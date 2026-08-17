import React, { useState } from 'react';
import { Pelada, Player, ConfirmedPlayer, AttendanceStatus, PaymentStatus, NotificationLog } from '../types';
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Share2,
  Bell,
  DollarSign,
  UserPlus,
  Send,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  QrCode
} from 'lucide-react';
import {
  generateAttendanceMessage,
  generateReminderMessage,
  generatePixBillingMessage,
  openWhatsAppWithText,
  formatCurrency,
  formatDateBR
} from '../utils/whatsappGenerator';

interface AttendanceManagerProps {
  pelada?: Pelada | null;
  allPlayers: Player[];
  onUpdatePelada: (updated: Pelada) => void;
  onAddNotification: (notif: NotificationLog) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenNewPelada?: () => void;
  onOpenUserProfile?: () => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  pelada,
  allPlayers,
  onUpdatePelada,
  onAddNotification,
  onSelectPlayer,
  onOpenNewPelada,
  onOpenUserProfile,
}) => {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'waitlist' | 'pending' | 'unpaid'>('all');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPosition, setGuestPosition] = useState<'GK' | 'DEF' | 'MID' | 'ATT'>('MID');
  const [guestOverall, setGuestOverall] = useState(75);
  const [guestPhone, setGuestPhone] = useState('');

  if (!pelada) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl">
        <Users className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-white font-['Teko',sans-serif] uppercase tracking-wider text-3xl">
          Nenhuma Pelada para Gerenciar Presenças
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 mb-6">
          Crie ou selecione uma pelada para acompanhar confirmações, lista de espera e pagamentos PIX.
        </p>
        {onOpenNewPelada && (
          <button
            onClick={onOpenNewPelada}
            className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-black transition-all active:scale-95"
          >
            + Agendar Pelada
          </button>
        )}
      </div>
    );
  }

  const playersMap = new Map<string, Player>(allPlayers.map((p) => [p.id, p]));

  const confirmedList = pelada.confirmedPlayers.filter((p) => p.status === 'confirmed');
  const waitlistList = pelada.confirmedPlayers.filter((p) => p.status === 'waitlist');
  const pendingList = pelada.confirmedPlayers.filter((p) => p.status === 'pending');
  const declinedList = pelada.confirmedPlayers.filter((p) => p.status === 'declined');

  const spotsLeft = Math.max(0, pelada.maxPlayers - confirmedList.length);
  const isFull = confirmedList.length >= pelada.maxPlayers;

  // Filtered display list
  const filteredPlayers = pelada.confirmedPlayers.filter((cp) => {
    if (filter === 'confirmed') return cp.status === 'confirmed';
    if (filter === 'waitlist') return cp.status === 'waitlist';
    if (filter === 'pending') return cp.status === 'pending';
    if (filter === 'unpaid') return cp.paymentStatus !== 'paid' && cp.status === 'confirmed';
    return true;
  });

  const handleStatusChange = (playerId: string, newStatus: AttendanceStatus) => {
    let updatedConfirmed = [...pelada.confirmedPlayers];
    const existingIndex = updatedConfirmed.findIndex((p) => p.playerId === playerId);

    // If changing to confirmed but match is full, automatically place on waitlist
    let targetStatus = newStatus;
    if (newStatus === 'confirmed' && confirmedList.length >= pelada.maxPlayers) {
      const alreadyConfirmed = existingIndex >= 0 && updatedConfirmed[existingIndex].status === 'confirmed';
      if (!alreadyConfirmed) {
        targetStatus = 'waitlist';
        alert('O limite de vagas foi atingido! O jogador foi inserido na Lista de Espera.');
      }
    }

    if (existingIndex >= 0) {
      updatedConfirmed[existingIndex] = {
        ...updatedConfirmed[existingIndex],
        status: targetStatus,
        confirmedAt: targetStatus === 'confirmed' ? new Date().toISOString() : undefined,
      };
    } else {
      updatedConfirmed.push({
        playerId,
        status: targetStatus,
        paymentStatus: 'pending',
        paidAmount: 0,
        confirmedAt: targetStatus === 'confirmed' ? new Date().toISOString() : undefined,
      });
    }

    // Auto-promote from waitlist if someone declined and slot opened
    if (newStatus === 'declined') {
      const firstWaitlistIndex = updatedConfirmed.findIndex((p) => p.status === 'waitlist');
      if (firstWaitlistIndex >= 0) {
        updatedConfirmed[firstWaitlistIndex] = {
          ...updatedConfirmed[firstWaitlistIndex],
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
        };
        const promotedPlayer = playersMap.get(updatedConfirmed[firstWaitlistIndex].playerId);
        if (promotedPlayer) {
          alert(`🎉 Uma vaga abriu! ${promotedPlayer.nickname || promotedPlayer.name} foi promovido da lista de espera para os CONFIRMADOS!`);
        }
      }
    }

    onUpdatePelada({
      ...pelada,
      confirmedPlayers: updatedConfirmed,
    });
  };

  const handlePaymentStatusChange = (
    playerId: string,
    newStatus: PaymentStatus,
    method?: 'pix' | 'dinheiro' | 'cartao'
  ) => {
    const player = playersMap.get(playerId);
    const amount = player?.type === 'mensalista' ? pelada.priceMensalista : pelada.priceDiarista;

    const updated = pelada.confirmedPlayers.map((cp) => {
      if (cp.playerId === playerId) {
        return {
          ...cp,
          paymentStatus: newStatus,
          paidAmount: newStatus === 'paid' ? amount : 0,
          paymentMethod: newStatus === 'paid' ? (method || 'pix') : undefined,
          paymentDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return cp;
    });

    onUpdatePelada({
      ...pelada,
      confirmedPlayers: updated,
    });
  };

  const handleTriggerAutoNotification = (type: 'convite_24h' | 'lembrete_dia' | 'cobranca_pix') => {
    let title = '';
    let message = '';
    let count = 0;

    if (type === 'convite_24h') {
      title = '📢 Convocação Geral da Pelada';
      message = generateAttendanceMessage(pelada, playersMap);
      count = pelada.confirmedPlayers.length;
    } else if (type === 'lembrete_dia') {
      title = '⏰ Lembrete de Presença (24h)';
      message = generateReminderMessage(pelada, playersMap);
      count = pendingList.length + confirmedList.length;
    } else if (type === 'cobranca_pix') {
      title = '💸 Cobrança Automática de PIX';
      message = `Chave Pix da Pelada: ${pelada.pixKey} (${pelada.pixReceiverName}) - Mensalistas R$ ${pelada.priceMensalista} / Diaristas R$ ${pelada.priceDiarista}`;
      count = pelada.confirmedPlayers.filter((p) => p.paymentStatus !== 'paid' && p.status === 'confirmed').length;
    }

    const notif: NotificationLog = {
      id: `notif-${Date.now()}`,
      peladaId: pelada.id,
      type,
      title,
      message,
      sentAt: new Date().toISOString(),
      recipientsCount: count,
      channel: 'whatsapp',
    };

    onAddNotification(notif);

    // Open WhatsApp with message ready
    openWhatsAppWithText(message);
  };

  const handleCopyPixKey = () => {
    navigator.clipboard.writeText(pelada.pixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyWhatsAppList = () => {
    const text = generateAttendanceMessage(pelada, playersMap);
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Add guest / avulso player
  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    const newId = `guest-${Date.now()}`;
    const newGuestPlayer: Player = {
      id: newId,
      name: guestName.trim(),
      nickname: guestName.trim(),
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      position: guestPosition,
      type: 'diarista',
      overall: guestOverall,
      pace: guestOverall,
      shoot: guestOverall,
      pass: guestOverall,
      dribble: guestOverall,
      def: guestOverall,
      physical: guestOverall,
      dominantFoot: 'destro',
      phone: guestPhone,
      active: true,
      matchesCount: 1,
      wins: 0,
      draws: 0,
      losses: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      mvpCount: 0,
      bagreCount: 0,
      averageRating: 7.0,
      ratingsCount: 0,
      lastRatings: [],
      badges: ['Convidado'],
    };

    // Add to players list and confirm
    allPlayers.push(newGuestPlayer);

    const targetStatus = confirmedList.length < pelada.maxPlayers ? 'confirmed' : 'waitlist';
    const updatedConfirmed = [
      ...pelada.confirmedPlayers,
      {
        playerId: newId,
        status: targetStatus,
        paymentStatus: 'pending',
        paidAmount: 0,
        confirmedAt: new Date().toISOString(),
      } as ConfirmedPlayer,
    ];

    onUpdatePelada({
      ...pelada,
      confirmedPlayers: updatedConfirmed,
    });

    setGuestName('');
    setGuestPhone('');
    setIsAddGuestModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Quick WhatsApp Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Lista de Presença
              </span>
              <span className="text-xs text-slate-400">
                {formatDateBR(pelada.date)} às {pelada.time}h • {pelada.location}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" />
              <span>{confirmedList.length} de {pelada.maxPlayers} Jogadores Confirmados</span>
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-300 mt-2">
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> {confirmedList.length} confirmados
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <Clock className="w-3.5 h-3.5" /> {waitlistList.length} na espera
              </span>
              <span className="flex items-center gap-1 font-bold text-slate-400">
                <HelpCircle className="w-3.5 h-3.5" /> {pendingList.length} pendentes
              </span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${spotsLeft === 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
                {spotsLeft === 0 ? '⛔ Vagas Esgotadas' : `🔥 ${spotsLeft} vagas restantes`}
              </span>
            </div>
          </div>

          {/* Quick Automation & WhatsApp Broadcast Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-broadcast-convocacao"
              onClick={() => handleTriggerAutoNotification('convite_24h')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
              title="Disparar lista formatada no WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              Disparar no WhatsApp
            </button>
            <button
              id="btn-copy-whatsapp-list"
              onClick={handleCopyWhatsAppList}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedMessage ? 'Copiado!' : 'Copiar Texto'}
            </button>
            <button
              id="btn-open-guest-modal"
              onClick={() => setIsAddGuestModalOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              + Convidado
            </button>
            {onOpenUserProfile && (
              <button
                id="btn-attendance-user-profile"
                onClick={onOpenUserProfile}
                className="px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Criar ou editar seu perfil de jogador"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Meu Perfil
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar of Capacity */}
        <div className="mt-4">
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                confirmedList.length >= pelada.maxPlayers ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (confirmedList.length / pelada.maxPlayers) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* PIX Quick Box Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-white">Chave PIX da Pelada ({pelada.pixKeyType}): <span className="text-emerald-400 font-mono">{pelada.pixKey}</span></p>
            <p className="text-[11px] text-slate-400">Favorecido: {pelada.pixReceiverName} • Mensalistas: {formatCurrency(pelada.priceMensalista)} | Diaristas: {formatCurrency(pelada.priceDiarista)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-copy-pix-banner"
            onClick={handleCopyPixKey}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey ? 'Chave Copiada!' : 'Copiar PIX'}
          </button>
          <button
            id="btn-notify-pix-unpaid"
            onClick={() => handleTriggerAutoNotification('cobranca_pix')}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            Cobrar Pendentes
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
          {[
            { id: 'all', label: 'Todos', count: pelada.confirmedPlayers.length },
            { id: 'confirmed', label: 'Confirmados', count: confirmedList.length },
            { id: 'waitlist', label: 'Espera', count: waitlistList.length },
            { id: 'pending', label: 'Pendentes', count: pendingList.length },
            { id: 'unpaid', label: 'PIX Pendente', count: pelada.confirmedPlayers.filter((p) => p.paymentStatus !== 'paid' && p.status === 'confirmed').length },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`tab-filter-${tab.id}`}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filter === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filter === tab.id ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Players Attendance Table / Cards */}
      <div className="space-y-2.5">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300 font-bold">Nenhum jogador encontrado nesta categoria.</p>
            <p className="text-xs text-slate-500 mt-1">Altere o filtro acima ou convide jogadores pelo WhatsApp.</p>
          </div>
        ) : (
          filteredPlayers.map((cp, idx) => {
            const player = playersMap.get(cp.playerId);
            if (!player) return null;

            const isConfirmed = cp.status === 'confirmed';
            const isWaitlist = cp.status === 'waitlist';
            const isPaid = cp.paymentStatus === 'paid';

            return (
              <div
                key={cp.playerId}
                id={`attendance-row-${cp.playerId}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all"
              >
                {/* Player identity info */}
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => onSelectPlayer(player)}
                >
                  <span className="text-xs font-extrabold text-slate-500 w-5 text-center">
                    {idx + 1}
                  </span>
                  <div className="relative">
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                    />
                    <span className="absolute -bottom-1 -right-1 text-[9px] font-black px-1 rounded bg-amber-400 text-slate-950">
                      {player.overall}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white hover:text-emerald-400 transition-colors">
                        {player.nickname || player.name}
                      </h4>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {player.position}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 capitalize">
                        {player.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {player.name} • {player.phone || 'Sem telefone'}
                    </p>
                  </div>
                </div>

                {/* Status Toggles & Payment Status */}
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  {/* Presence Status Select Button Group */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      id={`btn-confirm-${cp.playerId}`}
                      onClick={() => handleStatusChange(cp.playerId, 'confirmed')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        isConfirmed
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-emerald-400'
                      }`}
                      title="Confirmar presença"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isConfirmed ? 'Confirmado' : 'Confirmar'}</span>
                    </button>
                    <button
                      id={`btn-waitlist-${cp.playerId}`}
                      onClick={() => handleStatusChange(cp.playerId, 'waitlist')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        isWaitlist
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-amber-400'
                      }`}
                      title="Mover para lista de espera"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isWaitlist ? 'Espera' : 'Espera'}</span>
                    </button>
                    <button
                      id={`btn-decline-${cp.playerId}`}
                      onClick={() => handleStatusChange(cp.playerId, 'declined')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        cp.status === 'declined'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-rose-400'
                      }`}
                      title="Recusar presença"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Recusar</span>
                    </button>
                  </div>

                  {/* Payment Status Dropdown / Quick Toggle */}
                  <div className="flex items-center gap-1.5">
                    {isPaid ? (
                      <button
                        id={`btn-pay-status-${cp.playerId}`}
                        onClick={() => handlePaymentStatusChange(cp.playerId, 'pending')}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Clique para desmarcar pagamento"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pago {formatCurrency(cp.paidAmount || (player.type === 'mensalista' ? pelada.priceMensalista : pelada.priceDiarista))}</span>
                      </button>
                    ) : (
                      <button
                        id={`btn-mark-paid-${cp.playerId}`}
                        onClick={() => handlePaymentStatusChange(cp.playerId, 'paid', 'pix')}
                        className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Marcar como Pago via PIX"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pagar {formatCurrency(player.type === 'mensalista' ? pelada.priceMensalista : pelada.priceDiarista)}</span>
                      </button>
                    )}

                    {/* Direct Individual WhatsApp Billing Link */}
                    {player.phone && !isPaid && (
                      <button
                        id={`btn-send-pix-msg-${cp.playerId}`}
                        onClick={() => {
                          const msg = generatePixBillingMessage(pelada, cp, player);
                          openWhatsAppWithText(msg, player.phone);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl border border-slate-700 transition-colors"
                        title="Enviar cobrança individual no WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Guest Modal */}
      {isAddGuestModalOpen && (
        <div
          id="add-guest-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsAddGuestModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Adicionar Convidado / Diarista
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cadastre um jogador avulso para participar desta pelada.
            </p>

            <form onSubmit={handleAddGuest} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Nome / Apelido</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ex: Pedrinho do Bairro"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Posição</label>
                  <select
                    value={guestPosition}
                    onChange={(e) => setGuestPosition(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="GK">Goleiro (GK)</option>
                    <option value="DEF">Zagueiro (DEF)</option>
                    <option value="MID">Meia (MID)</option>
                    <option value="ATT">Atacante (ATT)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nível / Overall: {guestOverall}</label>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    value={guestOverall}
                    onChange={(e) => setGuestOverall(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">WhatsApp (Opcional)</label>
                <input
                  type="text"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddGuestModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-colors"
                >
                  Adicionar à Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
