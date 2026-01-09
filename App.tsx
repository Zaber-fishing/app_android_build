import React, { useState, useEffect } from 'react';
import { NavigationTab, ViewState, Catch, AppNotification, User, Competition, EcoReport } from './types';
import { 
  db, 
  auth, 
  onAuthStateChanged, 
  signOut,
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  setDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  writeBatch, 
  addDoc,
  where
} from './firebase';
import { SYSTEM_CONFIG } from './constants';
import { Loader2, AlertTriangle, X, MapPin, ShieldAlert, Anchor, Waves, Hammer, Sparkles, AlertOctagon, ArrowRight } from 'lucide-react';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import MyCatchesScreen from './screens/MyCatchesScreen';
import AddCatchScreen from './screens/AddCatchScreen';
import RankingsScreen from './screens/RankingsScreen';
import CommunityScreen from './screens/CommunityScreen';
import CatchDetailScreen from './screens/CatchDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatScreen from './screens/ChatScreen';
import AiAssistantScreen from './screens/AiAssistantScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import EcoMonitoringScreen from './screens/EcoMonitoringScreen';
import LegislationScreen from './screens/LegislationScreen';
import AdminScreen from './screens/AdminScreen';
import CompetitionDetailScreen from './screens/CompetitionDetailScreen';
import FaqScreen from './screens/FaqScreen';
import UpdatesScreen from './screens/UpdatesScreen';
import BottomNav from './components/BottomNav';

