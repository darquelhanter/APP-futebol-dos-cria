import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Share2,
  PlusSquare,
  X,
  Sparkles,
  Zap,
  WifiOff,
  Shield,
  Layers,
  Copy,
  ExternalLink,
  QrCode,
  Globe,
  MessageCircle,
  Laptop,
  Check,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstalled?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled,
}) => {
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop'>('android');
  const [activeTab, setActiveTab] = useState<'qr' | 'link' | 'guide'>('qr');
  const [copied, setCopied] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    // Determine the best clean URL to share/install
    const currentHref = window.location.href.split('?')[0];
    setAppUrl(currentHref);

    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator.clipboard && appUrl) {
      navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(appUrl || window.location.href, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `⚽ *Futebol dos Cria* - Acesse e baixe nosso aplicativo no seu celular:\n${appUrl || window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setInstallSuccess(true);
          if (onInstalled) onInstalled();
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } catch (err) {
        console.warn('Native install prompt error:', err);
      }
    } else {
      // Direct opening in full browser tab where PWA is active
      handleOpenInNewTab();
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&bgcolor=020617&color=10b981&data=${encodeURIComponent(
    appUrl || window.location.href
  )}`;

  return (
    <div
      id="install-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gramado/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="install-modal-card"
        className="relative w-full max-w-xl bg-gramado-card border border-gramado-light rounded-3xl p-5 sm:p-7 shadow-2xl shadow-gramado-card/50 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow accents */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-capim/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-barro/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-giz/50 hover:text-giz rounded-full bg-gramado-light/60 hover:bg-gramado-light transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Logo */}
        <div className="flex items-center gap-3.5 mb-5 pr-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-capim via-capim to-barro p-0.5 shadow-xl shadow-capim/25 shrink-0 flex items-center justify-center border border-capim-light/50">
            <div className="w-full h-full bg-gramado rounded-[14px] flex flex-col items-center justify-center">
              <span className="text-2xl">⚽</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-capim/20 text-capim-light text-[10px] font-black uppercase tracking-wider border border-capim/30">
                PWA • Web App Oficial
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-giz font-['Teko',sans-serif] uppercase tracking-wider leading-none mt-0.5">
              Baixar & Instalar no Celular
            </h3>
            <p className="text-xs text-giz/50">
              Acesse como aplicativo nativo, com abertura rápida e tela cheia
            </p>
          </div>
        </div>

        {/* Quick Instant Install Action (if available) */}
        {deferredPrompt && (
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-capim/30 to-barro/30 border border-capim/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left">
              <div className="text-xs font-bold text-giz flex items-center justify-center sm:justify-start gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Instalação Direta Disponível!</span>
              </div>
              <p className="text-[11px] text-giz/70">
                Toque no botão para adicionar direto à sua tela inicial.
              </p>
            </div>
            <button
              onClick={handleNativeInstall}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-capim to-barro hover:from-capim-light hover:to-barro text-gramado font-black text-xs rounded-xl shadow-lg shadow-capim/25 flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Agora</span>
            </button>
          </div>
        )}

        {/* Action Tabs: QR Code | Link Direto | Passo a Passo */}
        <div className="flex bg-gramado p-1 rounded-2xl border border-gramado-light mb-5">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'qr'
                ? 'bg-capim text-giz shadow-md shadow-capim/20'
                : 'text-giz/50 hover:text-giz/85'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code Celular</span>
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'link'
                ? 'bg-capim text-giz shadow-md shadow-capim/20'
                : 'text-giz/50 hover:text-giz/85'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Link & WhatsApp</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-capim text-giz shadow-md shadow-capim/20'
                : 'text-giz/50 hover:text-giz/85'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Como Instalar</span>
          </button>
        </div>

        {/* TAB 1: QR CODE */}
        {activeTab === 'qr' && (
          <div className="space-y-4 text-center">
            <div className="p-5 rounded-3xl bg-gramado border border-gramado-light flex flex-col items-center">
              <div className="relative p-3 rounded-2xl bg-gramado-card border border-capim/30 shadow-xl mb-3">
                <img
                  src={qrCodeUrl}
                  alt="QR Code para baixar o app no celular"
                  className="w-48 h-48 sm:w-52 sm:h-52 rounded-xl object-contain"
                  loading="eager"
                />
              </div>

              <div className="flex items-center gap-2 text-capim-light text-xs font-bold mb-1">
                <Smartphone className="w-4 h-4" />
                <span>Aponte a câmera do seu celular para escanear</span>
              </div>
              <p className="text-[11px] text-giz/50 max-w-sm">
                O link abrirá instantaneamente no seu navegador móvel (Chrome no Android ou Safari no iPhone).
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={handleOpenInNewTab}
                className="flex-1 py-3 px-4 rounded-xl bg-gramado-light hover:bg-giz/15 text-giz text-xs font-bold flex items-center justify-center gap-2 border border-giz/15 transition-all"
              >
                <ExternalLink className="w-4 h-4 text-capim-light" />
                <span>Abrir em Nova Aba</span>
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 py-3 px-4 rounded-xl bg-capim hover:bg-capim text-giz text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-capim/20 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Mandar no WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LINK & WHATSAPP */}
        {activeTab === 'link' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gramado border border-gramado-light space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-giz/70 block">
                Link Direto do Aplicativo:
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={appUrl || window.location.href}
                  className="flex-1 bg-gramado-card border border-giz/15 rounded-xl px-3.5 py-2.5 text-xs text-capim-light select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                    copied
                      ? 'bg-capim text-gramado'
                      : 'bg-gramado-light hover:bg-giz/15 text-giz border border-giz/15'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar Link
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-giz/50">
                Copie e cole este link no navegador do seu celular ou compartilhe com os jogadores do grupo.
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleShareWhatsApp}
                className="p-3.5 rounded-2xl bg-capim hover:bg-capim text-giz font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-capim/20 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar para o meu WhatsApp</span>
              </button>

              <button
                onClick={handleOpenInNewTab}
                className="p-3.5 rounded-2xl bg-gramado-light hover:bg-giz/15 text-giz font-bold text-xs flex items-center justify-center gap-2 border border-giz/15 transition-all"
              >
                <ExternalLink className="w-4 h-4 text-capim-light" />
                <span>Abrir fora da prévia (Nova Aba)</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: STEP-BY-STEP GUIDE */}
        {activeTab === 'guide' && (
          <div className="space-y-4">
            {/* Device Selector */}
            <div className="flex bg-gramado p-1 rounded-xl border border-gramado-light">
              <button
                onClick={() => setPlatform('android')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  platform === 'android' ? 'bg-capim text-giz' : 'text-giz/50'
                }`}
              >
                🤖 Android (Chrome)
              </button>
              <button
                onClick={() => setPlatform('ios')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  platform === 'ios' ? 'bg-capim text-giz' : 'text-giz/50'
                }`}
              >
                🍏 iPhone (Safari)
              </button>
              <button
                onClick={() => setPlatform('desktop')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  platform === 'desktop' ? 'bg-capim text-giz' : 'text-giz/50'
                }`}
              >
                💻 Computador (PC / Mac)
              </button>
            </div>

            {/* Android instructions */}
            {platform === 'android' && (
              <div className="p-4 rounded-2xl bg-gramado border border-gramado-light space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-capim/20 text-capim-light font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-giz/70">
                    Abra o link do site no navegador <strong className="text-giz">Google Chrome</strong> do celular.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-capim/20 text-capim-light font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-giz/70">
                    Toque no menu de <strong className="text-giz">3 pontinhos (⋮)</strong> no canto superior direito do Chrome.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-capim/20 text-capim-light font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-giz/70">
                    Selecione a opção <strong className="text-capim-light font-bold">"Instalar aplicativo"</strong> ou <strong className="text-giz">"Adicionar à tela inicial"</strong>.
                  </div>
                </div>
              </div>
            )}

            {/* iOS instructions */}
            {platform === 'ios' && (
              <div className="p-4 rounded-2xl bg-gramado border border-gramado-light space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-capim/20 text-capim-light font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-giz/70">
                    Abra o link no navegador <strong className="text-giz">Safari</strong> do iPhone.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-capim/20 text-capim-light font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-giz/70">
                    Toque no ícone central de <strong className="text-giz">Compartilhar</strong> (o quadrado com uma seta para cima <Share2 className="w-3.5 h-3.5 inline text-capim-light" />).
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-capim/20 text-capim-light font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-giz/70">
                    Role a lista e toque em <strong className="text-capim-light font-bold">"Adicionar à Tela de Início"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-capim-light" />).
                  </div>
                </div>
              </div>
            )}

            {/* Desktop instructions */}
            {platform === 'desktop' && (
              <div className="p-4 rounded-2xl bg-gramado border border-gramado-light space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-capim/20 text-capim-light font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-giz/70">
                    Abra o link no <strong className="text-giz">Google Chrome</strong>, <strong className="text-giz">Microsoft Edge</strong> ou <strong className="text-giz">Brave</strong>.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-capim/20 text-capim-light font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-giz/70">
                    Clique no ícone de <strong className="text-giz">Instalar aplicativo (⤓)</strong> que aparece no final da barra de endereço URL.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleOpenInNewTab}
              className="w-full py-3 rounded-xl bg-capim hover:bg-capim text-giz font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-capim/20 active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir em Nova Aba para Instalar Agora</span>
            </button>
          </div>
        )}

        {/* Benefits bar */}
        <div className="mt-5 pt-4 border-t border-gramado-light/80 grid grid-cols-3 gap-2 text-center text-giz/50">
          <div className="flex flex-col items-center">
            <Zap className="w-3.5 h-3.5 text-amber-400 mb-1" />
            <span className="text-[10px] font-bold text-giz/70">Abertura em 1 toque</span>
          </div>
          <div className="flex flex-col items-center">
            <WifiOff className="w-3.5 h-3.5 text-capim-light mb-1" />
            <span className="text-[10px] font-bold text-giz/70">Funciona Offline</span>
          </div>
          <div className="flex flex-col items-center">
            <Shield className="w-3.5 h-3.5 text-barro mb-1" />
            <span className="text-[10px] font-bold text-giz/70">Leve e Seguro (PWA)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
