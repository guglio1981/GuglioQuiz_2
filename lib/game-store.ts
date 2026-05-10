'use client'

import { createClient } from '@/lib/supabase/client'
import type { Game, Player, Question, Answer, GameSettings, GameProfile } from '@/lib/types'
import { generateGameCode, calculateCorrectPoints, calculateWrongPoints, SCORING } from '@/lib/types'

// Lazy initialization of Supabase client
let supabaseInstance: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
}

// Game operations
export async function createGame(hostId: string, settings: GameSettings): Promise<Game | null> {
  const code = generateGameCode()
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('games')
    .insert({
      code,
      host_id: hostId,
      topics: settings.topics,
      question_count: settings.questionCount,
      difficulty: settings.difficulty,
      max_abstentions: settings.maxAbstentions,
      game_profile: settings.gameProfile || 'timed',
      arcade_games: settings.arcadeGames || null,

      arcade_frequency: settings.arcadeFrequency || null,
      status: 'lobby',
      manche_ready: true,  // First manche is ready by default
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating game:', error)
    return null
  }

  return data
}

export async function clearGameSettingsForNewManche(gameId: string): Promise<boolean> {
  const supabase = getSupabase()
  
  // Clear topics and arcade state to indicate "waiting for host to configure new manche"
  const { error } = await supabase
    .from('games')
    .update({ 
      topics: [],
      current_arcade_game: null,
      current_arcade_round: 0,
      manche_ready: false,
      topic_selection_mode: null,
    })
    .eq('id', gameId)

  if (error) {
    console.error('Error clearing game settings:', error)
    return false
  }
  
  // Delete all arcade_results for this game to start fresh in new manche
  await supabase
    .from('arcade_results')
    .delete()
    .eq('game_id', gameId)
  
  return true
}

export async function updateGameSettings(gameId: string, settings: GameSettings): Promise<boolean> {
  const supabase = getSupabase()
  
  // Delete old questions first
  await supabase.from('questions').delete().eq('game_id', gameId)
  
  // First read current manche to increment properly
  const { data: currentGame } = await supabase
    .from('games')
    .select('manche')
    .eq('id', gameId)
    .single()
  
  const nextManche = (currentGame?.manche || 0) + 1

  // Update game settings and increment manche
  const { error } = await supabase
    .from('games')
    .update({
      topics: settings.topics,
      question_count: settings.questionCount,
      difficulty: settings.difficulty,
      max_abstentions: settings.maxAbstentions,
      game_profile: settings.gameProfile || 'timed',
      arcade_games: settings.arcadeGames || null,
      arcade_frequency: settings.arcadeFrequency || null,
      current_question: 0,
      topic_selection_mode: null,
      manche: nextManche,
    })
    .eq('id', gameId)

  if (error) {
    console.error('Error updating game settings:', error)
    return false
  }
  
  return true
}

export async function updateGameTopics(gameId: string, topics: string[]): Promise<boolean> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('games')
    .update({ topics })
    .eq('id', gameId)

  if (error) {
    console.error('Error updating game topics:', error)
    return false
  }
  
  return true
}

export async function setPlayerTopicsConfirmed(playerId: string, confirmed: boolean): Promise<boolean> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('players')
    .update({ topics_confirmed: confirmed })
    .eq('id', playerId)

  if (error) {
    console.error('Error setting player topics_confirmed:', error)
    return false
  }
  
  return true
}

export async function resetAllPlayersTopicsConfirmed(gameId: string): Promise<boolean> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('players')
    .update({ topics_confirmed: false })
    .eq('game_id', gameId)

  if (error) {
    console.error('Error resetting players topics_confirmed:', error)
    return false
  }
  
  return true
}

export async function setTopicSelectionMode(gameId: string, mode: string | null): Promise<boolean> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('games')
    .update({ topic_selection_mode: mode })
    .eq('id', gameId)

  if (error) {
    console.error('Error setting topic selection mode:', error)
    return false
  }
  
  return true
}