// Global session state
let hasCheckedGpsThisSession = false;
let hasShownBetaNotice = false;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [maintenanceModeActive, setMaintenanceModeActive] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [showBetaNotice, setShowBetaNotice] = useState(false);

  const [viewState, setViewState] = useState<ViewState>({
    tab: NavigationTab.Home,
    isLoggedIn: false,
  });

  const [catches, setCatches] = useState<Catch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [ecoReports, setEcoReports] = useState<EcoReport[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const ADMIN_EMAILS = ['radovan.kudela@gmail.com'];

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        setMaintenanceModeActive(!!data.maintenanceMode);
      }
    }, (error) => {
      console.warn("Settings listener access restricted:", error);
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.viewState) {
        setViewState({ ...event.state.viewState, isLoggedIn: true });
      } else if (currentUser) {
        setViewState(prev => ({ 
          ...prev, 
          tab: NavigationTab.Home, 
          detailCatchId: undefined, 
          detailCompetitionId: undefined, 
          viewingUserId: undefined,
          activeChatUserId: undefined
        }));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  const navigateTo = (newViewState: Partial<ViewState>) => {
    const updated = { ...viewState, ...newViewState };
    setViewState(updated);
    window.history.pushState({ viewState: updated }, "");
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo({ 
        tab: NavigationTab.Home, 
        detailCatchId: undefined, 
        detailCompetitionId: undefined, 
        viewingUserId: undefined 
      });
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        const initialState = { tab: NavigationTab.Home, isLoggedIn: true };
        setViewState(initialState);
        window.history.replaceState({ viewState: initialState }, "");
        await handleLoginSuccess(firebaseUser);
        
        if (!hasShownBetaNotice) {
          setShowBetaNotice(true);
          hasShownBetaNotice = true;
        }
      } else {
        setCurrentUser(null);
        setViewState(prev => ({ ...prev, isLoggedIn: false }));
      }
      setIsAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!viewState.isLoggedIn || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    setIsProfileLoading(true);

    const unsubMe = onSnapshot(doc(db, "users", uid), (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentUser({ ...data, id: docSnap.id, isAdmin: ADMIN_EMAILS.includes(auth.currentUser?.email?.toLowerCase() || '') } as User);
      }
      setIsProfileLoading(false);
    });

    const unsubCatches = onSnapshot(collection(db, "catches"), (snap: any) => {
        const data = snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as Catch));
        setCatches(data.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)));
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap: any) => {
        setUsers(snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as User)));
    });

    const unsubComps = onSnapshot(collection(db, "competitions"), (snap: any) => {
        setCompetitions(snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as Competition)));
    });

    const unsubEco = onSnapshot(collection(db, "ecoReports"), (snap: any) => {
        setEcoReports(snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as EcoReport)));
    });

    const unsubNotifs = onSnapshot(query(collection(db, "notifications"), where("userId", "==", uid)), (snap: any) => {
        setNotifications(snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as AppNotification)));
    });

    return () => { unsubMe(); unsubCatches(); unsubUsers(); unsubComps(); unsubEco(); unsubNotifs(); };
  }, [viewState.isLoggedIn, auth.currentUser?.uid]);

  const handleLoginSuccess = async (firebaseUser: any, name?: string) => {
    const userId = firebaseUser.uid;
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      const userData = {
        id: userId,
        name: name || firebaseUser.displayName || "Rybár",
        avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
        catchCount: 0,
        ecoPoints: 0,
        status: 'online',
        isAdmin: ADMIN_EMAILS.includes(firebaseUser.email?.toLowerCase() || '')
      };
      await setDoc(userRef, userData);
    }
  };

  const requestGPS = () => {
    if (hasCheckedGpsThisSession) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => { 
          hasCheckedGpsThisSession = true;
          setShowPermissionModal(false);
          window.dispatchEvent(new CustomEvent('gps-ready'));
        },
        (err) => {
          if (err.code === 1) {
            hasCheckedGpsThisSession = true;
            setShowPermissionModal(true);
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  useEffect(() => {
    if (viewState.isLoggedIn && !hasCheckedGpsThisSession) {
      requestGPS();
    }
  }, [viewState.isLoggedIn]);

  const handleSaveCatch = async (catchData: Catch) => {
    try {
      const catchRef = doc(collection(db, "catches"), catchData.id);
      const sanitizedData = JSON.parse(JSON.stringify(catchData));
      await setDoc(catchRef, { ...sanitizedData, createdAt: serverTimestamp() });
      if (catchData.verificationStatus === 'verified') {
        await updateDoc(doc(db, "users", currentUser!.id), { catchCount: increment(1) });
      }
      return true;
    } catch (err) {
      console.error("Firestore Save Error:", err);
      throw err;
    }
  };

  if (!isAuthReady) return <div className="h-screen bg-[#112a23] flex items-center justify-center"><Loader2 className="animate-spin text-[#d97706]" /></div>;
  if (viewState.isLoggedIn && isProfileLoading && !currentUser) {
    return <div className="h-screen bg-[#112a23] flex items-center justify-center"><Loader2 className="animate-spin text-[#d97706]" /></div>;
  }
  if (!viewState.isLoggedIn) return <AuthScreen onLogin={handleLoginSuccess} />;

  const renderScreen = () => {
    if (!currentUser) return null;
    
    if (viewState.detailCatchId) {
      const c = catches.find(x => x.id === viewState.detailCatchId);
      return c ? <CatchDetailScreen catchData={c} currentUser={currentUser} onBack={goBack} onStartChat={(uid) => navigateTo({ tab: NavigationTab.Chat, activeChatUserId: uid, detailCatchId: undefined })} /> : null;
    }
    
    if (viewState.detailCompetitionId) {
      const comp = competitions.find(x => x.id === viewState.detailCompetitionId);
      return comp ? <CompetitionDetailScreen competition={comp} catches={catches} onBack={goBack} onShowCatch={(id) => navigateTo({ detailCatchId: id, detailCompetitionId: undefined })} /> : null;
    }

    if (viewState.viewingUserId) {
      const targetUser = users.find(u => u.id === viewState.viewingUserId);
      if (targetUser) {
        return (
          <ProfileScreen 
            user={targetUser} 
            catches={catches} 
            ecoPoints={targetUser.ecoPoints} 
            onBack={goBack} 
            onLogout={() => signOut(auth)} 
            onSupportClick={() => {}} 
            onLegislationClick={() => navigateTo({ tab: NavigationTab.Legislation })} 
            onFaqClick={() => navigateTo({ tab: NavigationTab.FAQs })} 
            onUpdatesClick={() => navigateTo({ tab: NavigationTab.Updates })} 
            onOpenAdmin={() => navigateTo({ tab: NavigationTab.Admin })}
            isOwnProfile={currentUser.id === targetUser.id} 
            onRequestGPS={requestGPS}
            onShowDetail={(id) => navigateTo({ detailCatchId: id, viewingUserId: undefined })}
          />
        );
      }
    }

    switch (viewState.tab) {
      case NavigationTab.Home: return <HomeScreen users={users} catches={catches} currentUser={currentUser} unreadCount={notifications.filter(n => !n.isRead).length} onShowDetail={(id) => navigateTo({ detailCatchId: id })} onShowAll={() => navigateTo({ tab: NavigationTab.Catches })} onProfileClick={() => navigateTo({ tab: NavigationTab.Profile })} onOpenAI={() => navigateTo({ tab: NavigationTab.AI })} onNotificationsClick={() => navigateTo({ tab: NavigationTab.Notifications })} onOpenEco={() => navigateTo({ tab: NavigationTab.EcoMap })} onNavigateToRankings={() => navigateTo({ tab: NavigationTab.Rankings })} onRequestGPS={requestGPS} onFaqClick={() => navigateTo({ tab: NavigationTab.FAQs })} onUpdatesClick={() => navigateTo({ tab: NavigationTab.Updates })} />;
      case NavigationTab.Catches: return <MyCatchesScreen catches={catches.filter(c => c.userId === currentUser.id)} onShowDetail={(id) => navigateTo({ detailCatchId: id })} onDeleteCatch={() => {}} />;
      case NavigationTab.Add: return <AddCatchScreen user={currentUser} competitions={competitions} onSave={handleSaveCatch} onClose={goBack} onSuccess={() => navigateTo({ tab: NavigationTab.Catches })} />;
      case NavigationTab.Rankings: return <RankingsScreen users={users} catches={catches} competitions={competitions} currentUser={currentUser} onUserClick={(uid) => navigateTo({ viewingUserId: uid })} onCompetitionClick={(id) => navigateTo({ detailCompetitionId: id })} onCatchClick={(id) => navigateTo({ detailCatchId: id })} />;
      case NavigationTab.Community: return <CommunityScreen users={users} catches={catches.filter(c => c.verificationStatus === 'verified')} currentUser={currentUser} onStartChat={(uid) => navigateTo({ tab: NavigationTab.Chat, activeChatUserId: uid })} onShowDetail={(id) => navigateTo({ detailCatchId: id })} onShowProfile={(uid) => navigateTo({ viewingUserId: uid })} />;
      case NavigationTab.Chat: return <ChatScreen currentUserId={currentUser.id} targetUserId={viewState.activeChatUserId || ""} onBack={goBack} />;
      case NavigationTab.Profile: return <ProfileScreen user={currentUser} catches={catches} ecoPoints={currentUser.ecoPoints} onBack={goBack} onShowDetail={(id) => navigateTo({ detailCatchId: id })} onLogout={() => signOut(auth)} onSupportClick={() => {}} onLegislationClick={() => navigateTo({ tab: NavigationTab.Legislation })} onFaqClick={() => navigateTo({ tab: NavigationTab.FAQs })} onUpdatesClick={() => navigateTo({ tab: NavigationTab.Updates })} onOpenAdmin={() => navigateTo({ tab: NavigationTab.Admin })} isOwnProfile={true} onRequestGPS={requestGPS} />;
      case NavigationTab.AI: return <AiAssistantScreen onBack={goBack} />;
      case NavigationTab.Notifications: return <NotificationsScreen notifications={notifications} onBack={goBack} onNotificationClick={(n) => navigateTo({ detailCatchId: n.relatedId })} onMarkAllRead={() => {}} />;
      case NavigationTab.EcoMap: return <EcoMonitoringScreen currentUser={currentUser} onBack={goBack} onAddPoints={async (p) => { await updateDoc(doc(db, "users", currentUser.id), { ecoPoints: increment(p) }); }} />;
      case NavigationTab.Legislation: return <LegislationScreen onBack={goBack} />;
      case NavigationTab.FAQs: return <FaqScreen onBack={goBack} />;
      case NavigationTab.Updates: return <UpdatesScreen onBack={goBack} />;
      case NavigationTab.Admin: return (
        <AdminScreen 
          catches={catches} 
          ecoReports={ecoReports} 
          supportTickets={[]} 
          competitions={competitions} 
          maintenanceActive={maintenanceModeActive}
          onToggleMaintenance={async (active) => {
            await setDoc(doc(db, "settings", "global"), { maintenanceMode: active });
          }}
          onVerifyCatch={async (id, approve) => { 
            const catchRef = doc(db, "catches", id);
            await updateDoc(catchRef, { 
              verificationStatus: approve ? 'verified' : 'rejected',
              isSuspicious: false 
            });
          }} 
          onVerifyEcoReport={async (report, approve) => {
            const reportRef = doc(db, "ecoReports", report.id);
            await updateDoc(reportRef, { status: approve ? 'verified' : 'rejected' });
            if (approve) {
                await updateDoc(doc(db, "users", report.userId), { ecoPoints: increment(report.rewardValue) });
            }
          }}
          onResolveTicket={() => {}} 
          onCreateCompetition={async (comp) => { await addDoc(collection(db, "competitions"), comp); }} 
          onBack={goBack} 
        />
      );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen text-white select-none overflow-hidden bg-[#112a23]">
      <main className="flex-1 relative overflow-hidden">{renderScreen()}</main>

      {/* BETA NOTICE MODAL */}
      {showBetaNotice && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-[#0a1814]/98 backdrop-blur-xl animate-fade-in" onClick={() => setShowBetaNotice(false)}></div>
           <div className="relative bg-[#1a3d32] rounded-[48px] p-10 border border-[#d97706]/30 shadow-[0_40px_80px_rgba(0,0,0,0.8)] animate-slide-up max-w-sm text-center overflow-hidden">
              <div className="absolute -right-8 -top-8 opacity-5 rotate-12"><AlertOctagon className="w-32 h-32 text-white" /></div>
              <div className="w-16 h-16 bg-[#d97706]/20 rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-[#d97706]/30 shadow-xl">
                 <AlertOctagon className="w-8 h-8 text-[#d97706]" />
              </div>
              <h2 className="text-2xl font-black italic uppercase text-[#f5f5f0] mb-4 tracking-tighter">Skúšobná prevádzka</h2>
              <p className="text-xs text-[#d1d1c7]/60 mb-8 leading-relaxed italic px-2 font-medium">
                Vitajte v Beta verzii aplikácie ZÁBER. <br/><br/>
                Upozornenie: Toto je testovacia fáza. Všetky záznamy, úlovky a profilové dáta budú pri prechode na produkčnú verziu **nenávratne vymazané**.
              </p>
              <button onClick={() => setShowBetaNotice(false)} className="w-full bg-[#d97706] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3">
                 Vstúpiť do revíru <ArrowRight className="w-4 h-4" />
              </button>
           </div>
        </div>
      )}

      {showPermissionModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowPermissionModal(false)}></div>
           <div className="relative bg-[#1a3d32] rounded-[44px] p-10 border border-[#d97706]/30 shadow-2xl animate-slide-up max-sm text-center">
              <MapPin className="w-12 h-12 text-[#d97706] mx-auto mb-6" />
              <h2 className="text-2xl font-black italic uppercase text-white mb-4 leading-none tracking-tight">Poloha nie je zdieľaná</h2>
              <p className="text-sm text-[#d1d1c7] mb-8 leading-relaxed italic">Pre automatické určenie revíru povoľte GPS polohu.</p>
              <button onClick={() => { setShowPermissionModal(false); requestGPS(); }} className="w-full bg-[#d97706] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest">Aktualizovať prístup</button>
           </div>
        </div>
      )}
      {!['Chat', 'AI', 'Add', 'Notifications', 'EcoMap', 'Admin', 'Legislation', 'FAQs', 'Updates'].includes(viewState.tab) && !viewState.detailCatchId && !viewState.detailCompetitionId && !viewState.viewingUserId && (
        <BottomNav activeTab={viewState.tab} onNavigate={(tab) => navigateTo({ tab })} />
      )}
    </div>
  );
};

export default App;