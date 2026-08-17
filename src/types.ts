export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'ATT';

export type PlayerType = 'mensalista' | 'diarista';

export type Foot = 'destro' | 'canhoto' | 'ambidestro';

export interface Player {
  id: string;
  userId?: string;
  userEmail?: string;
  name: string;
  nickname: string;
  photoUrl: string;
  position: PlayerPosition;
  type: PlayerType;
  overall: number; // 40-99
  pace: number;
  shoot: number;
  pass: number;
  dribble: number;
  def: number;
  physical: number;
  dominantFoot: Foot;
  phone: string;
  active: boolean;
  // Aggregate stats
  matchesCount: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  mvpCount: number;
  bagreCount: number;
  averageRating: number;
  ratingsCount: number;
  lastRatings: number[];
  badges: string[];
}

export type AttendanceStatus = 'confirmed' | 'pending' | 'declined' | 'waitlist';
export type PaymentStatus = 'paid' | 'pending' | 'late' | 'free';

export interface ConfirmedPlayer {
  playerId: string;
  status: AttendanceStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  paymentMethod?: 'pix' | 'dinheiro' | 'cartao';
  paymentDate?: string;
  confirmedAt?: string;
  reminderSent?: boolean;
}

export interface Team {
  id: string;
  name: string;
  colorName: string;
  colorHex: string;
  bgHex: string;
  borderHex: string;
  playerIds: string[];
}

export interface MatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'own_goal';
  playerId: string;
  assistPlayerId?: string;
  teamId: string;
}

export interface MatchGame {
  id: string;
  roundNumber: number;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  status: 'pending' | 'playing' | 'finished';
  events: MatchEvent[];
  durationMinutes: number;
  mvpPlayerId?: string;
}

export interface PlayerScoreRating {
  score: number;
  comment?: string;
  tags?: string[];
}

export interface PlayerEvaluation {
  id: string;
  peladaId: string;
  voterName: string;
  voterPlayerId?: string;
  submittedAt: string;
  ratings: Record<string, PlayerScoreRating>;
  mvpVoteId?: string;
  bagreVoteId?: string;
  bestGoalPlayerId?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'aluguel_campo' | 'coletes_bolas' | 'juiz' | 'resenha_churras' | 'outros';
  paidDate: string;
  isPaid: boolean;
}

export interface NotificationLog {
  id: string;
  peladaId: string;
  type: 'convite_24h' | 'lembrete_dia' | 'cobranca_pix' | 'pos_jogo_votacao';
  title: string;
  message: string;
  sentAt: string;
  recipientsCount: number;
  channel: 'whatsapp' | 'push' | 'sms';
}

export interface Pelada {
  id: string;
  title: string;
  creatorUid?: string;
  creatorEmail?: string;
  creatorName?: string;
  adminUids?: string[];
  adminEmails?: string[];
  location: string;
  address: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  frequency?: 'semanal' | 'mensal' | 'quinzenal' | 'unica';
  dayOfWeek?: 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado';
  monthlyWeekPattern?: string;
  fieldType: 'society' | 'campo' | 'futsal';
  playersPerTeam: number; // e.g. 5, 6, 7
  teamsCount: number; // e.g. 2, 3, 4
  maxPlayers: number;
  priceMensalista: number;
  priceDiarista: number;
  pixKey: string;
  pixKeyType: 'cpf' | 'telefone' | 'email' | 'aleatoria';
  pixReceiverName: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  confirmedPlayers: ConfirmedPlayer[];
  teams: Team[];
  matches: MatchGame[];
  expenses: Expense[];
  evaluations: PlayerEvaluation[];
  resenhaNotes?: string;
  whatsappGroupLink?: string;
}
