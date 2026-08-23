import React, { useState, useEffect, useRef } from 'react';
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
  subscribeToCloudPeladas,
  subscribeToCloudPlayers,
  deletePlayerProfileFromCloud,
  clearCloudData,
  logoutUser,
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
  LogOut,
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

  // Guards so cloud snapshots we just applied locally don't get echoed straight
  // back to Firestore by the sync-to-cloud effects below (sync loop prevention).
  const isApplyingRemotePlayers = useRef(false);
  const isApplyingRemotePeladas = useRef(false);
  const hasWipedMockData = useRef(false);

  // The whole roster lives in a single Firestore document (players is one
  // array field), so writing it before we've actually seen what's already
  // there would silently replace everyone else's cards with whatever this
  // device had loaded so far. Block writes until the first real snapshot
  // arrives, and fold in any player created locally in that brief window
  // instead of discarding it.
  const hasReceivedCloudPlayers = useRef(false);

  const wipeMockData = async () => {
    if (hasWipedMockData.current) return;
    hasWipedMockData.current = true;
    await clearCloudData();
    setPlayers([]);
    setPeladas([]);
    setCurrentPeladaId('');
    setNotifications([]);
    clearAllData();
  };

  // Firebase Auth listener + real-time cloud sync (peladas/players created by
  // other users show up live, without needing to reload or log in again).
  useEffect(() => {
    checkRedirectLogin();
    let unsubscribePeladas: (() => void) | undefined;
    let unsubscribePlayers: (() => void) | undefined;

    const unsubscribeAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
      setAuthChecking(false);

      unsubscribePeladas?.();
      unsubscribePlayers?.();
      unsubscribePeladas = undefined;
      unsubscribePlayers = undefined;
      hasReceivedCloudPlayers.current = false;

      if (user) {
        setIsCloudSynced(true);

        unsubscribePlayers = subscribeToCloudPlayers((cloudPlayers) => {
          const isMockPlayers = cloudPlayers.some((p) => p.id === 'p1' || p.name === 'Carlos Eduardo');
          if (isMockPlayers) {
            wipeMockData();
            return;
          }

          if (!hasReceivedCloudPlayers.current) {
            hasReceivedCloudPlayers.current = true;
            // Merge in anything created locally before this first snapshot
            // landed (e.g. a profile saved in the first second after login),
            // instead of either discarding it or letting it wipe the cloud.
            setPlayers((prevLocal) => {
              const cloudIds = new Set(cloudPlayers.map((p) => p.id));
              const localOnly = prevLocal.filter((p) => !cloudIds.has(p.id));
              const merged = [...cloudPlayers, ...localOnly];
              if (localOnly.length === 0) {
                isApplyingRemotePlayers.current = true;
              }
              return merged;
            });
            return;
          }

          isApplyingRemotePlayers.current = true;
          setPlayers(cloudPlayers);
        });

        unsubscribePeladas = subscribeToCloudPeladas((cloudPeladas) => {
          const isMockPelada = cloudPeladas.some((p) => p.id === 'pelada-next');
          if (isMockPelada) {
            wipeMockData();
            return;
          }

          // Legacy peladas synced before creatorUid/creatorEmail existed have no
          // recorded owner. Claim them for whoever opens the app next, once,
          // instead of granting creator/admin rights to every visitor (security fix).
          const repairedPeladas = cloudPeladas.map((p) => {
            if (!p.creatorUid && !p.creatorEmail) {
              const claimed: Pelada = {
                ...p,
                creatorUid: user.uid,
                creatorEmail: user.email || '',
                creatorName: user.displayName || 'Organizador',
              };
              syncPeladaToCloud(claimed);
              return claimed;
            }
            return p;
          });

          isApplyingRemotePeladas.current = true;
          setPeladas(repairedPeladas);
          setCurrentPeladaId((prevId) => {
            if (repairedPeladas.length > 0 && !repairedPeladas.find((p) => p.id === prevId)) {
              return repairedPeladas[0].id;
            }
            return prevId;
          });
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribePeladas?.();
      unsubscribePlayers?.();
    };
  }, []);

  // Sync to storage and cloud on updates (skipped when the change just came
  // down from the real-time cloud listeners above).
  useEffect(() => {
    savePlayersToStorage(players);
    if (isApplyingRemotePlayers.current) {
      isApplyingRemotePlayers.current = false;
      return;
    }
    if (currentUser && players.length > 0 && hasReceivedCloudPlayers.current) {
      syncPlayersToCloud(players);
    }
  }, [players, currentUser]);

  useEffect(() => {
    savePeladasToStorage(peladas);
    if (isApplyingRemotePeladas.current) {
      isApplyingRemotePeladas.current = false;
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
        alert(
          `Não foi possível salvar as alterações na nuvem${result.error ? `: ${result.error}` : '.'} ` +
          'Elas ficaram salvas apenas neste dispositivo por enquanto.'
        );
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
        alert(
          `Não foi possível salvar a pelada na nuvem${result.error ? `: ${result.error}` : '.'} ` +
          'Ela ficou salva apenas neste dispositivo por enquanto.'
        );
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

  // Find the logged in user's linked player profile.
  // Matched only by uid/email (both set once, by this same account, via
  // handleSaveUserProfile) — matching by display name would link this
  // account to anyone else's card that happens to share the same name.
  const myLinkedPlayer = players.find((p) => {
    if (currentUser?.uid && p.userId === currentUser.uid) return true;
    if (currentUser?.email && p.userEmail === currentUser.email) return true;
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
      deletePlayerProfileFromCloud(playerId);
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
      <div className="min-h-screen bg-gramado flex flex-col items-center justify-center text-giz font-sans">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-capim via-capim-light to-refletor flex items-center justify-center shadow-xl shadow-capim/20 text-3xl mb-4 animate-bounce">
          ⚽
        </div>
        <div className="flex items-center gap-2.5 text-sm font-bold text-giz/70">
          <RefreshCw className="w-4 h-4 text-refletor animate-spin" />
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
    <div className="min-h-screen text-giz flex flex-col selection:bg-refletor selection:text-gramado font-sans pb-20 sm:pb-0">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-gramado/90 backdrop-blur-md border-b chalk-divider">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
            {/* Logo and Brand */}
            <div
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer"
              onClick={() => setActiveTab('overview')}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-capim via-capim-light to-refletor flex items-center justify-center shadow-lg shadow-capim/20 text-2xl border border-refletor/30 shrink-0">
                ⚽
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-lg sm:text-2xl font-black text-giz tracking-tight flex items-center gap-1.5 font-display uppercase tracking-wider text-2xl sm:text-3xl leading-none">
                    Futebol dos Cria
                  </h1>
                  <span className="hidden md:inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-capim/20 text-capim-light border border-capim/30">
                    Autorizado
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-giz/50 font-medium hidden sm:block">
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
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-capim/20 to-refletor/10 hover:from-capim/30 hover:to-refletor/20 border border-capim/40 text-capim-light text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 animate-pulse hover:animate-none"
                  title="Baixar e Instalar Aplicativo no Celular"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-capim-light" />
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
                    : 'bg-gradient-to-r from-amber-500/25 to-capim/25 hover:from-amber-500/35 hover:to-capim/35 border-amber-500/50 text-giz shadow-amber-500/10'
                }`}
                title="Criar ou Personalizar Meu Perfil Oficial de Jogador"
              >
                {myLinkedPlayer ? (
                  <>
                    <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                    <span>Meu Perfil</span>
                    <span className="bg-amber-400 text-gramado px-1.5 py-0.2 rounded font-black text-[10px] font-mono">
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
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-gramado-card hover:bg-gramado-light border border-capim/30 shadow-sm transition-all text-left"
                title="Perfil Google Conectado"
              >
                <div className="relative">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Jogador'}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-capim-light object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-capim text-giz font-bold flex items-center justify-center text-xs">
                      {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-refletor border-2 border-gramado-card" />
                </div>
                <div className="hidden md:block">
                  <div className="text-[11px] font-bold text-giz/90 leading-tight truncate max-w-[100px]">
                    {currentUser.displayName?.split(' ')[0] || 'Jogador'}
                  </div>
                  <div className="text-[9px] text-capim-light font-bold flex items-center gap-1">
                    <Cloud className="w-2.5 h-2.5" /> Sincronizado
                  </div>
                </div>
              </button>

              {/* Sign Out Button */}
              <button
                id="header-btn-logout"
                onClick={() => {
                  if (window.confirm('Deseja realmente sair da sua conta?')) {
                    logoutUser();
                  }
                }}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gramado-card hover:bg-red-500/20 border border-giz/10 hover:border-red-500/40 text-giz/50 hover:text-red-400 transition-colors"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Privileges & Access Control Button */}
              {currentPelada && (
                <button
                  id="header-btn-privileges"
                  onClick={() => setIsPrivilegesModalOpen(true)}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isPeladaCreator(currentPelada, currentUser)
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-gramado-card hover:bg-gramado-light border-giz/15 text-giz/70'
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
                  className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-capim/40 bg-capim/10 hover:bg-capim/20 text-capim-light text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Editar Dados da Pelada (Horários, Local, Valores)"
                >
                  <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-capim-light" />
                  <span className="hidden lg:inline">Editar Pelada</span>
                </button>
              )}

              {/* Pelada Selector Dropdown */}
              {peladas.length > 1 && (
                <div className="relative hidden md:block">
                  <select
                    value={currentPeladaId}
                    onChange={(e) => setCurrentPeladaId(e.target.value)}
                    className="bg-gramado-card border border-giz/15 text-xs font-bold text-giz/90 rounded-xl px-3 py-2 pr-7 focus:outline-none focus:border-capim appearance-none cursor-pointer"
                  >
                    {peladas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.date})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-giz/50 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Notification Button */}
              <button
                id="header-btn-notifications"
                onClick={() => setIsNotificationsModalOpen(true)}
                className="relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gramado-card hover:bg-gramado-light border border-giz/10 text-giz/60 hover:text-refletor transition-colors"
                title="Central de Notificações Automáticas"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-refletor text-gramado font-black text-[9px] font-mono flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Clear Data Button (Quick Action) */}
              <button
                id="header-btn-clear-data"
                onClick={handleClearAllData}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gramado-card hover:bg-red-500/20 border border-giz/10 hover:border-red-500/40 text-giz/50 hover:text-red-400 transition-colors"
                title="Limpar todos os dados do app"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* New Pelada Button */}
              <button
                id="header-btn-new-pelada"
                onClick={() => setIsNewPeladaModalOpen(true)}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-capim hover:bg-capim-light text-giz rounded-xl sm:rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-capim/20 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Nova Pelada</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar (Desktop and Tablet) */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 border-t chalk-divider no-scrollbar">
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
                      ? 'bg-capim text-gramado shadow-md shadow-capim/30'
                      : 'text-giz/50 hover:text-giz hover:bg-gramado-card'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black font-mono ${
                        isActive ? 'bg-gramado text-refletor' : 'bg-gramado-card text-giz/60'
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
            currentUser={currentUser}
            onUpdatePelada={handleUpdateCurrentPelada}
            onAddPlayer={(newPlayer) => setPlayers((prev) => [...prev, newPlayer])}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
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
            currentUser={currentUser}
          />
        )}

        {activeTab === 'placar' && (
          <LiveScoreboard
            pelada={currentPelada}
            allPlayers={players}
            onUpdatePelada={handleUpdateCurrentPelada}
            onUpdatePlayers={setPlayers}
            onSelectPlayer={(p) => setSelectedPlayer(p)}
            currentUser={currentUser}
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
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-gramado/95 backdrop-blur-xl border-t chalk-divider px-2 py-1.5 flex items-center justify-around safe-area-pb">
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
                isActive ? 'text-refletor font-bold' : 'text-giz/40 hover:text-giz/70'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-refletor' : ''}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer with Reset and Quick links */}
      <footer className="border-t chalk-divider bg-gramado/60 py-6 text-xs text-giz/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">⚽</span>
            <span className="font-bold text-giz/70">Futebol dos Cria</span>
            <span>• O Hub definitivo para Peladas, Gestão Financeira & Rankings</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="text-refletor hover:text-capim-light flex items-center gap-1 font-bold transition-colors"
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
              className="text-giz/40 hover:text-giz/60 flex items-center gap-1 transition-colors"
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
