import React, { useState, useEffect, useRef } from 'react';
import { Pelada, Player, MatchGame, MatchEvent, Team } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
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
  AlertCircle,
  Trash2,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playWhistleSound, playGoalCheerSound } from '../utils/audio';
import { formatDateBR } from '../utils/whatsappGenerator';
import { isPeladaAdmin } from '../utils/permissions';

interface LiveScoreboardProps {
  pelada?: Pelada | null;
  allPlayers: Player[];
  onUpdatePelada: (updated: Pelada) => void;
  onUpdatePlayers: (players: Player[]) => void;
  onSelectPlayer: (player: Player) => void;
  currentUser?: FirebaseUser | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export const LiveScoreboard: React.FC<LiveScoreboardProps> = ({
  pelada,
  allPlayers,
  onUpdatePelada,
  onUpdatePlayers,
  onSelectPlayer,
  currentUser,
}) => {
  const playersMap = new Map<string, Player>(allPlayers.map((p) => [p.id, p]));
  const isAdmin = isPeladaAdmin(pelada, currentUser || null);

  // Selected or active match
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number>(0);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [cardModalOpen, setCardModalOpen] = useState<{ teamId: string; type: 'yellow_card' | 'red_card' } | null>(null);
  const [selectedCardPlayerId, setSelectedCardPlayerId] = useState<string>('');
  const [newMatchModalOpen, setNewMatchModalOpen] = useState(false);
  const [newMatchDate, setNewMatchDate] = useState(todayISO());

  const timerRef = useRef<number | null>(null);

  // Default matches if none exist
  useEffect(() => {
    if (!pelada) return;
    if ((!pelada.matches || pelada.matches.length === 0) && pelada.teams && pelada.teams.length >= 2) {
      const initialMatch: MatchGame = {
        id: `match-1-${Date.now()}`,
        roundNumber: 1,
        date: pelada.date,
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
      <div className="rounded-3xl bg-gramado-card border border-gramado-light p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl">
        <Clock className="w-16 h-16 text-capim-light mx-auto mb-4" />
        <h2 className="text-2xl font-black text-giz font-['Teko',sans-serif] uppercase tracking-wider text-3xl">
          Nenhuma Pelada em Andamento
        </h2>
        <p className="text-xs sm:text-sm text-giz/70 mt-2 mb-4">
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

  // Most recently registered goal event in the current match (assist target)
  const getLastGoalEvent = (): MatchEvent | null => {
    if (!currentMatch) return null;
    for (let i = currentMatch.events.length - 1; i >= 0; i--) {
      if (currentMatch.events[i].type === 'goal') return currentMatch.events[i];
    }
    return null;
  };

  const canAssistLastGoal = (playerId: string, teamId: string) => {
    const lastGoal = getLastGoalEvent();
    if (!lastGoal) return false;
    if (lastGoal.teamId !== teamId) return false;
    if (lastGoal.playerId === playerId) return false;
    if (lastGoal.assistPlayerId) return false;
    return true;
  };

  // Instantly register a goal for a player (one click, no modal)
  const handleQuickGoal = (playerId: string, teamId: string) => {
    if (!currentMatch) return;

    playGoalCheerSound();

    const isTeamA = teamId === currentMatch.teamAId;
    const newScoreA = isTeamA ? currentMatch.scoreA + 1 : currentMatch.scoreA;
    const newScoreB = !isTeamA ? currentMatch.scoreB + 1 : currentMatch.scoreB;

    const newEvent: MatchEvent = {
      id: `ev-${Date.now()}`,
      minute: Math.floor(timerSeconds / 60) || 1,
      type: 'goal',
      playerId,
      teamId,
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
  };

  // Attach a player as the assist of the last registered goal (one click, no modal)
  const handleQuickAssist = (playerId: string, teamId: string) => {
    if (!currentMatch) return;
    const lastGoal = getLastGoalEvent();
    if (!lastGoal || !canAssistLastGoal(playerId, teamId)) return;

    const updatedEvents = currentMatch.events.map((ev) =>
      ev.id === lastGoal.id ? { ...ev, assistPlayerId: playerId } : ev
    );

    const updatedMatches = [...pelada.matches];
    updatedMatches[selectedMatchIndex] = {
      ...currentMatch,
      events: updatedEvents,
    };

    onUpdatePelada({
      ...pelada,
      matches: updatedMatches,
    });
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

  // Open the "new match" date prompt
  const handleOpenNewMatchModal = () => {
    if (pelada.teams.length < 2) return;
    setNewMatchDate(todayISO());
    setNewMatchModalOpen(true);
  };

  // Create next round match, on the chosen date
  const handleConfirmAddNewMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (pelada.teams.length < 2) return;
    const roundNumber = (pelada.matches?.length || 0) + 1;

    // Cycle teams
    const teamAIndex = (roundNumber - 1) % pelada.teams.length;
    const teamBIndex = roundNumber % pelada.teams.length;

    const newMatch: MatchGame = {
      id: `match-${roundNumber}-${Date.now()}`,
      roundNumber,
      date: newMatchDate || undefined,
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
    setNewMatchModalOpen(false);
  };

  // Delete a match (admin only)
  const handleDeleteMatch = (matchId: string) => {
    if (!isAdmin || !pelada.matches) return;
    if (!window.confirm('Tem certeza que deseja excluir este jogo? Os gols, cartões e estatísticas dessa partida serão perdidos.')) return;

    const deletedIndex = pelada.matches.findIndex((m) => m.id === matchId);
    const updatedMatches = pelada.matches.filter((m) => m.id !== matchId);

    onUpdatePelada({
      ...pelada,
      matches: updatedMatches,
    });

    if (deletedIndex <= selectedMatchIndex) {
      setSelectedMatchIndex(Math.max(0, selectedMatchIndex - 1));
      setTimerSeconds(0);
      setIsRunning(false);
    }
  };

  if (!pelada.teams || pelada.teams.length < 2) {
    return (
      <div className="text-center py-16 bg-gramado-card/40 rounded-3xl border border-gramado-light p-8">
        <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h3 className="text-lg font-black text-giz">Sorteie os times primeiro</h3>
        <p className="text-xs text-giz/50 mt-1 max-w-md mx-auto">
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
            <div key={m.id} className="relative group">
              <button
                id={`btn-match-tab-${idx}`}
                onClick={() => {
                  setSelectedMatchIndex(idx);
                  setIsRunning(false);
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                  selectedMatchIndex === idx
                    ? 'bg-capim text-giz shadow-lg'
                    : 'bg-gramado-card text-giz/50 hover:text-giz border border-gramado-light'
                } ${isAdmin ? 'pr-8' : ''}`}
              >
                <span className="flex flex-col items-start leading-tight">
                  <span>Jogo {m.roundNumber}</span>
                  {m.date && (
                    <span className={`text-[9px] font-bold ${selectedMatchIndex === idx ? 'text-gramado/70' : 'text-giz/35'}`}>
                      {formatDateBR(m.date)}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.status === 'finished' ? 'bg-gramado-light text-capim-light' : m.status === 'playing' ? 'bg-rose-500 text-giz animate-pulse' : 'bg-gramado-light text-giz/50'}`}>
                  {m.status === 'finished' ? 'Encerrado' : m.status === 'playing' ? 'AO VIVO' : 'Agendado'}
                </span>
              </button>
              {isAdmin && (
                <button
                  id={`btn-delete-match-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMatch(m.id);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-current opacity-60 hover:opacity-100 hover:text-rose-400 transition-all"
                  title="Excluir este jogo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          id="btn-add-new-match"
          onClick={handleOpenNewMatchModal}
          className="px-3.5 py-2 bg-gramado-light hover:bg-giz/15 text-giz/85 border border-giz/15 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4 text-capim-light" />
          Nova Partida
        </button>
      </div>

      {currentMatch && teamA && teamB && (
        <div className="bg-gradient-to-b from-gramado-card via-gramado-card/95 to-gramado p-6 rounded-3xl border border-gramado-light shadow-2xl relative overflow-hidden">
          
          {/* Whistle sound button in top-right */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-capim-light bg-capim/10 px-3 py-1 rounded-full border border-capim/30">
              Placar ao Vivo • Jogo {currentMatch.roundNumber}
              {currentMatch.date && ` • ${formatDateBR(currentMatch.date)}`}
            </span>
            <button
              id="btn-play-whistle-sound"
              onClick={playWhistleSound}
              className="p-2 rounded-xl bg-gramado-light/80 hover:bg-giz/15 text-giz/70 flex items-center gap-1.5 text-xs font-bold transition-colors"
              title="Tocar apito do juiz"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              Apito do Juiz
            </button>
          </div>

          {/* Big Scoreboard Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center my-6">
            
            {/* Team A */}
            <div className="flex flex-col items-center md:items-end text-center md:text-right w-full">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: teamA.colorHex }}
                />
                <h3 className="text-xl font-black text-giz">{teamA.name}</h3>
              </div>

              <div className="w-full max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
                {teamAPlayers.map((p) => {
                  const assistEnabled = canAssistLastGoal(p.id, teamA.id);
                  return (
                    <div
                      key={p.id}
                      id={`scoreboard-player-a-${p.id}`}
                      className="flex flex-row-reverse items-center justify-between gap-2 bg-gramado/60 hover:bg-gramado border border-gramado-light rounded-xl px-2.5 py-1.5"
                    >
                      <div className="flex flex-row-reverse items-center gap-2 min-w-0">
                        <img
                          src={p.photoUrl}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-lg object-cover border border-giz/15 shrink-0"
                        />
                        <span className="text-xs font-bold text-giz truncate">{p.nickname || p.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          id={`btn-quick-goal-${p.id}`}
                          onClick={() => handleQuickGoal(p.id, teamA.id)}
                          className="p-1.5 rounded-lg bg-capim/15 hover:bg-capim/30 text-sm transition-colors"
                          title="Registrar gol"
                        >
                          ⚽
                        </button>
                        <button
                          id={`btn-quick-assist-${p.id}`}
                          disabled={!assistEnabled}
                          onClick={() => handleQuickAssist(p.id, teamA.id)}
                          className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-sm transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-amber-500/15"
                          title={assistEnabled ? 'Marcar assistência no último gol' : 'Marque um gol do time antes de dar assistência'}
                        >
                          🎯
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                id="btn-card-team-a"
                onClick={() => setCardModalOpen({ teamId: teamA.id, type: 'yellow_card' })}
                className="mt-2.5 text-[11px] font-bold text-giz/50 hover:text-amber-400 transition-colors"
              >
                + Cartão
              </button>
            </div>

            {/* Score Numbers & Timer in Center */}
            <div className="flex flex-col items-center justify-center bg-gramado/80 p-5 rounded-3xl border border-gramado-light shadow-inner">
              {/* Digital Timer */}
              <div className="text-3xl sm:text-4xl font-black text-capim-light font-mono tracking-widest mb-3">
                {formatTimer(timerSeconds)}
              </div>

              {/* Score Display */}
              <div className="flex items-center justify-center gap-4 text-5xl sm:text-6xl font-black text-giz tracking-tighter">
                <span>{currentMatch.scoreA}</span>
                <span className="text-giz/25 text-3xl font-light">x</span>
                <span>{currentMatch.scoreB}</span>
              </div>

              {/* Timer Action Buttons */}
              <div className="flex items-center gap-2 mt-5">
                <button
                  id="btn-toggle-timer"
                  onClick={handleToggleTimer}
                  className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-all ${
                    isRunning
                      ? 'bg-amber-500 text-gramado hover:bg-amber-400'
                      : 'bg-capim text-giz hover:bg-capim'
                  }`}
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isRunning ? 'Pausar' : 'Iniciar'}
                </button>
                <button
                  id="btn-reset-timer"
                  onClick={handleResetTimer}
                  className="p-2 bg-gramado-light hover:bg-giz/15 text-giz/50 hover:text-giz rounded-xl border border-giz/15 transition-colors"
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
            <div className="flex flex-col items-center md:items-start text-center md:text-left w-full">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: teamB.colorHex }}
                />
                <h3 className="text-xl font-black text-giz">{teamB.name}</h3>
              </div>

              <div className="w-full max-h-56 overflow-y-auto space-y-1.5 pl-0.5">
                {teamBPlayers.map((p) => {
                  const assistEnabled = canAssistLastGoal(p.id, teamB.id);
                  return (
                    <div
                      key={p.id}
                      id={`scoreboard-player-b-${p.id}`}
                      className="flex items-center justify-between gap-2 bg-gramado/60 hover:bg-gramado border border-gramado-light rounded-xl px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={p.photoUrl}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-lg object-cover border border-giz/15 shrink-0"
                        />
                        <span className="text-xs font-bold text-giz truncate">{p.nickname || p.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          id={`btn-quick-goal-${p.id}`}
                          onClick={() => handleQuickGoal(p.id, teamB.id)}
                          className="p-1.5 rounded-lg bg-capim/15 hover:bg-capim/30 text-sm transition-colors"
                          title="Registrar gol"
                        >
                          ⚽
                        </button>
                        <button
                          id={`btn-quick-assist-${p.id}`}
                          disabled={!assistEnabled}
                          onClick={() => handleQuickAssist(p.id, teamB.id)}
                          className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-sm transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-amber-500/15"
                          title={assistEnabled ? 'Marcar assistência no último gol' : 'Marque um gol do time antes de dar assistência'}
                        >
                          🎯
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                id="btn-card-team-b"
                onClick={() => setCardModalOpen({ teamId: teamB.id, type: 'yellow_card' })}
                className="mt-2.5 text-[11px] font-bold text-giz/50 hover:text-amber-400 transition-colors"
              >
                + Cartão
              </button>
            </div>
          </div>

          {/* Events Timeline Feed */}
          <div className="pt-4 border-t border-gramado-light">
            <h4 className="text-xs font-black uppercase tracking-wider text-giz/50 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-capim-light" /> Linha do Tempo da Partida
            </h4>

            {currentMatch.events.length === 0 ? (
              <p className="text-xs text-giz/35 italic text-center py-4">
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
                          ? 'bg-capim/10 border-capim/30 text-giz'
                          : ev.type === 'yellow_card'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-giz/50">{ev.minute}'</span>
                        <span className="text-sm">
                          {ev.type === 'goal' ? '⚽' : ev.type === 'yellow_card' ? '🟨' : '🟥'}
                        </span>
                        <span className="font-extrabold text-giz">
                          {player?.nickname || player?.name || 'Jogador'}
                        </span>
                        {assistPlayer && (
                          <span className="text-[11px] text-giz/50">
                            (Assistência: {assistPlayer.nickname || assistPlayer.name})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-giz/50">
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

      {/* New Match Modal */}
      {newMatchModalOpen && (
        <div
          id="new-match-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setNewMatchModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-gramado-card border border-gramado-light rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-giz mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-capim-light" /> Nova Partida
            </h3>
            <p className="text-xs text-giz/50 mb-4">
              Como os jogos acontecem toda semana, escolha a data desta partida.
            </p>

            <form onSubmit={handleConfirmAddNewMatch} className="space-y-4 text-xs">
              <div>
                <label className="text-giz/70 font-bold block mb-1">Data do Jogo</label>
                <input
                  id="input-new-match-date"
                  type="date"
                  required
                  value={newMatchDate}
                  onChange={(e) => setNewMatchDate(e.target.value)}
                  className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gramado-light">
                <button
                  type="button"
                  onClick={() => setNewMatchModalOpen(false)}
                  className="px-4 py-2 bg-gramado-light text-giz/70 rounded-xl font-bold hover:bg-giz/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-capim hover:bg-capim text-giz rounded-xl font-bold shadow-lg transition-colors"
                >
                  Criar Partida
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
            className="w-full max-w-md bg-gramado-card border border-gramado-light rounded-3xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-giz mb-1 flex items-center gap-2">
              {cardModalOpen.type === 'yellow_card' ? '🟨 Cartão Amarelo' : '🟥 Cartão Vermelho'}
            </h3>
            <p className="text-xs text-giz/50 mb-4">
              Selecione o jogador advertido.
            </p>

            <form onSubmit={handleRegisterCard} className="space-y-4 text-xs">
              <div>
                <label className="text-giz/70 font-bold block mb-1">Jogador Advertido</label>
                <select
                  required
                  value={selectedCardPlayerId}
                  onChange={(e) => setSelectedCardPlayerId(e.target.value)}
                  className="w-full bg-gramado border border-giz/15 rounded-xl px-3 py-2 text-giz focus:outline-none focus:border-capim"
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
                <label className="text-giz/70 font-bold block mb-1">Tipo de Cartão</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCardModalOpen({ ...cardModalOpen, type: 'yellow_card' })}
                    className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 border ${
                      cardModalOpen.type === 'yellow_card'
                        ? 'bg-amber-500 text-gramado border-amber-400'
                        : 'bg-gramado text-giz/50 border-gramado-light'
                    }`}
                  >
                    🟨 Amarelo
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardModalOpen({ ...cardModalOpen, type: 'red_card' })}
                    className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 border ${
                      cardModalOpen.type === 'red_card'
                        ? 'bg-rose-600 text-giz border-rose-500'
                        : 'bg-gramado text-giz/50 border-gramado-light'
                    }`}
                  >
                    🟥 Vermelho
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gramado-light">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(null)}
                  className="px-4 py-2 bg-gramado-light text-giz/70 rounded-xl font-bold hover:bg-giz/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-capim hover:bg-capim text-giz rounded-xl font-bold shadow-lg transition-colors"
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