export async function setMancheReady(gameId: string, ready: boolean): Promise<boolean> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('games')
    .update({ manche_ready: ready })
    .eq('id', gameId)

  if (error) {
    console.error('Error setting manche_ready:', error)
    return false
  }
  
  return true
}

export async function getGameByCode(code: string): Promise<Game | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('games')
    .select()
    .eq('code', code.toUpperCase())
    .single()

  if (error) {
    console.error('Error fetching game:', error)
    return null
  }

  return data
}

export async function updateGameStatus(gameId: string, status: Game['status']): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('games')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', gameId)

  if (error) {
    console.error('Error updating game status:', error)
    return false
  }

  return true
}

export async function updateCurrentQuestion(gameId: string, questionNumber: number, resetTopicSelectionMode: boolean = false): Promise<boolean> {
  const supabase = getSupabase()
  const updateData: any = { current_question: questionNumber, updated_at: new Date().toISOString() }
  if (resetTopicSelectionMode) {
    updateData.topic_selection_mode = null
  }
  
  const { error } = await supabase
    .from('games')
    .update(updateData)
    .eq('id', gameId)

  if (error) {
    console.error('Error updating current question:', error)
    return false
  }

  return true
}

// Helper to capitalize first letter of name
function capitalizeFirstLetter(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Player operations
export async function addPlayer(
  gameId: string,
  name: string,
  avatar: string | null,
  avatarUrl: string | null,
  isHost: boolean
): Promise<Player | null> {
  const supabase = getSupabase()
  const capitalizedName = capitalizeFirstLetter(name.trim())
  const { data, error } = await supabase
    .from('players')
    .insert({
      game_id: gameId,
      name: capitalizedName,
      avatar,
      avatar_url: avatarUrl,
      is_host: isHost,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding player:', error)
    return null
  }

  return data
}

export async function getPlayers(gameId: string): Promise<Player[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching players:', error)
    return []
  }

  return data || []
}

export async function updatePlayerReady(playerId: string, ready: boolean): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('players')
    .update({ ready })
    .eq('id', playerId)

  if (error) {
    console.error('Error updating player ready status:', error)
    return false
  }

  return true
}

export async function updatePlayerScore(playerId: string, scoreChange: number): Promise<boolean> {
  const supabase = getSupabase()
  
  // Use atomic RPC to avoid read-modify-write race conditions.
  // The RPC does: UPDATE players SET score = score + points WHERE id = player_id
  const { error } = await supabase.rpc('increment_player_score', {
    player_id: playerId,
    points: scoreChange,
  })

  if (error) {
    console.error('Error updating player score via RPC:', error)
    // Fallback: direct update (non-atomic, but better than nothing)
    const { data: player } = await supabase
      .from('players')
      .select('score')
      .eq('id', playerId)
      .single()

    if (!player) return false

    const newScore = (player.score || 0) + scoreChange
    const { error: fallbackError } = await supabase
      .from('players')
      .update({ score: newScore })
      .eq('id', playerId)

    if (fallbackError) {
      console.error('Fallback score update also failed:', fallbackError)
      return false
    }
  }

  return true
}

export async function updatePlayerAbstentions(playerId: string): Promise<boolean> {
  const supabase = getSupabase()
  const { data: player } = await supabase
    .from('players')
    .select('abstentions_used')
    .eq('id', playerId)
    .single()

  if (!player) return false

  const { error } = await supabase
    .from('players')
    .update({ abstentions_used: player.abstentions_used + 1 })
    .eq('id', playerId)

  if (error) {
    console.error('Error updating player abstentions:', error)
    return false
  }

  return true
}

