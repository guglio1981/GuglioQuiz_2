'use client'

import { createClient } from '@/lib/supabase/client'
import type { Game, Player, Question, Answer, GameSettings } from '@/lib/types'
import { generateGameCode, calculateCorrectPoints, calculateWrongPoints } from '@/lib/types'

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
      status: 'lobby',
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
  
  // Clear topics to indicate "waiting for host to configure new manche"
  const { error } = await supabase
    .from('games')
    .update({ topics: [] })
    .eq('id', gameId)

  if (error) {
    console.error('Error clearing game settings:', error)
    return false
  }
  
  return true
}

export async function updateGameSettings(gameId: string, settings: GameSettings): Promise<boolean> {
  const supabase = getSupabase()
  
  // Delete old questions first
  await supabase.from('questions').delete().eq('game_id', gameId)
  
  // Update game settings and increment manche
  const { error } = await supabase
    .from('games')
    .update({
      topics: settings.topics,
      question_count: settings.questionCount,
      difficulty: settings.difficulty,
      max_abstentions: settings.maxAbstentions,
      current_question: 0,
      manche: supabase.rpc ? undefined : 1, // Will increment via raw SQL if needed
    })
    .eq('id', gameId)

  if (error) {
    console.error('Error updating game settings:', error)
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

export async function updateCurrentQuestion(gameId: string, questionNumber: number): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('games')
    .update({ current_question: questionNumber, updated_at: new Date().toISOString() })
    .eq('id', gameId)

  if (error) {
    console.error('Error updating current question:', error)
    return false
  }

  return true
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
  const { data, error } = await supabase
    .from('players')
    .insert({
      game_id: gameId,
      name,
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
  const { data: player } = await supabase
    .from('players')
    .select('score')
    .eq('id', playerId)
    .single()

  if (!player) return false

  const { error } = await supabase
    .from('players')
    .update({ score: player.score + scoreChange })
    .eq('id', playerId)

  if (error) {
    console.error('Error updating player score:', error)
    return false
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

export async function deletePlayer(playerId: string): Promise<boolean> {
  const supabase = getSupabase()
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
    }
  })

  const { data, error } = await supabase
    .from('questions')
    .insert(questionsToInsert)
    .select()

  if (error) {
    console.error('[v0] Error saving questions code:', error.code)
    console.error('[v0] Error saving questions message:', error.message)
    console.error('[v0] Error saving questions details:', error.details)
    console.error('[v0] Error saving questions hint:', error.hint)
    console.error('[v0] First question sample:', JSON.stringify(questionsToInsert[0]))
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
export async function submitAnswer(
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
  questionId: string,
  correctAnswer: string,
  players: Player[],
  maxAbstentions: number,
  isFirstQuestion: boolean
): Promise<void> {
  const supabase = getSupabase()
  const answers = await getAnswersForQuestion(questionId)
  
  // Sort players by score for position calculation
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  
  for (const answer of answers) {
    const player = players.find(p => p.id === answer.player_id)
    if (!player) continue

    const position = sortedPlayers.findIndex(p => p.id === player.id) + 1
    let points = 0
    let isCorrect = false

    if (answer.is_abstention) {
      // Check if abstention should count as wrong
      if (player.abstentions_used >= maxAbstentions) {
        points = calculateWrongPoints(position, players.length, isFirstQuestion, answer.response_time_ms ?? undefined)
      }
      await updatePlayerAbstentions(player.id)
    } else if (answer.answer === correctAnswer) {
      isCorrect = true
      points = calculateCorrectPoints(answer.response_time_ms || 15000)
    } else {
      points = calculateWrongPoints(position, players.length, isFirstQuestion, answer.response_time_ms ?? undefined)
    }

    // Update answer record
    await supabase
      .from('answers')
      .update({ is_correct: isCorrect, points_earned: points })
      .eq('id', answer.id)

    // Update player score
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
