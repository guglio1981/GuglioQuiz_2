export const TOPICS = [
  'storia',
  'geografia',
  'tecnologia',
  'informatica',
  'ragionamento_rapido',
  'anagrammi',
  'inglese',
  'economia_diritto',
  'serie_tv',
  'religione',
  'lingue_straniere',
  'avvenimenti_storici',
  'matematica',
  'italiano',
] as const

export const TOPIC_LABELS: Record<Topic, string> = {
  storia: 'Storia',
  geografia: 'Geografia',
  tecnologia: 'Tecnologia',
  informatica: 'Informatica',
  ragionamento_rapido: 'Ragionamento Rapido',
  anagrammi: 'Anagrammi',
  inglese: 'Inglese',
  economia_diritto: 'Economia e Diritto',
  serie_tv: 'Serie TV',
  religione: 'Religione',
  lingue_straniere: 'Lingue Straniere',
  avvenimenti_storici: 'Avvenimenti Storici',
  matematica: 'Matematica',
  italiano: 'Italiano',
}

export type Topic = (typeof TOPICS)[number]

export type Difficulty = 'intermedia' | 'difficile'

export type QuestionType = 'multiple' | 'true_false'

export type GameStatus = 'lobby' | 'playing' | 'finished'

export interface Game {
  id: string
  code: string
  host_id: string
  status: GameStatus
  topics: Topic[]
  question_count: number
  difficulty: Difficulty
  max_abstentions: number
  current_question: number
  manche: number
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  game_id: string
  name: string
  avatar: string | null
  avatar_url: string | null
  is_host: boolean
  score: number
  abstentions_used: number
  ready: boolean
  created_at: string
}

export interface Question {
  id: string
  game_id: string
  question_number: number
  topic: string
  question_text: string
  question_type: QuestionType
  options: string[]
  correct_answer: string
  created_at: string
}

export interface Answer {
  id: string
  question_id: string
  player_id: string
  answer: string | null
  is_correct: boolean | null
  is_abstention: boolean
  response_time_ms: number | null
  points_earned: number
  created_at: string
}

export interface GameSettings {
  topics: Topic[]
  questionCount: number
  difficulty: Difficulty
  maxAbstentions: number
}

export interface PlayerProfile {
  name: string
  avatar: string | null
  avatarUrl: string | null
}

export const AVATARS = [
  'avatar_1',
  'avatar_2',
  'avatar_3',
  'avatar_4',
  'avatar_5',
  'avatar_6',
  'avatar_7',
  'avatar_8',
  'avatar_9',
  'avatar_10',
] as const

export type AvatarId = (typeof AVATARS)[number]

export const AVATAR_COLORS: Record<AvatarId, { bg: string; text: string }> = {
  avatar_1: { bg: 'bg-red-500', text: 'text-white' },
  avatar_2: { bg: 'bg-blue-500', text: 'text-white' },
  avatar_3: { bg: 'bg-green-500', text: 'text-white' },
  avatar_4: { bg: 'bg-yellow-500', text: 'text-black' },
  avatar_5: { bg: 'bg-purple-500', text: 'text-white' },
  avatar_6: { bg: 'bg-pink-500', text: 'text-white' },
  avatar_7: { bg: 'bg-indigo-500', text: 'text-white' },
  avatar_8: { bg: 'bg-teal-500', text: 'text-white' },
  avatar_9: { bg: 'bg-orange-500', text: 'text-white' },
  avatar_10: { bg: 'bg-cyan-500', text: 'text-white' },
}

export const AVATAR_ICONS: Record<AvatarId, string> = {
  avatar_1: '🦊',
  avatar_2: '🐸',
  avatar_3: '🦁',
  avatar_4: '🐼',
  avatar_5: '🦄',
  avatar_6: '🐷',
  avatar_7: '🦉',
  avatar_8: '🐙',
  avatar_9: '🦜',
  avatar_10: '🐳',
}

// Scoring constants
export const SCORING = {
  CORRECT_MIN: 200,
  CORRECT_MAX: 300,
  WRONG_MIN: -50,
  WRONG_MAX: -200,
  ABSTENTION: 0,
  TIME_LIMIT_MS: 15000,
} as const

export function calculateCorrectPoints(responseTimeMs: number): number {
  // Faster response = more points (linear interpolation)
  const timeFraction = Math.min(responseTimeMs / SCORING.TIME_LIMIT_MS, 1)
  const pointRange = SCORING.CORRECT_MAX - SCORING.CORRECT_MIN
  return Math.round(SCORING.CORRECT_MAX - timeFraction * pointRange)
}

export function calculateWrongPoints(
  position: number,
  totalPlayers: number,
  isFirstQuestion: boolean,
  responseTimeMs?: number
): number {
  if (isFirstQuestion && responseTimeMs !== undefined) {
    // First question: faster wrong answer = more penalty
    const timeFraction = 1 - Math.min(responseTimeMs / SCORING.TIME_LIMIT_MS, 1)
    const penaltyRange = Math.abs(SCORING.WRONG_MAX - SCORING.WRONG_MIN)
    return Math.round(SCORING.WRONG_MIN - timeFraction * penaltyRange)
  }
  
  // Normal: higher position = less penalty
  const positionFraction = totalPlayers > 1 ? (position - 1) / (totalPlayers - 1) : 0
  const penaltyRange = Math.abs(SCORING.WRONG_MAX - SCORING.WRONG_MIN)
  return Math.round(SCORING.WRONG_MAX + positionFraction * penaltyRange)
}

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
