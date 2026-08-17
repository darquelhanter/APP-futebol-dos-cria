import React, { useState } from 'react';
import { Player, PlayerPosition, PlayerType, Foot } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  Zap,
  Sparkles,
  Award
} from 'lucide-react';
import { PlayerCard } from './PlayerCard';

interface PlayersManagerProps {
  players: Player[];
  onAddPlayer: (newPlayer: Player) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenUserProfile?: () => void;
}

export const PlayersManager: React.FC<PlayersManagerProps> = ({
  players,
  onAddPlayer,
  onSelectPlayer,
  onOpenUserProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<'all' | PlayerPosition>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | PlayerType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Player Form State
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [position, setPosition] = useState<PlayerPosition>('MID');
  const [type, setType] = useState<PlayerType>('mensalista');
  const [dominantFoot, setDominantFoot] = useState<Foot>('destro');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
  const [pace, setPace] = useState(80);
  const [shoot, setShoot] = useState(78);
  const [pass, setPass] = useState(82);
  const [dribble, setDribble] = useState(80);
  const [def, setDef] = useState(65);
  const [physical, setPhysical] = useState(75);

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Calculate overall based on position
    let calcOverall = Math.round((pace + shoot + pass + dribble + def + physical) / 6);
    if (position === 'GK') {
      calcOverall = Math.round(def * 0.45 + physical * 0.25 + pass * 0.15 + pace * 0.15);
    } else if (position === 'DEF') {
      calcOverall = Math.round(def * 0.4 + physical * 0.3 + pass * 0.15 + pace * 0.15);
    } else if (position === 'MID') {
      calcOverall = Math.round(pass * 0.35 + dribble * 0.25 + shoot * 0.2 + def * 0.2);
    } else if (position === 'ATT') {
      calcOverall = Math.round(shoot * 0.4 + pace * 0.25 + dribble * 0.25 + physical * 0.1);
    }

    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      nickname: nickname.trim() || name.trim(),
      photoUrl: photoUrl.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      position,
      type,
      overall: Math.min(99, Math.max(40, calcOverall)),
      pace,
      shoot,
      pass,
      dribble,
      def,
      physical,
      dominantFoot,
      phone: phone.trim(),
      active: true,
      matchesCount: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      mvpCount: 0,
      bagreCount: 0,
      averageRating: 7.5,
      ratingsCount: 0,
      lastRatings: [],
      badges: ['Novo Cria'],
    };

    onAddPlayer(newPlayer);
    setIsAddModalOpen(false);
    
    // Reset
    setName('');
    setNickname('');
    setPhone('');
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nickname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === 'all' || p.position === positionFilter;
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesPosition && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Squad Stats and Add Player */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Elenco dos Cria
            </span>
            <span className="text-xs text-slate-400">
              {players.length} atletas cadastrados ({players.filter(p => p.type === 'mensalista').length} mensalistas, {players.filter(p => p.type === 'diarista').length} diaristas)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Gerenciar Elenco & Atributos</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Clique em qualquer cartão para ver o perfil completo estilo FIFA, editar atributos ou abrir conversa no WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenUserProfile && (
            <button
              id="btn-open-my-profile-elenco"
              onClick={onOpenUserProfile}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 rounded-2xl text-xs font-black flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              ⭐ Criar / Editar Meu Perfil
            </button>
          )}

          <button
            id="btn-add-player-open"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            + Cadastrar Jogador
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou apelido..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Position Filters */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'GK', 'DEF', 'MID', 'ATT'].map((pos) => (
              <button
                key={pos}
                id={`filter-pos-${pos}`}
                onClick={() => setPositionFilter(pos as any)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  positionFilter === pos ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {pos === 'all' ? 'Todas Pos.' : pos}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['all', 'mensalista', 'diarista'].map((tp) => (
              <button
                key={tp}
                id={`filter-type-${tp}`}
                onClick={() => setTypeFilter(tp as any)}
                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all ${
                  typeFilter === tp ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tp === 'all' ? 'Todos' : tp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of FIFA Style Player Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredPlayers.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 p-8">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Nenhum jogador encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {players.length === 0
                ? "Seu elenco está limpo. Comece cadastrando os jogadores da sua pelada para gerar as cartas e estatísticas."
                : "Nenhum jogador corresponde aos filtros selecionados."}
            </p>
            {players.length === 0 && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Cadastrar Primeiro Jogador
              </button>
            )}
          </div>
        ) : (
          filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onClick={() => onSelectPlayer(player)}
            />
          ))
        )}
      </div>

      {/* Add Player Modal */}
      {isAddModalOpen && (
        <div
          id="add-player-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Cadastrar Novo Jogador no Elenco
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Defina as características e atributos técnicos do novo atleta.
            </p>

            <form onSubmit={handleCreatePlayer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Apelido na Pelada</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ex: Cadu 10"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Posição</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="GK">Goleiro (GK)</option>
                    <option value="DEF">Zagueiro / Lateral (DEF)</option>
                    <option value="MID">Meio-Campo (MID)</option>
                    <option value="ATT">Atacante (ATT)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Tipo de Membro</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PlayerType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="mensalista">Mensalista</option>
                    <option value="diarista">Diarista / Avulso</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Pé Dominante</label>
                  <select
                    value={dominantFoot}
                    onChange={(e) => setDominantFoot(e.target.value as Foot)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="destro">Destro</option>
                    <option value="canhoto">Canhoto</option>
                    <option value="ambidestro">Ambidestro</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Attributes sliders */}
              <div className="pt-3 border-t border-slate-800">
                <p className="text-xs font-bold text-slate-300 mb-3">Atributos FIFA (0 a 99):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {[
                    { label: 'Velocidade', val: pace, setVal: setPace },
                    { label: 'Finalização', val: shoot, setVal: setShoot },
                    { label: 'Passe', val: pass, setVal: setPass },
                    { label: 'Drible', val: dribble, setVal: setDribble },
                    { label: 'Defesa', val: def, setVal: setDef },
                    { label: 'Físico', val: physical, setVal: setPhysical },
                  ].map((attr) => (
                    <div key={attr.label}>
                      <div className="flex justify-between text-slate-300 font-bold mb-1">
                        <span>{attr.label}</span>
                        <span className="text-emerald-400 font-black">{attr.val}</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="99"
                        value={attr.val}
                        onChange={(e) => attr.setVal(parseInt(e.target.value, 10))}
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-colors"
                >
                  Cadastrar Jogador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
