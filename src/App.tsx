import React, { useState, useEffect } from 'react';
import { Pelada, Player, MatchGame, Team, NotificationLog } from './types';
import {
  loadPeladasFromStorage,
  savePeladasToStorage,
  loadPlayersFromStorage,
  savePlayersToStorage,
  loadNotificationsFromStorage,
  saveNotificationsToStorage,
  clearAllData,
  resetToInitialData,
} from './utils/storage';
import { initialPelada, initialPlayers, initialNotifications } from './data/initialData';
import {
  auth,
  subscribeToAuth,
  checkRedirectLogin,
  syncPeladaToCloud,
  syncAllPeladasToCloud,
  deletePeladaFromCloud,
  syncPlayersToCloud,
  fetchCloudData,
  clearCloudData,
  subscribeToCloudPeladas,
  subscribeToCloudPlayers,
} from './lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

// Icons
import {
  LayoutDashboard,
  Users,
  Shuffle,
  Clock,
  DollarSign,
  Star,
  Trophy,
  Bell,
  Plus,
  Flame,
  Shield,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Download,
  Smartphone,
  LogIn,
  CheckCircle2,
  Cloud,
  User,
  Trash2,
  Lock,
  RefreshCw,
  Edit3,
  Crown,
} from 'lucide-react';

// Components
import { DashboardOverview } from './components/DashboardOverview';
import { AttendanceManager } from './components/AttendanceManager';
import { TeamDrawer } from './components/TeamDrawer';
import { LiveScoreboard } from './components/LiveScoreboard';
import { FinancesManager } from './components/FinancesManager';
import { PostMatchEvaluation } from './components/PostMatchEvaluation';
import { LeaderboardView } from './components/LeaderboardView';
import { PlayersManager } from './components/PlayersManager';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { NotificationsModal } from './components/NotificationsModal';
import { NewPeladaModal } from './components/NewPeladaModal';
import { EditPeladaModal } from './components/EditPeladaModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AuthModal } from './components/AuthModal';
import { InstallAppModal } from './components/InstallAppModal';
import { PrivilegesModal } from './components/PrivilegesModal';
import { AuthGate } from './components/AuthGate';
import { isPeladaCreator, isPeladaAdmin } from './utils/permissions';