export async function deletePlayer(playerId: string, gameId?: string): Promise<boolean> {
  const supabase = getSupabase()
  
  // Get the player's game_id before deleting if not provided
  let playerGameId = gameId
  if (!playerGameId) {
    const { data: player } = await supabase.from('players').select('game_id').eq('id', playerId).single()
    playerGameId = player?.game_id
  }
  
  const { error } = await supabase.from('players').delete().eq('id', playerId)
  
  if (error) {
    console.error('Error deleting player:', error)
    return false
  }
  
  return true
}

export async function removeDuplicatePlayers(gameId: string): Promise<void> {
  const supabase = getSupabase()
  const players = await getPlayers(gameId)
  
  // Group players by name
  const playersByName = new Map<string, Player[]>()
  for (const player of players) {
    const existing = playersByName.get(player.name) || []
    existing.push(player)
    playersByName.set(player.name, existing)
  }
  
  // For each name with duplicates, keep only the first (oldest) one
  for (const [, duplicates] of playersByName) {
    if (duplicates.length > 1) {
      // Sort by created_at, keep the first one
      duplicates.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const toDelete = duplicates.slice(1)
      
      for (const player of toDelete) {
        await supabase.from('players').delete().eq('id', player.id)
      }
    }
  }
}

export async function resetPlayersForNewManche(gameId: string, resetScores: boolean): Promise<boolean> {
  const supabase = getSupabase()
  const updates: Partial<Player> = {
    abstentions_used: 0,
    ready: false,
  }
  
  if (resetScores) {
    updates.score = 0
  }

  const { error } = await supabase
    .from('players')
    .update(updates)
    .eq('game_id', gameId)

  if (error) {
    console.error('Error resetting players:', error)
    return false
  }

  return true
}

// Question operations
export async function saveQuestions(gameId: string, questions: Omit<Question, 'id' | 'game_id' | 'created_at'>[]): Promise<Question[]> {
  const supabase = getSupabase()
  
  const questionsToInsert = questions.map((q, index) => {
    // Normalize question_type to match database constraint
    let questionType: 'multiple' | 'true_false' = 'multiple'
    const qt = String(q.question_type || '').toLowerCase()
    if (qt.includes('true') || qt.includes('false') || qt.includes('vero') || qt === 'true_false') {
      questionType = 'true_false'
    }
    
    return {
      game_id: gameId,
      question_number: index + 1,
      topic: q.topic,
      question_text: q.question_text,
      question_type: questionType,
      options: q.options,
      correct_answer: q.correct_answer,
      image_url: q.image_url || null,
    }
  })

  const { data, error } = await supabase
    .from('questions')
    .insert(questionsToInsert)
    .select()

  if (error) {
    console.error('Error saving questions:', error.message)
    return []
  }

  return data || []
}

export async function getQuestions(gameId: string): Promise<Question[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('questions')
    .select()
    .eq('game_id', gameId)
    .order('question_number', { ascending: true })

  if (error) {
    console.error('Error fetching questions:', error)
    return []
  }

  return data || []
}

// Answer operations
export async function submitAnswerV3(
  questionId: string,
  playerId: string,
  answer: string | null,
  isAbstention: boolean,
  responseTimeMs: number | null
): Promise<Answer | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('answers')
    .upsert({
      question_id: questionId,
      player_id: playerId,
      answer,
      is_abstention: isAbstention,
      response_time_ms: responseTimeMs,
    }, {
      onConflict: 'question_id,player_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting answer:', error)
    return null
  }

  return data
}

export async function getAnswersForQuestion(questionId: string): Promise<Answer[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('answers')
    .select()
    .eq('question_id', questionId)

  if (error) {
    console.error('Error fetching answers:', error)
    return []
  }

  return data || []
}

