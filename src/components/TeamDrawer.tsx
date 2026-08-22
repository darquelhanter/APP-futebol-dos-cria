import React, { useState } from 'react';
import { Pelada, Player, Team } from '../types';
import {
  Shuffle,
  Shield,
  Zap,
  Users,
  Share2,
  Sparkles,
  ArrowLeftRight,
  Plus,
  Trash2,
  Layers,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { balanceTeams } from '../utils/teamBalancer';
import { generateTeamsDrawMessage, openWhatsAppWithText } from '../utils/whatsappGenerator';

interface TeamDrawerProps {
  pelada?: Pelada | null;
  allPlayers: Player[];
  onUpdatePelada: (updated: Pelada) => void;
  onSelectPlayer: (player: Player) => void;
}

export const TeamDrawer: React.FC<TeamDrawerProps> = ({
  pelada,
  allPlayers,
  onUpdatePelada,
  onSelectPlayer,
}) => {
  const [teamsCount, setTeamsCount] = useState<number>(pelada?.teamsCount || 2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedPlayerToMove, setSelectedPlayerToMove] = useState<{ playerId: string; fromTeamId: string } | null>(null);

  if (!pelada) {
    return (
      <div className="rounded-3xl bg-gramado-card border border-gramado-light p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl">
        <Shuffle className="w-16 h-16 text-capim-light mx-auto mb-4" />
        <h2 className="text-2xl font-black text-giz font-['Teko',sans-serif] uppercase tracking-wider text-3xl">
          Nenhuma Pelada Ativa para Sorteio
        </h2>
        <p className="text-xs sm:text-sm text-giz/70 mt-2 mb-4">
          Crie ou selecione uma pelada para realizar o sorteio balanceado de times.
        </p>
      </div>
    );
  }

  const playersMap = new Map<string, Player>(allPlayers.map((p) => [p.id, p]));

  // Confirmed players eligible for draw
  const confirmedPlayerIds = pelada.confirmedPlayers
    .filter((cp) => cp.status === 'confirmed')
    .map((cp) => cp.playerId);

  const confirmedPlayers = confirmedPlayerIds
    .map((id) => playersMap.get(id))
    .filter(Boolean) as Player[];

  // Run balanced draw with animation and confetti
  const handlePerformDraw = () => {
    if (confirmedPlayers.length < teamsCount * 2) {
      alert(`Você precisa de pelo menos ${teamsCount * 2} jogadores confirmados para sortear ${teamsCount} times!`);
      return;
    }

    setIsDrawing(true);

    setTimeout(() => {
      const result = balanceTeams(confirmedPlayers, teamsCount, pelada.playersPerTeam);
      onUpdatePelada({
        ...pelada,
        teamsCount,
        teams: result.teams,
      });
      setIsDrawing(false);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899'],
        });
      } catch (e) {
        console.log(e);
      }
    }, 600);
  };

  // Move or swap player between teams
  const handleTransferPlayer = (targetTeamId: string) => {
    if (!selectedPlayerToMove) return;

    const { playerId, fromTeamId } = selectedPlayerToMove;
    if (fromTeamId === targetTeamId) {
      setSelectedPlayerToMove(null);
      return;
    }

    const updatedTeams = pelada.teams.map((team) => {
      if (team.id === fromTeamId) {
        return {
          ...team,
          playerIds: team.playerIds.filter((id) => id !== playerId),
        };
      }
      if (team.id === targetTeamId) {
        return {
          ...team,
          playerIds: [...team.playerIds, playerId],
        };
      }
      return team;
    });

    onUpdatePelada({
      ...pelada,
      teams: updatedTeams,
    });

    setSelectedPlayerToMove(null);
  };

  const handleShareWhatsApp = () => {
    const text = generateTeamsDrawMessage(pelada, playersMap);
    openWhatsAppWithText(text);
  };

  // Compute team average overalls
  const getTeamStats = (team: Team) => {
    const players = team.playerIds.map((id) => playersMap.get(id)).filter(Boolean) as Player[];
    const totalOv = players.reduce((sum, p) => sum + p.overall, 0);
    const avgOv = players.length > 0 ? Math.round((totalOv / players.length) * 10) / 10 : 0;
    const gks = players.filter((p) => p.position === 'GK').length;
    const defs = players.filter((p) => p.position === 'DEF').length;
    const mids = players.filter((p) => p.position === 'MID').length;
    const atts = players.filter((p) => p.position === 'ATT').length;
    return { players, totalOv, avgOv, gks, defs, mids, atts };
  };

  return (
    <div className="space-y-6">
      {/* Header & Draw Control Panel */}
      <div className="bg-gradient-to-r from-gramado-card via-gramado-card/95 to-gramado p-5 rounded-3xl border border-gramado-light shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-capim-light bg-capim/10 px-2.5 py-0.5 rounded-full border border-capim/30">
                Sorteio Inteligente
              </span>
              <span className="text-xs text-giz/50">
                Balanceamento automático por Overall e Posição
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-giz flex items-center gap-2">
              <Shuffle className="w-6 h-6 text-capim-light" />
              <span>Gerador de Times Equilibrados</span>
            </h2>
            <p className="text-xs text-giz/50 mt-1">
              {confirmedPlayers.length} jogadores disponíveis para sorteio ({confirmedPlayers.filter(p => p.position === 'GK').length} goleiros)
            </p>
          </div>

          {/* Controls: Team Count selector + Sorteio Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-gramado p-1 rounded-2xl border border-gramado-light">
              <span className="text-xs font-bold text-giz/50 px-2">Qtd. de Times:</span>
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  id={`btn-teams-count-${count}`}
                  onClick={() => setTeamsCount(count)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    teamsCount === count
                      ? 'bg-capim text-giz shadow-md'
                      : 'text-giz/50 hover:text-giz hover:bg-gramado-light'
                  }`}
                >
                  {count} Times
                </button>
              ))}
            </div>

            <button
              id="btn-sortear-times"
              disabled={isDrawing || confirmedPlayers.length === 0}
              onClick={handlePerformDraw}
              className="px-5 py-2.5 bg-gradient-to-r from-capim to-barro hover:from-capim hover:to-barro text-giz rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-capim/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isDrawing ? 'animate-spin' : ''}`} />
              {isDrawing ? 'Sorteando e Equilibrando...' : 'Sortear Times Agora'}
            </button>

            {pelada.teams.length > 0 && (
              <button
                id="btn-share-teams-whatsapp"
                onClick={handleShareWhatsApp}
                className="px-3.5 py-2.5 bg-gramado-light hover:bg-giz/15 text-giz/85 border border-giz/15 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Compartilhar escalações no WhatsApp"
              >
                <Share2 className="w-4 h-4 text-capim-light" />
                WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selected player to move indicator */}
      {selectedPlayerToMove && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            <span>
              Mover <strong>{playersMap.get(selectedPlayerToMove.playerId)?.nickname}</strong>: Clique no botão "Transferir para cá" do time de destino.
            </span>
          </div>
          <button
            onClick={() => setSelectedPlayerToMove(null)}
            className="px-2.5 py-1 bg-gramado-light hover:bg-giz/15 text-giz/85 rounded-lg text-xs font-bold"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Teams Grid */}
      {pelada.teams.length === 0 ? (
        <div className="text-center py-16 bg-gramado-card/40 rounded-3xl border border-gramado-light">
          <Shuffle className="w-12 h-12 text-giz/25 mx-auto mb-3" />
          <h3 className="text-base font-black text-giz">Nenhum time sorteado ainda</h3>
          <p className="text-xs text-giz/50 mt-1 max-w-md mx-auto">
            Clique no botão acima para sortear os times de forma equilibrada com base no nível técnico (Overall) e posições de cada atleta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pelada.teams.map((team, tIdx) => {
            const stats = getTeamStats(team);
            const isTarget = selectedPlayerToMove && selectedPlayerToMove.fromTeamId !== team.id;

            return (
              <div
                key={team.id}
                id={`team-box-${team.id}`}
                className={`bg-gramado-card/90 rounded-3xl border ${
                  isTarget ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-gramado-light'
                } p-5 shadow-xl transition-all flex flex-col justify-between relative overflow-hidden`}
              >
                {/* Top header with team color badge and Overall average */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: team.colorHex }}
                      />
                      <h3 className="text-base font-black text-giz">{team.name}</h3>
                    </div>

                    <div className="flex items-center gap-1 bg-gramado px-2.5 py-1 rounded-xl border border-gramado-light">
                      <span className="text-[10px] text-giz/50 font-bold uppercase">OVR:</span>
                      <span className="text-xs font-black text-amber-400">{stats.avgOv}</span>
                    </div>
                  </div>

                  {/* Positional distribution badges */}
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-giz/50 mb-4 bg-gramado/60 p-2 rounded-xl border border-gramado-light/80">
                    <span className="text-amber-400">🧤 {stats.gks} GK</span>
                    <span>•</span>
                    <span className="text-blue-400">🛡️ {stats.defs} DEF</span>
                    <span>•</span>
                    <span className="text-capim-light">🎯 {stats.mids} MEI</span>
                    <span>•</span>
                    <span className="text-rose-400">⚡ {stats.atts} ATA</span>
                    <span className="ml-auto text-giz/70 font-extrabold">{stats.players.length} atletas</span>
                  </div>

                  {/* Players list inside this team */}
                  <div className="space-y-2 mb-4">
                    {stats.players.map((p) => {
                      const isSelected = selectedPlayerToMove?.playerId === p.id;
                      return (
                        <div
                          key={p.id}
                          id={`team-player-${p.id}`}
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                              : 'bg-gramado/70 hover:bg-gramado border-gramado-light text-giz/85'
                          }`}
                        >
                          <div
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                            onClick={() => onSelectPlayer(p)}
                          >
                            <img
                              src={p.photoUrl}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover border border-giz/15"
                            />
                            <div className="truncate">
                              <p className="text-xs font-bold text-giz truncate">{p.nickname || p.name}</p>
                              <p className="text-[10px] text-giz/50">
                                {p.position} • Pé {p.dominantFoot === 'canhoto' ? 'Esq' : 'Dir'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              {p.overall}
                            </span>
                            <button
                              id={`btn-swap-${p.id}`}
                              onClick={() =>
                                setSelectedPlayerToMove(
                                  isSelected ? null : { playerId: p.id, fromTeamId: team.id }
                                )
                              }
                              className={`p-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                isSelected
                                  ? 'bg-amber-500 text-gramado border-amber-400'
                                  : 'bg-gramado-light text-giz/50 hover:text-giz/85 border-giz/15'
                              }`}
                              title="Trocar de time"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Transfer here target button */}
                {isTarget && (
                  <button
                    id={`btn-transfer-to-${team.id}`}
                    onClick={() => handleTransferPlayer(team.id)}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-gramado rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-colors mt-2"
                  >
                    <Plus className="w-4 h-4" /> Transferir para {team.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
