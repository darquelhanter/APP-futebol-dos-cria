import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Pelada, Player, ConfirmedPlayer, AttendanceStatus, PaymentStatus, NotificationLog } from '../types';
import { isPeladaAdmin } from '../utils/permissions';
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
  currentUser?: FirebaseUser | null;
  onUpdatePelada: (updated: Pelada) => void;
  onAddPlayer: (player: Player) => void;
  onAddNotification: (notif: NotificationLog) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenNewPelada?: () => void;
  onOpenUserProfile?: () => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  pelada,
  allPlayers,
  currentUser,
  onUpdatePelada,
  onAddPlayer,
  onAddNotification,
  onSelectPlayer,
  onOpenNewPelada,
  onOpenUserProfile,
}) => {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'waitlist' | 'pending' | 'unpaid'>('all');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [addPlayerTab, setAddPlayerTab] = useState<'existing' | 'new'>('existing');
  const [selectedExistingPlayerId, setSelectedExistingPlayerId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPosition, setGuestPosition] = useState<'GK' | 'DEF' | 'MID' | 'ATT'>('MID');
  const [guestOverall, setGuestOverall] = useState(75);
  const [guestPhone, setGuestPhone] = useState('');

  if (!pelada) {
    return (
      <div className="rounded-3xl bg-gramado-card border border-gramado-light p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl">
        <Users className="w-16 h-16 text-capim-light mx-auto mb-4" />
        <h2 className="text-2xl font-black text-giz font-['Teko',sans-serif] uppercase tracking-wider text-3xl">
          Nenhuma Pelada para Gerenciar Presenças
        </h2>
        <p className="text-xs sm:text-sm text-giz/70 mt-2 mb-6">
          Crie ou selecione uma pelada para acompanhar confirmações, lista de espera e pagamentos PIX.
        </p>
        {onOpenNewPelada && (
          <button
            onClick={onOpenNewPelada}
            className="px-6 py-3.5 bg-capim hover:bg-capim text-giz rounded-2xl text-sm font-black transition-all active:scale-95"
          >
            + Agendar Pelada
          </button>
        )}
      </div>
    );
  }

  const playersMap = new Map<string, Player>(allPlayers.map((p) => [p.id, p]));

  const isAdmin = isPeladaAdmin(pelada, currentUser || null);

  // Only the pelada admin can change someone else's status; a regular
  // authorized user can only confirm/decline their own presence.
  const canEditStatus = (playerId: string) => {
    if (isAdmin) return true;
    const targetPlayer = playersMap.get(playerId);
    if (!targetPlayer || !currentUser) return false;
    if (currentUser.uid && targetPlayer.userId === currentUser.uid) return true;
    if (currentUser.email && targetPlayer.userEmail === currentUser.email) return true;
    return false;
  };

  const confirmedList = pelada.confirmedPlayers.filter((p) => p.status === 'confirmed');
  const waitlistList = pelada.confirmedPlayers.filter((p) => p.status === 'waitlist');
  const pendingList = pelada.confirmedPlayers.filter((p) => p.status === 'pending');
  const declinedList = pelada.confirmedPlayers.filter((p) => p.status === 'declined');

  // Registered players not yet on this pelada's list, for the "Jogador Cadastrado" tab
  const registeredPlayerIds = new Set(pelada.confirmedPlayers.map((cp) => cp.playerId));
  const availableExistingPlayers = allPlayers.filter((p) => !registeredPlayerIds.has(p.id));

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
    if (!canEditStatus(playerId)) return;
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
    if (!isAdmin) return;
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

  // Confirm an already-registered player (from the Elenco) into this pelada
  const handleConfirmExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingPlayerId) return;

    const targetStatus = confirmedList.length < pelada.maxPlayers ? 'confirmed' : 'waitlist';
    const updatedConfirmed: ConfirmedPlayer[] = [
      ...pelada.confirmedPlayers,
      {
        playerId: selectedExistingPlayerId,
        status: targetStatus,
        paymentStatus: 'pending',
        paidAmount: 0,
        confirmedAt: new Date().toISOString(),
      },
    ];

    onUpdatePelada({
      ...pelada,
      confirmedPlayers: updatedConfirmed,
    });

    setSelectedExistingPlayerId('');
    setIsAddGuestModalOpen(false);
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
    onAddPlayer(newGuestPlayer);

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
      <div className="bg-gradient-to-r from-gramado-card via-gramado-card/95 to-gramado p-5 rounded-3xl border border-gramado-light shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-capim-light bg-capim/10 px-2.5 py-0.5 rounded-full border border-capim/30">
                Lista de Presença
              </span>
              <span className="text-xs text-giz/50">
                {formatDateBR(pelada.date)} às {pelada.time}h • {pelada.location}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-giz flex items-center gap-2">
              <Users className="w-6 h-6 text-capim-light" />
              <span>{confirmedList.length} de {pelada.maxPlayers} Jogadores Confirmados</span>
            </h2>
            <div className="flex items-center gap-3 text-xs text-giz/70 mt-2">
              <span className="flex items-center gap-1 font-bold text-capim-light">
                <CheckCircle2 className="w-3.5 h-3.5" /> {confirmedList.length} confirmados
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <Clock className="w-3.5 h-3.5" /> {waitlistList.length} na espera
              </span>
              <span className="flex items-center gap-1 font-bold text-giz/50">
                <HelpCircle className="w-3.5 h-3.5" /> {pendingList.length} pendentes
              </span>
              <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${spotsLeft === 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-capim/20 text-capim-light border border-capim/40'}`}>
                {spotsLeft === 0 ? '⛔ Vagas Esgotadas' : `🔥 ${spotsLeft} vagas restantes`}
              </span>
            </div>
          </div>

          {/* Quick Automation & WhatsApp Broadcast Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-broadcast-convocacao"
              onClick={() => handleTriggerAutoNotification('convite_24h')}
              className="px-3.5 py-2 bg-capim hover:bg-capim text-giz rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-capim/20 transition-all"
              title="Disparar lista formatada no WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              Disparar no WhatsApp
            </button>
            <button
              id="btn-copy-whatsapp-list"
              onClick={handleCopyWhatsAppList}
              className="px-3 py-2 bg-gramado-light hover:bg-giz/15 text-giz/85 border border-giz/15 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5 text-capim-light" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedMessage ? 'Copiado!' : 'Copiar Texto'}
            </button>
            <button
              id="btn-open-guest-modal"
              onClick={() => {
                setAddPlayerTab(availableExistingPlayers.length > 0 ? 'existing' : 'new');
                setIsAddGuestModalOpen(true);
              }}
              className="px-3 py-2 bg-gramado-light hover:bg-giz/15 text-giz/85 border border-giz/15 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-capim-light" />
              + Adicionar Jogador
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
          <div className="h-2 w-full bg-gramado-light rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                confirmedList.length >= pelada.maxPlayers ? 'bg-rose-500' : 'bg-capim'
              }`}
              style={{ width: `${Math.min(100, (confirmedList.length / pelada.maxPlayers) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* PIX Quick Box Banner */}
      <div className="bg-gramado-card/90 border border-gramado-light p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-capim/10 border border-capim/30 flex items-center justify-center text-capim-light">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-giz">Chave PIX da Pelada ({pelada.pixKeyType}): <span className="text-capim-light font-mono">{pelada.pixKey}</span></p>
            <p className="text-[11px] text-giz/50">Favorecido: {pelada.pixReceiverName} • Mensalistas: {formatCurrency(pelada.priceMensalista)} | Diaristas: {formatCurrency(pelada.priceDiarista)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-copy-pix-banner"
            onClick={handleCopyPixKey}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-gramado-light hover:bg-giz/15 text-giz/85 text-xs font-bold rounded-xl border border-giz/15 flex items-center justify-center gap-1.5 transition-colors"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-capim-light" /> : <Copy className="w-3.5 h-3.5" />}
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
        <div className="flex items-center gap-1.5 bg-gramado-card/80 p-1 rounded-2xl border border-gramado-light">
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
                  ? 'bg-capim text-giz shadow-md'
                  : 'text-giz/50 hover:text-giz/85 hover:bg-gramado-light'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filter === tab.id ? 'bg-gramado-light text-giz' : 'bg-gramado-light text-giz/50'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Players Attendance Table / Cards */}
      <div className="space-y-2.5">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-12 bg-gramado-card/40 rounded-3xl border border-gramado-light">
            <Users className="w-10 h-10 text-giz/25 mx-auto mb-2" />
            <p className="text-giz/70 font-bold">Nenhum jogador encontrado nesta categoria.</p>
            <p className="text-xs text-giz/35 mt-1">Altere o filtro acima ou convide jogadores pelo WhatsApp.</p>
          </div>
        ) : (
          filteredPlayers.map((cp, idx) => {
            const player = playersMap.get(cp.playerId);
            if (!player) return null;

            const isConfirmed = cp.status === 'confirmed';
            const isWaitlist = cp.status === 'waitlist';
            const isPaid = cp.paymentStatus === 'paid';
            const canEditThisRow = canEditStatus(cp.playerId);

            return (
              <div
                key={cp.playerId}
                id={`attendance-row-${cp.playerId}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gramado-card/80 hover:bg-gramado-card border border-gramado-light hover:border-giz/15 rounded-2xl transition-all"
              >
                {/* Player identity info */}
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => onSelectPlayer(player)}
                >
                  <span className="text-xs font-extrabold text-giz/35 w-5 text-center">
                    {idx + 1}
                  </span>
                  <div className="relative">
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-giz/15"
                    />
                    <span className="absolute -bottom-1 -right-1 text-[9px] font-black px-1 rounded bg-amber-400 text-gramado">
                      {player.overall}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-giz hover:text-capim-light transition-colors">
                        {player.nickname || player.name}
                      </h4>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-gramado-light text-giz/70 border border-giz/15">
                        {player.position}
                      </span>
                      <span className="text-[10px] font-medium text-giz/50 capitalize">
                        {player.type}
                      </span>
                    </div>
                    <p className="text-xs text-giz/50">
                      {player.name} • {player.phone || 'Sem telefone'}
                    </p>
                  </div>
                </div>

                {/* Status Toggles & Payment Status */}
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  {/* Presence Status Select Button Group */}
                  <div className="flex items-center gap-1 bg-gramado p-1 rounded-xl border border-gramado-light">
                    <button
                      id={`btn-confirm-${cp.playerId}`}
                      onClick={() => handleStatusChange(cp.playerId, 'confirmed')}
                      disabled={!canEditThisRow}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        !canEditThisRow
                          ? 'opacity-40 cursor-not-allowed'
                          : ''
                      } ${
                        isConfirmed
                          ? 'bg-capim text-gramado shadow-sm'
                          : 'text-giz/50 hover:text-capim-light'
                      }`}
                      title={canEditThisRow ? 'Confirmar presença' : 'Só o administrador pode alterar a presença de outros atletas'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isConfirmed ? 'Confirmado' : 'Confirmar'}</span>
                    </button>
                    <button
                      id={`btn-waitlist-${cp.playerId}`}
                      onClick={() => handleStatusChange(cp.playerId, 'waitlist')}
                      disabled={!canEditThisRow}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        !canEditThisRow
                          ? 'opacity-40 cursor-not-allowed'
                          : ''
                      } ${
                        isWaitlist
                          ? 'bg-amber-500 text-gramado shadow-sm'
                          : 'text-giz/50 hover:text-amber-400'
                      }`}
                      title={canEditThisRow ? 'Mover para lista de espera' : 'Só o administrador pode alterar a presença de outros atletas'}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isWaitlist ? 'Espera' : 'Espera'}</span>
                    </button>
                    <button
                      id={`btn-decline-${cp.playerId}`}
                      onClick={() => handleStatusChange(cp.playerId, 'declined')}
                      disabled={!canEditThisRow}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        !canEditThisRow
                          ? 'opacity-40 cursor-not-allowed'
                          : ''
                      } ${
                        cp.status === 'declined'
                          ? 'bg-rose-500 text-giz shadow-sm'
                          : 'text-giz/50 hover:text-rose-400'
                      }`}
                      title={canEditThisRow ? 'Recusar presença' : 'Só o administrador pode alterar a presença de outros atletas'}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Recusar</span>
                    </button>
                  </div>

                  {/* Payment Status Dropdown / Quick Toggle — admin only */}
                  <div className="flex items-center gap-1.5">
                    {isPaid ? (
                      <button
                        id={`btn-pay-status-${cp.playerId}`}
                        onClick={() => handlePaymentStatusChange(cp.playerId, 'pending')}
                        disabled={!isAdmin}
                        className={`px-2.5 py-1 rounded-xl bg-capim/10 border border-capim/30 text-xs font-bold flex items-center gap-1 transition-colors ${
                          isAdmin ? 'hover:bg-capim/20 text-capim-light' : 'text-capim-light/50 cursor-not-allowed'
                        }`}
                        title={isAdmin ? 'Clique para desmarcar pagamento' : 'Só o administrador pode alterar pagamentos'}
                      >
                        <Check className="w-3.5 h-3.5 text-capim-light" />
                        <span>Pago {formatCurrency(cp.paidAmount || (player.type === 'mensalista' ? pelada.priceMensalista : pelada.priceDiarista))}</span>
                      </button>
                    ) : (
                      <button
                        id={`btn-mark-paid-${cp.playerId}`}
                        onClick={() => handlePaymentStatusChange(cp.playerId, 'paid', 'pix')}
                        disabled={!isAdmin}
                        className={`px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition-colors ${
                          isAdmin ? 'hover:bg-amber-500/20 text-amber-300' : 'text-amber-300/50 cursor-not-allowed'
                        }`}
                        title={isAdmin ? 'Marcar como Pago via PIX' : 'Só o administrador pode alterar pagamentos'}
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
                        className="p-1.5 bg-gramado-light hover:bg-giz/15 text-capim-light rounded-xl border border-giz/15 transition-colors"
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
            className="w-full max-w-md bg-gramado-card border border-gramado-light rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-giz mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-capim-light" />
              Adicionar Jogador à Pelada
            </h3>
            <p className="text-xs text-giz/50 mb-4">
              Confirme alguém que já está no elenco ou cadastre um convidado novo.
            </p>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gramado p-1 rounded-xl border border-gramado-light text-xs mb-4">
              <button
                type="button"
                id="add-player-tab-existing"
                onClick={() => setAddPlayerTab('existing')}
                className={`flex-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  addPlayerTab === 'existing' ? 'bg-capim text-giz' : 'text-giz/50 hover:text-giz'
                }`}
              >
                Jogador Cadastrado
              </button>
              <button
                type="button"
                id="add-player-tab-new"
                onClick={() => setAddPlayerTab('new')}
                className={`flex-1 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  addPlayerTab === 'new' ? 'bg-capim text-giz' : 'text-giz/50 hover:text-giz'
                }`}
              >
                Convidado Novo
              </button>
            </div>

            {addPlayerTab === 'existing' ? (
              <form onSubmit={handleConfirmExisting} className="space-y-3.5 text-xs">
                {availableExistingPlayers.length === 0 ? (
                  <p className="text-giz/50 py-4 text-center">
                    Todos os jogadores do elenco já estão nesta pelada. Cadastre um convidado novo na outra aba.
                  </p>
                ) : (
                  <div>
                    <label className="text-giz/70 font-bold block mb-1">Selecione o Jogador</label>
                    <select
                      required
                      value={selectedExistingPlayerId}
                      onChange={(e) => setSelectedExistingPlayerId(e.target.value)}
                      className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim"
                    >
                      <option value="" disabled>Escolha um atleta do elenco...</option>
                      {availableExistingPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nickname || p.name} ({p.position})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gramado-light">
                  <button
                    type="button"
                    onClick={() => setIsAddGuestModalOpen(false)}
                    className="px-4 py-2 bg-gramado-light text-giz/70 rounded-xl font-bold hover:bg-giz/15"
                  >
                    Cancelar
                  </button>
                  {availableExistingPlayers.length > 0 && (
                    <button
                      type="submit"
                      className="px-5 py-2 bg-capim hover:bg-capim text-giz rounded-xl font-bold shadow-lg transition-colors"
                    >
                      Confirmar na Lista
                    </button>
                  )}
                </div>
              </form>
            ) : (
            <form onSubmit={handleAddGuest} className="space-y-3.5 text-xs">
              <div>
                <label className="text-giz/70 font-bold block mb-1">Nome / Apelido</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ex: Pedrinho do Bairro"
                  className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-giz/70 font-bold block mb-1">Posição</label>
                  <select
                    value={guestPosition}
                    onChange={(e) => setGuestPosition(e.target.value as any)}
                    className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim"
                  >
                    <option value="GK">Goleiro (GK)</option>
                    <option value="DEF">Zagueiro (DEF)</option>
                    <option value="MID">Meia (MID)</option>
                    <option value="ATT">Atacante (ATT)</option>
                  </select>
                </div>
                <div>
                  <label className="text-giz/70 font-bold block mb-1">Nível / Overall: {guestOverall}</label>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    value={guestOverall}
                    onChange={(e) => setGuestOverall(parseInt(e.target.value, 10))}
                    className="w-full accent-capim mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-giz/70 font-bold block mb-1">WhatsApp (Opcional)</label>
                <input
                  type="text"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gramado-light">
                <button
                  type="button"
                  onClick={() => setIsAddGuestModalOpen(false)}
                  className="px-4 py-2 bg-gramado-light text-giz/70 rounded-xl font-bold hover:bg-giz/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-capim hover:bg-capim text-giz rounded-xl font-bold shadow-lg transition-colors"
                >
                  Adicionar à Lista
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
