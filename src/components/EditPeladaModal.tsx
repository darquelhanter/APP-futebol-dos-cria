import React, { useState, useEffect } from 'react';
import { Pelada } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { isPeladaAdmin, isPeladaCreator } from '../utils/permissions';
import {
  Edit3,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Repeat,
  X,
  Save,
  CheckCircle2,
  ShieldAlert,
  Crown,
  ShieldCheck,
  Link,
} from 'lucide-react';

interface EditPeladaModalProps {
  isOpen: boolean;
  onClose: () => void;
  pelada: Pelada | null;
  currentUser?: FirebaseUser | null;
  onUpdatePelada: (updated: Pelada) => void;
}

export const EditPeladaModal: React.FC<EditPeladaModalProps> = ({
  isOpen,
  onClose,
  pelada,
  currentUser,
  onUpdatePelada,
}) => {
  if (!isOpen || !pelada) return null;

  const isAdmin = isPeladaAdmin(pelada, currentUser);
  const isCreator = isPeladaCreator(pelada, currentUser);

  const [title, setTitle] = useState(pelada.title || '');
  const [location, setLocation] = useState(pelada.location || '');
  const [address, setAddress] = useState(pelada.address || '');
  const [date, setDate] = useState(pelada.date || '');
  const [time, setTime] = useState(pelada.time || '20:00');
  const [frequency, setFrequency] = useState<'semanal' | 'mensal' | 'quinzenal' | 'unica'>(
    pelada.frequency || 'semanal'
  );
  const [dayOfWeek, setDayOfWeek] = useState<
    'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado'
  >(pelada.dayOfWeek || 'terca');
  const [monthlyWeekPattern, setMonthlyWeekPattern] = useState<string>(
    pelada.monthlyWeekPattern || 'primeira_semana'
  );
  const [fieldType, setFieldType] = useState<'society' | 'campo' | 'futsal'>(
    pelada.fieldType || 'society'
  );
  const [playersPerTeam, setPlayersPerTeam] = useState<number>(pelada.playersPerTeam || 6);
  const [maxPlayers, setMaxPlayers] = useState<number>(pelada.maxPlayers || 14);
  const [priceMensalista, setPriceMensalista] = useState<number>(pelada.priceMensalista || 60);
  const [priceDiarista, setPriceDiarista] = useState<number>(pelada.priceDiarista || 25);
  const [pixKey, setPixKey] = useState(pelada.pixKey || '');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'telefone' | 'email' | 'aleatoria'>(
    pelada.pixKeyType || 'telefone'
  );
  const [pixReceiverName, setPixReceiverName] = useState(pelada.pixReceiverName || '');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState(pelada.whatsappGroupLink || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if pelada changes
  useEffect(() => {
    if (pelada) {
      setTitle(pelada.title || '');
      setLocation(pelada.location || '');
      setAddress(pelada.address || '');
      setDate(pelada.date || '');
      setTime(pelada.time || '20:00');
      setFrequency(pelada.frequency || 'semanal');
      setDayOfWeek(pelada.dayOfWeek || 'terca');
      setMonthlyWeekPattern(pelada.monthlyWeekPattern || 'primeira_semana');
      setFieldType(pelada.fieldType || 'society');
      setPlayersPerTeam(pelada.playersPerTeam || 6);
      setMaxPlayers(pelada.maxPlayers || 14);
      setPriceMensalista(pelada.priceMensalista || 60);
      setPriceDiarista(pelada.priceDiarista || 25);
      setPixKey(pelada.pixKey || '');
      setPixKeyType(pelada.pixKeyType || 'telefone');
      setPixReceiverName(pelada.pixReceiverName || '');
      setWhatsappGroupLink(pelada.whatsappGroupLink || '');
    }
  }, [pelada]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      alert('Apenas o criador ou administradores autorizados podem editar os dados da pelada!');
      return;
    }

    const updatedPelada: Pelada = {
      ...pelada,
      title: title.trim() || pelada.title,
      location: location.trim() || pelada.location,
      address: address.trim(),
      date,
      time,
      frequency,
      dayOfWeek: frequency !== 'unica' ? dayOfWeek : undefined,
      monthlyWeekPattern: frequency === 'mensal' ? monthlyWeekPattern : undefined,
      fieldType,
      playersPerTeam,
      maxPlayers,
      priceMensalista,
      priceDiarista,
      pixKey: pixKey.trim(),
      pixKeyType,
      pixReceiverName: pixReceiverName.trim() || 'Administrador',
      whatsappGroupLink: whatsappGroupLink.trim() || undefined,
    };

    onUpdatePelada(updatedPelada);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      id="edit-pelada-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="edit-pelada-modal-content"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Editar Dados da Pelada</h3>
              <p className="text-xs text-slate-400">Atualize horários, recorrência semanal/mensal, local e valores</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permissions check banner if not admin */}
        {!isAdmin && (
          <div className="m-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Apenas administradores autorizados ou o criador da pelada podem salvar alterações.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="text-slate-300 font-bold block mb-1">Título / Nome da Pelada</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Pelada de Terça dos Cria 🔥"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-medium disabled:opacity-50"
              />
            </div>

            {/* Recurrence & Frequency Selection */}
            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Repeat className="w-4 h-4" />
                <span>Tipo de Recorrência & Frequência</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'semanal', label: 'Toda Semana', desc: 'Semanal' },
                  { id: 'mensal', label: 'Mensal', desc: '1x por mês' },
                  { id: 'quinzenal', label: 'Quinzenal', desc: 'A cada 15 dias' },
                  { id: 'unica', label: 'Jogo Único', desc: 'Amistoso/Avulso' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setFrequency(item.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      frequency === item.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-400">{item.desc}</div>
                  </button>
                ))}
              </div>

              {/* If Mensal or Semanal, choose Day of the Week & Weekly Time */}
              {frequency !== 'unica' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      Dia da Semana Fixo
                    </label>
                    <select
                      disabled={!isAdmin}
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold text-emerald-400"
                    >
                      <option value="segunda">Segunda-feira</option>
                      <option value="terca">Terça-feira</option>
                      <option value="quarta">Quarta-feira</option>
                      <option value="quinta">Quinta-feira</option>
                      <option value="sexta">Sexta-feira</option>
                      <option value="sabado">Sábado</option>
                      <option value="domingo">Domingo</option>
                    </select>
                  </div>

                  {frequency === 'mensal' && (
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">
                        Padrão do Mês
                      </label>
                      <select
                        disabled={!isAdmin}
                        value={monthlyWeekPattern}
                        onChange={(e) => setMonthlyWeekPattern(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="primeira_semana">Todo 1º dia da semana no mês</option>
                        <option value="segunda_semana">Todo 2º dia da semana no mês</option>
                        <option value="terceira_semana">Todo 3º dia da semana no mês</option>
                        <option value="ultima_semana">Todo último dia da semana no mês</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Data da Partida Atual</label>
              <input
                type="date"
                required
                disabled={!isAdmin}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Horário de Início</label>
              <input
                type="time"
                required
                disabled={!isAdmin}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold text-emerald-400"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Local / Nome do Campo</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Arena Gol de Placa - Quadra 2"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Endereço do Local</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Rua dos Atletas, 120 - Bairro"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Tipo de Piso</label>
              <select
                disabled={!isAdmin}
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="society">Society (Grama Sintética)</option>
                <option value="futsal">Futsal (Quadra de Salão)</option>
                <option value="campo">Campo de Grama Natural</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Jogadores por Time</label>
              <select
                disabled={!isAdmin}
                value={playersPerTeam}
                onChange={(e) => setPlayersPerTeam(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value={5}>5x5 (Futsal / Society Pequeno)</option>
                <option value={6}>6x6 (Society Padrão)</option>
                <option value={7}>7x7 (Society Grande)</option>
                <option value={11}>11x11 (Campo Oficial)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Limite Máximo de Vagas</label>
              <input
                type="number"
                min="6"
                max="50"
                disabled={!isAdmin}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10) || 14)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Valor Mensalista (R$/mês)</label>
              <input
                type="number"
                min="0"
                disabled={!isAdmin}
                value={priceMensalista}
                onChange={(e) => setPriceMensalista(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold text-emerald-400"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Valor Diarista / Avulso (R$/jogo)</label>
              <input
                type="number"
                min="0"
                disabled={!isAdmin}
                value={priceDiarista}
                onChange={(e) => setPriceDiarista(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold text-amber-400"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Chave PIX para Cobrança</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Ex: 11987654321 ou email@pix.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Nome do Beneficiário PIX</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={pixReceiverName}
                onChange={(e) => setPixReceiverName(e.target.value)}
                placeholder="Ex: Carlos Eduardo (Admin)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-300 font-bold block mb-1">Link do Grupo do WhatsApp (Opcional)</label>
              <input
                type="url"
                disabled={!isAdmin}
                value={whatsappGroupLink}
                onChange={(e) => setWhatsappGroupLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Dados da pelada atualizados e sincronizados com sucesso!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            {isAdmin && (
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
