import React, { useState, useEffect } from 'react';
import { Player, PlayerPosition, PlayerType, Foot, Pelada } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { loginWithGoogle } from '../lib/firebase';
import {
  User,
  Sparkles,
  Shield,
  Zap,
  Award,
  Phone,
  CheckCircle2,
  X,
  Save,
  Image as ImageIcon,
  LogIn,
  Crown,
  Flame,
  Plus,
  Trash2,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  players: Player[];
  currentPelada: Pelada | null;
  onSavePlayer: (player: Player) => void;
  onOpenAuth?: () => void;
}

const AVATAR_PRESETS = [
  { id: '1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200', label: 'Camisa 10' },
  { id: '2', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200', label: 'Capitão' },
  { id: '3', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', label: 'Goleador' },
  { id: '4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', label: 'Volante' },
  { id: '5', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200', label: 'Paredão' },
  { id: '6', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200', label: 'Maestro' },
  { id: '7', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200', label: 'Ala Rápido' },
  { id: '8', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200', label: 'Cria Raiz' },
];

const POPULAR_BADGES = [
  'Visão de Jogo',
  'Paredão',
  'Canhão',
  'Motorzinho',
  'Raça Pura',
  'Cobrador de Falta',
  'Drible Curto',
  'Finalizador Nato',
  'Garçom',
  'Desarme Limpo',
  'Fominha do Bem',
  'Cria Decisivo',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  players,
  currentPelada,
  onSavePlayer,
  onOpenAuth,
}) => {
  if (!isOpen) return null;

  // Find existing player linked to this user (by UID or email only — matching by
  // display name would let a different account claim someone else's card just
  // because they share a name, reassigning that card's userId/userEmail on save)
  const existingPlayer = players.find((p) => {
    if (currentUser?.uid && p.userId === currentUser.uid) return true;
    if (currentUser?.email && p.userEmail === currentUser.email) return true;
    return false;
  });

  const [name, setName] = useState(
    existingPlayer?.name || currentUser?.displayName || ''
  );
  const [nickname, setNickname] = useState(
    existingPlayer?.nickname || currentUser?.displayName?.split(' ')[0] || ''
  );
  const [photoUrl, setPhotoUrl] = useState(
    existingPlayer?.photoUrl || currentUser?.photoURL || AVATAR_PRESETS[0].url
  );
  const [position, setPosition] = useState<PlayerPosition>(
    existingPlayer?.position || 'MID'
  );
  const [type, setType] = useState<PlayerType>(
    existingPlayer?.type || 'diarista'
  );
  const [dominantFoot, setDominantFoot] = useState<Foot>(
    existingPlayer?.dominantFoot || 'destro'
  );
  const [phone, setPhone] = useState(
    existingPlayer?.phone || ''
  );

  // Stats
  const [pace, setPace] = useState(existingPlayer?.pace || 78);
  const [shoot, setShoot] = useState(existingPlayer?.shoot || 75);
  const [pass, setPass] = useState(existingPlayer?.pass || 80);
  const [dribble, setDribble] = useState(existingPlayer?.dribble || 77);
  const [def, setDef] = useState(existingPlayer?.def || 65);
  const [physical, setPhysical] = useState(existingPlayer?.physical || 74);

  const [badges, setBadges] = useState<string[]>(
    existingPlayer?.badges || ['Cria da Pelada']
  );
  const [newBadgeText, setNewBadgeText] = useState('');
  const [customPhotoInput, setCustomPhotoInput] = useState('');
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [successSaved, setSuccessSaved] = useState(false);
  const [addToCurrentPelada, setAddToCurrentPelada] = useState(true);

  // Calculate Overall
  const calculateOverall = () => {
    if (position === 'GK') {
      return Math.round(def * 0.45 + physical * 0.25 + pass * 0.15 + pace * 0.15);
    } else if (position === 'DEF') {
      return Math.round(def * 0.4 + physical * 0.3 + pass * 0.15 + pace * 0.15);
    } else if (position === 'MID') {
      return Math.round(pass * 0.35 + dribble * 0.25 + shoot * 0.2 + def * 0.2);
    } else {
      // ATT
      return Math.round(shoot * 0.4 + pace * 0.25 + dribble * 0.25 + physical * 0.1);
    }
  };

  const overall = Math.min(99, Math.max(40, calculateOverall()));

  const handleToggleBadge = (badge: string) => {
    if (badges.includes(badge)) {
      setBadges(badges.filter((b) => b !== badge));
    } else {
      if (badges.length >= 5) {
        alert('Você pode selecionar no máximo 5 características!');
        return;
      }
      setBadges([...badges, badge]);
    }
  };

  const handleAddCustomBadge = () => {
    if (!newBadgeText.trim()) return;
    if (badges.includes(newBadgeText.trim())) return;
    if (badges.length >= 5) {
      alert('Você pode selecionar no máximo 5 características!');
      return;
    }
    setBadges([...badges, newBadgeText.trim()]);
    setNewBadgeText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, informe seu nome!');
      return;
    }

    const playerToSave: Player = {
      id: existingPlayer?.id || (currentUser?.uid ? `player-${currentUser.uid.slice(0, 10)}` : `player-custom-${Date.now()}`),
      userId: currentUser?.uid || existingPlayer?.userId || undefined,
      userEmail: currentUser?.email || existingPlayer?.userEmail || undefined,
      name: name.trim(),
      nickname: nickname.trim() || name.trim().split(' ')[0],
      photoUrl: photoUrl.trim() || AVATAR_PRESETS[0].url,
      position,
      type,
      overall,
      pace,
      shoot,
      pass,
      dribble,
      def,
      physical,
      dominantFoot,
      phone: phone.trim(),
      active: true,
      matchesCount: existingPlayer?.matchesCount || 0,
      wins: existingPlayer?.wins || 0,
      draws: existingPlayer?.draws || 0,
      losses: existingPlayer?.losses || 0,
      goals: existingPlayer?.goals || 0,
      assists: existingPlayer?.assists || 0,
      cleanSheets: existingPlayer?.cleanSheets || 0,
      yellowCards: existingPlayer?.yellowCards || 0,
      redCards: existingPlayer?.redCards || 0,
      mvpCount: existingPlayer?.mvpCount || 0,
      bagreCount: existingPlayer?.bagreCount || 0,
      averageRating: existingPlayer?.averageRating || 8.0,
      ratingsCount: existingPlayer?.ratingsCount || 0,
      lastRatings: existingPlayer?.lastRatings || [],
      badges: badges.length > 0 ? badges : ['Cria da Pelada'],
    };

    onSavePlayer(playerToSave);
    setSuccessSaved(true);
    setTimeout(() => {
      setSuccessSaved(false);
      onClose();
    }, 1200);
  };

  const positionLabel = {
    GK: 'Goleiro (GK)',
    DEF: 'Zagueiro / Lateral (DEF)',
    MID: 'Meio-Campista (MID)',
    ATT: 'Atacante / Ponta (ATT)',
  }[position];

  return (
    <div
      id="user-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gramado/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="user-profile-modal-card"
        className="relative w-full max-w-3xl bg-gramado-card border border-gramado-light rounded-3xl overflow-hidden shadow-2xl my-auto shadow-gramado-card/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-gramado-card via-gramado-card to-gramado-light border-b border-gramado-light flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-capim to-barro p-0.5 shadow-lg shadow-capim/25 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-gramado rounded-[14px] flex items-center justify-center text-capim-light">
                <Crown className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-capim/20 text-capim-light text-[10px] font-black uppercase tracking-wider border border-capim/30">
                  {existingPlayer ? 'Editar Meu Perfil' : 'Criar Meu Cartão'}
                </span>
                {currentUser && (
                  <span className="text-[11px] text-giz/50 hidden sm:inline">
                    Conectado como <strong className="text-capim-light">{currentUser.displayName || currentUser.email}</strong>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-giz font-['Teko',sans-serif] uppercase tracking-wider leading-none mt-1">
                {existingPlayer ? 'Personalizar Meu Perfil de Jogador' : 'Crie seu Perfil Oficial de Cria'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-giz/50 hover:text-giz rounded-full bg-gramado-light/80 hover:bg-gramado-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Not Logged In Banner with 1-Click Login Option */}
        {!currentUser && (
          <div className="mx-5 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-capim/10 border border-capim/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-giz/70">
              <Sparkles className="w-4 h-4 text-capim-light shrink-0" />
              <span>
                Faça login com sua conta Google para salvar seu perfil na nuvem e sincronizar em qualquer celular.
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } catch (e) {
                  if (onOpenAuth) onOpenAuth();
                }
              }}
              className="px-4 py-2 bg-capim hover:bg-capim text-giz rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar com Google</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: LIVE FUT CARD PREVIEW */}
            <div className="lg:col-span-5 flex flex-col items-center justify-start">
              <div className="text-xs font-black uppercase tracking-wider text-giz/50 mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Prévia do seu Cartão</span>
              </div>

              {/* FIFA Ultimate Team Style Card */}
              <div className="w-64 sm:w-68 rounded-3xl p-4 bg-gradient-to-b from-amber-500/20 via-gramado-card to-gramado border-2 border-amber-500/40 shadow-2xl shadow-amber-500/10 relative overflow-hidden flex flex-col items-center">
                {/* Glow accent */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

                {/* Top card row: Overall & Position */}
                <div className="w-full flex items-start justify-between relative z-10 mb-1">
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-black text-amber-400 font-['Teko',sans-serif] leading-none">
                      {overall}
                    </span>
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                      {position}
                    </span>
                  </div>

                  {/* Avatar / Photo */}
                  <div className="relative">
                    <img
                      src={photoUrl}
                      alt={name || 'Avatar'}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-amber-400/60 shadow-xl bg-gramado-light"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = AVATAR_PRESETS[0].url;
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPhotoPicker(!showPhotoPicker)}
                      className="absolute -bottom-2 -right-2 p-1.5 bg-gramado-card border border-amber-400 text-amber-300 rounded-full hover:bg-gramado-light transition-transform active:scale-90 shadow-md"
                      title="Mudar Foto"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Nickname / Name on Card */}
                <div className="text-center relative z-10 my-2 w-full">
                  <h3 className="text-xl sm:text-2xl font-black text-giz font-['Teko',sans-serif] uppercase tracking-wider truncate">
                    {nickname || name || 'Seu Nome'}
                  </h3>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-giz/70">
                    <span className="capitalize">{type}</span>
                    <span>•</span>
                    <span className="capitalize">Pé {dominantFoot}</span>
                  </div>
                </div>

                {/* 6 Stats Grid */}
                <div className="w-full grid grid-cols-2 gap-x-3 gap-y-1 pt-2 border-t border-amber-500/20 text-xs relative z-10">
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-gramado-card/80">
                    <span className="text-giz/50 font-bold">PAC</span>
                    <span className="font-black text-amber-400">{pace}</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-gramado-card/80">
                    <span className="text-giz/50 font-bold">DRI</span>
                    <span className="font-black text-amber-400">{dribble}</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-gramado-card/80">
                    <span className="text-giz/50 font-bold">SHO</span>
                    <span className="font-black text-amber-400">{shoot}</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-gramado-card/80">
                    <span className="text-giz/50 font-bold">DEF</span>
                    <span className="font-black text-amber-400">{def}</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-gramado-card/80">
                    <span className="text-giz/50 font-bold">PAS</span>
                    <span className="font-black text-amber-400">{pass}</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-gramado-card/80">
                    <span className="text-giz/50 font-bold">PHY</span>
                    <span className="font-black text-amber-400">{physical}</span>
                  </div>
                </div>

                {/* Selected Badges Preview */}
                {badges.length > 0 && (
                  <div className="w-full flex flex-wrap justify-center gap-1 mt-2.5 pt-2 border-t border-amber-500/20">
                    {badges.slice(0, 3).map((b, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[9px] font-bold border border-amber-500/30 truncate max-w-[100px]"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Photo selector dropdown / popover */}
              {showPhotoPicker && (
                <div className="mt-3 p-3 w-full max-w-xs bg-gramado border border-gramado-light rounded-2xl shadow-xl space-y-2">
                  <div className="text-[11px] font-bold text-giz/70 flex items-center justify-between">
                    <span>Escolher Avatar Rápido</span>
                    <button
                      type="button"
                      onClick={() => setShowPhotoPicker(false)}
                      className="text-giz/50 hover:text-giz"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setPhotoUrl(preset.url);
                          setShowPhotoPicker(false);
                        }}
                        className={`relative rounded-xl overflow-hidden border-2 transition-transform active:scale-95 ${
                          photoUrl === preset.url ? 'border-amber-400 scale-105' : 'border-gramado-light'
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-12 object-cover" />
                      </button>
                    ))}
                  </div>
                  {currentUser?.photoURL && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl(currentUser.photoURL!);
                        setShowPhotoPicker(false);
                      }}
                      className="w-full py-1.5 px-2 rounded-xl bg-gramado-card hover:bg-gramado-light text-[10px] font-bold text-capim-light border border-gramado-light flex items-center justify-center gap-1"
                    >
                      <User className="w-3 h-3" /> Usar Foto do Google
                    </button>
                  )}
                  <div className="pt-1">
                    <input
                      type="url"
                      placeholder="Ou cole a URL da sua foto..."
                      value={customPhotoInput}
                      onChange={(e) => setCustomPhotoInput(e.target.value)}
                      onBlur={() => {
                        if (customPhotoInput.trim()) {
                          setPhotoUrl(customPhotoInput.trim());
                        }
                      }}
                      className="w-full bg-gramado-card border border-giz/15 rounded-xl px-2 py-1 text-[11px] text-giz focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: PERSONAL INFO & SKILL SLIDERS */}
            <div className="lg:col-span-7 space-y-4 text-xs">
              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-giz/70 font-bold block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim font-medium"
                  />
                </div>

                <div>
                  <label className="text-giz/70 font-bold block mb-1">Apelido na Camisa *</label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ex: Carlinhos / Cadu"
                    className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="text-giz/70 font-bold block mb-1">Posição Principal</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                    className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim font-bold text-capim-light"
                  >
                    <option value="GK">🧤 Goleiro (GK)</option>
                    <option value="DEF">🛡️ Zagueiro / Lateral (DEF)</option>
                    <option value="MID">🪄 Meio-Campo / Volante (MID)</option>
                    <option value="ATT">⚡ Atacante / Ponta (ATT)</option>
                  </select>
                </div>

                <div>
                  <label className="text-giz/70 font-bold block mb-1">Pé Dominante</label>
                  <select
                    value={dominantFoot}
                    onChange={(e) => setDominantFoot(e.target.value as Foot)}
                    className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim"
                  >
                    <option value="destro">Destro (Pé Direito)</option>
                    <option value="canhoto">Canhoto (Pé Esquerdo)</option>
                    <option value="ambidestro">Ambidestro (Chuta com as Duas)</option>
                  </select>
                </div>

                <div>
                  <label className="text-giz/70 font-bold block mb-1">Tipo de Jogador</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('mensalista')}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                        type === 'mensalista'
                          ? 'bg-capim/20 border-capim text-capim-light'
                          : 'bg-gramado border-gramado-light text-giz/50'
                      }`}
                    >
                      👑 Mensalista
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('diarista')}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                        type === 'diarista'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-gramado border-gramado-light text-giz/50'
                      }`}
                    >
                      ⚽ Diarista / Avulso
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-giz/70 font-bold block mb-1">WhatsApp / Telefone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim"
                  />
                </div>
              </div>

              {/* Skills & Attributes Sliders */}
              <div className="p-4 rounded-2xl bg-gramado/80 border border-gramado-light space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Seus Atributos de Jogo (40 a 99)</span>
                  </span>
                  <span className="text-xs font-black text-giz bg-gramado-card px-2 py-0.5 rounded-md border border-giz/15">
                    OVR Calculado: <strong className="text-amber-400">{overall}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-giz/70 mb-0.5">
                      <span>⚡ Velocidade / Pique (PAC)</span>
                      <span className="text-amber-400 font-black">{pace}</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="99"
                      value={pace}
                      onChange={(e) => setPace(Number(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-gramado-light rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-giz/70 mb-0.5">
                      <span>🪄 Drible & Agilidade (DRI)</span>
                      <span className="text-amber-400 font-black">{dribble}</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="99"
                      value={dribble}
                      onChange={(e) => setDribble(Number(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-gramado-light rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-giz/70 mb-0.5">
                      <span>🎯 Chute & Finalização (SHO)</span>
                      <span className="text-amber-400 font-black">{shoot}</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="99"
                      value={shoot}
                      onChange={(e) => setShoot(Number(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-gramado-light rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-giz/70 mb-0.5">
                      <span>🛡️ Defesa & Desarme (DEF)</span>
                      <span className="text-amber-400 font-black">{def}</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="99"
                      value={def}
                      onChange={(e) => setDef(Number(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-gramado-light rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-giz/70 mb-0.5">
                      <span>👟 Passe & Visão (PAS)</span>
                      <span className="text-amber-400 font-black">{pass}</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="99"
                      value={pass}
                      onChange={(e) => setPass(Number(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-gramado-light rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-giz/70 mb-0.5">
                      <span>💪 Físico & Resistência (PHY)</span>
                      <span className="text-amber-400 font-black">{physical}</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="99"
                      value={physical}
                      onChange={(e) => setPhysical(Number(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-gramado-light rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Characteristics & Badges */}
              <div className="p-3.5 rounded-2xl bg-gramado/80 border border-gramado-light space-y-2">
                <label className="text-xs font-bold text-giz/70 block">
                  Tags & Características Marcantes (Máx 5):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_BADGES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleToggleBadge(b)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        badges.includes(b)
                          ? 'bg-capim text-gramado shadow-sm'
                          : 'bg-gramado-card text-giz/50 border border-gramado-light hover:border-giz/15'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Adicionar característica personalizada..."
                    value={newBadgeText}
                    onChange={(e) => setNewBadgeText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomBadge();
                      }
                    }}
                    className="flex-1 bg-gramado-card border border-giz/15 rounded-xl px-2.5 py-1.5 text-xs text-giz focus:outline-none focus:border-capim"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomBadge}
                    className="px-3 py-1.5 bg-gramado-light hover:bg-giz/15 text-giz rounded-xl text-xs font-bold border border-giz/15"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {successSaved && (
            <div className="p-3 rounded-2xl bg-capim/20 border border-capim/40 text-capim-light text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Perfil salvo e sincronizado com sucesso!</span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gramado-light">
            <div className="text-[11px] text-giz/50 text-center sm:text-left">
              Seu perfil será exibido nas convocações, sorteios e estatísticas da pelada.
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gramado-light hover:bg-giz/15 text-giz/70 rounded-xl font-bold transition-colors text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-capim to-barro hover:from-capim-light hover:to-barro text-gramado rounded-xl font-black text-xs shadow-lg shadow-capim/25 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Meu Perfil</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