export async function processAnswers(
  gameId: string,
  questionId: string,
  correctAnswer: string,
  maxAbstentions: number,
  isFirstQuestion: boolean,
  gameProfile: GameProfile = 'timed'
): Promise<void> {

  const supabase = getSupabase()
  const answers = await getAnswersForQuestion(questionId)
  const players = await getPlayers(gameId)
  
  // Sort players by score for position calculation
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  
  const normalizedCorrect = correctAnswer.trim().toLowerCase()
  
  for (const answer of answers) {
    // Skip answers that have already been processed (idempotency guard)
    if ((answer as any).points_processed) {
      continue
    }

    const player = players.find(p => p.id === answer.player_id)
    if (!player) continue

    const position = sortedPlayers.findIndex(p => p.id === player.id) + 1
    let points = 0
    let isCorrect = false

    const playerAnswer = (answer.answer || '').trim().toLowerCase()

    if (playerAnswer === normalizedCorrect) {
      isCorrect = true
      if (gameProfile === 'untimed') {
        points = SCORING.CORRECT_UNTIMED
      } else {
        points = calculateCorrectPoints(answer.response_time_ms || 15000)
      }
    } else if (answer.is_abstention || !answer.answer) {
      // Check if abstention should count as wrong
      if (player.abstentions_used >= maxAbstentions) {
        if (gameProfile === 'untimed') {
          points = SCORING.WRONG_UNTIMED
        } else {
          points = calculateWrongPoints(position, players.length, isFirstQuestion, answer.response_time_ms ?? undefined)
        }
      }
      await updatePlayerAbstentions(player.id)
    } else {
      if (gameProfile === 'untimed') {
        points = SCORING.WRONG_UNTIMED
      } else {
        points = calculateWrongPoints(position, players.length, isFirstQuestion, answer.response_time_ms ?? undefined)
      }
    }

    // Update answer record AND mark as processed atomically
    await supabase
      .from('answers')
      .update({ is_correct: isCorrect, points_earned: points, points_processed: true })
      .eq('id', answer.id)

    // Update player score (atomic via RPC)
    await updatePlayerScore(player.id, points)
  }
}

// Realtime subscriptions
export function subscribeToGame(gameId: string, callback: (game: Game) => void) {
  const supabase = getSupabase()
  return supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => {
        callback(payload.new as Game)
      }
    )
    .subscribe()
}

export function subscribeToPlayers(gameId: string, callback: (players: Player[]) => void) {
  const supabase = getSupabase()
  // Initial fetch
  getPlayers(gameId).then(callback)

  return supabase
    .channel(`players:${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
      async () => {
        const players = await getPlayers(gameId)
        callback(players)
      }
    )
    .subscribe()
}

export function subscribeToAnswers(questionId: string, callback: (answers: Answer[]) => void) {
  const supabase = getSupabase()
  return supabase
    .channel(`answers:${questionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'answers', filter: `question_id=eq.${questionId}` },
      async () => {
        const answers = await getAnswersForQuestion(questionId)
        callback(answers)
      }
    )
    .subscribe()
}

export function unsubscribe(channel: ReturnType<ReturnType<typeof createClient>['channel']>) {
  const supabase = getSupabase()
  supabase.removeChannel(channel)
}

// Arcade game sync functions
export async function setCurrentArcadeGameInDb(
  gameId: string,
  arcadeGame: string,
  arcadeRound: number
): Promise<boolean> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('games')
    .update({
      current_arcade_game: arcadeGame,
      current_arcade_round: arcadeRound,
      topic_selection_mode: null,
    })
    .eq('id', gameId)

  if (error) {
    console.error('Error setting current arcade game:', error)
    return false
  }
  return true
}

export async function clearCurrentArcadeGame(gameId: string): Promise<boolean> {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('games')
    .update({
      current_arcade_game: null,
      current_arcade_round: 0,
    })
    .eq('id', gameId)

  if (error) {
    console.error('Error clearing current arcade game:', error)
    return false
  }
  return true
}

// Arcade game functions
export interface ArcadeResult {
  id: string
  game_id: string
  player_id: string
  game_type: string
  arcade_round: number
  raw_score: number
  points_earned: number
  position: number | null
  completed_at: string
}

