import { Pelada, Player, ConfirmedPlayer } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function generateAttendanceMessage(pelada: Pelada, playersMap: Map<string, Player>): string {
  const confirmed = pelada.confirmedPlayers.filter((p) => p.status === 'confirmed');
  const waitlist = pelada.confirmedPlayers.filter((p) => p.status === 'waitlist');
  const pending = pelada.confirmedPlayers.filter((p) => p.status === 'pending');

  const dayNames: Record<string, string> = {
    segunda: 'Segunda-feira',
    terca: 'Terça-feira',
    quarta: 'Quarta-feira',
    quinta: 'Quinta-feira',
    sexta: 'Sexta-feira',
    sabado: 'Sábado',
    domingo: 'Domingo',
  };

  let text = `⚽ *FUTEBOL DOS CRIA - CONVOCAÇÃO OFICIAL* ⚽\n\n`;
  text += `📅 *Data:* ${formatDateBR(pelada.date)} às ${pelada.time}h`;
  if (pelada.frequency && pelada.frequency !== 'unica' && pelada.dayOfWeek) {
    const freqLabel = pelada.frequency === 'mensal' ? 'Mensal' : pelada.frequency === 'quinzenal' ? 'Quinzenal' : 'Semanal';
    text += ` (${freqLabel} - ${dayNames[pelada.dayOfWeek] || pelada.dayOfWeek})`;
  }
  text += `\n📍 *Local:* ${pelada.location}\n`;
  if (pelada.address) text += `📌 *Endereço:* ${pelada.address}\n`;
  text += `💵 *Valores:* Mensalistas ${formatCurrency(pelada.priceMensalista)} | Diaristas ${formatCurrency(pelada.priceDiarista)}\n`;
  text += `🔑 *Chave PIX (${pelada.pixKeyType}):* ${pelada.pixKey} (${pelada.pixReceiverName})\n\n`;

  text += `📋 *LISTA DE CONFIRMADOS (${confirmed.length}/${pelada.maxPlayers}):*\n`;
  if (confirmed.length === 0) {
    text += `_Nenhum confirmado ainda. Seja o primeiro!_\n`;
  } else {
    confirmed.forEach((cp, idx) => {
      const p = playersMap.get(cp.playerId);
      const name = p ? `${p.nickname || p.name} (${p.position})` : 'Jogador';
      const payIcon = cp.paymentStatus === 'paid' ? '✅ Pago' : '⏳ Pendente';
      text += `${idx + 1}. ${name} - ${payIcon}\n`;
    });
  }

  if (waitlist.length > 0) {
    text += `\n⏳ *LISTA DE ESPERA (${waitlist.length}):*\n`;
    waitlist.forEach((cp, idx) => {
      const p = playersMap.get(cp.playerId);
      const name = p ? `${p.nickname || p.name}` : 'Jogador';
      text += `${idx + 1}. ${name}\n`;
    });
  }

  if (pending.length > 0) {
    text += `\n❓ *EM DÚVIDA / PENDENTES (${pending.length}):*\n`;
    pending.forEach((cp, idx) => {
      const p = playersMap.get(cp.playerId);
      const name = p ? `${p.nickname || p.name}` : 'Jogador';
      text += `• ${name}\n`;
    });
  }

  text += `\n🚨 *Avisem com antecedência caso não possam comparecer para liberar a vaga da fila de espera!*`;
  return text;
}

export function generateReminderMessage(pelada: Pelada, playersMap: Map<string, Player>): string {
  const confirmed = pelada.confirmedPlayers.filter((p) => p.status === 'confirmed');
  const spotsLeft = Math.max(0, pelada.maxPlayers - confirmed.length);

  let text = `⏰ *LEMBRETE DA PELADA DOS CRIA!* ⏰\n\n`;
  text += `Fala rapaziada! A pelada é *${formatDateBR(pelada.date)} às ${pelada.time}h* no *${pelada.location}*.\n\n`;
  text += `🔥 Vagas restantes: *${spotsLeft} vagas*\n`;
  text += `💸 Não esqueçam de fazer o PIX antecipado para garantir a vaga e o pagamento do campo:\n`;
  text += `👉 *Chave PIX:* \`${pelada.pixKey}\`\n`;
  text += `👤 *Favorecido:* ${pelada.pixReceiverName}\n\n`;
  text += `Confirme no app ou responda aqui se vai colar! ⚽🔥`;
  return text;
}

