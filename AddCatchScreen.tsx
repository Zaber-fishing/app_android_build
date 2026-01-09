import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, X, Loader2, Ruler, Scale, Fish, RefreshCw, 
  MapPin, Check, Search, Thermometer, Wind, Gauge, 
  ChevronRight, Navigation, ChevronLeft, Fingerprint, Ban,
  Trophy, Target, Droplets, Waves, Anchor, EyeOff, ShieldCheck,
  ShieldAlert, AlertTriangle
} from 'lucide-react';
import { Catch, User, Competition } from './types';
import { GoogleGenAI, Type } from "@google/genai";
import { SRZ_GROUNDS } from './constants';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const compressImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      } else {
        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

interface AddCatchScreenProps {
  user: User;
  competitions: Competition[];
  onSave: (c: Catch) => Promise<any>;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCatchScreen: React.FC<AddCatchScreenProps> = ({ user, competitions, onSave, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fishType: '', length: '', weight: '', 
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }),
    locationName: '', 
    groundId: '',
    image: null as string | null,
    coords: { lat: 48.66, lng: 19.69 }, 
    competitionId: '',
    isLocationPrivate: false, 
    bait: '', 
    method: 'Prívlač',
    temperature: 15,
    pressure: 1013,
    windSpeed: '2',
    waterClarity: 'clear' as 'clear' | 'prikalena' | 'turbid' | 'muddy' | 'algae'
  });
  
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGroundSearch, setShowGroundSearch] = useState(false);
  const [groundSearchQuery, setGroundSearchQuery] = useState('');
  
  const [aiAnalysis, setAiAnalysis] = useState<{
    isFish: boolean;
    isSuspicious: boolean;
    fraudReason?: string;
    detectedObject?: string;
  } | null>(null);

  const sortedGrounds = useMemo(() => {
    let list = [...SRZ_GROUNDS];
    const q = groundSearchQuery.toLowerCase().trim();
    if (formData.coords) {
       list = list.sort((a, b) => {
         const distA = calculateDistance(formData.coords.lat, formData.coords.lng, a.lat, a.lng);
         const distB = calculateDistance(formData.coords.lat, formData.coords.lng, b.lat, b.lng);
         return distA - distB;
       });
    }
    if (q) {
      list = list.filter(g => g.name.toLowerCase().includes(q) || g.id.includes(q));
    }
    return list.slice(0, 20);
  }, [groundSearchQuery, formData.coords]);

  const findNearestGround = () => {
    setIsLocating(true);
    setErrorMsg(null);
    
    const timeoutId = setTimeout(() => {
      if (isLocating) {
        setIsLocating(false);
        setErrorMsg("GPS signál je slabý. Vyberte revír manuálne zo zoznamu.");
      }
    }, 20000);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      clearTimeout(timeoutId);
      const { latitude: lat, longitude: lng } = pos.coords;
      setFormData(prev => ({ ...prev, coords: { lat, lng } }));
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Súradnice: ${lat}, ${lng}. Nájdi najbližší slovenský rybársky revír SRZ. Vráť JSON: {name, id}.`,
          config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text || '{}');
        if (result.name) setFormData(prev => ({ ...prev, locationName: result.name, groundId: result.id }));
      } catch (e) { 
        console.error(e); 
      } finally { 
        setIsLocating(false); 
      }
    }, (err) => { 
      clearTimeout(timeoutId);
      setIsLocating(false);
      setErrorMsg("Nepodarilo sa získať polohu. Prosím, povoľte GPS a skúste to znova.");
    }, { enableHighAccuracy: true, timeout: 15000 });
  };

  useEffect(() => { findNearestGround(); }, []);

  const verifyWithAI = async (compressedImage: string) => {
    setIsAiProcessing(true);
    setErrorMsg(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = compressedImage.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          role: 'user',
          parts: [
            { text: `Identifikuj rybu. JSON: {isFish: boolean, species: string, length: number, weight: number, isSuspicious: boolean, fraudReason: string, detectedObject: string}.` },
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
          ]
        }],
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isFish: { type: Type.BOOLEAN },
              species: { type: Type.STRING },
              length: { type: Type.NUMBER },
              weight: { type: Type.NUMBER },
              isSuspicious: { type: Type.BOOLEAN },
              fraudReason: { type: Type.STRING },
              detectedObject: { type: Type.STRING }
            },
            required: ["isFish", "isSuspicious"]
          }
        }
      });
      const result = JSON.parse(response.text || '{}');
      setAiAnalysis(result);
      if (result.isFish) {
        setFormData(p => ({ 
          ...p, 
          fishType: result.species || p.fishType, 
          length: result.length?.toString() || p.length, 
          weight: result.weight?.toString() || p.weight
        }));
      } else {
        setErrorMsg(`STRIKTNÁ KONTROLA: Detegovaný objekt "${result.detectedObject || 'Iný objekt'}". Zápis zamietnutý.`);
      }
    } catch (e) { setAiAnalysis({ isFish: true, isSuspicious: true }); } finally { setIsAiProcessing(false); }
  };

  const handleFinalSave = async () => {
    if (isSaving || !formData.fishType || !formData.locationName || (formData.image && !aiAnalysis?.isFish)) return;
    setIsSaving(true);
    try {
      const catchObj: Catch = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name, 
        userAvatar: user.avatar,
        fishType: formData.fishType,
        length: parseFloat(formData.length) || 0, 
        weight: parseFloat(formData.weight) || 0,
        date: formData.date,
        time: formData.time,
        locationName: formData.locationName,
        coordinates: formData.coords,
        isLocationPrivate: formData.isLocationPrivate,
        bait: formData.bait,
        method: formData.method,
        imageUrl: formData.image || '',
        likes: 0, 
        commentsCount: 0, 
        verificationStatus: (aiAnalysis?.isSuspicious || formData.competitionId) ? 'pending' : 'verified',
        isSuspicious: aiAnalysis?.isSuspicious,
        competitionId: formData.competitionId,
        temperature: formData.temperature,
        pressure: formData.pressure,
        windSpeed: formData.windSpeed,
        waterClarity: formData.waterClarity
      };
      await onSave(catchObj);
      setIsSuccess(true);
    } catch (e) { setErrorMsg("Chyba spojenia s databázou."); } finally { setIsSaving(false); }
  };

  const canSave = !!(formData.fishType && formData.locationName && (!formData.image || (aiAnalysis?.isFish && !isAiProcessing)));

  return (
    <div className="flex flex-col h-full bg-[#112a23] overflow-y-auto pb-40 relative font-sans select-none">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]"></div>

      <header className="px-6 py-10 flex items-center justify-between sticky top-0 bg-[#1a3d32] border-b border-white/5 z-[150] pt-[env(safe-area-inset-top)] shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-3 bg-[#112a23] rounded-2xl text-[#f5f5f0] shadow-md active:scale-95 transition-all"><ChevronLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-[#f5f5f0] leading-none">Nový Zápis</h1>
            <p className="text-[9px] font-black text-[#d97706] uppercase tracking-[0.2em] mt-1.5">Digitálna Kronika</p>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-8 mt-8 relative z-10">
        
        {/* 1. FOTO A AI ANALÝZA */}
        <div className={`relative aspect-[4/5] rounded-[50px] bg-[#1a3d32] border-2 border-dashed overflow-hidden shadow-2xl transition-all ${aiAnalysis ? (aiAnalysis.isFish ? 'border-green-500/30' : 'border-red-500/50') : 'border-[#2c5d63]/30'}`}>
          {formData.image ? (
            <div className="w-full h-full relative">
              <img src={formData.image} className="w-full h-full object-cover" alt="" />
              {isAiProcessing && (
                <div className="absolute inset-0 bg-[#112a23]/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                   <Fingerprint className="w-12 h-12 text-[#d97706] mb-4 animate-pulse" />
                   <span className="text-[10px] font-black uppercase text-[#d97706]">Analyzujem biológiu úlovku...</span>
                </div>
              )}
              <button onClick={() => { setFormData(p => ({...p, image: null})); setAiAnalysis(null); }} className="absolute bottom-6 left-6 right-6 py-4 bg-[#112a23]/90 rounded-2xl text-white font-black text-[10px] uppercase shadow-2xl">Zmazať a nahrať znova</button>
            </div>
          ) : (
            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-12 text-center group">
              <Camera className="w-12 h-12 text-[#d97706] mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-black text-[#f5f5f0] uppercase italic">Nahrať Foto</h3>
              <p className="text-[9px] text-[#d1d1c7]/40 font-black uppercase tracking-widest mt-2">AI okamžite identifikuje druh</p>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const r = new FileReader();
                  r.onloadend = async () => { 
                    const comp = await compressImage(r.result as string);
                    setFormData(p => ({...p, image: comp})); 
                    verifyWithAI(comp);
                  };
                  r.readAsDataURL(file);
                }
              }} />
            </label>
          )}
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center gap-3 animate-fade-in shadow-lg">
             <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
             <p className="text-[10px] font-bold text-red-200 uppercase">{errorMsg}</p>
          </div>
        )}

        {/* 2. LOKALITA A REVÍR */}
        <div className="bg-[#1a3d32] p-8 rounded-[48px] border border-white/5 space-y-6 shadow-2xl">
           <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-3">
                 <MapPin className="w-4 h-4 text-[#d97706]" />
                 <h3 className="text-[9px] font-black uppercase text-[#2c5d63] tracking-[0.3em]">Miesto lovu</h3>
              </div>
              <button onClick={findNearestGround} disabled={isLocating} className="p-2.5 bg-[#112a23] rounded-xl text-[#d97706] active:scale-90 shadow-md">
                 <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse text-[#d97706]' : ''}`} />
              </button>
           </div>
           <button onClick={() => setShowGroundSearch(true)} className="w-full bg-[#112a23] p-6 rounded-[28px] border border-white/5 flex flex-col justify-center text-left group">
              <div className="min-w-0 w-full flex items-center justify-between">
                <div className="flex-1">
                  {isLocating ? (
                    <div className="space-y-1">
                       <p className="text-sm font-black text-[#d97706] uppercase italic animate-pulse">Zameriavam polohu...</p>
                       <p className="text-[7px] text-[#2c5d63] font-bold uppercase tracking-widest leading-none">Synchronizácia so satelitmi môže trvať až 60 sekúnd.</p>
                    </div>
                  ) : formData.locationName ? (
                    <>
                      <p className="text-sm font-black text-[#f5f5f0] uppercase italic truncate">{formData.locationName}</p>
                      <p className="text-[8px] font-bold text-[#d97706] uppercase tracking-widest mt-1">{formData.groundId || 'Registrovaný revír'}</p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-[#d1d1c7]/10 uppercase italic">Vybrať zo zoznamu...</p>
                  )}
                </div>
                <Search className="w-5 h-5 text-[#2c5d63] ml-4 group-hover:text-[#d97706] transition-colors" />
              </div>
           </button>
        </div>

        {/* 3. STEALTH MODE */}
        <div className="bg-[#1a3d32] p-6 rounded-[36px] border border-white/5 flex items-center justify-between shadow-xl">
           <div className="flex items-center gap-3">
              <EyeOff className="w-5 h-5 text-[#d97706]" />
              <div>
                 <h4 className="text-[10px] font-black text-[#f5f5f0] uppercase tracking-widest">Stealth Mode</h4>
                 <p className="text-[8px] text-[#d1d1c7]/30 uppercase font-bold italic">Utajiť presné miesto na mape</p>
              </div>
           </div>
           <button onClick={() => setFormData(p => ({...p, isLocationPrivate: !p.isLocationPrivate}))} className={`w-12 h-6 rounded-full transition-all relative ${formData.isLocationPrivate ? 'bg-[#d97706]' : 'bg-[#112a23]'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.isLocationPrivate ? 'right-1' : 'left-1'}`} />
           </button>
        </div>

        {/* 4. ÚDAJE O RYBE */}
        <div className="bg-[#1a3d32] p-8 rounded-[48px] border border-white/5 space-y-8 shadow-2xl">
           <div className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                 <Fish className="w-4 h-4 text-[#d97706]" />
                 <span className="text-[8px] font-black text-[#2c5d63] uppercase tracking-widest">Druh ryby</span>
              </div>
              <input value={formData.fishType} onChange={e => setFormData(p => ({...p, fishType: e.target.value}))} className="w-full bg-transparent text-3xl font-black italic uppercase text-[#f5f5f0] outline-none border-b border-white/5 pb-4 placeholder:text-white/5" placeholder="Názov ryby..." />
           </div>
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <span className="text-[8px] font-black text-[#2c5d63] uppercase tracking-widest ml-2">Dĺžka (cm)</span>
                 <input type="number" value={formData.length} onChange={e => setFormData(p => ({...p, length: e.target.value}))} className="w-full bg-[#112a23] text-xl font-black italic text-[#f5f5f0] rounded-2xl p-5 border border-white/5" placeholder="0" />
              </div>
              <div className="space-y-2">
                 <span className="text-[8px] font-black text-[#2c5d63] uppercase tracking-widest ml-2">Váha (kg)</span>
                 <input type="number" value={formData.weight} onChange={e => setFormData(p => ({...p, weight: e.target.value}))} className="w-full bg-[#112a23] text-xl font-black italic text-[#f5f5f0] rounded-2xl p-5 border border-white/5" placeholder="0.0" />
              </div>
           </div>
        </div>

        {/* 5. TECHNIKA A NÁSTRAHA */}
        <div className="bg-[#1a3d32] p-8 rounded-[48px] border border-white/5 space-y-6 shadow-2xl">
           <div className="flex items-center gap-3 px-2">
              <Anchor className="w-4 h-4 text-[#d97706]" />
              <h3 className="text-[9px] font-black uppercase text-[#2c5d63] tracking-[0.3em]">Technika lovu</h3>
           </div>
           <div className="space-y-4">
              <div className="space-y-2">
                 <span className="text-[8px] font-black text-[#2c5d63] uppercase tracking-widest ml-2">Spôsob</span>
                 <select value={formData.method} onChange={e => setFormData(p => ({...p, method: e.target.value}))} className="w-full bg-[#112a23] text-sm font-black italic text-[#f5f5f0] rounded-2xl p-5 border border-white/5 outline-none appearance-none">
                    {['Prívlač', 'Položená', 'Feeder', 'Plávaná', 'Muškárenie', 'Dierky'].map(m => <option key={m} value={m}>{m}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <span className="text-[8px] font-black text-[#2c5d63] uppercase tracking-widest ml-2">Použitá nástraha</span>
                 <input value={formData.bait} onChange={e => setFormData(p => ({...p, bait: e.target.value}))} className="w-full bg-[#112a23] text-sm font-black italic text-[#f5f5f0] rounded-2xl p-5 border border-white/5 outline-none shadow-inner" placeholder="napr. Wobler 7cm, Kukurica..." />
              </div>
           </div>
        </div>

        {/* 6. METEO DÁTA */}
        <div className="bg-[#1a3d32] p-8 rounded-[48px] border border-white/5 space-y-6 shadow-2xl">
           <div className="flex items-center gap-3 px-2">
              <Gauge className="w-4 h-4 text-[#d97706]" />
              <h3 className="text-[9px] font-black uppercase text-[#2c5d63] tracking-[0.3em]">Poveternostné podmienky</h3>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#112a23] p-4 rounded-2xl border border-white/5">
                 <span className="text-[8px] font-black text-[#2c5d63] uppercase block mb-2">Vzduch (°C)</span>
                 <input type="number" value={formData.temperature} onChange={e => setFormData(p => ({...p, temperature: parseInt(e.target.value)}))} className="bg-transparent text-xl font-black italic text-white outline-none w-full" />
              </div>
              <div className="bg-[#112a23] p-4 rounded-2xl border border-white/5">
                 <span className="text-[8px] font-black text-[#2c5d63] uppercase block mb-2">Vietor (m/s)</span>
                 <input value={formData.windSpeed} onChange={e => setFormData(p => ({...p, windSpeed: e.target.value}))} className="bg-transparent text-xl font-black italic text-white outline-none w-full" />
              </div>
              <div className="bg-[#112a23] p-4 rounded-2xl border border-white/5">
                 <span className="text-[8px] font-black text-[#2c5d63] uppercase block mb-2">Tlak (hPa)</span>
                 <input type="number" value={formData.pressure} onChange={e => setFormData(p => ({...p, pressure: parseInt(e.target.value)}))} className="bg-transparent text-xl font-black italic text-white outline-none w-full" />
              </div>
              <div className="bg-[#112a23] p-4 rounded-2xl border border-white/5">
                 <span className="text-[8px] font-black text-[#2c5d63] uppercase block mb-2">Čistota vody</span>
                 <select value={formData.waterClarity} onChange={e => setFormData(p => ({...p, waterClarity: e.target.value as any}))} className="bg-transparent text-[10px] font-black uppercase text-white outline-none w-full border-none">
                    <option value="clear">Číra</option>
                    <option value="prikalena">Prisalená</option>
                    <option value="turbid">Zakalená</option>
                    <option value="muddy">Kalená</option>
                    <option value="algae">Kvitnúca</option>
                 </select>
              </div>
           </div>
        </div>

        {/* 7. SÚŤAŽE */}
        {competitions.length > 0 && (
          <div className="bg-gradient-to-br from-[#d97706]/10 to-transparent p-8 rounded-[48px] border border-[#d97706]/20 space-y-4 shadow-2xl relative overflow-hidden">
             <div className="absolute -right-8 -top-8 opacity-5 rotate-12"><Trophy className="w-32 h-32 text-white" /></div>
             <div className="flex items-center gap-3 px-2">
                <Target className="w-4 h-4 text-[#d97706]" />
                <h3 className="text-[9px] font-black uppercase text-[#d97706] tracking-[0.3em]">Zapojiť do turnaja</h3>
             </div>
             <select value={formData.competitionId} onChange={e => setFormData(p => ({...p, competitionId: e.target.value}))} className="w-full bg-[#112a23] text-sm font-black italic text-[#f5f5f0] rounded-2xl p-5 border border-[#d97706]/20 outline-none appearance-none shadow-xl">
                <option value="">-- Bez účasti v súťaži --</option>
                {competitions.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
             </select>
             <p className="text-[7px] text-[#d1d1c7]/40 uppercase font-bold italic text-center">Súťažné úlovky podliehajú manuálnej verifikácii.</p>
          </div>
        )}

        <button 
          onClick={handleFinalSave} 
          disabled={!canSave || isSaving} 
          className="w-full py-8 bg-[#d97706] text-white rounded-[48px] font-black uppercase tracking-[0.4em] text-[11px] shadow-2xl disabled:opacity-20 flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <><ShieldCheck className="w-5 h-5" /> Potvrdiť Zápis</>}
        </button>
      </div>

      {/* MODÁLNE VYHĽADÁVANIE REVÍROV */}
      {showGroundSearch && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-[#0a1814]/98 backdrop-blur-xl">
           <div className="relative bg-[#1a3d32] w-full max-w-md rounded-[48px] p-8 shadow-2xl border border-white/10 flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center mb-8 px-2">
                 <h2 className="text-2xl font-black italic uppercase text-[#f5f5f0]">Register SRZ</h2>
                 <button onClick={() => setShowGroundSearch(false)} className="p-3 bg-[#112a23] rounded-2xl text-[#d1d1c7]/30"><X className="w-5 h-5" /></button>
              </div>
              <div className="relative mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2c5d63]" />
                 <input autoFocus value={groundSearchQuery} onChange={e => setGroundSearchQuery(e.target.value)} className="w-full bg-[#112a23] border border-white/5 rounded-2xl pl-12 pr-4 py-5 text-[#f5f5f0] font-black italic outline-none focus:border-[#d97706] transition-all" placeholder="Meno alebo kód..." />
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar pr-1">
                 <p className="text-[9px] font-black text-[#2c5d63] uppercase tracking-widest ml-2 mb-2">Zoradené podľa vzdialenosti</p>
                 {sortedGrounds.map(g => (
                   <button key={g.id} onClick={() => { setFormData(p => ({ ...p, locationName: g.name, groundId: g.id })); setShowGroundSearch(false); }} className="w-full bg-[#112a23]/40 border border-white/5 rounded-3xl p-5 flex items-center justify-between text-left active:bg-[#2c5d63]/20 transition-all group">
                      <div className="min-w-0">
                         <h4 className="text-sm font-black text-[#f5f5f0] uppercase italic truncate group-active:text-[#d97706]">{g.name}</h4>
                         <p className="text-[8px] font-bold text-[#d97706] uppercase tracking-widest">{g.id} • {g.region}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#2c5d63]" />
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {isSuccess && (
        <div className="fixed inset-0 bg-[#112a23] z-[3000] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="w-24 h-24 bg-[#d97706]/20 rounded-[44px] flex items-center justify-center mb-10 border border-[#d97706]/30 shadow-2xl">
             <Check className="w-12 h-12 text-[#d97706]" strokeWidth={4} />
          </div>
          <h2 className="text-4xl font-black italic uppercase text-[#f5f5f0] mb-4">Uložené</h2>
          <p className="text-[10px] text-[#d1d1c7]/40 font-black uppercase tracking-[0.2em] mb-16">Váš denník bol aktualizovaný</p>
          <button onClick={onSuccess} className="w-full bg-[#2c5d63] text-white py-6 rounded-[32px] font-black uppercase tracking-[0.4em] text-[10px] shadow-2xl active:scale-95 transition-all">Pokračovať</button>
        </div>
      )}
    </div>
  );
};

export default AddCatchScreen;