export const TOPICS = [
  'storia',
  'geografia',
  'tecnologia',
  'informatica',
  'ragionamento_rapido',
  'inglese',
  'economia_diritto',
  'serie_tv',
  'religione',
  'lingue_straniere',
  'matematica',
  'italiano',
  'cultura_generale',
  'cinema',
  'libri',
  'musica',
  'televisione',
  'giochi_tavolo',
  'cartoni_animati',
  'scienze_natura',
  'sport',
  'politica',
  'arte',
  'celebrita',
  'animali',
  'veicoli',
  'indovina_logo',
  'indovina_bandiera',
  'indovina_anno',
] as const

export const TOPIC_LABELS: Record<Topic, string> = {
  storia: 'Storia',
  geografia: 'Geografia',
  tecnologia: 'Tecnologia',
  informatica: 'Informatica',
  ragionamento_rapido: 'Ragionam. Rapido',
  inglese: 'Inglese',
  economia_diritto: 'Economia e Diritto',
  serie_tv: 'Serie TV',
  religione: 'Religione',
  lingue_straniere: 'Lingue Straniere',
  matematica: 'Matematica',
  italiano: 'Italiano',
  cultura_generale: 'Cultura Generale',
  cinema: 'Cinema/Film',
  libri: 'Libri',
  musica: 'Musica',
  televisione: 'Televisione',
  giochi_tavolo: 'Giochi da Tavolo',
  cartoni_animati: 'Cartoni Animati',
  scienze_natura: 'Scienze e Natura',
  sport: 'Sport',
  politica: 'Politica',
  arte: 'Arte',
  celebrita: 'Celebrita',
  animali: 'Animali',
  veicoli: 'Veicoli',
  indovina_logo: 'Indovina il Logo',
  indovina_bandiera: 'Indovina Bandiera',
  indovina_anno: 'Indovina l\'Anno',
}

export type Topic = (typeof TOPICS)[number]

// Arcade mini-games
export const ARCADE_GAMES = [
  'reaction_time',
  'memory_cards',
  'speed_typing',
  'sequenza_numerica',
  'simon_says',
  'puzzle_slider',
] as const

export type ArcadeGame = (typeof ARCADE_GAMES)[number]

export const ARCADE_GAME_LABELS: Record<ArcadeGame, string> = {
  reaction_time: 'Reaction Time',
  memory_cards: 'Memory Cards',
  speed_typing: 'Speed Typing',
  sequenza_numerica: 'Sequenza Numerica',
  simon_says: 'Sequenza di Colori',
  puzzle_slider: 'Puzzle Slider',
}

export const ARCADE_GAME_DESCRIPTIONS: Record<ArcadeGame, string> = {
  reaction_time: 'Clicca appena vedi il verde',
  memory_cards: 'Abbina le coppie',
  speed_typing: 'Scrivi piu veloce',
  sequenza_numerica: 'Tocca i numeri in ordine',
  simon_says: 'Ripeti la sequenza di colori',
  puzzle_slider: 'Ricomponi l\'immagine',
}

export type Difficulty = 'intermedia' | 'difficile'

export type QuestionType = 'multiple' | 'true_false'

export type GameStatus = 'lobby' | 'playing' | 'finished'

export type GameProfile = 'timed' | 'untimed'


export interface Game {
  id: string
  code: string
  host_id: string
  status: GameStatus
  topics: Topic[]
  question_count: number
  difficulty: Difficulty
  max_abstentions: number
  game_profile?: GameProfile

  arcade_games?: ArcadeGame[] | null
  arcade_frequency?: number | null
  current_arcade_game?: ArcadeGame | null
  current_arcade_round?: number
  current_question: number
  manche: number
  topic_selection_mode?: string | null  // '1' or '2' for collaborative selection
  manche_ready: boolean  // true when host has clicked "avvia nuova manche"
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
  topics_confirmed: boolean
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
  image_url?: string | null
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
  gameProfile?: GameProfile
  arcadeGames?: ArcadeGame[]

  arcadeFrequency?: number
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
  CORRECT_UNTIMED: 300,
  WRONG_UNTIMED: -150,
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
