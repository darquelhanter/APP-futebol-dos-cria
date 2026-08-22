import React from 'react';
import { Player } from '../types';
import { Award, Shield, Zap, Sparkles, AlertCircle } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onClick,
  size = 'md',
  showBadge = true,
}) => {
  const getPositionColor = (pos: string) => {
    switch (pos) {
      case 'GK':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'DEF':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'MID':
        return 'bg-capim/20 text-capim-light border-capim/40';
      case 'ATT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-giz/20 text-giz/70 border-giz/40';
    }
  };

  const getPositionLabel = (pos: string) => {
    switch (pos) {
      case 'GK':
        return 'Goleiro';
      case 'DEF':
        return 'Zagueiro';
      case 'MID':
        return 'Meia';
      case 'ATT':
        return 'Atacante';
      default:
        return pos;
    }
  };

  const getOverallTier = (ovr: number) => {
    if (ovr >= 85) return 'from-amber-400 via-yellow-500 to-amber-600 border-yellow-400/50 shadow-yellow-500/20 text-yellow-950';
    if (ovr >= 78) return 'from-capim-light via-capim to-capim-light border-capim-light/50 shadow-capim/20 text-gramado-card';
    if (ovr >= 70) return 'from-sky-400 via-blue-500 to-blue-600 border-sky-400/50 shadow-sky-500/20 text-sky-950';
    return 'from-giz/50 via-giz/35 to-giz/25 border-giz/50 shadow-giz/20 text-gramado';
  };

  if (size === 'sm') {
    return (
      <div
        id={`player-card-sm-${player.id}`}
        onClick={onClick}
        className={`flex items-center gap-3 p-2.5 rounded-xl bg-gramado-card/90 border border-gramado-light hover:border-capim/50 transition-all cursor-pointer group`}
      >
        <div className="relative">
          <img
            src={player.photoUrl}
            alt={player.name}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover border-2 border-giz/15 group-hover:border-capim-light transition-colors"
          />
          <span
            className={`absolute -bottom-1 -right-1 text-[10px] font-black px-1 rounded-md bg-gradient-to-r ${getOverallTier(
              player.overall
            )}`}
          >
            {player.overall}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-giz truncate">{player.nickname || player.name}</p>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPositionColor(
                player.position
              )}`}
            >
              {player.position}
            </span>
          </div>
          <p className="text-xs text-giz/50 truncate">
            {player.goals} ⚽ | {player.assists} 🎯 | ⭐ {player.averageRating.toFixed(1)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`player-card-${player.id}`}
      onClick={onClick}
      className={`relative group cursor-pointer transition-all duration-300 hover:-translate-y-1`}
    >
      {/* FIFA FUT Style Card Wrapper */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-gramado-card via-gramado-card/95 to-gramado border border-gramado-light group-hover:border-capim/50 shadow-xl group-hover:shadow-capim/10 p-4">
        
        {/* Glow effect */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-capim/10 rounded-full blur-2xl group-hover:bg-capim/20 transition-all pointer-events-none" />
        
        {/* Card Header: Overall + Position + Avatar */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getOverallTier(
                player.overall
              )} flex items-center justify-center font-black text-xl shadow-lg border tracking-tighter`}
            >
              {player.overall}
            </div>
            <span
              className={`mt-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${getPositionColor(
                player.position
              )} uppercase tracking-wider`}
            >
              {player.position}
            </span>
            <span className="text-[10px] font-semibold text-giz/50 mt-0.5">
              {player.dominantFoot === 'canhoto' ? 'Canhota' : player.dominantFoot === 'ambidestro' ? 'Ambi' : 'Destro'}
            </span>
          </div>

          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-giz/80 group-hover:border-capim-light/80 shadow-md transition-all">
              <img
                src={player.photoUrl}
                alt={player.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            {player.mvpCount > 3 && (
              <span className="absolute -top-2 -right-2 bg-amber-500 text-gramado text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md border border-amber-300">
                <Sparkles className="w-2.5 h-2.5" /> MVP
              </span>
            )}
          </div>
        </div>

        {/* Player Name and Role */}
        <div className="text-center mb-3">
          <h3 className="text-base font-extrabold text-giz tracking-wide truncate group-hover:text-capim-light transition-colors">
            {player.nickname || player.name}
          </h3>
          <p className="text-xs text-giz/50 truncate">
            {player.name} • <span className="capitalize">{player.type}</span>
          </p>
        </div>

        {/* Attributes Grid (FIFA Stats) */}
        <div className="grid grid-cols-3 gap-1.5 bg-gramado/80 rounded-xl p-2.5 border border-gramado-light/80 text-[11px] mb-3">
          <div className="flex justify-between px-1">
            <span className="text-giz/50 font-bold">PAC</span>
            <span className="font-extrabold text-giz">{player.pace}</span>
          </div>
          <div className="flex justify-between px-1">
            <span className="text-giz/50 font-bold">FIN</span>
            <span className="font-extrabold text-giz">{player.shoot}</span>
          </div>
          <div className="flex justify-between px-1">
            <span className="text-giz/50 font-bold">PAS</span>
            <span className="font-extrabold text-giz">{player.pass}</span>
          </div>
          <div className="flex justify-between px-1">
            <span className="text-giz/50 font-bold">DRI</span>
            <span className="font-extrabold text-giz">{player.dribble}</span>
          </div>
          <div className="flex justify-between px-1">
            <span className="text-giz/50 font-bold">DEF</span>
            <span className="font-extrabold text-giz">{player.def}</span>
          </div>
          <div className="flex justify-between px-1">
            <span className="text-giz/50 font-bold">FIS</span>
            <span className="font-extrabold text-giz">{player.physical}</span>
          </div>
        </div>

        {/* Aggregate Badges & Metrics */}
        <div className="flex items-center justify-between text-xs text-giz/70 pt-1 border-t border-gramado-light">
          <div className="flex items-center gap-2">
            <span title="Gols marcados" className="flex items-center gap-1 text-giz/85 font-bold">
              ⚽ {player.goals}
            </span>
            <span title="Assistências" className="flex items-center gap-1 text-giz/85 font-bold">
              🎯 {player.assists}
            </span>
            {player.position === 'GK' && (
              <span title="Jogos sem sofrer gols" className="flex items-center gap-1 text-amber-300 font-bold">
                🧤 {player.cleanSheets}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
            <span>⭐</span>
            <span>{player.averageRating > 0 ? player.averageRating.toFixed(1) : '-'}</span>
          </div>
        </div>

        {/* Badges tags */}
        {showBadge && player.badges && player.badges.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {player.badges.slice(0, 2).map((badge, idx) => (
              <span
                key={idx}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-capim/10 text-capim-light border border-capim/20 truncate"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