export const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>(() => loadPlayersFromStorage());
  const [peladas, setPeladas] = useState<Pelada[]>(() => loadPeladasFromStorage());
  const [currentPeladaId, setCurrentPeladaId] = useState<string>(() => {
    const loaded = loadPeladasFromStorage();
    return loaded[0]?.id || '';
  });
  const [notifications, setNotifications] = useState<NotificationLog[]>(() => loadNotificationsFromStorage());

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isNewPeladaModalOpen, setIsNewPeladaModalOpen] = useState(false);
  const [isEditPeladaModalOpen, setIsEditPeladaModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isPrivilegesModalOpen, setIsPrivilegesModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Check PWA mode & listen to beforeinstallprompt
  useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!checkStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Flags to avoid echoing cloud-originated updates straight back to the cloud
  const isApplyingCloudPlayers = React.useRef(false);
  const isApplyingCloudPeladas = React.useRef(false);

  // Firebase Auth listener and one-time cloud bootstrap (handles legacy mock-data wipe)
  useEffect(() => {
    checkRedirectLogin();
    const unsubscribe = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
      if (user) {
        setIsCloudSynced(true);
        // Fetch cloud data once to check for legacy mock data that needs wiping
        const cloudData = await fetchCloudData();

        // If cloud contains legacy mock data (e.g. 'p1' or 'pelada-next'), auto wipe it
        const isMockPlayers = cloudData?.players?.some((p) => p.id === 'p1' || p.name === 'Carlos Eduardo');
        const isMockPelada = cloudData?.peladas?.some((p) => p.id === 'pelada-next');

        if (isMockPlayers || isMockPelada) {
          await clearCloudData();
          setPlayers([]);
          setPeladas([]);
          setCurrentPeladaId('');
          setNotifications([]);
          clearAllData();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time listeners: keep peladas & players in sync with Firestore as soon as
  // anyone (you, on another device, or a teammate) creates/updates them.
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribePlayers = subscribeToCloudPlayers((cloudPlayers) => {
      isApplyingCloudPlayers.current = true;
      setPlayers(cloudPlayers);
    });

    const unsubscribePeladas = subscribeToCloudPeladas((cloudPeladas) => {
      isApplyingCloudPeladas.current = true;
      setPeladas(cloudPeladas);
      setCurrentPeladaId((prev) => {
        if (cloudPeladas.length === 0) return '';
        if (cloudPeladas.find((p) => p.id === prev)) return prev;
        return cloudPeladas[0].id;
      });
    });

    return () => {
      unsubscribePlayers();
      unsubscribePeladas();
    };
  }, [currentUser]);

  // Sync to storage and cloud on updates
  useEffect(() => {
    savePlayersToStorage(players);
    if (isApplyingCloudPlayers.current) {
      isApplyingCloudPlayers.current = false;
      return;
    }
    if (currentUser && players.length > 0) {
      syncPlayersToCloud(players);
    }
  }, [players, currentUser]);

  useEffect(() => {
    savePeladasToStorage(peladas);
    if (isApplyingCloudPeladas.current) {
      isApplyingCloudPeladas.current = false;
      return;
    }
    if (currentUser && peladas.length > 0) {
      syncAllPeladasToCloud(peladas);
    }
  }, [peladas, currentUser]);

  useEffect(() => {
    saveNotificationsToStorage(notifications);
  }, [notifications]);

  // Current active pelada
  const currentPelada = peladas.find((p) => p.id === currentPeladaId) || peladas[0] || null;

  const handleUpdateCurrentPelada = async (updatedPelada: Pelada) => {
    setPeladas((prev) => prev.map((p) => (p.id === updatedPelada.id ? updatedPelada : p)));
    if (currentUser) {
      const result = await syncPeladaToCloud(updatedPelada);
      if (!result.success) {
        alert(`⚠️ Não foi possível salvar as alterações na nuvem (erro: ${result.error}). Suas mudanças ficaram salvas só neste dispositivo por enquanto.`);
      }
    }
  };

  const handleCreatePelada = async (newPelada: Pelada) => {
    setPeladas((prev) => [newPelada, ...prev]);
    setCurrentPeladaId(newPelada.id);
    setActiveTab('overview');
    if (currentUser) {
      const result = await syncPeladaToCloud(newPelada);
      if (!result.success) {
        alert(`⚠️ A pelada foi criada, mas não foi possível salvá-la na nuvem (erro: ${result.error}). Ela pode sumir ao recarregar a página ou não aparecer em outros dispositivos.`);
      }
    }
  };

  const handleAddPlayer = (newPlayer: Player) => {
    setPlayers((prev) => [...prev, newPlayer]);
    if (currentPelada) {
      handleUpdateCurrentPelada({
        ...currentPelada,
        confirmedPlayers: [
          ...currentPelada.confirmedPlayers,
          {
            playerId: newPlayer.id,
            status: newPlayer.type === 'mensalista' ? 'confirmed' : 'pending',
            paymentStatus: 'pending',
            paidAmount: 0,
          },
        ],
      });
    }
  };

  const handleSaveUserProfile = (savedPlayer: Player) => {
    setPlayers((prev) => {
      const exists = prev.some((p) => p.id === savedPlayer.id);
      if (exists) {
        return prev.map((p) => (p.id === savedPlayer.id ? savedPlayer : p));
      } else {
        return [...prev, savedPlayer];
      }
    });

    if (selectedPlayer?.id === savedPlayer.id) {
      setSelectedPlayer(savedPlayer);
    }

    // If current active pelada exists, ensure player is on the list
    if (currentPelada) {
      const isAlreadyInPelada = currentPelada.confirmedPlayers.some(
        (cp) => cp.playerId === savedPlayer.id
      );
      if (!isAlreadyInPelada) {
        handleUpdateCurrentPelada({
          ...currentPelada,
          confirmedPlayers: [
            ...currentPelada.confirmedPlayers,
            {
              playerId: savedPlayer.id,
              status: savedPlayer.type === 'mensalista' ? 'confirmed' : 'pending',
              paymentStatus: 'pending',
              paidAmount: 0,
            },
          ],
        });
      }
    }
  };

  // Find the logged in user's linked player profile
  const myLinkedPlayer = players.find((p) => {
    if (currentUser?.uid && p.userId === currentUser.uid) return true;
    if (currentUser?.email && p.userEmail === currentUser.email) return true;
    if (currentUser?.displayName && p.name.toLowerCase() === currentUser.displayName.toLowerCase()) return true;
    return false;
  });

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers((prev) => prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p)));
    if (selectedPlayer?.id === updatedPlayer.id) {
      setSelectedPlayer(updatedPlayer);
    }
  };

  const handleDeletePlayer = (playerId: string) => {
    if (!isPeladaCreator(currentPelada, currentUser)) {
      alert('Apenas quem criou a pelada tem permissão para excluir atletas do elenco!');
      return;
    }

    const updatedPlayers = players.filter((p) => p.id !== playerId);
    setPlayers(updatedPlayers);
    if (selectedPlayer?.id === playerId) {
      setSelectedPlayer(null);
    }

    // Remove from peladas confirmed players
    setPeladas((prev) =>
      prev.map((pel) => ({
        ...pel,
        confirmedPlayers: pel.confirmedPlayers.filter((cp) => cp.playerId !== playerId),
      }))
    );

    if (currentUser) {
      syncPlayersToCloud(updatedPlayers);
    }
  };

  const handleDeletePelada = (peladaId: string) => {
    const peladaToDelete = peladas.find((p) => p.id === peladaId);
    if (!isPeladaCreator(peladaToDelete, currentUser)) {
      alert('Apenas quem criou esta pelada tem permissão para excluí-la!');
      return;
    }

    const updated = peladas.filter((p) => p.id !== peladaId);
    setPeladas(updated);
    if (currentPeladaId === peladaId) {
      setCurrentPeladaId(updated[0]?.id || '');
    }
    if (currentUser) {
      deletePeladaFromCloud(peladaId);
      syncAllPeladasToCloud(updated);
    }
  };

  const handleAddNotification = (notif: NotificationLog) => {
    setNotifications((prev) => [notif, ...prev]);
  };

  // Clear all data to fresh empty state
  const handleClearAllData = async () => {
    if (peladas.length > 0 && !isPeladaCreator(currentPelada, currentUser)) {
      alert('Apenas quem criou a pelada tem permissão para limpar ou excluir os dados do aplicativo!');
      return;
    }

    if (window.confirm('⚠️ Tem certeza que deseja LIMPAR TODOS OS DADOS do aplicativo? O app ficará totalmente zerado para você cadastrar sua pelada e jogadores.')) {
      clearAllData();
      setPlayers([]);
      setPeladas([]);
      setCurrentPeladaId('');
      setNotifications([]);
      if (currentUser) {
        await clearCloudData();
      }
      setActiveTab('overview');
    }
  };

  // Restore sample demo data
  const handleResetDemoData = () => {
    if (window.confirm('Deseja carregar dados de exemplo (demonstração) do Futebol dos Cria?')) {
      resetToInitialData();
      setPlayers(initialPlayers);
      setPeladas([initialPelada]);
      setCurrentPeladaId(initialPelada.id);
      setNotifications(initialNotifications);
      if (currentUser) {
        syncPlayersToCloud(initialPlayers);
        syncAllPeladasToCloud([initialPelada]);
      }
      setActiveTab('overview');
    }
  };

  // If Auth is still initializing on first load
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 text-3xl mb-4 animate-bounce">
          ⚽
        </div>
        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-300">
          <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
          <span>Verificando autorização...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated/authorized, lock app behind AuthGate
  if (!currentUser) {
    return (
      <>
        <AuthGate
          onInstallClick={() => setIsInstallModalOpen(true)}
          isStandalone={isStandalone}
        />
        {isInstallModalOpen && (
          <InstallAppModal
            isOpen={isInstallModalOpen}
            onClose={() => setIsInstallModalOpen(false)}
            deferredPrompt={deferredPrompt}
            onInstalled={() => setIsStandalone(true)}
          />
        )}
      </>
    );
  }

  const unreadNotificationsCount = notifications.length;

  const navigationTabs = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    {
      id: 'presencas',
      label: 'Presenças',
      icon: Users,
      badge: currentPelada ? currentPelada.confirmedPlayers.filter((p) => p.status === 'confirmed').length : 0,
    },
    { id: 'sorteio', label: 'Sorteio & Times', icon: Shuffle },
    { id: 'placar', label: 'Placar ao Vivo', icon: Clock },
    { id: 'financeiro', label: 'Financeiro & PIX', icon: DollarSign },
    { id: 'avaliacao', label: 'Votação Pós-Jogo', icon: Star },
    { id: 'ranking', label: 'Rankings & Podiums', icon: Trophy },
    { id: 'elenco', label: 'Elenco (Cartas)', icon: Shield, badge: players.length },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans pb-20 sm:pb-0">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
            {/* Logo and Brand */}
            <div
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer"
              onClick={() => setActiveTab('overview')}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-2xl border border-emerald-400/40 shrink-0">
                ⚽
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-1.5 font-['Teko',sans-serif] uppercase tracking-wider text-2xl sm:text-3xl leading-none">
                                        Futebol dos Cria
                  </h1>
                  <span className="hidden md:inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Autorizado
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden sm:block">
                  Gestão Completa de Peladas, Sorteios, Financeiro & Rankings
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Install App Button (Download PWA) */}
              {!isStandalone && (
                <button
                  id="header-btn-install-app"
                  onClick={() => setIsInstallModalOpen(true)}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600/20 to-teal-500/20 hover:from-emerald-600/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 animate-pulse hover:animate-none"
                  title="Baixar e Instalar Aplicativo no Celular"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Baixar App</span>
                </button>
              )}

              {/* Create Profile / My Profile Button */}
              <button
                id="header-btn-user-profile-card"
                onClick={() => setIsUserProfileModalOpen(true)}
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border text-[11px] sm:text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                  myLinkedPlayer
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
                    : 'bg-gradient-to-r from-amber-500/25 to-emerald-500/25 hover:from-amber-500/35 hover:to-emerald-500/35 border-amber-500/50 text-white shadow-amber-500/10'
                }`}
                title="Criar ou Personalizar Meu Perfil Oficial de Jogador"
              >
                {myLinkedPlayer ? (
                  <>
                    <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                    <span>Meu Perfil</span>
                    <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[10px]">
                      {myLinkedPlayer.overall}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
                    <span>Criar Meu Perfil</span>
                  </>
                )}
              </button>

              {/* Connected Google Account Profile Button */}
              <button
                id="header-btn-user-profile"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 shadow-sm transition-all text-left"
                title="Perfil Google Conectado"
              >
                <div className="relative">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Jogador'}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-emerald-400 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                      {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                </div>
                <div className="hidden md:block">
                  <div className="text-[11px] font-bold text-slate-200 leading-tight truncate max-w-[100px]">
                    {currentUser.displayName?.split(' ')[0] || 'Jogador'}
                  </div>
                  <div className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                    <Cloud className="w-2.5 h-2.5" /> Sincronizado
                  </div>
                </div>
              </button>

              {/* Privileges & Access Control Button */}
              {currentPelada && (
                <button
                  id="header-btn-privileges"
                  onClick={() => setIsPrivilegesModalOpen(true)}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isPeladaCreator(currentPelada, currentUser)
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                  title="Gerenciar Privilégios & Administradores"
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                  <span className="hidden lg:inline">Privilégios</span>
                </button>
              )}

              {/* Edit Pelada Header Button for Admins */}
              {currentPelada && isPeladaAdmin(currentPelada, currentUser) && (
                <button
                  id="header-btn-edit-pelada"
                  onClick={() => setIsEditPeladaModalOpen(true)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Editar Dados da Pelada (Horários, Local, Valores)"
                >
                  <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                  <span className="hidden lg:inline">Editar Pelada</span>
                </button>
              )}

              {/* Pelada Selector Dropdown */}
              {peladas.length > 1 && (
                <div className="relative hidden md:block">
                  <select
                    value={currentPeladaId}
                    onChange={(e) => setCurrentPeladaId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl px-3 py-2 pr-7 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                  >
                    {peladas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.date})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Notification Button */}
              <button
                id="header-btn-notifications"
                onClick={() => setIsNotificationsModalOpen(true)}
                className="relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
                title="Central de Notificações Automáticas"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Clear Data Button (Quick Action) */}
              <button
                id="header-btn-clear-data"
                onClick={handleClearAllData}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-red-500/20 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors"
                title="Limpar todos os dados do app"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* New Pelada Button */}
              <button
                id="header-btn-new-pelada"
                onClick={() => setIsNewPeladaModalOpen(true)}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl sm:rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Nova Pelada</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar (Desktop and Tablet) */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 border-t border-slate-800/80 no-scrollbar">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isActive ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'overview' && (
          <DashboardOverview
            pelada={currentPelada}
            allPlayers={players}
            currentUser={currentUser}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onOpenNotifications={() => setIsNotificationsModalOpen(true)}
            onOpenNewPelada={() => setIsNewPeladaModalOpen(true)}
            onOpenPrivileges={() => setIsPrivilegesModalOpen(true)}
            onOpenEditPelada={() => setIsEditPeladaModalOpen(true)}
            onOpenUserProfile={() => setIsUserProfileModalOpen(true)}
            onDeletePelada={handleDeletePelada}
            onUpdatePelada={handleUpdateCurrentPelada}
          />
        )}

        {activeTab === 'presencas' && (
          <AttendanceManager
            pelada={currentPelada}
            allPlayers={players}
            onUpdatePelada={handleUpdateCurrentPelada}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onAddPlayer={(p) => setPlayers((prev) => [...prev, p])}
            onAddNotification={handleAddNotification}
            onOpenNewPelada={() => setIsNewPeladaModalOpen(true)}
            onOpenUserProfile={() => setIsUserProfileModalOpen(true)}
          />
        )}

        {activeTab === 'sorteio' && (
          <TeamDrawer
            pelada={currentPelada}
            allPlayers={players}
            onUpdatePelada={handleUpdateCurrentPelada}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        )}

        {activeTab === 'placar' && (
          <LiveScoreboard
            pelada={currentPelada}
            allPlayers={players}
            onUpdatePelada={handleUpdateCurrentPelada}
            onUpdatePlayers={setPlayers}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        )}

        {activeTab === 'financeiro' && (
          <FinancesManager
            pelada={currentPelada}
            allPlayers={players}
            currentUser={currentUser}
            onUpdatePelada={handleUpdateCurrentPelada}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        )}

        {activeTab === 'avaliacao' && (
          <PostMatchEvaluation
            pelada={currentPelada}
            allPlayers={players}
            onUpdatePelada={handleUpdateCurrentPelada}
            onUpdatePlayers={setPlayers}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
          />
        )}

        {activeTab === 'ranking' && (
          <LeaderboardView
            players={players}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onOpenUserProfile={() => setIsUserProfileModalOpen(true)}
          />
        )}

        {activeTab === 'elenco' && (
          <PlayersManager
            players={players}
            onAddPlayer={handleAddPlayer}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            onOpenUserProfile={() => setIsUserProfileModalOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-2 py-1.5 flex items-center justify-around safe-area-pb">
        {[
          { id: 'overview', label: 'Início', icon: LayoutDashboard },
          { id: 'presencas', label: 'Presenças', icon: Users },
          { id: 'sorteio', label: 'Sorteio', icon: Shuffle },
          { id: 'placar', label: 'Placar', icon: Clock },
          { id: 'financeiro', label: 'PIX', icon: DollarSign },
          { id: 'ranking', label: 'Ranking', icon: Trophy },
          { id: 'elenco', label: 'Elenco', icon: Shield },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-emerald-400' : ''}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer with Reset and Quick links */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">⚽</span>
            <span className="font-bold text-slate-400">Futebol dos Cria</span>
            <span>• O Hub definitivo para Peladas, Gestão Financeira & Rankings</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Baixar no Celular
            </button>
            <button
              onClick={handleClearAllData}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              title="Limpar todos os dados do app"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Dados
            </button>
            <button
              onClick={handleResetDemoData}
              className="text-slate-500 hover:text-slate-400 flex items-center gap-1 transition-colors"
              title="Restaurar dados de exemplo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Carregar Demo
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onUpdatePlayer={handleUpdatePlayer}
          onDeletePlayer={handleDeletePlayer}
          isCreator={isPeladaCreator(currentPelada, currentUser)}
        />
      )}

      {isNotificationsModalOpen && (
        <NotificationsModal
          isOpen={isNotificationsModalOpen}
          onClose={() => setIsNotificationsModalOpen(false)}
          notifications={notifications}
          pelada={currentPelada}
          allPlayers={players}
          onAddNotification={handleAddNotification}
        />
      )}

      {isNewPeladaModalOpen && (
        <NewPeladaModal
          isOpen={isNewPeladaModalOpen}
          onClose={() => setIsNewPeladaModalOpen(false)}
          allPlayers={players}
          currentUser={currentUser}
          onCreatePelada={handleCreatePelada}
        />
      )}

      {isEditPeladaModalOpen && currentPelada && (
        <EditPeladaModal
          isOpen={isEditPeladaModalOpen}
          onClose={() => setIsEditPeladaModalOpen(false)}
          pelada={currentPelada}
          currentUser={currentUser}
          onUpdatePelada={handleUpdateCurrentPelada}
        />
      )}

      {isPrivilegesModalOpen && (
        <PrivilegesModal
          isOpen={isPrivilegesModalOpen}
          onClose={() => setIsPrivilegesModalOpen(false)}
          pelada={currentPelada}
          currentUser={currentUser}
          allPlayers={players}
          onUpdatePelada={handleUpdateCurrentPelada}
        />
      )}

      {isUserProfileModalOpen && (
        <UserProfileModal
          isOpen={isUserProfileModalOpen}
          onClose={() => setIsUserProfileModalOpen(false)}
          currentUser={currentUser}
          players={players}
          currentPelada={currentPelada}
          onSavePlayer={handleSaveUserProfile}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          players={players}
          onAddPlayer={handleAddPlayer}
        />
      )}

      {isInstallModalOpen && (
        <InstallAppModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          deferredPrompt={deferredPrompt}
          onInstalled={() => setIsStandalone(true)}
        />
      )}
    </div>
  );
};

export default App;
