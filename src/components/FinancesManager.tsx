import React, { useState } from 'react';
import { Pelada, Player, Expense, ConfirmedPlayer, PaymentStatus } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { isPeladaCreator, isPeladaAdmin } from '../utils/permissions';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Plus,
  Trash2,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  QrCode,
  FileSpreadsheet
} from 'lucide-react';
import { formatCurrency, formatDateBR, generatePixBillingMessage, openWhatsAppWithText } from '../utils/whatsappGenerator';

interface FinancesManagerProps {
  pelada?: Pelada | null;
  allPlayers: Player[];
  currentUser?: FirebaseUser | null;
  onUpdatePelada: (updated: Pelada) => void;
  onSelectPlayer: (player: Player) => void;
}

export const FinancesManager: React.FC<FinancesManagerProps> = ({
  pelada,
  allPlayers,
  currentUser,
  onUpdatePelada,
  onSelectPlayer,
}) => {
  const [filter, setFilter] = useState<'all' | 'mensalistas' | 'diaristas' | 'unpaid' | 'paid'>('all');
  const [copiedKey, setCopiedKey] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(80);
  const [expenseCategory, setExpenseCategory] = useState<Expense['category']>('aluguel_campo');
  const [isExpensePaid, setIsExpensePaid] = useState(true);

  if (!pelada) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl">
        <DollarSign className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-white font-['Teko',sans-serif] uppercase tracking-wider text-3xl">
          Nenhum Caixa / Pelada Ativa
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 mb-4">
          Crie ou selecione uma pelada para gerenciar os pagamentos PIX e despesas da quadra.
        </p>
      </div>
    );
  }

  const playersMap = new Map<string, Player>(allPlayers.map((p) => [p.id, p]));

  // Calculate totals
  const totalArrecadado = pelada.confirmedPlayers
    .filter((cp) => cp.paymentStatus === 'paid')
    .reduce((sum, cp) => sum + (cp.paidAmount || (playersMap.get(cp.playerId)?.type === 'mensalista' ? pelada.priceMensalista : pelada.priceDiarista)), 0);

  const totalPendente = pelada.confirmedPlayers
    .filter((cp) => cp.paymentStatus !== 'paid' && cp.status === 'confirmed')
    .reduce((sum, cp) => sum + (playersMap.get(cp.playerId)?.type === 'mensalista' ? pelada.priceMensalista : pelada.priceDiarista), 0);

  const totalGastos = (pelada.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
  const saldoCaixa = totalArrecadado - totalGastos;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pelada.pixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleTogglePayment = (playerId: string, currentStatus: PaymentStatus) => {
    const p = playersMap.get(playerId);
    const amount = p?.type === 'mensalista' ? pelada.priceMensalista : pelada.priceDiarista;
    const newStatus: PaymentStatus = currentStatus === 'paid' ? 'pending' : 'paid';

    const updated = pelada.confirmedPlayers.map((cp) => {
      if (cp.playerId === playerId) {
        return {
          ...cp,
          paymentStatus: newStatus,
          paidAmount: newStatus === 'paid' ? amount : 0,
          paymentMethod: newStatus === 'paid' ? ('pix' as const) : undefined,
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

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || expenseAmount <= 0) return;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      description: expenseDesc.trim(),
      amount: expenseAmount,
      category: expenseCategory,
      paidDate: new Date().toISOString().split('T')[0],
      isPaid: isExpensePaid,
    };

    onUpdatePelada({
      ...pelada,
      expenses: [...(pelada.expenses || []), newExpense],
    });

    setExpenseDesc('');
    setExpenseAmount(80);
    setIsAddExpenseModalOpen(false);
  };

  const handleDeleteExpense = (id: string) => {
    if (!isPeladaAdmin(pelada, currentUser)) {
      alert('Apenas quem criou a pelada ou administradores autorizados podem excluir despesas!');
      return;
    }
    if (window.confirm('Deseja excluir este lançamento de despesa?')) {
      onUpdatePelada({
        ...pelada,
        expenses: pelada.expenses.filter((e) => e.id !== id),
      });
    }
  };

  const filteredPlayers = pelada.confirmedPlayers.filter((cp) => {
    const player = playersMap.get(cp.playerId);
    if (!player) return false;
    if (filter === 'mensalistas') return player.type === 'mensalista';
    if (filter === 'diaristas') return player.type === 'diarista';
    if (filter === 'unpaid') return cp.paymentStatus !== 'paid' && cp.status === 'confirmed';
    if (filter === 'paid') return cp.paymentStatus === 'paid';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Financial KPIs Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Arrecadado</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(totalArrecadado)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Pagamentos confirmados</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">A Receber</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{formatCurrency(totalPendente)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Pendentes de confirmação</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Despesas / Custos</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{formatCurrency(totalGastos)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Quadra, juiz, bolas, etc.</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Saldo em Caixa</p>
            <p className={`text-2xl font-black mt-1 ${saldoCaixa >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(saldoCaixa)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Líquido da Pelada</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* PIX Details & Quick Billing Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <QrCode className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Chave PIX Oficial
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-lg font-black text-white font-mono">{pelada.pixKey}</span>
              <span className="text-xs text-slate-400 font-bold uppercase">({pelada.pixKeyType})</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Beneficiário: <strong className="text-slate-200">{pelada.pixReceiverName}</strong> • Mensalistas: {formatCurrency(pelada.priceMensalista)} | Diaristas: {formatCurrency(pelada.priceDiarista)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            id="btn-copy-pix-finance"
            onClick={handleCopyPix}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
          >
            {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedKey ? 'Chave Copiada!' : 'Copiar Chave PIX'}
          </button>
          <button
            id="btn-add-expense-open"
            onClick={() => setIsAddExpenseModalOpen(true)}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            + Nova Despesa
          </button>
        </div>
      </div>

      {/* Two Columns: Player Payments & Expenses Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Player Payments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Controle de Mensalidades & Diárias
            </h3>

            {/* Filters */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'unpaid', label: 'Pendentes' },
                { id: 'paid', label: 'Pagos' },
                { id: 'mensalistas', label: 'Mensal' },
                { id: 'diaristas', label: 'Diária' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    filter === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredPlayers.map((cp) => {
              const player = playersMap.get(cp.playerId);
              if (!player) return null;
              const isPaid = cp.paymentStatus === 'paid';
              const expectedAmount = player.type === 'mensalista' ? pelada.priceMensalista : pelada.priceDiarista;

              return (
                <div
                  key={cp.playerId}
                  id={`finance-player-${cp.playerId}`}
                  className="flex items-center justify-between p-3.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 rounded-2xl transition-all"
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onSelectPlayer(player)}
                  >
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white hover:text-emerald-400 transition-colors">
                          {player.nickname || player.name}
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                          {player.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(expectedAmount)} • {isPaid ? `Pago (${cp.paymentMethod?.toUpperCase() || 'PIX'})` : 'Aguardando pagamento'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-toggle-pay-${cp.playerId}`}
                      onClick={() => handleTogglePayment(cp.playerId, cp.paymentStatus)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isPaid
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      {isPaid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{isPaid ? 'Pago' : 'Dar Baixa'}</span>
                    </button>

                    {player.phone && !isPaid && (
                      <button
                        id={`btn-pix-cobrar-${cp.playerId}`}
                        onClick={() => {
                          const msg = generatePixBillingMessage(pelada, cp, player);
                          openWhatsAppWithText(msg, player.phone);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl border border-slate-700 transition-colors"
                        title="Enviar cobrança no WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Expenses Ledger */}
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-rose-400" />
              Livro de Despesas
            </h3>
            <span className="text-xs font-black text-rose-400">
              {formatCurrency(totalGastos)}
            </span>
          </div>

          <div className="space-y-2.5">
            {pelada.expenses?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8 bg-slate-900/40 rounded-2xl border border-slate-800">
                Nenhuma despesa cadastrada.
              </p>
            ) : (
              pelada.expenses?.map((exp) => (
                <div
                  key={exp.id}
                  id={`expense-row-${exp.id}`}
                  className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h5 className="font-bold text-white">{exp.description}</h5>
                    <p className="text-[10px] text-slate-400">
                      {formatDateBR(exp.paidDate)} • <span className="capitalize">{exp.category.replace('_', ' ')}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-black text-rose-400">{formatCurrency(exp.amount)}</span>
                    <button
                      id={`btn-del-expense-${exp.id}`}
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Excluir despesa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddExpenseModalOpen && (
        <div
          id="add-expense-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsAddExpenseModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Adicionar Despesa da Pelada
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Registre custos de quadra, arbitragem, coletes, bolas ou resenha.
            </p>

            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Ex: Aluguel da Quadra / Juiz / Bolas Novas"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Categoria</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="aluguel_campo">Aluguel do Campo</option>
                    <option value="juiz">Árbitro / Juiz</option>
                    <option value="coletes_bolas">Coletes & Bolas</option>
                    <option value="resenha_churras">Resenha / Bebidas</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-colors"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
