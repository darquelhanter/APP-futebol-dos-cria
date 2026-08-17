import React, { useState } from 'react';
import { Player, PlayerPosition, PlayerType, Foot } from '../types';
import { X, Award, Shield, Zap, Sparkles, Phone, MessageSquare, Edit2, Save, Trash2, Check } from 'lucide-react';
import { openWhatsAppWithText } from '../utils/whatsappGenerator';

interface PlayerProfileModalProps {
  player: Player | null;
  onClose: () => void;
  onUpdatePlayer: (updated: Player) => void;
  onDeletePlayer?: (playerId: string) => void;
  isCreator?: boolean;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  onClose,
  onUpdatePlayer,
  onDeletePlayer,
  isCreator = false,
}) => {
  if (!player) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Player>({ ...player });
  const [newBadge, setNewBadge] = useState('');

  const handleDelete = () => {
    if (!isCreator) {
      alert('Apenas quem criou a pelada tem permissão para excluir atletas do elenco!');
      return;
    }
    if (window.confirm(`⚠️ Tem certeza que deseja EXCLUIR o atleta "${player.name}" (${player.nickname}) do elenco permanentemente?`)) {
      if (onDeletePlayer) {
        onDeletePlayer(player.id);
        onClose();
      }
    }
  };

  const handleSave = () => {
    // Recalculate overall based on attributes & position
    const attrs = [formData.pace, formData.shoot, formData.pass, formData.dribble, formData.def, formData.physical];
    let calcOverall = Math.round(attrs.reduce((a, b) => a + b, 0) / 6);
    
    // Position weight adjustment
    if (formData.position === 'GK') {
      calcOverall = Math.round(formData.def * 0.45 + formData.physical * 0.25 + formData.pass * 0.15 + formData.pace * 0.15);
    } else if (formData.position === 'DEF') {
      calcOverall = Math.round(formData.def * 0.4 + formData.physical * 0.3 + formData.pass * 0.15 + formData.pace * 0.15);
    } else if (formData.position === 'MID') {
      calcOverall = Math.round(formData.pass * 0.35 + formData.dribble * 0.25 + formData.shoot * 0.2 + formData.def * 0.2);
    } else if (formData.position === 'ATT') {
      calcOverall = Math.round(formData.shoot * 0.4 + formData.pace * 0.25 + formData.dribble * 0.25 + formData.physical * 0.1);
    }

    const updated = {
      ...formData,
      overall: Math.min(99, Math.max(40, calcOverall)),
    };

    onUpdatePlayer(updated);
    setIsEditing(false);
  };

  const handleAddBadge = () => {
    if (!newBadge.trim()) return;
    setFormData({
      ...formData,
      badges: [...(formData.badges || []), newBadge.trim()],
    });
    setNewBadge('');
  };

  const handleRemoveBadge = (index: number) => {
    setFormData({
      ...formData,
      badges: formData.badges.filter((_, i) => i !== index),
    });
  };

  return (
    <div
      id="player-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="player-profile-modal-content"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header background banner */}
        <div className="h-32 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 relative p-6 flex items-start justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
              Perfil do Cria
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-edit-player"
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isEditing
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              {isEditing ? 'Cancelar Edição' : 'Editar Atributos'}
            </button>
            <button
              id="btn-close-player-modal"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 pt-0 relative">
          {/* Avatar and Top Meta */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 mb-6">
            <div className="flex items-end gap-4">
              <div className="relative">
                <img
                  src={formData.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={formData.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-900 shadow-xl"
                />
                <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-sm px-2 py-0.5 rounded-lg border border-yellow-300 shadow-md">
                  {formData.overall}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{formData.nickname || formData.name}</h2>
                <p className="text-sm text-slate-400">{formData.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/30 capitalize">
                    {formData.type}
                  </span>
                  <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700">
                    Posição: {formData.position}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">
                    Pé: {formData.dominantFoot}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Message button */}
            {formData.phone && (
              <button
                id="btn-whatsapp-player"
                onClick={() =>
                  openWhatsAppWithText(
                    `Fala ${formData.nickname || formData.name}! Tudo bem? Te mandando mensagem sobre a pelada dos Cria! ⚽`,
                    formData.phone
                  )
                }
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Conversar no WhatsApp
              </button>
            )}
          </div>

          {/* Form edit mode vs Normal View */}
          {isEditing ? (
            <div className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" /> Editar Dados do Jogador
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Apelido na Pelada</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Posição</label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value as PlayerPosition })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="GK">Goleiro (GK)</option>
                    <option value="DEF">Zagueiro / Lateral (DEF)</option>
                    <option value="MID">Meio-Campo (MID)</option>
                    <option value="ATT">Atacante (ATT)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Tipo de Membro</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PlayerType })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="mensalista">Mensalista</option>
                    <option value="diarista">Diarista / Avulso</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Pé Dominante</label>
                  <select
                    value={formData.dominantFoot}
                    onChange={(e) => setFormData({ ...formData, dominantFoot: e.target.value as Foot })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="destro">Destro</option>
                    <option value="canhoto">Canhoto</option>
                    <option value="ambidestro">Ambidestro</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Telefone WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-400 font-bold block mb-1">URL da Foto (Avatar)</label>
                  <input
                    type="text"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Attributes sliders */}
              <div className="pt-3 border-t border-slate-800">
                <p className="text-xs font-bold text-slate-300 mb-3">Atributos FIFA (0 a 99):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  {[
                    { label: 'Velocidade (PAC)', key: 'pace' },
                    { label: 'Finalização (SHO)', key: 'shoot' },
                    { label: 'Passe (PAS)', key: 'pass' },
                    { label: 'Drible (DRI)', key: 'dribble' },
                    { label: 'Defesa (DEF)', key: 'def' },
                    { label: 'Físico (PHY)', key: 'physical' },
                  ].map((attr) => (
                    <div key={attr.key}>
                      <div className="flex justify-between text-slate-300 font-bold mb-1">
                        <span>{attr.label}</span>
                        <span className="text-emerald-400 font-black">
                          {formData[attr.key as keyof Player] as number}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="99"
                        value={formData[attr.key as keyof Player] as number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [attr.key]: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Badges edit */}
              <div className="pt-3 border-t border-slate-800">
                <p className="text-xs font-bold text-slate-300 mb-2">Conquistas & Badges:</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.badges?.map((badge, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                    >
                      {badge}
                      <button
                        type="button"
                        onClick={() => handleRemoveBadge(idx)}
                        className="hover:text-rose-400 text-slate-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="Nova tag (Ex: Chuteira de Ouro)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddBadge}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {onDeletePlayer && (
                  <button
                    type="button"
                    id="btn-delete-player"
                    onClick={handleDelete}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      isCreator
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800/60 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                    title={
                      isCreator
                        ? 'Excluir jogador do elenco'
                        : 'Apenas quem criou a pelada pode excluir atletas'
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Jogador</span>
                    {!isCreator && <span className="text-[10px] text-slate-500">(Restrito ao Criador)</span>}
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id="btn-save-player"
                    onClick={handleSave}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Career Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">Partidas</p>
                  <p className="text-xl font-black text-white">{player.matchesCount}</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">
                    {player.wins}V • {player.draws}E • {player.losses}D
                  </p>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">Gols / Assists</p>
                  <p className="text-xl font-black text-emerald-400">
                    {player.goals} <span className="text-slate-500 text-sm">/</span> {player.assists}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {((player.goals + player.assists) / Math.max(1, player.matchesCount)).toFixed(2)} part./jogo
                  </p>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">Nota Média</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-amber-400">⭐</span>
                    <span className="text-xl font-black text-amber-300">
                      {player.averageRating > 0 ? player.averageRating.toFixed(1) : '-'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{player.ratingsCount} avaliações</p>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">Premiações</p>
                  <p className="text-xl font-black text-white flex items-center justify-center gap-2">
                    <span className="text-amber-400" title="Craque da Rodada (MVP)">
                      👑 {player.mvpCount}
                    </span>
                    <span className="text-rose-400" title="Troféu Bagre">
                      🐟 {player.bagreCount}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Craque vs Bagre</p>
                </div>
              </div>

              {/* FIFA Attributes Progress Bars */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Atributos Técnicos & Físicos
                </h4>
                <div className="space-y-3">
                  {[
                    { label: 'Velocidade & Arrancada (PAC)', val: player.pace, color: 'bg-amber-500' },
                    { label: 'Finalização & Pontaria (SHO)', val: player.shoot, color: 'bg-rose-500' },
                    { label: 'Passe & Visão de Jogo (PAS)', val: player.pass, color: 'bg-emerald-500' },
                    { label: 'Drible & Controle de Bola (DRI)', val: player.dribble, color: 'bg-purple-500' },
                    { label: 'Desarme & Marcação (DEF)', val: player.def, color: 'bg-blue-500' },
                    { label: 'Físico & Resistência (PHY)', val: player.physical, color: 'bg-teal-500' },
                  ].map((attr) => (
                    <div key={attr.label}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-300">{attr.label}</span>
                        <span className="text-white font-extrabold">{attr.val}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${attr.color} rounded-full transition-all duration-500`}
                          style={{ width: `${attr.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Badges & Tags */}
              {player.badges && player.badges.length > 0 && (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" /> Conquistas da Pelada
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {player.badges.map((b, i) => (
                      <span
                        key={i}
                        className="text-xs font-extrabold px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