export function generatePixBillingMessage(pelada: Pelada, cp: ConfirmedPlayer, player: Player): string {
  const amount = player.type === 'mensalista' ? pelada.priceMensalista : pelada.priceDiarista;
  let text = `👋 Fala *${player.nickname || player.name}*, tudo certo?\n\n`;
  text += `Segue a cobrança da *${pelada.title}* (${formatDateBR(pelada.date)} às ${pelada.time}h):\n\n`;
  text += `💰 *Valor:* ${formatCurrency(amount)} (${player.type === 'mensalista' ? 'Mensalidade' : 'Diária'})\n`;
  text += `🔑 *Chave PIX (${pelada.pixKeyType}):* \`${pelada.pixKey}\`\n`;
  text += `👤 *Nome:* ${pelada.pixReceiverName}\n\n`;
  text += `Assim que fizer a transferência, manda o comprovante aqui pra gente dar baixa no sistema! Valeu! ⚽`;
  return text;
}

export function generateTeamsDrawMessage(pelada: Pelada, playersMap: Map<string, Player>): string {
  let text = `🏆 *SORTEIO OFICIAL DOS TIMES - FUTEBOL DOS CRIA* 🏆\n\n`;
  text += `📅 *Pelada:* ${pelada.title} (${formatDateBR(pelada.date)} - ${pelada.time}h)\n\n`;

  pelada.teams.forEach((team) => {
    const players = team.playerIds.map((id) => playersMap.get(id)).filter(Boolean) as Player[];
    const avgOv = players.length > 0 ? Math.round((players.reduce((s, p) => s + p.overall, 0) / players.length) * 10) / 10 : 0;
    text += `👕 *${team.name.toUpperCase()}* (Média: ${avgOv} OVR):\n`;
    players.forEach((p) => {
      const posBadge = p.position === 'GK' ? '🧤 GK' : p.position === 'DEF' ? '🛡️ DEF' : p.position === 'MID' ? '🎯 MEI' : '⚡ ATA';
      text += `  • ${p.nickname || p.name} [${posBadge} | ${p.overall}]\n`;
    });
    text += `\n`;
  });

  text += `⚖️ *Times equilibrados pelo sistema do Futebol dos Cria! Que vença o melhor!* 🔥`;
  return text;
}

export function generatePostGameReportMessage(pelada: Pelada, playersMap: Map<string, Player>): string {
  let text = `📝 *RESENHA PÓS-JOGO - FUTEBOL DOS CRIA* ⚽🔥\n\n`;
  text += `📅 *${pelada.title}* - ${formatDateBR(pelada.date)}\n\n`;

  if (pelada.matches && pelada.matches.length > 0) {
    text += `📊 *RESULTADOS DAS PARTIDAS:*\n`;
    pelada.matches.forEach((m, idx) => {
      const teamA = pelada.teams.find((t) => t.id === m.teamAId)?.name || 'Time A';
      const teamB = pelada.teams.find((t) => t.id === m.teamBId)?.name || 'Time B';
      text += `Rodada ${idx + 1}: *${teamA} ${m.scoreA} x ${m.scoreB} ${teamB}*\n`;
    });
    text += `\n`;
  }

  // Count goals from events
  const goalsByPlayer: Record<string, number> = {};
  const assistsByPlayer: Record<string, number> = {};

  pelada.matches.forEach((m) => {
    m.events.forEach((ev) => {
      if (ev.type === 'goal') {
        goalsByPlayer[ev.playerId] = (goalsByPlayer[ev.playerId] || 0) + 1;
        if (ev.assistPlayerId) {
          assistsByPlayer[ev.assistPlayerId] = (assistsByPlayer[ev.assistPlayerId] || 0) + 1;
        }
      }
    });
  });

  const topScorers = Object.entries(goalsByPlayer).sort((a, b) => b[1] - a[1]);
  if (topScorers.length > 0) {
    text += `⚽ *ARTILHARIA DO DIA:*\n`;
    topScorers.slice(0, 3).forEach(([pid, goals]) => {
      const p = playersMap.get(pid);
      text += `  • ${p?.nickname || p?.name || 'Jogador'}: ${goals} gol(s)\n`;
    });
    text += `\n`;
  }

  if (pelada.resenhaNotes) {
    text += `💬 *Comentário do Jogo:*\n"${pelada.resenhaNotes}"\n\n`;
  }

  text += `⭐ *VOTAÇÃO DO CRAQUE & BAGRE DA RODADA ABERTA!*\n`;
  text += `Abra o aplicativo para avaliar as notas individuais de 1 a 10 de cada jogador! 🗳️`;

  return text;
}

export function openWhatsAppWithText(text: string, phone?: string) {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  const encoded = encodeURIComponent(text);
  const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}
