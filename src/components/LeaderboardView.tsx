import React, { useState } from 'react';
import { Player } from '../types';
import {
  Trophy,
  Award,
  Flame,
  Zap,
  Shield,
  Star,
  Sparkles,
  Medal,
  Users,
  Target,
  ArrowUpDown
} from 'lucide-react';
import { PlayerCard } from './PlayerCard';

interface LeaderboardViewProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
  onOpenUserProfile?: () => void;
}

type RankingCategory = 'overall' | 'goals' | 'assists' | 'rating' | 'mvp' | 'cleansheets' | 'bagre';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  players,
  onSelectPlayer,
  onOpenUserProfile,
}) => {
  const [activeCategory, setActiveCategory] = useState<RankingCategory>('overall');

  // Sort players based on active category
  const getSortedPlayers = () => {
    const list = [...players];
    switch (activeCategory) {
      case 'goals':
        return list.sort((a, b) => b.goals - a.goals || b.overall - a.overall);
      case 'assists':
        return list.sort((a, b) => b.assists - a.assists || b.overall - a.overall);
      case 'rating':
        return list.sort((a, b) => b.averageRating - a.averageRating || b.ratingsCount - a.ratingsCount);
      case 'mvp':
        return list.sort((a, b) => b.mvpCount - a.mvpCount || b.averageRating - a.averageRating);
      case 'cleansheets':
        return list.filter((p) => p.position === 'GK').sort((a, b) => b.cleanSheets - a.cleanSheets || b.overall - a.overall);
      case 'bagre':
        return list.sort((a, b) => b.bagreCount - a.bagreCount || a.averageRating - b.averageRating);
      case 'overall':
      default:
        return list.sort((a, b) => b.overall - a.overall || b.goals - a.goals);
    }
  };

  const sortedList = getSortedPlayers();
  const top3 = sortedList.slice(0, 3);
  const remaining = sortedList.slice(3);

  const getCategoryTitle = () => {
    switch (activeCategory) {
      case 'goals':
        return { title: 'Chuteira de Ouro (Artilharia)', icon: '⚽', desc: 'Atletas com mais gols marcados na temporada' };
      case 'assists':
        return { title: 'Garçom de Elite (Assistências)', icon: '🎯', desc: 'Reis do passe e assistências para gol' };
      case 'rating':
        return { title: 'Bola de Ouro (Maior Nota Média)', icon: '⭐', desc: 'Melhores médias de notas avaliadas pós-jogo' };
      case 'mvp':
        return { title: 'Craque da Galera (Mais MVPs)', icon: '👑', desc: 'Mais vezes eleito o Craque da Rodada' };
      case 'cleansheets':
        return { title: 'Luva de Ouro (Paredão)', icon: '🧤', desc: 'Goleiros com mais jogos sem sofrer gols' };
      case 'bagre':
        return { title: 'Troféu Bagre da Temporada', icon: '🐟', desc: 'Os maiores destaques cômicos e furadas da pelada' };
      case 'overall':
      default:
        return { title: 'Ranking Geral de Nível (Overall)', icon: '🏆', desc: 'Classificação geral dos atletas da pelada' };
    }
  };

  const categoryMeta = getCategoryTitle();

  if (players.length === 0) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl">
        <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-white font-['Teko',sans-serif] uppercase tracking-wider text-3xl">
          Ranking Aguardando Jogadores
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 mb-4">
          Cadastre os atletas e realize as partidas para gerar as classificações de artilharia, assistências, notas e MVP.
        </p>
      </div>
    );
  }

  const getMetricValue = (p: Player) => {
    switch (activeCategory) {
      case 'goals':
        return `${p.goals} Gols`;
      case 'assists':
        return `${p.assists} Assist.`;
      case 'rating':
        return `⭐ ${p.averageRating.toFixed(1)}`;
      case 'mvp':
        return `👑 ${p.mvpCount}x MVP`;
      case 'cleansheets':
        return `🧤 ${p.cleanSheets} jogos`;
      case 'bagre':
        return `🐟 ${p.bagreCount}x Bagre`;
      case 'overall':
      default:
        return `OVR ${p.overall}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overall', label: '🏆 Geral (Overall)' },
          { id: 'goals', label: '⚽ Artilharia' },
          { id: 'assists', label: '🎯 Assistências' },
          { id: 'rating', label: '⭐ Nota Média' },
          { id: 'mvp', label: '👑 Mais MVPs' },
          { id: 'cleansheets', label: '🧤 Luva de Ouro' },
          { id: 'bagre', label: '🐟 Troféu Bagre' },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-ranking-${tab.id}`}
            onClick={() => setActiveCategory(tab.id as RankingCategory)}
            className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === tab.id
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
            Leaderboard Oficial
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <span>{categoryMeta.icon}</span>
            <span>{categoryMeta.title}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">{categoryMeta.desc}</p>
        </div>

        {onOpenUserProfile && (
          <button
            id="btn-leaderboard-my-profile"
            onClick={onOpenUserProfile}
            className="px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Meu Cartão de Jogador</span>
          </button>
        )}
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-4">
          
          {/* 2nd Place (Silver) */}
          {top3[1] && (
            <div
              id={`podium-2nd-${top3[1].id}`}
              onClick={() => onSelectPlayer(top3[1])}
              className="order-2 md:order-1 bg-gradient-to-b from-slate-800/80 to-slate-900 p-5 rounded-3xl border border-slate-700/80 shadow-xl text-center cursor-pointer hover:-translate-y-1 transition-transform relative group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-950 font-black text-base flex items-center justify-center mx-auto -mt-10 mb-3 shadow-lg border-2 border-slate-100">
                2º
              </div>
              <img
                src={top3[1].photoUrl}
                alt={top3[1].name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 border-2 border-slate-400 shadow-md group-hover:scale-105 transition-transform"
              />
              <h3 className="text-base font-extrabold text-white truncate">{top3[1].nickname || top3[1].name}</h3>
              <p className="text-xs text-slate-400 mb-2">{top3[1].position} • {top3[1].name}</p>
              <span className="text-sm font-black text-slate-200 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700 inline-block">
                {getMetricValue(top3[1])}
              </span>
            </div>
          )}

          {/* 1st Place (Gold Champion) */}
          {top3[0] && (
            <div
              id={`podium-1st-${top3[0].id}`}
              onClick={() => onSelectPlayer(top3[0])}
              className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 p-6 rounded-3xl border-2 border-amber-400/60 shadow-2xl text-center cursor-pointer hover:-translate-y-1.5 transition-transform relative group md:-mt-6"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-lg flex items-center justify-center mx-auto -mt-12 mb-3 shadow-xl border-2 border-yellow-300">
                👑 1º
              </div>
              <img
                src={top3[0].photoUrl}
                alt={top3[0].name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-2xl object-cover mx-auto mb-3 border-4 border-amber-400 shadow-xl group-hover:scale-105 transition-transform"
              />
              <h3 className="text-lg font-black text-white truncate">{top3[0].nickname || top3[0].name}</h3>
              <p className="text-xs text-amber-300/80 font-bold mb-3">{top3[0].position} • {top3[0].name}</p>
              <span className="text-base font-black text-amber-300 bg-amber-500/20 px-4 py-1.5 rounded-xl border border-amber-500/40 inline-block shadow-md">
                {getMetricValue(top3[0])}
              </span>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {top3[2] && (
            <div
              id={`podium-3rd-${top3[2].id}`}
              onClick={() => onSelectPlayer(top3[2])}
              className="order-3 bg-gradient-to-b from-amber-900/30 to-slate-900 p-5 rounded-3xl border border-amber-800/60 shadow-xl text-center cursor-pointer hover:-translate-y-1 transition-transform relative group"
            >
              <div className="w-10 h-10 rounded-full bg-amber-700 text-amber-100 font-black text-base flex items-center justify-center mx-auto -mt-10 mb-3 shadow-lg border-2 border-amber-600">
                3º
              </div>
              <img
                src={top3[2].photoUrl}
                alt={top3[2].name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 border-2 border-amber-700 shadow-md group-hover:scale-105 transition-transform"
              />
              <h3 className="text-base font-extrabold text-white truncate">{top3[2].nickname || top3[2].name}</h3>
              <p className="text-xs text-slate-400 mb-2">{top3[2].position} • {top3[2].name}</p>
              <span className="text-sm font-black text-amber-200 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700 inline-block">
                {getMetricValue(top3[2])}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table (Position 4 onwards) */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 shadow-xl">
        <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
          <Medal className="w-5 h-5 text-emerald-400" />
          Classificação Completa dos Atletas
        </h3>

        <div className="space-y-2">
          {sortedList.map((p, idx) => (
            <div
              key={p.id}
              id={`rank-row-${p.id}`}
              onClick={() => onSelectPlayer(p)}
              className="flex items-center justify-between p-3.5 bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3.5">
                <span
                  className={`w-7 text-center font-black text-sm ${
                    idx === 0
                      ? 'text-amber-400 font-extrabold'
                      : idx === 1
                      ? 'text-slate-300 font-extrabold'
                      : idx === 2
                      ? 'text-amber-600 font-extrabold'
                      : 'text-slate-500'
                  }`}
                >
                  {idx + 1}º
                </span>
                <img
                  src={p.photoUrl}
                  alt={p.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white hover:text-emerald-400 transition-colors">
                      {p.nickname || p.name}
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {p.position}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">{p.type}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {p.matchesCount} jogos • {p.goals} gols • {p.assists} assistências • ⭐ {p.averageRating.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                  {getMetricValue(p)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
