import { Player, Team } from '../types';

export interface BalancedTeamResult {
  teams: Team[];
  stats: {
    teamNames: string[];
    averageOveralls: number[];
    totalOveralls: number[];
    maxDelta: number;
    gksCount: number[];
  };
}

const DEFAULT_TEAM_CONFIGS = [
  { name: 'Colete Preto', colorName: 'Preto', colorHex: '#0f172a', bgHex: 'bg-slate-900', borderHex: 'border-slate-700' },
  { name: 'Colete Branco', colorName: 'Branco', colorHex: '#f8fafc', bgHex: 'bg-slate-100', borderHex: 'border-slate-300' },
  { name: 'Colete Vermelho', colorName: 'Vermelho', colorHex: '#dc2626', bgHex: 'bg-red-600', borderHex: 'border-red-500' },
  { name: 'Colete Azul', colorName: 'Azul', colorHex: '#2563eb', bgHex: 'bg-blue-600', borderHex: 'border-blue-500' },
  { name: 'Colete Verde', colorName: 'Verde', colorHex: '#16a34a', bgHex: 'bg-emerald-600', borderHex: 'border-emerald-500' },
  { name: 'Colete Amarelo', colorName: 'Amarelo', colorHex: '#eab308', bgHex: 'bg-yellow-500', borderHex: 'border-yellow-400' },
];

export function createEmptyTeams(teamsCount: number = 2): Team[] {
  const effectiveTeamsCount = Math.max(2, Math.min(teamsCount, DEFAULT_TEAM_CONFIGS.length));

  return Array.from({ length: effectiveTeamsCount }, (_, idx) => {
    const config = DEFAULT_TEAM_CONFIGS[idx % DEFAULT_TEAM_CONFIGS.length];
    return {
      id: `team-${idx + 1}-${Date.now().toString(36)}-${idx}`,
      name: `Time ${config.name}`,
      colorName: config.colorName,
      colorHex: config.colorHex,
      bgHex: config.bgHex,
      borderHex: config.borderHex,
      playerIds: [],
    };
  });
}

export function balanceTeams(
  confirmedPlayers: Player[],
  teamsCount: number = 2,
  playersPerTeam?: number
): BalancedTeamResult {
  const effectiveTeamsCount = Math.max(2, Math.min(teamsCount, DEFAULT_TEAM_CONFIGS.length));
  
  // Clone and separate by role
  const goalkeepers = confirmedPlayers.filter((p) => p.position === 'GK').sort((a, b) => b.overall - a.overall);
  const defenders = confirmedPlayers.filter((p) => p.position === 'DEF').sort((a, b) => b.overall - a.overall);
  const midfielders = confirmedPlayers.filter((p) => p.position === 'MID').sort((a, b) => b.overall - a.overall);
  const attackers = confirmedPlayers.filter((p) => p.position === 'ATT').sort((a, b) => b.overall - a.overall);

  // Initialize teams
  const teamLists: Player[][] = Array.from({ length: effectiveTeamsCount }, () => []);

  // 1. Distribute GKs snake-draft style
  goalkeepers.forEach((gk, idx) => {
    const teamIndex = idx % effectiveTeamsCount;
    teamLists[teamIndex].push(gk);
  });

  // 2. Distribute non-GKs position by position with greedy overall balancing
  const otherGroups = [defenders, midfielders, attackers];

  // Helper to get total overall of a team
  const getTeamOverall = (team: Player[]) => team.reduce((sum, p) => sum + p.overall, 0);

  otherGroups.forEach((group) => {
    // Add some random tie-breaker variance
    const sortedGroup = [...group].sort((a, b) => b.overall - a.overall + (Math.random() * 2 - 1));

    sortedGroup.forEach((player) => {
      // Find team with lowest total overall (or lowest player count if unbalanced)
      let targetIndex = 0;
      let minScore = Infinity;

      for (let i = 0; i < effectiveTeamsCount; i++) {
        const count = teamLists[i].length;
        const totalOv = getTeamOverall(teamLists[i]);
        // Weight heavily by player count to avoid huge size mismatch, then by overall
        const score = count * 1000 + totalOv;
        if (score < minScore) {
          minScore = score;
          targetIndex = i;
        }
      }

      teamLists[targetIndex].push(player);
    });
  });

  // Optimize with swap passes to minimize standard deviation between teams
  for (let pass = 0; pass < 20; pass++) {
    for (let i = 0; i < effectiveTeamsCount; i++) {
      for (let j = i + 1; j < effectiveTeamsCount; j++) {
        const teamA = teamLists[i];
        const teamB = teamLists[j];
        const sumA = getTeamOverall(teamA);
        const sumB = getTeamOverall(teamB);
        const currentDiff = Math.abs(sumA - sumB);

        // Try swapping non-goalkeepers of similar position or overall
        for (let aIdx = 0; aIdx < teamA.length; aIdx++) {
          for (let bIdx = 0; bIdx < teamB.length; bIdx++) {
            const pA = teamA[aIdx];
            const pB = teamB[bIdx];

            // Don't swap GK if one is GK and other is not
            if (pA.position === 'GK' || pB.position === 'GK') continue;

            const newSumA = sumA - pA.overall + pB.overall;
            const newSumB = sumB - pB.overall + pA.overall;
            const newDiff = Math.abs(newSumA - newSumB);

            if (newDiff < currentDiff - 1) {
              teamA[aIdx] = pB;
              teamB[bIdx] = pA;
            }
          }
        }
      }
    }
  }

  // Create teams format
  const teams: Team[] = teamLists.map((players, idx) => {
    const config = DEFAULT_TEAM_CONFIGS[idx % DEFAULT_TEAM_CONFIGS.length];
    return {
      id: `team-${idx + 1}-${Date.now().toString(36)}`,
      name: `Time ${config.name}`,
      colorName: config.colorName,
      colorHex: config.colorHex,
      bgHex: config.bgHex,
      borderHex: config.borderHex,
      playerIds: players.map((p) => p.id),
    };
  });

  const totals = teamLists.map((t) => getTeamOverall(t));
  const averages = teamLists.map((t) => (t.length > 0 ? Math.round((getTeamOverall(t) / t.length) * 10) / 10 : 0));
  const maxDelta = Math.max(...averages) - Math.min(...averages);

  return {
    teams,
    stats: {
      teamNames: teams.map((t) => t.name),
      averageOveralls: averages,
      totalOveralls: totals,
      maxDelta: Math.round(maxDelta * 10) / 10,
      gksCount: teamLists.map((t) => t.filter((p) => p.position === 'GK').length),
    },
  };
}
