import React, { useState } from 'react';
import { Pelada, Player, PlayerEvaluation, PlayerScoreRating } from '../types';
import {
  Star,
  Award,
  Sparkles,
  Share2,
  Send,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Trophy,
  Flame,
  Frown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { generatePostGameReportMessage, openWhatsAppWithText } from '../utils/whatsappGenerator';

interface PostMatchEvaluationProps {
  pelada?: Pelada | null;
  allPlayers: Player[];
  onUpdatePelada: (updated: Pelada) => void;
  onUpdatePlayers: (players: Player[]) => void;
  onSelectPlayer: (player: Player) => void;
}

const AVAILABLE_TAGS = [
  'Jogou de Terno 👔',
  'Golaço 🚀',
  'Paredão Impenetrável 🧤',
  'Fominha 🍕',
  'Raçudo na Zaga 🛡️',
  'Caneta & Drible 🪄',
  'Furou na Cara 🙈',
  'Inimigo do Gol 🐟',
  'Visão de Jogo 🎯',
  'Pulmão de Aço ⚡',
];

export const PostMatchEvaluation: React.FC<PostMatchEvaluationProps> = ({
  pelada,
  allPlayers,
  onUpdatePelada,
  onUpdatePlayers,
  onSelectPlayer,
}) => {
  const playersMap = new Map<string, Player>(allPlayers.map((p) => [p.id, p]));

  const [voterName, setVoterName] = useState('');
  const [selectedVoterPlayerId, setSelectedVoterPlayerId] = useState('');
  const [ratings, setRatings] = useState<Record<string, { score: number; comment: string; tags: string[] }>>({});
  const [mvpVoteId, setMvpVoteId] = useState('');
  const [bagreVoteId, setBagreVoteId] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  if (!pelada) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl">
        <Award className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-white font-['Teko',sans-serif] uppercase tracking-wider text-3xl">
          Nenhuma Pelada para Avaliação
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 mb-4">
          Crie ou finalize uma pelada para votar no MVP, Bagre da rodada e dar notas aos atletas.
        </p>
      </div>
    );
  }

  // Confirmed / participated players in this pelada
  const participatedPlayers = pelada.confirmedPlayers
    .filter((cp) => cp.status === 'confirmed')
    .map((cp) => playersMap.get(cp.playerId))
    .filter(Boolean) as Player[];
  const [bestGoalPlayerId, setBestGoalPlayerId] = useState('');
  const [resenhaText, setResenhaText] = useState(pelada.resenhaNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize ratings when players change
  const getRatingForPlayer = (playerId: string) => {
    return ratings[playerId] || { score: 7.5, comment: '', tags: [] };
  };

  const handleScoreChange = (playerId: string, score: number) => {
    const current = getRatingForPlayer(playerId);
    setRatings({
      ...ratings,
      [playerId]: { ...current, score },
    });
  };

  const handleCommentChange = (playerId: string, comment: string) => {
    const current = getRatingForPlayer(playerId);
    setRatings({
      ...ratings,
      [playerId]: { ...current, comment },
    });
  };

  const handleToggleTag = (playerId: string, tag: string) => {
    const current = getRatingForPlayer(playerId);
    const hasTag = current.tags.includes(tag);
    const newTags = hasTag ? current.tags.filter((t) => t !== tag) : [...current.tags, tag];
    setRatings({
      ...ratings,
      [playerId]: { ...current, tags: newTags },
    });
  };

  // Submit voting ballot
  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    const finalVoterName = voterName.trim() || playersMap.get(selectedVoterPlayerId)?.name || 'Cria da Pelada';

    setIsSubmitting(true);

    const newEval: PlayerEvaluation = {
      id: `eval-${Date.now()}`,
      peladaId: pelada.id,
      voterName: finalVoterName,
      voterPlayerId: selectedVoterPlayerId || undefined,
      submittedAt: new Date().toISOString(),
      ratings,
      mvpVoteId: mvpVoteId || undefined,
      bagreVoteId: bagreVoteId || undefined,
      bestGoalPlayerId: bestGoalPlayerId || undefined,
    };

    const updatedEvaluations = [...(pelada.evaluations || []), newEval];

    // Recalculate players average ratings, MVP counts, and Bagre counts
    const updatedPlayers = allPlayers.map((player) => {
      const playerRating = ratings[player.id];
      if (!playerRating) return player;

      const newLastRatings = [playerRating.score, ...(player.lastRatings || [])].slice(0, 10);
      const totalRatingsCount = player.ratingsCount + 1;
      const newAverageRating = Math.round(((player.averageRating * player.ratingsCount + playerRating.score) / totalRatingsCount) * 10) / 10;
      const isMvp = mvpVoteId === player.id;
      const isBagre = bagreVoteId === player.id;

      // Extract new badges from tags if frequent
      const newBadges = [...(player.badges || [])];
      playerRating.tags.forEach((tag) => {
        const cleanTag = tag.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').trim();
        if (cleanTag && !newBadges.includes(cleanTag) && newBadges.length < 5) {
          newBadges.push(cleanTag);
        }
      });

      return {
        ...player,
        ratingsCount: totalRatingsCount,
        averageRating: newAverageRating,
        lastRatings: newLastRatings,
        mvpCount: player.mvpCount + (isMvp ? 1 : 0),
        bagreCount: player.bagreCount + (isBagre ? 1 : 0),
        badges: newBadges,
      };
    });

    onUpdatePlayers(updatedPlayers);
    onUpdatePelada({
      ...pelada,
      evaluations: updatedEvaluations,
      resenhaNotes: resenhaText || pelada.resenhaNotes,
    });

    setIsSubmitting(false);

    // Celebration Confetti
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899'],
      });
    } catch (e) {}

    alert('🎉 Avaliação e votos registrados com sucesso! Os rankings e médias dos jogadores foram atualizados.');
  };

  const handleShareResenha = () => {
    const text = generatePostGameReportMessage(pelada, playersMap);
    openWhatsAppWithText(text);
  };

  // Aggregate current votes for this pelada
  const mvpVotesCount: Record<string, number> = {};
  const bagreVotesCount: Record<string, number> = {};
  const sumScores: Record<string, { total: number; count: number }> = {};

  (pelada.evaluations || []).forEach((ev) => {
    if (ev.mvpVoteId) {
      mvpVotesCount[ev.mvpVoteId] = (mvpVotesCount[ev.mvpVoteId] || 0) + 1;
    }
    if (ev.bagreVoteId) {
      bagreVotesCount[ev.bagreVoteId] = (bagreVotesCount[ev.bagreVoteId] || 0) + 1;
    }
    Object.entries(ev.ratings || {}).forEach(([pid, r]) => {
      const ratingObj = r as PlayerScoreRating;
      if (ratingObj && typeof ratingObj.score === 'number') {
        if (!sumScores[pid]) sumScores[pid] = { total: 0, count: 0 };
        sumScores[pid].total += ratingObj.score;
        sumScores[pid].count += 1;
      }
    });
  });

  const sortedMvpCandidates = Object.entries(mvpVotesCount).sort((a, b) => b[1] - a[1]);
  const sortedBagreCandidates = Object.entries(bagreVotesCount).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Voting Status & Resenha sharing */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Votação Pós-Jogo
            </span>
            <span className="text-xs text-slate-400">
              {pelada.evaluations?.length || 0} avaliações recebidas
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            <span>Avaliação Individual & Resenha da Rodada</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dê notas de 1 a 10 para cada atleta e vote no Craque da Rodada e no Troféu Bagre!
          </p>
        </div>

        <button
          id="btn-share-resenha-whatsapp"
          onClick={handleShareResenha}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
        >
          <Share2 className="w-4 h-4" />
          Compartilhar Resenha no WhatsApp
        </button>
      </div>

      {/* Voting Highlights / Current Leaders in this Pelada */}
      {pelada.evaluations && pelada.evaluations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* MVP Craque da Rodada */}
          <div className="bg-gradient-to-br from-amber-500/10 to-slate-900 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl">
              👑
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Craque da Partida (MVP)</p>
              <h4 className="text-base font-black text-white">
                {sortedMvpCandidates[0]
                  ? playersMap.get(sortedMvpCandidates[0][0])?.nickname || playersMap.get(sortedMvpCandidates[0][0])?.name
                  : 'Em votação'}
              </h4>
              <p className="text-[10px] text-slate-400">
                {sortedMvpCandidates[0] ? `${sortedMvpCandidates[0][1]} voto(s)` : 'Aguardando votos'}
              </p>
            </div>
          </div>

          {/* Troféu Bagre da Rodada */}
          <div className="bg-gradient-to-br from-rose-500/10 to-slate-900 border border-rose-500/30 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-2xl">
              🐟
            </div>
            <div>
              <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Troféu Bagre da Rodada</p>
              <h4 className="text-base font-black text-white">
                {sortedBagreCandidates[0]
                  ? playersMap.get(sortedBagreCandidates[0][0])?.nickname || playersMap.get(sortedBagreCandidates[0][0])?.name
                  : 'Em votação'}
              </h4>
              <p className="text-[10px] text-slate-400">
                {sortedBagreCandidates[0] ? `${sortedBagreCandidates[0][1]} voto(s)` : 'Aguardando votos'}
              </p>
            </div>
          </div>

          {/* Votos Registrados */}
          <div className="bg-gradient-to-br from-indigo-500/10 to-slate-900 border border-indigo-500/30 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-2xl">
              📝
            </div>
            <div>
              <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Participação na Votação</p>
              <h4 className="text-base font-black text-white">{pelada.evaluations.length} Votos</h4>
              <p className="text-[10px] text-slate-400">Votantes: {pelada.evaluations.map(e => e.voterName).join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Ballot Form */}
      <form onSubmit={handleSubmitEvaluation} className="space-y-6">
        
        {/* Voter Identity & Match Notes Box */}
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            Identificação do Avaliador & Resenha Geral
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Seu Nome / Apelido</label>
              <input
                type="text"
                required
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                placeholder="Ex: Paulinho Trator / Convidado"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Ou selecione seu Jogador</label>
              <select
                value={selectedVoterPlayerId}
                onChange={(e) => {
                  setSelectedVoterPlayerId(e.target.value);
                  const p = playersMap.get(e.target.value);
                  if (p) setVoterName(p.nickname || p.name);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Avaliador Avulso / Espectador</option>
                {allPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname || p.name} ({p.position})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-300 font-bold block mb-1">
                Resenha do Jogo (Comentário Geral da Pelada)
              </label>
              <textarea
                rows={2}
                value={resenhaText}
                onChange={(e) => setResenhaText(e.target.value)}
                placeholder="Ex: Jogo muito equilibrado! Destaque pro Digão que fechou o gol e Cadu que mandou no meio..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Individual Player Score Sliders & Tags */}
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            Notas Individuais dos Atletas (1.0 a 10.0)
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {participatedPlayers.map((p) => {
              const currentRating = getRatingForPlayer(p.id);

              return (
                <div
                  key={p.id}
                  id={`eval-player-${p.id}`}
                  className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => onSelectPlayer(p)}
                    >
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white hover:text-emerald-400 transition-colors">
                          {p.nickname || p.name}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {p.position} • OVR {p.overall} • {p.goals} gols • {p.assists} assistências
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 px-3 py-1 rounded-xl border border-slate-700">
                      <span className="text-amber-400 font-bold text-xs">⭐</span>
                      <span className="text-base font-black text-amber-300 font-mono">
                        {currentRating.score.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Score Slider */}
                  <div>
                    <input
                      type="range"
                      min="1.0"
                      max="10.0"
                      step="0.5"
                      value={currentRating.score}
                      onChange={(e) => handleScoreChange(p.id, parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold px-1 mt-0.5">
                      <span>1.0 (Péssimo)</span>
                      <span>5.0 (Regular)</span>
                      <span>8.0 (Bom)</span>
                      <span>10.0 (Monstro)</span>
                    </div>
                  </div>

                  {/* Quick Tags */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 mb-1.5">Selos / Tags da Rodada:</p>
                    <div className="flex flex-wrap gap-1">
                      {AVAILABLE_TAGS.map((tag) => {
                        const isSelected = currentRating.tags.includes(tag);
                        return (
                          <button
                            type="button"
                            key={tag}
                            onClick={() => handleToggleTag(p.id, tag)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                              isSelected
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Short Comment */}
                  <input
                    type="text"
                    value={currentRating.comment}
                    onChange={(e) => handleCommentChange(p.id, e.target.value)}
                    placeholder="Comentário sobre a atuação (opcional)..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Awards Voting: Craque, Bagre e Melhor Gol */}
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Eleição dos Destaques da Rodada
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-amber-300 font-black block mb-1 flex items-center gap-1.5">
                👑 Craque do Jogo (MVP)
              </label>
              <select
                value={mvpVoteId}
                onChange={(e) => setMvpVoteId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-bold"
              >
                <option value="">Selecione o Craque...</option>
                {participatedPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname || p.name} ({p.position})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-rose-300 font-black block mb-1 flex items-center gap-1.5">
                🐟 Troféu Bagre da Rodada
              </label>
              <select
                value={bagreVoteId}
                onChange={(e) => setBagreVoteId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-bold"
              >
                <option value="">Selecione o Bagre...</option>
                {participatedPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname || p.name} ({p.position})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-emerald-300 font-black block mb-1 flex items-center gap-1.5">
                🚀 Melhor Gol da Rodada
              </label>
              <select
                value={bestGoalPlayerId}
                onChange={(e) => setBestGoalPlayerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="">Selecione o autor...</option>
                {participatedPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname || p.name} ({p.position})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              id="btn-submit-evaluation"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-2xl text-sm flex items-center gap-2 shadow-xl shadow-amber-500/20 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Enviar Avaliação & Atualizar Ranking
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