export async function submitArcadeResult(
  gameId: string,
  playerId: string,
  gameType: string,
  arcadeRound: number,
  rawScore: number
): Promise<ArcadeResult | null> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('arcade_results')
    .insert({
      game_id: gameId,
      player_id: playerId,
      game_type: gameType,
      arcade_round: arcadeRound,
      raw_score: rawScore,
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting arcade result:', error)
    return null
  }
  return data
}

export async function getArcadeResults(gameId: string, arcadeRound: number): Promise<ArcadeResult[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('arcade_results')
    .select('*')
    .eq('game_id', gameId)
    .eq('arcade_round', arcadeRound)
    .order('raw_score', { ascending: true }) // Lower is better for time-based games
  
  if (error) {
    console.error('Error getting arcade results:', error)
    return []
  }
  return data || []
}

export async function processArcadeResults(
  gameId: string,
  arcadeRound: number,
  gameType: string,
  isLowerBetter: boolean = true
): Promise<void> {
  const supabase = getSupabase()
  
  // Get all results for this round
  const results = await getArcadeResults(gameId, arcadeRound)
  if (results.length === 0) return

  // Sort by score (lower better for time-based, higher better for level-based)
  const sorted = [...results].sort((a, b) => 
    isLowerBetter ? a.raw_score - b.raw_score : b.raw_score - a.raw_score
  )

  // Max points per game (scaled by difficulty)
  const MAX_POINTS: Record<string, number> = {
    puzzle_slider: 1000,
    memory_cards: 700,
    simon_says: 700,
    speed_typing: 500,
    sequenza_numerica: 400,
    reaction_time: 300,
  }

  const maxPoints = MAX_POINTS[gameType] || 500
  const validResults = sorted.filter(r => r.raw_score !== 999999 && r.raw_score !== -1)
  const bestScore = validResults.length > 0 ? validResults[0].raw_score : 0

  // Update each result with position and points (percentage-based)
  for (let i = 0; i < sorted.length; i++) {
    const position = i + 1
    let pointsEarned = 0

    // Skip already processed results (idempotency guard to prevent duplicate scores)
    if (sorted[i].position !== null) {
      continue
    }

    // Check if the player abstained
    if (sorted[i].raw_score === 999999 || sorted[i].raw_score === -1) {
      pointsEarned = 0
    }
    // Calculate percentage score based on performance relative to best
    else if (bestScore > 0) {
      // For time-based games (lower is better), best score gets 100%
      // For level-based (higher is better), best score gets 100%
      const performanceRatio = isLowerBetter 
        ? bestScore / sorted[i].raw_score  // time: 30s / 45s = 0.67 = 67%
        : sorted[i].raw_score / bestScore   // level: level4 / level8 = 0.5 = 50%
      
      pointsEarned = Math.round(maxPoints * performanceRatio)
    }

    // Update arcade result
    await supabase
      .from('arcade_results')
      .update({ position, points_earned: pointsEarned })
      .eq('id', sorted[i].id)

    // Update player score (atomic via RPC)
    await updatePlayerScore(sorted[i].player_id, pointsEarned)
  }
}

export function subscribeToArcadeResults(
  gameId: string, 
  arcadeRound: number, 
  callback: (results: ArcadeResult[]) => void
) {
  const supabase = getSupabase()
  return supabase
    .channel(`arcade:${gameId}:${arcadeRound}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'arcade_results', filter: `game_id=eq.${gameId}` },
      async () => {
        const results = await getArcadeResults(gameId, arcadeRound)
        callback(results)
      }
    )
    .subscribe()
}

export async function syncLeaderboardPhase(gameId: string, isLeaderboard: boolean | string): Promise<void> {
  const supabase = getSupabase()
  const state = typeof isLeaderboard === 'string' ? isLeaderboard : (isLeaderboard ? 'leaderboard' : null)
  await supabase
    .from('games')
    .update({ topic_selection_mode: state })
    .eq('id', gameId)
}