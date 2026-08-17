import React, { useState, useEffect, useRef } from 'react';
import { Pelada, Player, MatchGame, MatchEvent, Team } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Trophy,
  Plus,
  Minus,
  Sparkles,
  Award,
  Share2,
  CheckCircle,
  Clock,
  Flame,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playWhistleSound, playGoalCheerSound } from '../utils/audio';

interface LiveScoreboardProps {
  pelada?: Pelada | null;
  allPlayers: Player[];
  onUpdatePelada: (updated: Pelada) => void;
  onUpdatePlayers: (players: Player[]) => void;
  onSelectPlayer: (player: Player) => void;
}

export const LiveScoreboard: React.FC<LiveScoreboardProps> = ({
  pelada,
  allPlayers,
  onUpdatePelada,
  onUpdatePlayers,
  onSelectPlayer,
}) => {
  const playersMap = new Map<string, Player>(allPlayers.map((p) => [p.id, p]));

  // Selected or active match
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number>(0);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [goalModalOpen, setGoalModalOpen] = useState<{ teamId: string } | null>(null);
  const [selectedScorerId, setSelectedScorerId] = useState<string>('');
  const [selectedAssistId, setSelectedAssistId] = useState<string>('');
  const [cardModalOpen, setCardModalOpen] = useState<{ teamId: string; type: 'yellow_card' | 'red_card' } | null>(null);
  const [selectedCardPlayerId, setSelectedCardPlayerId] = useState<string>('');

  const timerRef = useRef<number | null>(null);

  // Default matches if none exist
  useEffect(() => {
    if (!pelada) return;
    if ((!pelada.matches || pelada.matches.length === 0) && pelada.teams && pelada.teams.length >= 2) {
      const initialMatch: MatchGame = {
        id: `match-1-${Date.now()}`,
        roundNumber: 1,
        teamAId: pelada.teams[0].id,
        teamBId: pelada.teams[1].id,
        scoreA: 0,
        scoreB: 0,
        status: 'pending',
        events: [],
        durationMinutes: 10,
      };
      onUpdatePelada({
        ...pelada,
        matches: [initialMatch],
      });
    }
  }, [pelada?.teams]);

  if (!pelada) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl">
        <Clock className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-white font-['Teko',sans-serif] uppercase tracking-wider text-3xl">
          Nenhuma Pelada em Andamento
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 mb-4">
          Crie ou selecione uma pelada para acompanhar o placar ao vivo e cronômetro.
        </p>
      </div>
    );
  }

  // Timer loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const currentMatch = pelada.matches?.[selectedMatchIndex] || null;
  const teamA = pelada.teams.find((t) => t.id === currentMatch?.teamAId);
  const teamB = pelada.teams.find((t) => t.id === currentMatch?.teamBId);

  const teamAPlayers = teamA?.playerIds.map((id) => playersMap.get(id)).filter(Boolean) as Player[];
  const teamBPlayers = teamB?.playerIds.map((id) => playersMap.get(id)).filter(Boolean) as Player[];

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => {
    playWhistleSound();
    setIsRunning(!isRunning);
    if (!isRunning && currentMatch && currentMatch.status === 'pending') {
      const updatedMatches = [...pelada.matches];
      updatedMatches[selectedMatchIndex] = {
        ...currentMatch,
        status: 'playing',
      };
      onUpdatePelada({ ...pelada, matches: updatedMatches });
    }
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimerSeconds(0);
  };

  // Add goal event
  const handleRegisterGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalModalOpen || !selectedScorerId || !currentMatch) return;

    playGoalCheerSound();

    const isTeamA = goalModalOpen.teamId === currentMatch.teamAId;
    const newScoreA = isTeamA ? currentMatch.scoreA + 1 : currentMatch.scoreA;
    const newScoreB = !isTeamA ? currentMatch.scoreB + 1 : currentMatch.scoreB;

    const newEvent: MatchEvent = {
      id: `ev-${Date.now()}`,
      minute: Math.floor(timerSeconds / 60) || 1,
      type: 'goal',
      playerId: selectedScorerId,
      assistPlayerId: selectedAssistId || undefined,
      teamId: goalModalOpen.teamId,
    };

    const updatedMatches = [...pelada.matches];
    updatedMatches[selectedMatchIndex] = {
      ...currentMatch,
      scoreA: newScoreA,
      scoreB: newScoreB,
      events: [...currentMatch.events, newEvent],
    };

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
      });
    } catch (e) {}

    onUpdatePelada({
      ...pelada,
      matches: updatedMatches,
    });

    setGoalModalOpen(null);
    setSelectedScorerId('');
    setSelectedAssistId('');
  };

  // Add card event
  const handleRegisterCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardModalOpen || !selectedCardPlayerId || !currentMatch) return;

    const newEvent: MatchEvent = {
      id: `ev-${Date.now()}`,
      minute: Math.floor(timerSeconds / 60) || 1,
      type: cardModalOpen.type,
      playerId: selectedCardPlayerId,
      teamId: cardModalOpen.teamId,
    };

    const updatedMatches = [...pelada.matches];
    updatedMatches[selectedMatchIndex] = {
      ...currentMatch,
      events: [...currentMatch.events, newEvent],
    };

    onUpdatePelada({
      ...pelada,
      matches: updatedMatches,
    });

    setCardModalOpen(null);
    setSelectedCardPlayerId('');
  };

  // Finish match and sync stats to player career records
  const handleFinishMatch = () => {
    if (!currentMatch) return;
    if (!confirm('Deseja finalizar esta partida e contabilizar as estatísticas?')) return;

    playWhistleSound();
    setIsRunning(false);

    const updatedMatches = [...pelada.matches];
    updatedMatches[selectedMatchIndex] = {
      ...currentMatch,
      status: 'finished',
    };

    // Update aggregate stats for players in this match
    const updatedPlayers = allPlayers.map((player) => {
      let goalsInMatch = 0;
      let assistsInMatch = 0;
      let yellowCardsInMatch = 0;
      let redCardsInMatch = 0;

      currentMatch.events.forEach((ev) => {
        if (ev.playerId === player.id) {
          if (ev.type === 'goal') goalsInMatch++;
          if (ev.type === 'yellow_card') yellowCardsInMatch++;
          if (ev.type === 'red_card') redCardsInMatch++;
        }
        if (ev.assistPlayerId === player.id && ev.type === 'goal') {
          assistsInMatch++;
        }
      });

      const playedInTeamA = teamA?.playerIds.includes(player.id);
      const playedInTeamB = teamB?.playerIds.includes(player.id);
      const participated = playedInTeamA || playedInTeamB;

      if (!participated) return player;

      let winsInc = 0;
      let drawsInc = 0;
      let lossesInc = 0;

      if (currentMatch.scoreA > currentMatch.scoreB) {
        if (playedInTeamA) winsInc = 1;
        if (playedInTeamB) lossesInc = 1;
      } else if (currentMatch.scoreB > currentMatch.scoreA) {
        if (playedInTeamB) winsInc = 1;
        if (playedInTeamA) lossesInc = 1;
      } else {
        drawsInc = 1;
      }

      const cleanSheetInc =
        player.position === 'GK' &&
        ((playedInTeamA && currentMatch.scoreB === 0) ||
          (playedInTeamB && currentMatch.scoreA === 0))
          ? 1
          : 0;

      return {
        ...player,
        matchesCount: player.matchesCount + 1,
        goals: player.goals + goalsInMatch,
        assists: player.assists + assistsInMatch,
        wins: player.wins + winsInc,
        draws: player.draws + drawsInc,
        losses: player.losses + lossesInc,
        yellowCards: player.yellowCards + yellowCardsInMatch,
        redCards: player.redCards + redCardsInMatch,
        cleanSheets: player.cleanSheets + cleanSheetInc,
      };
    });

    onUpdatePlayers(updatedPlayers);
    onUpdatePelada({
      ...pelada,
      matches: updatedMatches,
      status: 'in_progress',
    });
  };

  // Create next round match
  const handleAddNewMatch = () => {
    if (pelada.teams.length < 2) return;
    const roundNumber = (pelada.matches?.length || 0) + 1;
    
    // Cycle teams
    const teamAIndex = (roundNumber - 1) % pelada.teams.length;
    const teamBIndex = roundNumber % pelada.teams.length;

    const newMatch: MatchGame = {
      id: `match-${roundNumber}-${Date.now()}`,
      roundNumber,
      teamAId: pelada.teams[teamAIndex].id,
      teamBId: pelada.teams[teamBIndex].id,
      scoreA: 0,
      scoreB: 0,
      status: 'pending',
      events: [],
      durationMinutes: 10,
    };

    onUpdatePelada({
      ...pelada,
      matches: [...(pelada.matches || []), newMatch],
    });

    setSelectedMatchIndex((pelada.matches || []).length);
    setTimerSeconds(0);
    setIsRunning(false);
  };

  if (!pelada.teams || pelada.teams.length < 2) {
    return (
      <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 p-8">
        <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h3 className="text-lg font-black text-white">Sorteie os times primeiro</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Para iniciar o cronômetro e registrar os gols da pelada ao vivo, acerte a lista de presenças e realize o sorteio na aba "Sorteio de Times".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Match Rounds Switcher */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          {pelada.matches?.map((m, idx) => (
            <button
              key={m.id}
              id={`btn-match-tab-${idx}`}
              onClick={() => {
                setSelectedMatchIndex(idx);
                setIsRunning(false);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                selectedMatchIndex === idx
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>Jogo {m.roundNumber}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.status === 'finished' ? 'bg-slate-800 text-emerald-400' : m.status === 'playing' ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                {m.status === 'finished' ? 'Encerrado' : m.status === 'playing' ? 'AO VIVO' : 'Agendado'}
              </span>
            </button>
          ))}
        </div>

        <button
          id="btn-add-new-match"
          onClick={handleAddNewMatch}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          Nova Partida
        </button>
      </div>

      {currentMatch && teamA && teamB && (
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          
          {/* Whistle sound button in top-right */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
              Placar ao Vivo • Jogo {currentMatch.roundNumber}
            </span>
            <button
              id="btn-play-whistle-sound"
              onClick={playWhistleSound}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 text-xs font-bold transition-colors"
              title="Tocar apito do juiz"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              Apito do Juiz
            </button>
          </div>

          {/* Big Scoreboard Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center my-6">
            
            {/* Team A */}
            <div className="flex flex-col items-center md:items-end text-center md:text-right">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: teamA.colorHex }}
                />
                <h3 className="text-xl font-black text-white">{teamA.name}</h3>
              </div>
              <button
                id="btn-goal-team-a"
                onClick={() => setGoalModalOpen({ teamId: teamA.id })}
                className="mt-3 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Registrar Gol
              </button>
              <button
                id="btn-card-team-a"
                onClick={() => setCardModalOpen({ teamId: teamA.id, type: 'yellow_card' })}
                className="mt-1.5 text-[11px] font-bold text-slate-400 hover:text-amber-400 transition-colors"
              >
                + Cartão
              </button>
            </div>

            {/* Score Numbers & Timer in Center */}
            <div className="flex flex-col items-center justify-center bg-slate-950/80 p-5 rounded-3xl border border-slate-800 shadow-inner">
              {/* Digital Timer */}
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-widest mb-3">
                {formatTimer(timerSeconds)}
              </div>

              {/* Score Display */}
              <div className="flex items-center justify-center gap-4 text-5xl sm:text-6xl font-black text-white tracking-tighter">
                <span>{currentMatch.scoreA}</span>
                <span className="text-slate-600 text-3xl font-light">x</span>
                <span>{currentMatch.scoreB}</span>
              </div>

              {/* Timer Action Buttons */}
              <div className="flex items-center gap-2 mt-5">
                <button
                  id="btn-toggle-timer"
                  onClick={handleToggleTimer}
                  className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-all ${
                    isRunning
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isRunning ? 'Pausar' : 'Iniciar'}
                </button>
                <button
                  id="btn-reset-timer"
                  onClick={handleResetTimer}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-colors"
                  title="Reiniciar cronômetro"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                {currentMatch.status !== 'finished' && (
                  <button
                    id="btn-finish-match"
                    onClick={handleFinishMatch}
                    className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl text-xs font-black transition-colors"
                  >
                    Finalizar
                  </button>
                )}
              </div>
            </div>

            {/* Team B */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: teamB.colorHex }}
                />
                <h3 className="text-xl font-black text-white">{teamB.name}</h3>
              </div>
              <button
                id="btn-goal-team-b"
                onClick={() => setGoalModalOpen({ teamId: teamB.id })}
                className="mt-3 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Registrar Gol
              </button>
              <button
                id="btn-card-team-b"
                onClick={() => setCardModalOpen({ teamId: teamB.id, type: 'yellow_card' })}
                className="mt-1.5 text-[11px] font-bold text-slate-400 hover:text-amber-400 transition-colors"
              >
                + Cartão
              </button>
            </div>
          </div>

          {/* Events Timeline Feed */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Linha do Tempo da Partida
            </h4>

            {currentMatch.events.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">
                Nenhum gol ou cartão registrado ainda nesta partida.
              </p>
            ) : (
              <div className="space-y-2">
                {currentMatch.events.map((ev) => {
                  const player = playersMap.get(ev.playerId);
                  const assistPlayer = ev.assistPlayerId ? playersMap.get(ev.assistPlayerId) : null;
                  const isTeamA = ev.teamId === teamA.id;

                  return (
                    <div
                      key={ev.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                        ev.type === 'goal'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : ev.type === 'yellow_card'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-400">{ev.minute}'</span>
                        <span className="text-sm">
                          {ev.type === 'goal' ? '⚽' : ev.type === 'yellow_card' ? '🟨' : '🟥'}
                        </span>
                        <span className="font-extrabold text-white">
                          {player?.nickname || player?.name || 'Jogador'}
                        </span>
                        {assistPlayer && (
                          <span className="text-[11px] text-slate-400">
                            (Assistência: {assistPlayer.nickname || assistPlayer.name})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {isTeamA ? teamA.name : teamB.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {goalModalOpen && (
        <div
          id="goal-registration-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setGoalModalOpen(null)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              ⚽ Registrar Gol
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Selecione o autor do gol e quem deu o passe (assistência).
            </p>

            <form onSubmit={handleRegisterGoal} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Autor do Gol ⚽</label>
                <select
                  required
                  value={selectedScorerId}
                  onChange={(e) => setSelectedScorerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione o artilheiro...</option>
                  {(goalModalOpen.teamId === teamA?.id ? teamAPlayers : teamBPlayers).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname || p.name} ({p.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Assistência 🎯 (Opcional)</label>
                <select
                  value={selectedAssistId}
                  onChange={(e) => setSelectedAssistId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Sem assistência (Gol individual)</option>
                  {(goalModalOpen.teamId === teamA?.id ? teamAPlayers : teamBPlayers)
                    .filter((p) => p.id !== selectedScorerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nickname || p.name} ({p.position})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-colors"
                >
                  Confirmar Gol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card Modal */}
      {cardModalOpen && (
        <div
          id="card-registration-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setCardModalOpen(null)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              {cardModalOpen.type === 'yellow_card' ? '🟨 Cartão Amarelo' : '🟥 Cartão Vermelho'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Selecione o jogador advertido.
            </p>

            <form onSubmit={handleRegisterCard} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Jogador Advertido</label>
                <select
                  required
                  value={selectedCardPlayerId}
                  onChange={(e) => setSelectedCardPlayerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione o jogador...</option>
                  {(cardModalOpen.teamId === teamA?.id ? teamAPlayers : teamBPlayers).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname || p.name} ({p.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Tipo de Cartão</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCardModalOpen({ ...cardModalOpen, type: 'yellow_card' })}
                    className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 border ${
                      cardModalOpen.type === 'yellow_card'
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    🟨 Amarelo
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardModalOpen({ ...cardModalOpen, type: 'red_card' })}
                    className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 border ${
                      cardModalOpen.type === 'red_card'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    🟥 Vermelho
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-colors"
                >
                  Aplicar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
