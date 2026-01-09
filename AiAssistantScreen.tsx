
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Zap, Sparkles, MapPin, Wind, Thermometer, Waves, Loader2, Send, Fish, Target, ShieldCheck, Info, Camera, HeartPulse, ShieldAlert, X, AlertCircle, Volume2, Compass, Moon, ExternalLink } from 'lucide-react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
// Fixed incorrect relative import for root file
import { AiAdvice } from './types';

interface AiAssistantScreenProps {
  onBack: () => void;
}

const AiAssistantScreen: React.FC<AiAssistantScreenProps> = ({ onBack }) => {
  const [targetFish, setTargetFish] = useState('Kapor obyčajný');
  const [isThinking, setIsThinking] = useState(false);
  const [advice, setAdvice] = useState<any>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locStatus, setLocStatus] = useState<'checking' | 'ready' | 'denied'>('checking');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'strategy' | 'health'>('strategy');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    setLocStatus('checking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus('ready');
      },
      () => {
        setLocStatus('denied');
        console.warn("Location denied");
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAnalysisMode('health');
      };
      reader.readAsDataURL(file);
    }
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const speakAdvice = async () => {
    if (!advice || isPlayingAudio) return;
    setIsPlayingAudio(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const textToSpeak = analysisMode === 'health' 
        ? `Analýza druhu ${advice.species}. Zdravotný stav je hodnotený ako ${advice.healthStatus === 'healthy' ? 'zdravý' : 'podozrivý'}. ${advice.diagnostic}. ${advice.recommendation || ''}`
        : `Strategické odporúčanie: ${advice.text.slice(0, 250)}...`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Povedz to ako skúsený a priateľský rybár, stručne a k veci: ${textToSpeak}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsPlayingAudio(false);
        source.start();
      } else {
        setIsPlayingAudio(false);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsPlayingAudio(false);
    }
  };

  const analyze = async () => {
    setIsThinking(true);
    setAdvice(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (selectedImage && analysisMode === 'health') {
        const mimeType = selectedImage.split(';')[0].split(':')[1] || 'image/jpeg';
        const base64Data = selectedImage.split(',')[1];
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { text: "Si expertný ichtyológ. Analyzuj fotografiu ryby a zameraj sa na ZDRAVIE (parazity, plesne, rany, deformácie)." },
              { inlineData: { data: base64Data, mimeType } }
            ]
          },
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                species: { type: Type.STRING },
                healthStatus: { type: Type.STRING, enum: ["healthy", "injured", "parasites", "invasive"] },
                diagnostic: { type: Type.STRING, description: "Stručný odborný popis nálezu." },
                recommendation: { type: Type.STRING, description: "Čo má rybár s rybou urobiť." }
              },
              required: ["species", "healthStatus", "diagnostic", "recommendation"]
            }
          }
        });
        
        const result = JSON.parse(response.text || '{}');
        setAdvice(result);
      } else {
        // Mode: Strategy with Weather Grounding
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Si rybársky expert. Na základe aktuálneho počasia pre rybársku lokalitu na súradniciach ${location ? `${location.lat}, ${location.lng}` : 'Slovensko'} navrhni podrobnú stratégiu lovu pre rybu: ${targetFish}. Zameraj sa na hĺbku, nástrahu a metódu.`,
          config: { 
            tools: [{ googleSearch: {} }] 
          }
        });

        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.map((chunk: any) => ({ title: chunk.web?.title || "Zdroj", uri: chunk.web?.uri }))
          .filter((s: any) => s.uri) || [];
        
        setAdvice({ 
          text: response.text || "Nepodarilo sa načítať stratégiu.", 
          sources 
        });
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      alert("AI analýza momentálne zlyhala. Skontrolujte pripojenie.");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] animate-fade-in overflow-y-auto hide-scrollbar pb-32">
      <header className="px-6 pt-10 pb-6 flex items-center gap-4 sticky top-0 bg-[#020617]/80 backdrop-blur-xl z-50 border-b border-white/5">
        <button onClick={onBack} className="p-2 glass rounded-xl text-white active:scale-90 transition-all border border-white/10">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase">AI Ichtyológ</h1>
          <p className="text-[10px] font-bold text-[#00F5FF] uppercase tracking-widest flex items-center gap-1">
            <HeartPulse className="w-3 h-3 text-[#00F5FF]" /> Diagnostika & Stratégia
          </p>
        </div>
      </header>

      <div className="px-6 space-y-8 mt-6">
        <div className="glass p-1.5 rounded-[24px] flex border border-white/5">
           <button 
             onClick={() => { setAnalysisMode('strategy'); setAdvice(null); }}
             className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${analysisMode === 'strategy' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500'}`}
           >
             Stratégia Lovu
           </button>
           <button 
             onClick={() => { setAnalysisMode('health'); setAdvice(null); }}
             className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${analysisMode === 'health' ? 'bg-[#00F5FF] text-[#020617] shadow-lg' : 'text-slate-500'}`}
           >
             <ShieldCheck className="w-3.5 h-3.5" /> Kontrola Zdravia
           </button>
        </div>

        {analysisMode === 'health' ? (
          <section className="space-y-6 animate-fade-in">
             <div className="relative aspect-video rounded-[32px] glass border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden group">
                {selectedImage ? (
                  <div className="relative w-full h-full">
                    <img src={selectedImage} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 p-2 glass rounded-xl text-white"><X /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center cursor-pointer text-center px-8">
                    <Camera className="w-12 h-12 text-[#00F5FF] mb-4 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-black uppercase tracking-widest text-white">Odfoť rybu na analýzu</p>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
             </div>
             <button onClick={analyze} disabled={!selectedImage || isThinking} className="w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all bg-[#00F5FF] text-[#020617]">
               {isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
               Spustiť Analýzu
             </button>
          </section>
        ) : (
          <div className="glass rounded-[40px] p-8 border-white/5 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cieľový druh a poloha</h3>
              <div onClick={requestLocation} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border cursor-pointer active:scale-95 transition-all ${locStatus === 'ready' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                <MapPin className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase">{locStatus === 'ready' ? 'GPS Aktívne' : 'Získať GPS'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {['Kapor obyčajný', 'Zubáč veľkoústy', 'Šťuka severná', 'Pstruh potočný'].map(fish => (
                <button key={fish} onClick={() => setTargetFish(fish)} className={`py-3 px-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${targetFish === fish ? 'bg-[#00F5FF] text-[#020617]' : 'bg-white/5 text-slate-500'}`}>
                  {fish}
                </button>
              ))}
            </div>

            <button onClick={analyze} disabled={isThinking} className="w-full mt-6 bg-[#00F5FF] text-[#020617] py-5 rounded-[24px] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
              {isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              <span className="text-xs font-black uppercase tracking-widest">Generovať Stratégiu</span>
            </button>
          </div>
        )}

        {advice && !isThinking && (
          <div className="space-y-6 animate-slide-up pb-10">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Odporúčanie</h3>
               <button 
                onClick={speakAdvice}
                className={`p-3 rounded-2xl flex items-center gap-2 transition-all ${isPlayingAudio ? 'bg-[#00F5FF] text-[#020617] animate-pulse' : 'glass text-[#00F5FF]'}`}
               >
                 <Volume2 className="w-4 h-4" />
                 <span className="text-[9px] font-black uppercase">{isPlayingAudio ? 'Prehrávam...' : 'Vypočuť si'}</span>
               </button>
            </div>

            {analysisMode === 'health' ? (
              <div className={`rounded-[32px] p-8 border ${advice.healthStatus === 'healthy' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                   <div className="flex items-center gap-3 mb-6">
                      {advice.healthStatus === 'healthy' ? <ShieldCheck className="w-6 h-6 text-green-400" /> : <ShieldAlert className="w-6 h-6 text-red-500" />}
                      <div>
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Identifikácia</p>
                         <h3 className="text-xl font-black text-white">{advice.species}</h3>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="bg-black/20 rounded-2xl p-4">
                         <p className="text-[10px] font-black text-[#00F5FF] uppercase tracking-widest mb-1">Diagnostika</p>
                         <p className="text-sm font-medium text-slate-200 leading-relaxed">{advice.diagnostic}</p>
                      </div>
                      <div className="bg-black/20 rounded-2xl p-4">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Odporúčanie</p>
                         <p className="text-sm font-bold text-white">{advice.recommendation}</p>
                      </div>
                   </div>
              </div>
            ) : (
              <div className="glass rounded-[32px] p-8 border-[#00F5FF]/10 space-y-6">
                 <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-[#00F5FF]" />
                    <span className="text-[10px] font-black uppercase text-[#00F5FF]">Strategický Výklad</span>
                 </div>
                 <p className="text-sm font-medium text-slate-200 whitespace-pre-wrap leading-relaxed italic">
                    {advice.text}
                 </p>
                 {advice.sources && advice.sources.length > 0 && (
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <p className="text-[9px] font-black text-slate-600 uppercase">Zdroje:</p>
                    <div className="flex flex-wrap gap-2">
                      {advice.sources.map((s: any, i: number) => (
                        <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[8px] font-bold text-[#00F5FF] whitespace-nowrap bg-white/5 px-2 py-1 rounded-lg">
                          {s.title.slice(0, 15)}... <ExternalLink className="w-2 h-2" />
                        </a>
                      ))}
                    </div>
                  </div>
                 )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAssistantScreen;
