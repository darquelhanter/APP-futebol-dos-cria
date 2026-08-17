import React, { useState } from 'react';
import { Pelada, Player } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { isPeladaCreator } from '../utils/permissions';
import {
  ShieldCheck,
  Crown,
  UserPlus,
  Trash2,
  X,
  Lock,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Users,
  ShieldAlert,
} from 'lucide-react';

interface PrivilegesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pelada: Pelada | null;
  currentUser: FirebaseUser | null;
  allPlayers: Player[];
  onUpdatePelada: (updated: Pelada) => void;
}

export const PrivilegesModal: React.FC<PrivilegesModalProps> = ({
  isOpen,
  onClose,
  pelada,
  currentUser,
  allPlayers,
  onUpdatePelada,
}) => {
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !pelada) return null;

  const isCreator = isPeladaCreator(pelada, currentUser);
  const creatorEmail = pelada.creatorEmail || currentUser?.email || 'Organizador Principal';
  const creatorName = pelada.creatorName || currentUser?.displayName || 'Criador da Pelada';
  const adminEmails = pelada.adminEmails || [];

  const handleAddAdminEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!isCreator) {
      setErrorMessage('Apenas o criador da pelada pode adicionar novos administradores.');
      return;
    }

    const emailToAdd = newAdminEmail.trim().toLowerCase();
    if (!emailToAdd) {
      setErrorMessage('Por favor, informe o e-mail Google do atleta.');
      return;
    }

    if (emailToAdd === (pelada.creatorEmail || currentUser?.email || '').toLowerCase()) {
      setErrorMessage('Este e-mail já é o Criador / Dono da pelada.');
      return;
    }

    if (adminEmails.map((e) => e.toLowerCase()).includes(emailToAdd)) {
      setErrorMessage('Este e-mail já possui privilégios de administrador.');
      return;
    }

    const updatedAdminEmails = [...adminEmails, emailToAdd];
    const updatedPelada: Pelada = {
      ...pelada,
      adminEmails: updatedAdminEmails,
    };

    onUpdatePelada(updatedPelada);
    setNewAdminEmail('');
    setSuccessMessage(`Privilégio concedido para ${emailToAdd}!`);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const handleRemoveAdminEmail = (emailToRemove: string) => {
    if (!isCreator) {
      alert('Apenas o criador da pelada pode remover administradores.');
      return;
    }

    if (window.confirm(`Deseja remover os privilégios de administrador de "${emailToRemove}"?`)) {
      const updatedAdminEmails = adminEmails.filter(
        (e) => e.toLowerCase() !== emailToRemove.toLowerCase()
      );
      const updatedPelada: Pelada = {
        ...pelada,
        adminEmails: updatedAdminEmails,
      };
      onUpdatePelada(updatedPelada);
      setSuccessMessage(`Privilégio removido de ${emailToRemove}.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div
      id="privileges-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="privileges-modal-content"
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-['Teko',sans-serif] uppercase tracking-wider text-2xl leading-none">
                Controle de Privilégios & Acessos
              </h3>
              <p className="text-xs text-slate-400">
                Defina quem pode gerenciar a pelada além do criador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Creator Information Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-900 border border-amber-500/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Criador & Dono da Pelada
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase">
                      Master
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    {creatorName}
                  </h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {creatorEmail}
                  </p>
                </div>
              </div>

              {isCreator && (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Você é o Criador
                </span>
              )}
            </div>

            {/* Rules explanation box */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Lock className="w-3.5 h-3.5" /> Poderes Exclusivos do Criador:
              </div>
              <p className="text-slate-400 pl-5">
                • Excluir a pelada ou excluir atletas do grupo.
              </p>
              <p className="text-slate-400 pl-5">
                • Conceder ou revogar privilégios para outros membros.
              </p>
              <p className="text-slate-400 pl-5">
                • Limpar ou resetar o banco de dados.
              </p>
            </div>
          </div>

          {/* If current user is NOT the creator */}
          {!isCreator && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">
                  Acesso Restrito ao Criador
                </span>
                Apenas o criador ({creatorEmail}) tem permissão para cadastrar ou excluir informações críticas e escolher quem recebe privilégios de administrador.
              </div>
            </div>
          )}

          {/* Add Admin Form (Only for Creator) */}
          {isCreator && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  Conceder Privilégios a Outro Membro
                </label>
                <span className="text-[10px] text-slate-400">
                  (Permite gerenciar presenças, sorteio e placar)
                </span>
              </div>

              <form onSubmit={handleAddAdminEmail} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="email.google@gmail.com do atleta"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Dar Privilégio</span>
                </button>
              </form>

              {errorMessage && (
                <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {successMessage}
                </div>
              )}
            </div>
          )}

          {/* List of Current Admins */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Administradores com Privilégios ({adminEmails.length})</span>
            </h4>

            {adminEmails.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-500">
                Nenhum administrador adicional configurado. Apenas o criador principal possui privilégios de gestão.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {adminEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-white truncate">{email}</div>
                        <div className="text-[10px] text-emerald-400">Admin Autorizado</div>
                      </div>
                    </div>

                    {isCreator && (
                      <button
                        onClick={() => handleRemoveAdminEmail(email)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors ml-2 shrink-0"
                        title="Remover privilégios deste usuário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
