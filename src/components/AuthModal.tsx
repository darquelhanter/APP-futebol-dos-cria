import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { loginWithGoogle, logoutUser } from '../lib/firebase';
import { Player } from '../types';
import { X, LogIn, LogOut, CheckCircle2, ShieldCheck, Sparkles, User, Cloud, RefreshCw, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  players: Player[];
  onAddPlayer?: (player: Player) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  players,
  onAddPlayer,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justLinked, setJustLinked] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      // Auto close or show profile
    } catch (err: any) {
      console.error(err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Não foi possível autenticar com o Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const existingPlayer = players.find(
    (p) => p.name.toLowerCase() === currentUser?.displayName?.toLowerCase()
  );

  const handleCreateOrLinkPlayer = () => {
    if (!currentUser || existingPlayer || !onAddPlayer) return;

    const newPlayer: Player = {
      id: `player-google-${currentUser.uid.slice(0, 8)}`,
      name: currentUser.displayName || 'Jogador Google',
      nickname: currentUser.displayName?.split(' ')[0] || 'Cria',
      photoUrl: currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
      position: 'MID',
      type: 'mensalista',
      overall: 80,
      pace: 78,
      shoot: 75,
      pass: 82,
      dribble: 80,
      def: 70,
      physical: 74,
      dominantFoot: 'destro',
      phone: '(11) 99999-9999',
      active: true,
      matchesCount: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      mvpCount: 0,
      bagreCount: 0,
      averageRating: 8.0,
      ratingsCount: 1,
      lastRatings: [8.0],
      badges: ['Visão de Jogo', 'Passe Curto', 'Motorzinho'],
    };

    onAddPlayer(newPlayer);
    setJustLinked(true);
    setTimeout(() => setJustLinked(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="auth-modal-card"
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/30 overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          /* Logged In View */
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Usuário'}
                  className="w-20 h-20 rounded-full border-2 border-emerald-500 shadow-lg shadow-emerald-500/20 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-600/30 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 text-3xl font-black">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full border-2 border-slate-900">
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              </div>
            </div>

            <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              Conta Conectada com Gmail
            </span>

            <h3 className="text-xl font-bold text-white mb-1">
              {currentUser.displayName || 'Jogador dos Cria'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">{currentUser.email}</p>

            {/* Cloud Sync Status Card */}
            <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 mb-5 text-left flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-200">Sincronização em Nuvem Ativa</h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Suas peladas, escalações, pagamentos e estatísticas estão sincronizados com sua conta Google e acessíveis em qualquer celular ou computador.
                </p>
              </div>
            </div>

            {/* Player Card Integration */}
            {onAddPlayer && !existingPlayer && (
              <div className="w-full bg-gradient-to-r from-slate-950 to-slate-900 border border-amber-500/30 rounded-2xl p-4 mb-5 text-left">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Criar Minha Carta no Elenco</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Adicione sua própria carta estilo FUT ao elenco com sua foto e nome da conta Google.
                </p>
                <button
                  onClick={handleCreateOrLinkPlayer}
                  disabled={justLinked}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {justLinked ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Carta Criada com Sucesso!
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" /> Gerar Minha Carta Agora
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        ) : (
          /* Log In Request View */
          <div className="text-center">
            {/* Header Icon */}
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/20 mb-4 border border-emerald-400/40">
              ⚽
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight mb-2 font-['Teko',sans-serif] uppercase tracking-wider text-3xl leading-none">
              Entrar no Futebol dos Cria
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed max-w-sm mx-auto">
              Conecte sua conta do <strong>Gmail / Google</strong> para salvar suas peladas na nuvem, participar de sorteios, acompanhar suas estatísticas e sincronizar no celular.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              id="btn-google-login-action"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-bold text-sm shadow-xl shadow-white/5 transition-all flex items-center justify-center gap-3 border border-slate-200 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-slate-700" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>{loading ? 'Conectando...' : 'Continuar com o Google (Gmail)'}</span>
            </button>

            {/* Features summary */}
            <div className="grid grid-cols-2 gap-2 mt-6 pt-6 border-t border-slate-800 text-left">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Login Seguro via Google</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Backup Automático</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Perfil de Atleta</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <User className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Votações & MVP</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
