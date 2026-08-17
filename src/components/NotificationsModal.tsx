import React, { useState } from 'react';
import { Pelada, Player, NotificationLog } from '../types';
import {
  Bell,
  X,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  Share2,
  Zap,
  DollarSign,
  Star
} from 'lucide-react';
import {
  generateAttendanceMessage,
  generateReminderMessage,
  generatePostGameReportMessage,
  openWhatsAppWithText
} from '../utils/whatsappGenerator';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationLog[];
  pelada?: Pelada | null;
  allPlayers: Player[];
  onAddNotification: (notif: NotificationLog) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  pelada,
  allPlayers,
  onAddNotification,
}) => {
  if (!isOpen) return null;

  const playersMap = new Map<string, Player>(allPlayers.map((p) => [p.id, p]));
  const [customMsg, setCustomMsg] = useState('');

  const handleSimulateAutomatedNotification = (type: 'convite_24h' | 'lembrete_dia' | 'cobranca_pix' | 'pos_jogo_votacao') => {
    let title = '';
    let message = '';
    let recipientsCount = 0;

    if (!pelada) {
      alert('Crie ou selecione uma pelada antes de disparar avisos e convocações!');
      return;
    }

    if (type === 'convite_24h') {
      title = '📢 Convocação Automática da Pelada';
      message = generateAttendanceMessage(pelada, playersMap);
      recipientsCount = pelada.confirmedPlayers.length;
    } else if (type === 'lembrete_dia') {
      title = '⏰ Lembrete de Presença (Faltam 24h)';
      message = generateReminderMessage(pelada, playersMap);
      recipientsCount = pelada.confirmedPlayers.filter((p) => p.status === 'pending').length || 10;
    } else if (type === 'cobranca_pix') {
      title = '💸 Cobrança Automática PIX para Pendentes';
      message = `Chave Pix Oficial: ${pelada.pixKey} (${pelada.pixReceiverName}) - Mensalistas R$ ${pelada.priceMensalista} / Diaristas R$ ${pelada.priceDiarista}`;
      recipientsCount = pelada.confirmedPlayers.filter((p) => p.paymentStatus !== 'paid').length;
    } else if (type === 'pos_jogo_votacao') {
      title = '⭐ Abertura da Votação de Craque & Bagre';
      message = generatePostGameReportMessage(pelada, playersMap);
      recipientsCount = pelada.confirmedPlayers.filter((p) => p.status === 'confirmed').length;
    }

    const newNotif: NotificationLog = {
      id: `notif-${Date.now()}`,
      peladaId: pelada.id,
      type,
      title,
      message,
      sentAt: new Date().toISOString(),
      recipientsCount,
      channel: 'whatsapp',
    };

    onAddNotification(newNotif);
    openWhatsAppWithText(message);
  };

  const handleSendCustomMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;

    const newNotif: NotificationLog = {
      id: `notif-${Date.now()}`,
      peladaId: pelada.id,
      type: 'convite_24h',
      title: '💬 Aviso Geral do Administrador',
      message: customMsg.trim(),
      sentAt: new Date().toISOString(),
      recipientsCount: pelada.confirmedPlayers.length,
      channel: 'whatsapp',
    };

    onAddNotification(newNotif);
    openWhatsAppWithText(customMsg.trim());
    setCustomMsg('');
  };

  return (
    <div
      id="notifications-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="notifications-modal-content"
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Central de Notificações Automáticas</h3>
              <p className="text-xs text-slate-400">Dispare avisos, lembretes de presença e cobranças PIX</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Automatic Triggers Grid */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Disparadores Automáticos (WhatsApp & Push)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="btn-auto-convite"
                onClick={() => handleSimulateAutomatedNotification('convite_24h')}
                className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-2xl text-left transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📢</span>
                  <h5 className="text-xs font-bold text-white group-hover:text-emerald-400">Convocação Oficial</h5>
                </div>
                <p className="text-[11px] text-slate-400">Envia lista de confirmados e lista de espera para o grupo.</p>
              </button>

              <button
                id="btn-auto-lembrete"
                onClick={() => handleSimulateAutomatedNotification('lembrete_dia')}
                className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl text-left transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">⏰</span>
                  <h5 className="text-xs font-bold text-white group-hover:text-amber-400">Lembrete 24h Antes</h5>
                </div>
                <p className="text-[11px] text-slate-400">Alerta os jogadores pendentes para confirmarem ou liberarem vaga.</p>
              </button>

              <button
                id="btn-auto-pix"
                onClick={() => handleSimulateAutomatedNotification('cobranca_pix')}
                className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-2xl text-left transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">💸</span>
                  <h5 className="text-xs font-bold text-white group-hover:text-emerald-400">Cobrança PIX em Massa</h5>
                </div>
                <p className="text-[11px] text-slate-400">Envia a chave PIX e valores para atletas com pagamento pendente.</p>
              </button>

              <button
                id="btn-auto-posjogo"
                onClick={() => handleSimulateAutomatedNotification('pos_jogo_votacao')}
                className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-2xl text-left transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">⭐</span>
                  <h5 className="text-xs font-bold text-white group-hover:text-indigo-400">Votação Pós-Jogo</h5>
                </div>
                <p className="text-[11px] text-slate-400">Avisa a galera para avaliar as notas individuais de Craque e Bagre.</p>
              </button>
            </div>
          </div>

          {/* Custom Announcement Form */}
          <form onSubmit={handleSendCustomMessage} className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Enviar Comunicado Personalizado:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="Ex: Pessoal, hoje a pelada começa 15min mais cedo..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Enviar
              </button>
            </div>
          </form>

          {/* History Log */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Histórico de Envios
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Nenhuma notificação enviada ainda.</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <h5 className="font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {n.title}
                      </h5>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(n.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
