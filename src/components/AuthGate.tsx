import React, { useState } from 'react';
import { loginWithGoogle } from '../lib/firebase';
import {
  ShieldCheck,
  Lock,
  Sparkles,
  Users,
  Shuffle,
  DollarSign,
  Trophy,
  Download,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Smartphone
} from 'lucide-react';

interface AuthGateProps {
  onInstallClick?: () => void;
  isStandalone?: boolean;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onInstallClick, isStandalone }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Não foi possível autenticar com a conta Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gramado text-giz flex flex-col justify-between selection:bg-capim selection:text-gramado font-sans relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-capim/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 right-10 w-[400px] h-[400px] bg-barro/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar with Brand */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-capim via-capim to-barro flex items-center justify-center shadow-lg shadow-capim/20 text-2xl border border-capim-light/40 shrink-0">
            ⚽
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-giz tracking-tight flex items-center gap-1.5 font-['Teko',sans-serif] uppercase tracking-wider text-2xl sm:text-3xl leading-none">
              Futebol dos Cria
            </h1>
            <p className="text-[10px] text-capim-light font-bold uppercase tracking-wider">
              Área Restrita & Autorização
            </p>
          </div>
        </div>

        {!isStandalone && onInstallClick && (
          <button
            onClick={onInstallClick}
            className="px-3 py-1.5 rounded-xl bg-gramado-card hover:bg-gramado-light border border-gramado-light text-giz/70 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-capim-light" />
            <span className="hidden sm:inline">Baixar App no Celular</span>
            <span className="sm:hidden">Baixar App</span>
          </button>
        )}
      </header>

      {/* Center Auth Card */}
      <main className="w-full max-w-md mx-auto px-4 py-8 z-10 flex flex-col items-center text-center">
        <div
          id="auth-gate-container"
          className="w-full bg-gramado-card/90 border border-gramado-light backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-gramado-card/40 relative overflow-hidden"
        >
          {/* Top Lock Badge */}
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-capim to-barro flex items-center justify-center text-3xl shadow-xl shadow-capim/30 mb-5 border border-capim-light/40 relative">
            <ShieldCheck className="w-8 h-8 text-giz stroke-[2.2]" />
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gramado border-2 border-capim-light flex items-center justify-center">
              <Lock className="w-2.5 h-2.5 text-capim-light" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-capim/10 border border-capim/30 text-capim-light text-[11px] font-black uppercase tracking-wider mb-3">
            <Sparkles className="w-3 h-3" /> Acesso Protegido ao Grupo
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-giz font-['Teko',sans-serif] uppercase tracking-wider text-3xl sm:text-4xl leading-tight mb-2">
            Entrar com Gmail Autorizado
          </h2>

          <p className="text-xs sm:text-sm text-giz/70 mb-6 leading-relaxed">
            Para visualizar a lista de presenças, participar dos sorteios, conferir o ranking e registrar pagamentos, faça login com sua conta do <strong>Google (Gmail)</strong>.
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Google Login Button */}
          <button
            id="btn-gate-google-signin"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 px-5 bg-white hover:bg-giz text-gramado-card rounded-2xl font-black text-sm shadow-xl shadow-white/10 transition-all flex items-center justify-center gap-3 border border-giz/85 active:scale-95 disabled:opacity-50 group mb-6"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-giz/15" />
            ) : (
              <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
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
            <span>{loading ? 'Autenticando...' : 'Entrar com o Google (Gmail)'}</span>
          </button>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-5 border-t border-gramado-light text-left">
            <div className="p-2.5 rounded-2xl bg-gramado/60 border border-gramado-light/80 flex items-start gap-2">
              <Users className="w-4 h-4 text-capim-light shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-bold text-giz/85 leading-tight">Presenças & Vagas</div>
                <div className="text-[9px] text-giz/50 mt-0.5">Confirmação em tempo real</div>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-gramado/60 border border-gramado-light/80 flex items-start gap-2">
              <Shuffle className="w-4 h-4 text-barro shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-bold text-giz/85 leading-tight">Sorteio Balanceado</div>
                <div className="text-[9px] text-giz/50 mt-0.5">Equilíbrio por Overall</div>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-gramado/60 border border-gramado-light/80 flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-bold text-giz/85 leading-tight">Controle PIX</div>
                <div className="text-[9px] text-giz/50 mt-0.5">Mensalistas e diaristas</div>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-gramado/60 border border-gramado-light/80 flex items-start gap-2">
              <Trophy className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-bold text-giz/85 leading-tight">Ranking & MVP</div>
                <div className="text-[9px] text-giz/50 mt-0.5">Cartas estilo FUT</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile App Download teaser */}
        {!isStandalone && onInstallClick && (
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-giz/50">
            <Smartphone className="w-4 h-4 text-capim-light" />
            <span>Prefere no celular?</span>
            <button
              onClick={onInstallClick}
              className="text-capim-light font-bold hover:text-capim-light underline underline-offset-2"
            >
              Baixar aplicativo
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 py-4 text-center text-xs text-giz/35 z-10">
        Futebol dos Cria • Gestão de Peladas & Estatísticas • Acesso Seguro
      </footer>
    </div>
  );
};
