
import React, { useState, useEffect, useMemo } from 'react';
import { Bell, ChevronRight, Loader2, RefreshCw, Trophy, Zap, Sparkles, Leaf, Fish, TrendingUp, Calendar, Target, Star, Award } from 'lucide-react';
// Fixed incorrect relative import for root file
import { Catch } from './types';
import { GoogleGenAI } from "@google/genai";
import { MOCK_COMPETITIONS, MOCK_FRIENDS } from './constants';

interface WeatherData {
  summary: string;
  sources: { title: string; uri: string }[];
  location?: string;
  lastUpdated?: string;
}

let sessionWeatherCache: WeatherData | null = null;

const HomeScreen: React.FC<{ 
  catches: Catch[], 
  unreadCount: number, 
  ecoPoints: number,
  userName: string,
  userAvatar: string,
  onShowDetail: (id: string) => void, 
  onShowAll: () => void, 
  onProfileClick: () => void, 
  onOpenAI: () => void, 
  onNotificationsClick: () => void,
  onOpenEco: () => void,
  onNavigateToRankings: () => void
}> = ({ catches, unreadCount, ecoPoints, userName, userAvatar, onShowDetail, onShowAll, onProfileClick, onOpenAI, onNotificationsClick, onOpenEco, onNavigateToRankings }) => {
  const [weather, setWeather] = useState<WeatherData | null>(sessionWeatherCache);
  const [loading, setLoading] = useState(false);
  const [locName, setLocName] = useState('Lokalizujem...');

  useEffect(() => { if (!sessionWeatherCache) fetchEnv(); }, []);

  const fetchEnv = async () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analyzuj aktuálne podmienky pre rybolov na súradniciach ${pos.coords.latitude}, ${pos.coords.longitude}. Zameraj sa na to, ktoré druhy sú teraz aktívne a akú metódu zvoliť. Odpovedz v 2 vetách.`,
          config: { tools: [{ googleSearch: {} }] }
        });
        
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.map((chunk: any) => ({ title: chunk.web?.title || "Zdroj", uri: chunk.web?.uri }))
          .filter((s: any) => s.uri) || [];

        const enriched = { 
          summary: response.text || "Podmienky sú stabilné, ryby sú aktívne.", 
          lastUpdated: new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }), 
          sources 
        };
        sessionWeatherCache = enriched;
        setWeather(enriched);
        setLocName("Aktuálna poloha");
      } catch (e) { 
        console.error("Weather fetch failed:", e); 
        setLocName('Revír neidentifikovaný'); 
      }
      finally { setLoading(false); }
    }, () => { 
      setLoading(false); 
      setLocName('GPS nedostupné'); 
    }, { timeout: 10000 });
  };

  // Výpočet poradia (mock pre demo, v reálnej app by šlo z Firestore)
  const myRank = 14; 
  const totalAnglers = 1240;
  const activeComp = MOCK_COMPETITIONS[0];
  
  const inSeasonFish = [
    { name: 'Zubáč', icon: '🐟', status: 'Top sezóna' },
    { name: 'Šťuka', icon: '🎣', status: 'Aktívna' },
    { name: 'Hlavátka', icon: '❄️', status: 'Len na povolenku' }
  ];

  const latest = catches[0];

  return (
    <div className="flex flex-col h-full overflow-y-auto hide-scrollbar pb-32 bg-[#0A2239]">
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
         <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#3498DB]/20 to-transparent"></div>
      </div>

      <header className="p-6 flex items-center justify-between sticky top-0 z-40 bg-[#0A2239]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div onClick={onProfileClick} className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#3498DB]/30 shadow-lg active:scale-90 transition-transform cursor-pointer bg-white/5 p-0.5">
             <img src={userAvatar} alt="Profil" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <div>
            <p className="text-[9px] font-black text-[#3498DB] uppercase tracking-[0.2em]">Petrov zdar, {userName.split(' ')[0]}</p>
            <div className="flex items-center gap-1">
              <span className="text-sm font-black text-white italic tracking-tight">{locName}</span>
              <RefreshCw onClick={fetchEnv} className={`w-3 h-3 text-[#3498DB] cursor-pointer ${loading ? 'animate-spin' : ''}`} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div onClick={onOpenEco} className="glass px-3 py-2 rounded-xl flex items-center gap-2 border-[#22C55E]/20 cursor-pointer active:scale-95 transition-all">
             <Leaf className="w-4 h-4 text-green-500" />
             <span className="text-[10px] font-black text-green-500">{ecoPoints}</span>
          </div>
          <button onClick={onNotificationsClick} className="w-11 h-11 rounded-xl glass flex items-center justify-center relative active:scale-90 transition-all border-white/10">
            <Bell className="w-5 h-5 text-slate-300" />
            {unreadCount > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-[#FF3D68] rounded-full border border-[#0A2239] shadow-[0_0_8px_#FF3D68]"></span>}
          </button>
        </div>
      </header>

      <div className="px-6 space-y-6 pt-4 relative z-10">
        
        {/* 1. Quick Ranking & Progress Widget */}
        <section onClick={onNavigateToRankings} className="glass rounded-[32px] p-5 border-[#3498DB]/20 flex items-center justify-between shadow-2xl active:scale-[0.98] transition-all cursor-pointer bg-gradient-to-r from-[#3498DB]/5 to-transparent">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#3498DB] rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(52,152,219,0.3)]">
                 <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tvoja pozícia</p>
                 <h3 className="text-2xl font-black text-white italic">#{myRank} <span className="text-[10px] font-bold text-slate-500 not-italic uppercase ml-1">z {totalAnglers}</span></h3>
              </div>
           </div>
           <div className="text-right">
              <div className="flex items-center gap-1 text-[#3498DB] mb-1 justify-end">
                 <TrendingUp className="w-3 h-3" />
                 <span className="text-[10px] font-black uppercase">+3 pozície</span>
              </div>
              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-[#3498DB] w-[75%] rounded-full shadow-[0_0_8px_#3498DB]"></div>
              </div>
           </div>
        </section>

        {/* 2. Weather & AI Context */}
        <section className="glass rounded-[32px] p-6 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Sparkles className="w-20 h-20" /></div>
          {loading ? (
             <div className="flex flex-col items-center justify-center h-28 gap-3">
               <Loader2 className="w-7 h-7 text-[#3498DB] animate-spin" />
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] animate-pulse">Skenujem podmienky...</span>
             </div>
          ) : weather ? (
            <div className="animate-fade-in">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-lg bg-[#3498DB]/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-[#3498DB]" />
                   </div>
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Prognóza Lovu</h3>
                </div>
                <span className="text-[9px] font-black text-white bg-white/5 px-2 py-1 rounded-md">{weather.lastUpdated}</span>
              </div>

              <p className="text-sm font-medium text-slate-200 italic leading-relaxed mb-6">
                "{weather.summary}"
              </p>

              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {weather.sources.map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/5 px-3 py-2 rounded-xl text-[9px] font-black text-[#3498DB] whitespace-nowrap border border-white/5 active:bg-white/10 transition-colors">
                    <Star className="w-2.5 h-2.5 fill-[#3498DB]" />
                    {s.title.slice(0, 20)}...
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 flex flex-col items-center gap-2">
               <Fish className="w-8 h-8 text-slate-800" />
               <p className="text-[10px] text-slate-500 uppercase font-black">Čakám na GPS dáta</p>
            </div>
          )}
        </section>

        {/* 3. "In Season" Radar */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                 <Calendar className="w-3.5 h-3.5" /> Práve v sezóne
              </h2>
              <span className="text-[9px] font-black text-[#3498DB] uppercase tracking-widest">Február</span>
           </div>
           <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {inSeasonFish.map((fish, i) => (
                <div key={i} className="glass min-w-[130px] p-4 rounded-[28px] border-white/5 flex flex-col items-center text-center group active:scale-95 transition-all">
                   <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{fish.icon}</div>
                   <h4 className="text-xs font-black text-white uppercase mb-1">{fish.name}</h4>
                   <p className="text-[8px] font-bold text-[#3498DB] uppercase tracking-tighter">{fish.status}</p>
                </div>
              ))}
           </div>
        </section>

        {/* 4. Active Competition Preview */}
        <section className="glass rounded-[32px] p-6 border-yellow-500/20 shadow-xl relative overflow-hidden bg-gradient-to-br from-yellow-500/5 to-transparent active:scale-[0.98] transition-all cursor-pointer border">
           <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl"></div>
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg">
                 <Award className="w-6 h-6 text-[#0A2239]" />
              </div>
              <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                    <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Prebieha súťaž</p>
                 </div>
                 <h3 className="text-lg font-black italic uppercase leading-none text-white">{activeComp.title}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-700" />
           </div>
        </section>

        {/* 5. Personal Journal Snapshot */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Tvoj posledný záber</h2>
              <button onClick={onShowAll} className="text-[10px] font-black text-[#3498DB] uppercase tracking-widest hover:underline">Denník</button>
           </div>
           
           {latest ? (
              <div onClick={() => onShowDetail(latest.id)} className="relative h-64 rounded-[40px] overflow-hidden neo-shadow group active:scale-[0.98] transition-all cursor-pointer border border-white/5">
                 <img src={latest.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0A2239] via-transparent to-transparent"></div>
                 <div className="absolute bottom-6 left-6">
                    <div className="flex items-center gap-2 mb-1.5">
                       <Zap className="w-3.5 h-3.5 text-[#3498DB] fill-[#3498DB]/20" />
                       <span className="text-[9px] font-black text-[#3498DB] uppercase tracking-widest">Overený záznam</span>
                    </div>
                    <h3 className="text-3xl font-black italic uppercase text-white leading-none tracking-tighter">{latest.fishType}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">{latest.locationName} • {latest.length}cm</p>
                 </div>
              </div>
           ) : (
              <div className="glass rounded-[40px] p-12 flex flex-col items-center justify-center border-dashed border-2 border-white/10 text-center">
                 <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Fish className="w-8 h-8 text-slate-700" />
                 </div>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">Zatiaľ prázdny denník.<br/>Čas vyraziť k vode!</p>
              </div>
           )}
        </section>

        {/* 6. AI Assistant Quick Callout */}
        <section onClick={onOpenAI} className="glass rounded-[32px] p-6 border-[#3498DB]/20 shadow-xl relative overflow-hidden active:scale-95 transition-all cursor-pointer border mb-6 bg-gradient-to-br from-[#0A2239] to-[#152E47]">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-gradient-to-br from-[#3498DB] to-[#0A2239] rounded-2xl flex items-center justify-center shadow-lg relative">
                 <Sparkles className="w-7 h-7 text-white animate-pulse" />
                 <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF3D68] rounded-full border-2 border-[#0A2239]"></div>
              </div>
              <div className="flex-1">
                 <h3 className="text-lg font-black italic uppercase leading-none">AI Ichtyológ</h3>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Nová analýza zdravia k dispozícii</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-700" />
           </div>
        </section>
      </div>
    </div>
  );
};

export default HomeScreen;
