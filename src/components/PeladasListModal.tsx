import React from 'react';
import { Pelada, Player } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import {
  X,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ChevronRight,
  Shield,
  Trash2,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { isPeladaAdmin, isPeladaCreator } from '../utils/permissions';

interface PeladasListModalProps {
  isOpen: boolean;
  onClose: () => void;
  peladas: Pelada[];
  currentPeladaId: string;
  currentUser: FirebaseUser | null;
  onSelectPelada: (id: string) => void;
  onOpenNewPelada: () => void;
  onDeletePelada?: (id: string) => void;
}

export const PeladasListModal: React.FC<PeladasListModalProps> = ({
  isOpen,
  onClose,
  peladas,
  currentPeladaId,
  currentUser,
  onSelectPelada,
  onOpenNewPelada,
  onDeletePelada,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="peladas-list-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gramado/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="peladas-list-modal-card"
        className="relative w-full max-w-2xl bg-gramado-card border border-gramado-light rounded-3xl overflow-hidden shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-gramado-card via-gramado-card to-gramado border-b border-gramado-light flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-capim/20 border border-capim/30 flex items-center justify-center text-2xl shrink-0">
              ⚽
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-capim/20 text-capim-light text-[10px] font-black uppercase tracking-wider border border-capim/30">
                Comunidade em Tempo Real
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-giz font-['Teko',sans-serif] uppercase tracking-wider leading-none mt-1">
                Grupos & Peladas ({peladas.length})
              </h2>
            </div>
          </div>

          <button
            id="btn-close-peladas-list"
            onClick={onClose}
            className="p-2 rounded-xl bg-gramado-light/80 hover:bg-giz/15 text-giz/50 hover:text-giz transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-xs text-giz/50">
              Todas as peladas criadas por organizadores e participantes sincronizadas na nuvem.
            </p>
            <button
              id="btn-modal-new-pelada"
              onClick={() => {
                onClose();
                onOpenNewPelada();
              }}
              className="px-3.5 py-2 bg-capim hover:bg-capim text-giz rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-capim/20 transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Pelada</span>
            </button>
          </div>

          {peladas.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-gramado/60 border border-dashed border-gramado-light">
              <div className="w-14 h-14 mx-auto rounded-full bg-capim/10 flex items-center justify-center text-2xl mb-3">
                ⚽
              </div>
              <h3 className="text-base font-bold text-giz mb-1">Nenhuma pelada encontrada</h3>
              <p className="text-xs text-giz/50 max-w-sm mx-auto mb-4">
                Seja o primeiro a agendar uma pelada ou aguarde outros organizadores criarem grupos!
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenNewPelada();
                }}
                className="px-4 py-2 bg-capim hover:bg-capim text-giz text-xs font-black rounded-xl inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar a Primeira Pelada
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {peladas.map((p) => {
                const isSelected = p.id === currentPeladaId;
                const confirmedCount = p.confirmedPlayers?.filter((cp) => cp.status === 'confirmed').length || 0;
                const isAdmin = isPeladaAdmin(p, currentUser);
                const isCreator = isPeladaCreator(p, currentUser);

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-gramado-card/40 border-capim/60 shadow-lg shadow-gramado-card/30'
                        : 'bg-gramado/60 hover:bg-gramado-light/80 border-gramado-light hover:border-giz/15'
                    }`}
                    onClick={() => {
                      onSelectPelada(p.id);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                          isSelected
                            ? 'bg-capim text-gramado border-capim-light'
                            : 'bg-gramado-card text-capim-light border-giz/15'
                        }`}
                      >
                        {p.fieldType === 'futsal' ? '🥅' : p.fieldType === 'campo' ? '🌱' : '🏟️'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-giz truncate">{p.title}</h4>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-capim/20 text-capim-light text-[10px] font-black uppercase border border-capim/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ativa
                            </span>
                          )}
                          {isCreator && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase border border-amber-500/30">
                              Criador
                            </span>
                          )}
                          {!isCreator && p.creatorName && (
                            <span className="text-[10px] text-giz/50 truncate">
                              por <strong>{p.creatorName}</strong>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-giz/50 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-giz/35" />
                            {p.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-giz/35" />
                            {p.time}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-giz/35 shrink-0" />
                            <span className="truncate max-w-[150px]">{p.location}</span>
                          </span>
                          <span className="flex items-center gap-1 text-capim-light font-bold">
                            <Users className="w-3.5 h-3.5" />
                            {confirmedCount}/{p.maxPlayers}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPelada(p.id);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-capim text-gramado font-black'
                            : 'bg-gramado-light hover:bg-capim text-giz/85 hover:text-giz'
                        }`}
                      >
                        <span>{isSelected ? 'Selecionada' : 'Entrar'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {isAdmin && onDeletePelada && peladas.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Tem certeza que deseja excluir "${p.title}"?`)) {
                              onDeletePelada(p.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-gramado-light/80 hover:bg-red-500/20 text-giz/50 hover:text-red-400 transition-colors"
                          title="Excluir Pelada"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gramado/80 border-t border-gramado-light/80 flex items-center justify-between text-xs text-giz/50">
          <span>{peladas.length} peladas registradas em tempo real</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gramado-light hover:bg-giz/15 text-giz/85 font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
