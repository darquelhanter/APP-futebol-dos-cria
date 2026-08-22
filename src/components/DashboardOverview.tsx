import React, { useState } from 'react';
import { Pelada, Player, NotificationLog } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { isPeladaCreator, isPeladaAdmin } from '../utils/permissions';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Award,
  Sparkles,
  Shuffle,
  Share2,
  Bell,
  Copy,
  Check,
  Trophy,
  ArrowRight,
  Flame,
  Plus,
  ShieldCheck,
  Crown,
  Trash2,
  Lock,
  Edit3,
  Repeat,
} from 'lucide-react';
import { formatCurrency, formatDateBR, generateAttendanceMessage, openWhatsAppWithText } from '../utils/whatsappGenerator';
import { PlayerCard } from './PlayerCard';

interface DashboardOverviewProps {
  pelada?: Pelada | null;
  allPlayers: Player[];
  currentUser?: FirebaseUser | null;
  onNavigateTab: (tab: string) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenNotifications: () => void;
  onOpenNewPelada: () => void;
  onOpenPrivileges?: () => void;
  onOpenEditPelada?: () => void;
  onOpenUserProfile?: () => void;
  onDeletePelada?: (peladaId: string) => void;
  onUpdatePelada: (pelada: Pelada) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  pelada,
  allPlayers,
  currentUser,
  onNavigateTab,
  onSelectPlayer,
  onOpenNotifications,
  onOpenNewPelada,
  onOpenPrivileges,
  onOpenEditPelada,
  onOpenUserProfile,
  onDeletePelada,
  onUpdatePelada,
}) => {
  const [copiedPix, setCopiedPix] = useState(false);

  if (!pelada) {
    return (
      <div className="rounded-3xl bg-gramado-card border border-dashed border-giz/15 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-capim/10 border border-capim/30 flex items-center justify-center text-4xl mb-4">
          ⚽
        </div>
        <h2 className="text-2xl font-black text-giz font-display uppercase tracking-wider text-3xl">
          Nenhuma Pelada Agendada
        </h2>
        <p className="text-xs sm:text-sm text-giz/70 mt-2 mb-6 leading-relaxed">
          O aplicativo está limpo e pronto para o seu grupo. Crie a primeira pelada para confirmar presenças, sortear times equilibrados e controlar o PIX.
        </p>
        <button
          onClick={onOpenNewPelada}
          className="px-6 py-3.5 bg-capim hover:bg-capim-light text-giz rounded-2xl text-sm font-black flex items-center gap-2 mx-auto shadow-lg shadow-capim/30 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Agendar Primeira Pelada</span>
        </button>
      </div>
    );
  }

  const playersMap = new Map<string, Player>(allPlayers.map((p) => [p.id, p]));

  const confirmedList = pelada.confirmedPlayers.filter((p) => p.status === 'confirmed');
  const waitlistList = pelada.confirmedPlayers.filter((p) => p.status === 'waitlist');
  const pendingList = pelada.confirmedPlayers.filter((p) => p.status === 'pending');
  const paidList = pelada.confirmedPlayers.filter((p) => p.paymentStatus === 'paid');

  const totalPaid = paidList.reduce((acc, cp) => {
    const p = playersMap.get(cp.playerId);
    return acc + (cp.paidAmount || (p?.type === 'mensalista' ? pelada.priceMensalista : pelada.priceDiarista));
  }, 0);

  const totalExpenses = (pelada.expenses || []).reduce((acc, e) => acc + e.amount, 0);

  const spotsLeft = Math.max(0, pelada.maxPlayers - confirmedList.length);

  // Top scorers & MVP
  const topScorer = [...allPlayers].sort((a, b) => b.goals - a.goals)[0];
  const topRating = [...allPlayers].sort((a, b) => b.averageRating - a.averageRating)[0];
  const topGk = [...allPlayers].filter((p) => p.position === 'GK').sort((a, b) => b.cleanSheets - a.cleanSheets)[0];

  // User's own player profile (matched only by uid/email, never by display name)
  const myPlayer = allPlayers.find((p) => {
    if (currentUser?.uid && p.userId === currentUser.uid) return true;
    if (currentUser?.email && p.userEmail === currentUser.email) return true;
    return false;
  });

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pelada.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = generateAttendanceMessage(pelada, playersMap);
    openWhatsAppWithText(text);
  };

  return (
    <div className="space-y-6">
      {/* User Profile Quick Banner */}
      {onOpenUserProfile && (
        <div className="bg-gradient-to-r from-amber-500/10 via-gramado-card/90 to-capim/10 border border-amber-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
              {myPlayer?.avatarUrl ? (
                <img src={myPlayer.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                '⭐'
              )}
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-giz">
                  {myPlayer ? `Seu Cartão de Cria: ${myPlayer.nickname || myPlayer.name}` : 'Crie seu Perfil Oficial de Jogador'}
                </h3>
                {myPlayer && (
                  <span className="bg-amber-400 text-gramado font-black text-[10px] px-2 py-0.5 rounded-full font-mono">
                    OVR {myPlayer.overall}
                  </span>
                )}
              </div>
              <p className="text-xs text-giz/60 mt-0.5">
                {myPlayer
                  ? `Posição: ${myPlayer.position} • Status: ${myPlayer.type === 'mensalista' ? 'Mensalista' : 'Convidado'} • Ajuste foto e atributos`
                  : 'Personalize suas notas de Passe, Finalização, Velocidade, Fôlego e foto para entrar no sorteio!'}
              </p>
            </div>
          </div>
          <button
            id="overview-btn-my-profile"
            onClick={onOpenUserProfile}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gramado font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 shrink-0 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{myPlayer ? 'Editar Meu Perfil' : 'Criar Meu Perfil Agora'}</span>
          </button>
        </div>
      )}

      {/* Hero Match Card — súmula da próxima pelada */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-capim/20 via-gramado-light to-gramado border border-dashed border-capim/30 p-6 sm:p-8 shadow-2xl">

        {/* Floodlight glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-refletor/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-capim-light bg-capim/15 px-3 py-1 rounded-full border border-capim/35 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-capim-light fill-capim-light" /> Próxima Pelada
              </span>

              {/* Recurrence Badge */}
              {pelada.frequency && pelada.frequency !== 'unica' && (
                <span className="text-xs font-bold text-barro bg-barro/15 px-3 py-1 rounded-full border border-barro/30 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-barro" />
                  {pelada.frequency === 'mensal'
                    ? `Mensal • Toda ${
                        pelada.dayOfWeek === 'segunda'
                          ? 'Segunda'
                          : pelada.dayOfWeek === 'terca'
                          ? 'Terça'
                          : pelada.dayOfWeek === 'quarta'
                          ? 'Quarta'
                          : pelada.dayOfWeek === 'quinta'
                          ? 'Quinta'
                          : pelada.dayOfWeek === 'sexta'
                          ? 'Sexta'
                          : pelada.dayOfWeek === 'sabado'
                          ? 'Sábado'
                          : pelada.dayOfWeek === 'domingo'
                          ? 'Domingo'
                          : 'semana'
                      }-feira`
                    : pelada.frequency === 'quinzenal'
                    ? `Quinzenal (${
                        pelada.dayOfWeek === 'segunda'
                          ? 'Segunda'
                          : pelada.dayOfWeek === 'terca'
                          ? 'Terça'
                          : pelada.dayOfWeek === 'quarta'
                          ? 'Quarta'
                          : pelada.dayOfWeek === 'quinta'
                          ? 'Quinta'
                          : pelada.dayOfWeek === 'sexta'
                          ? 'Sexta'
                          : pelada.dayOfWeek === 'sabado'
                          ? 'Sábado'
                          : pelada.dayOfWeek === 'domingo'
                          ? 'Domingo'
                          : 'semana'
                      })`
                    : `Semanal • Toda ${
                        pelada.dayOfWeek === 'segunda'
                          ? 'Segunda'
                          : pelada.dayOfWeek === 'terca'
                          ? 'Terça'
                          : pelada.dayOfWeek === 'quarta'
                          ? 'Quarta'
                          : pelada.dayOfWeek === 'quinta'
                          ? 'Quinta'
                          : pelada.dayOfWeek === 'sexta'
                          ? 'Sexta'
                          : pelada.dayOfWeek === 'sabado'
                          ? 'Sábado'
                          : pelada.dayOfWeek === 'domingo'
                          ? 'Domingo'
                          : 'semana'
                      }-feira`}
                </span>
              )}

              <span className="text-xs font-bold text-giz/70 bg-gramado-card/80 px-2.5 py-0.5 rounded-full border border-giz/15">
                {pelada.fieldType === 'society' ? 'Society' : pelada.fieldType === 'futsal' ? 'Futsal' : 'Campo'} • {pelada.playersPerTeam}x{pelada.playersPerTeam}
              </span>
              {pelada.creatorEmail && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" /> Criador: {pelada.creatorName || pelada.creatorEmail.split('@')[0]}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-wide text-giz leading-none">
                {pelada.title}
              </h1>

              {/* Creator, Admin & Edit quick triggers */}
              <div className="flex items-center gap-2">
                {isPeladaAdmin(pelada, currentUser) && onOpenEditPelada && (
                  <button
                    id="hero-btn-edit-pelada"
                    onClick={onOpenEditPelada}
                    className="px-2.5 py-1.5 rounded-xl bg-capim/15 hover:bg-capim/25 border border-capim/40 text-capim-light text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Editar dados, horários e valores da pelada"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-capim-light" />
                    <span>Editar Dados</span>
                  </button>
                )}

                {onOpenPrivileges && (
                  <button
                    onClick={onOpenPrivileges}
                    className="px-2.5 py-1.5 rounded-xl bg-gramado/90 hover:bg-gramado-card border border-giz/15 hover:border-capim/40 text-giz/80 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Gerenciar Privilégios & Administradores"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Privilégios</span>
                  </button>
                )}

                {onDeletePelada && isPeladaCreator(pelada, currentUser) && (
                  <button
                    onClick={() => {
                      if (window.confirm(`⚠️ Atenção: Deseja realmente EXCLUIR a pelada "${pelada.title}"? Esta ação não poderá ser desfeita.`)) {
                        onDeletePelada(pelada.id);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-gramado/90 hover:bg-rose-500/20 text-giz/50 hover:text-rose-400 border border-giz/15 hover:border-rose-500/40 transition-colors"
                    title="Excluir Pelada (Exclusivo do Criador)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-giz/70">
              <span className="flex items-center gap-1.5 font-bold">
                <Calendar className="w-4 h-4 text-capim-light" />
                {formatDateBR(pelada.date)}
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <Clock className="w-4 h-4 text-capim-light" />
                {pelada.time}h
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <MapPin className="w-4 h-4 text-capim-light" />
                {pelada.location}
              </span>
            </div>

            {/* Attendance capacity bar */}
            <div className="pt-2">
              <div className="flex justify-between text-xs font-bold text-giz/70 mb-1.5 font-mono">
                <span>Vagas Preenchidas: <strong>{confirmedList.length}/{pelada.maxPlayers}</strong></span>
                <span className={spotsLeft === 0 ? 'text-rose-400' : 'text-capim-light'}>
                  {spotsLeft === 0 ? 'Lotado!' : `${spotsLeft} vagas disponíveis`}
                </span>
              </div>
              <div className="h-2.5 w-full bg-gramado rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    confirmedList.length >= pelada.maxPlayers ? 'bg-rose-500' : 'bg-capim'
                  }`}
                  style={{ width: `${Math.min(100, (confirmedList.length / pelada.maxPlayers) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              id="hero-btn-presenca"
              onClick={() => onNavigateTab('presencas')}
              className="px-5 py-3 bg-capim hover:bg-capim-light text-giz rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-capim/30 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Presenças ({confirmedList.length})
            </button>

            <button
              id="hero-btn-sorteio"
              onClick={() => onNavigateTab('sorteio')}
              className="px-5 py-3 bg-gramado-card hover:bg-gramado-light text-giz/90 border border-giz/15 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-colors"
            >
              <Shuffle className="w-4 h-4 text-amber-400" />
              Sorteio Balanceado
            </button>

            <button
              id="hero-btn-share-whatsapp"
              onClick={handleShareWhatsApp}
              className="px-5 py-3 bg-gramado/90 hover:bg-gramado-card text-capim-light border border-capim/30 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Convocação WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Grid of 4 Key Quick Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Module 1: Presença & Vagas */}
        <div
          id="card-quick-presenca"
          onClick={() => onNavigateTab('presencas')}
          className="bg-gramado-card/90 hover:bg-gramado-card p-5 rounded-3xl border border-giz/10 hover:border-capim/40 shadow-xl cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase text-giz/50">Presença</span>
              <div className="w-8 h-8 rounded-xl bg-capim/10 text-capim-light flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-giz font-mono">{confirmedList.length} <span className="text-xs font-normal text-giz/50">/ {pelada.maxPlayers}</span></h3>
            <p className="text-xs text-giz/50 mt-1">
              {waitlistList.length} na espera • {pendingList.length} pendentes
            </p>
          </div>

          <div className="pt-4 mt-2 border-t border-giz/10 flex items-center justify-between text-xs font-bold text-capim-light group-hover:translate-x-0.5 transition-transform">
            <span>Gerenciar lista</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Module 2: Financeiro */}
        <div
          id="card-quick-finance"
          onClick={() => onNavigateTab('financeiro')}
          className="bg-gramado-card/90 hover:bg-gramado-card p-5 rounded-3xl border border-giz/10 hover:border-amber-500/40 shadow-xl cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase text-giz/50">Arrecadação</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-capim-light font-mono">{formatCurrency(totalPaid)}</h3>
            <p className="text-xs text-giz/50 mt-1">
              Custos: {formatCurrency(totalExpenses)} • Saldo: {formatCurrency(totalPaid - totalExpenses)}
            </p>
          </div>

          <div className="pt-4 mt-2 border-t border-giz/10 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform">
            <span>Ver pagamentos & PIX</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Module 3: Placar ao Vivo */}
        <div
          id="card-quick-placar"
          onClick={() => onNavigateTab('placar')}
          className="bg-gramado-card/90 hover:bg-gramado-card p-5 rounded-3xl border border-giz/10 hover:border-capim/40 shadow-xl cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase text-giz/50">Placar & Cronômetro</span>
              <div className="w-8 h-8 rounded-xl bg-capim/10 text-capim-light flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-xl font-black text-giz flex items-center gap-1.5">
              <span>{pelada.matches?.length || 0} Partida(s)</span>
            </h3>
            <p className="text-xs text-giz/50 mt-1">
              Gols ao vivo, apito do juiz e cartões
            </p>
          </div>

          <div className="pt-4 mt-2 border-t border-giz/10 flex items-center justify-between text-xs font-bold text-capim-light group-hover:translate-x-0.5 transition-transform">
            <span>Abrir painel ao vivo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Module 4: Votação Pós-Jogo */}
        <div
          id="card-quick-votacao"
          onClick={() => onNavigateTab('avaliacao')}
          className="bg-gramado-card/90 hover:bg-gramado-card p-5 rounded-3xl border border-giz/10 hover:border-barro/40 shadow-xl cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase text-giz/50">Votação da Galera</span>
              <div className="w-8 h-8 rounded-xl bg-barro/10 text-barro flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-xl font-black text-giz">
              {pelada.evaluations?.length || 0} Avaliações
            </h3>
            <p className="text-xs text-giz/50 mt-1">
              Notas 1-10, Craque & Troféu Bagre
            </p>
          </div>

          <div className="pt-4 mt-2 border-t border-giz/10 flex items-center justify-between text-xs font-bold text-barro group-hover:translate-x-0.5 transition-transform">
            <span>Avaliar jogadores</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Season Stars / Leaderboard Highlight */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-giz flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Destaques da Temporada dos Cria
          </h3>
          <button
            onClick={() => onNavigateTab('ranking')}
            className="text-xs font-bold text-capim-light hover:text-capim flex items-center gap-1"
          >
            Ver ranking completo <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Top Scorer */}
          {topScorer && (
            <div
              onClick={() => onSelectPlayer(topScorer)}
              className="bg-gramado-card/90 border border-giz/10 hover:border-amber-500/40 p-4 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                ⚽
              </div>
              <div className="truncate">
                <p className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">Artilheiro Máximo</p>
                <h4 className="text-sm font-black text-giz truncate">{topScorer.nickname || topScorer.name}</h4>
                <p className="text-xs text-giz/50">{topScorer.goals} Gols em {topScorer.matchesCount} jogos</p>
              </div>
            </div>
          )}

          {/* Ballon d'Or / Best Rating */}
          {topRating && (
            <div
              onClick={() => onSelectPlayer(topRating)}
              className="bg-gramado-card/90 border border-giz/10 hover:border-capim/40 p-4 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-capim/10 border border-capim/30 flex items-center justify-center text-xl shrink-0">
                ⭐
              </div>
              <div className="truncate">
                <p className="text-[10px] font-extrabold uppercase text-capim-light tracking-wider">Bola de Ouro (Nota)</p>
                <h4 className="text-sm font-black text-giz truncate">{topRating.nickname || topRating.name}</h4>
                <p className="text-xs text-giz/50">Média {topRating.averageRating.toFixed(1)} • {topRating.mvpCount}x MVP</p>
              </div>
            </div>
          )}

          {/* Best Goalkeeper */}
          {topGk && (
            <div
              onClick={() => onSelectPlayer(topGk)}
              className="bg-gramado-card/90 border border-giz/10 hover:border-blue-500/40 p-4 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl shrink-0">
                🧤
              </div>
              <div className="truncate">
                <p className="text-[10px] font-extrabold uppercase text-blue-400 tracking-wider">Luva de Ouro</p>
                <h4 className="text-sm font-black text-giz truncate">{topGk.nickname || topGk.name}</h4>
                <p className="text-xs text-giz/50">{topGk.cleanSheets} jogos sem sofrer gols</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
