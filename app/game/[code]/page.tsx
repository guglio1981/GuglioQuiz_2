'use client'

import { useState, useEffect, useCallback, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuizTimer } from '@/components/quiz-timer'
import { AbstentionDots } from '@/components/abstention-dots'
import { Leaderboard } from '@/components/leaderboard'
import { 
  getGameByCode, 
  getPlayers, 
  getQuestions, 
  saveQuestions,
  submitAnswerV3,
  getAnswersForQuestion,
  processAnswers,
  subscribeToGame,
  subscribeToPlayers,
  subscribeToAnswers,
  unsubscribe,
  updateCurrentQuestion,
  updateGameStatus,
  resetPlayersForNewManche,
  syncLeaderboardPhase,
  clearGameSettingsForNewManche,
  submitArcadeResult,
  getArcadeResults,
  processArcadeResults,
  subscribeToArcadeResults,
  setCurrentArcadeGameInDb,
  clearCurrentArcadeGame,
  type ArcadeResult,
} from '@/lib/game-store'
import {
  TOPIC_LABELS,
  AVATAR_COLORS,
  AVATAR_ICONS,
  SCORING,
  ARCADE_GAME_LABELS,
  calculateCorrectPoints,
  calculateWrongPoints,
  type Game,
  type Player,
  type Question,
  type Answer,
  type AvatarId,
  type ArcadeGame,
} from '@/lib/types'
import { ArcadeGameWrapper } from '@/components/arcade/arcade-game-wrapper'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ArrowRight, RotateCcw, Home, Loader2, HandHelping } from 'lucide-react'


type GamePhase = 'loading' | 'question' | 'reveal' | 'leaderboard' | 'arcade' | 'arcade_results' | 'finished'

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()

  // State
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [questionScore, setQuestionScore] = useState<number | null>(null)
  const [myResponseTime, setMyResponseTime] = useState<number | null>(null)
  
  // Arcade state
  const [arcadeRound, setArcadeRound] = useState(0)
  const [currentArcadeGame, setCurrentArcadeGame] = useState<ArcadeGame | null>(null)
  const [arcadeResults, setArcadeResults] = useState<ArcadeResult[]>([])
  const [hasCompletedArcade, setHasCompletedArcade] = useState(false)
  const [lastManche, setLastManche] = useState(0)
  const [isClickable, setIsClickable] = useState(false) // Previene click accidentali su iOS
  
  // Gestione del ritardo di sicurezza per i click
  useEffect(() => {
    if (phase === 'question') {
      setIsClickable(false)
      const timer = setTimeout(() => {
        setIsClickable(true)
      }, 600) // 600ms di sicurezza prima di poter cliccare
      return () => clearTimeout(timer)
    }
  }, [phase, currentQuestionIndex])

  // Guard ref to prevent handleReveal from being called multiple times
  const isRevealingRef = useRef(false)

  // Ref that always holds the latest state — updated on every render.
  // This lets useCallback / subscription callbacks read fresh values
  // without needing those values in their dependency arrays.
  const latestRef = useRef({
    selectedAnswer: null as string | null,
    myResponseTime: null as number | null,
    answers: [] as Answer[],
    currentPlayerId: null as string | null,
    currentQuestionIndex: 0,
    players: [] as Player[],
    phase: 'loading' as GamePhase,
    isHost: false,
    game: null as Game | null,
    questions: [] as Question[],
  })
  // Sync on every render (no useEffect needed — this runs synchronously)
  latestRef.current = {
    selectedAnswer, myResponseTime, answers, currentPlayerId,
    currentQuestionIndex, players, phase, isHost:
      players.find(p => p.id === currentPlayerId)?.is_host || false,
    game, questions,
  }

  // Reset arcade state when manche changes (new manche started)
  useEffect(() => {
    if (!game) return

    if (game.manche !== lastManche && lastManche !== 0) {
      // New manche detected - reset ALL arcade state and phase
      setLastManche(game.manche)
      setArcadeRound(0)
      setCurrentArcadeGame(null)
      setArcadeResults([])
      setHasCompletedArcade(false)
      // If stuck in arcade phase from previous manche, go back to loading
      setPhase('loading')
    } else if (lastManche === 0 && game.manche > 0) {
      // Initial load - just record current manche
      setLastManche(game.manche)
    }
  }, [game, lastManche])

  // Sync arcade game from database (for non-host clients)
  useEffect(() => {
    if (!game) return

    // Check if host has set an arcade game in the database
    const dbArcadeGame = game.current_arcade_game
    const dbArcadeRound = game.current_arcade_round || 0

    if (dbArcadeGame && dbArcadeRound > arcadeRound) {
      // New arcade game set by host
      setCurrentArcadeGame(dbArcadeGame)
      setArcadeRound(dbArcadeRound)
      setHasCompletedArcade(false)
      setArcadeResults([])
      setPhase('arcade')
      isRevealingRef.current = false
    }
  }, [game, arcadeRound])

  const currentQuestion = questions[currentQuestionIndex]
  const currentPlayer = players.find((p) => p.id === currentPlayerId)
  const isHost = currentPlayer?.is_host || false

  // Load initial data
  useEffect(() => {
    // Check if we're in browser
    if (typeof window === 'undefined') return
    
    const playerId = sessionStorage.getItem('guglioquiz_playerId')
    if (!playerId) {
      toast.error('Sessione scaduta, torna alla home')
      router.push('/')
      return
    }
    setCurrentPlayerId(playerId)

    const loadGame = async () => {
      // Add retry logic for page navigation/reload scenarios
      let retries = 5
      let gameData = null
      
      while (retries > 0 && !gameData) {
        gameData = await getGameByCode(code)
        if (!gameData) {
          retries--
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 800))
          }
        }
      }
      
      if (!gameData) {
        toast.error('Partita non trovata')
        router.push('/')
        return
      }
      setGame(gameData)

      // Retry getting players to handle temporary network issues
      let playerRetries = 3
      let playersData: typeof players = []
      let currentPlayerData = null
      
      while (playerRetries > 0 && !currentPlayerData) {
        playersData = await getPlayers(gameData.id)
        currentPlayerData = playersData.find((p) => p.id === playerId)
        if (!currentPlayerData) {
          playerRetries--
          if (playerRetries > 0) {
            await new Promise(resolve => setTimeout(resolve, 600))
          }
        }
      }
      
      setPlayers(playersData)
      
      if (!currentPlayerData) {
        toast.error('Non sei in questa partita')
        router.push('/')
        return
      }

      // Check if questions already exist
      let questionsData = await getQuestions(gameData.id)
      
      if (questionsData.length === 0 && currentPlayerData?.is_host) {
        setIsGenerating(true)
        try {
          // Get previously used question hashes from localStorage to avoid repeats across ALL games
          const usedHashesKey = 'guglioquiz_used_question_hashes'
          const storedHashes = localStorage.getItem(usedHashesKey)
          const usedQuestionHashes = storedHashes ? JSON.parse(storedHashes) : []
          
          const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topics: gameData.topics,
              count: gameData.question_count,
              difficulty: gameData.difficulty,
              usedQuestionHashes,
            }),
          })

          const responseData = await response.json()

          if (!response.ok) {
            throw new Error(responseData.details || responseData.error || 'Failed to generate questions')
          }

          // New API returns { questions, hashes }
          const questions = responseData.questions || responseData
          const newHashes = responseData.hashes || []
          
          if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('No questions generated')
          }

          // Save new hashes to localStorage for future games (global across all games)
          const allHashes = [...usedQuestionHashes, ...newHashes]
          // Keep only last 500 hashes to prevent localStorage from growing too large
          const trimmedHashes = allHashes.slice(-500)
          localStorage.setItem(usedHashesKey, JSON.stringify(trimmedHashes))
          
          questionsData = await saveQuestions(gameData.id, questions)
        } catch (err) {
          toast.error(`Errore: ${err instanceof Error ? err.message : 'Generazione domande fallita'}`)
          router.push('/')
          return
        }
        setIsGenerating(false)
      }

      // Wait for questions if not host
      if (questionsData.length === 0) {
        // Poll for questions more frequently
        const pollInterval = setInterval(async () => {
          const polledQuestions = await getQuestions(gameData.id)
          if (polledQuestions.length > 0) {
            clearInterval(pollInterval)
            setQuestions(polledQuestions)
            setPhase('question')
            setIsTimerActive(true)
            const now = Date.now()
            setQuestionStartTime(now)
          }
        }, 500)

        // Cleanup on unmount
        const cleanup = () => clearInterval(pollInterval)
        
        // Also set a timeout to prevent infinite polling
        const timeoutId = setTimeout(() => {
          clearInterval(pollInterval)
        }, 30000)

        return () => {
          cleanup()
          clearTimeout(timeoutId)
        }
      }

      setQuestions(questionsData)
      setPhase('question')
      setIsTimerActive(true)
      const now = Date.now()
      setQuestionStartTime(now)
    }

    loadGame()
  }, [code, router])

  // Remove player when browser closes
  useEffect(() => {
    if (!currentPlayerId) return

    const handleBeforeUnload = () => {
      // Don't remove player if we're redirecting to lobby for new manche
      if (sessionStorage.getItem('guglioquiz_redirecting') === 'true') {
        sessionStorage.removeItem('guglioquiz_redirecting')
        return
      }
      // Use sendBeacon for reliable delivery on page close
      const url = `/api/remove-player?playerId=${currentPlayerId}`
      navigator.sendBeacon(url)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [currentPlayerId])

  // Subscribe to realtime updates
  // IMPORTANT: deps use game?.id (not game object) to avoid re-subscribing on every game state change.
  // Callback reads from latestRef to always get fresh values.
  const gameIdForSub = game?.id
  const gameCodeForSub = game?.code
  useEffect(() => {
    if (!gameIdForSub) return

    const gameChannel = subscribeToGame(gameIdForSub, (updatedGame) => {
      setGame(updatedGame)
      
      const { isHost: latestIsHost, currentQuestionIndex: latestQIdx, questions: latestQuestions } = latestRef.current
      
      // If game status changed to lobby, redirect to lobby (only for non-host players)
      if (updatedGame.status === 'lobby' && !latestIsHost) {
        sessionStorage.setItem('guglioquiz_redirecting', 'true')
        window.location.href = `/lobby/${updatedGame.code}`
        return
      }
      
      // Sync question index with host's current_question (for non-host players)
      if (!latestIsHost && updatedGame.current_question > 0) {
        const serverQuestionIndex = updatedGame.current_question - 1
        if (serverQuestionIndex !== latestQIdx && serverQuestionIndex < latestQuestions.length) {
          setCurrentQuestionIndex(serverQuestionIndex)
          setSelectedAnswer(null)
          setHasAnswered(false)
          setAnswers([])
          setPhase('question')
          setIsTimerActive(true)
          setQuestionStartTime(Date.now())
          setQuestionScore(null)
          setMyResponseTime(null)
          isRevealingRef.current = false
        }
      }

      // Sync leaderboard phase (for non-host players)
      if (!latestIsHost && updatedGame.topic_selection_mode === 'leaderboard') {
        setPhase('leaderboard')
      }
      
      // Sync finished phase (for non-host players)
      if (!latestIsHost && updatedGame.topic_selection_mode === 'finished') {
        setPhase('finished')
      }
    })
    const playersChannel = subscribeToPlayers(gameIdForSub, (updatedPlayers) => {
      setPlayers(updatedPlayers)
    })

    // PWA/mobile: force refresh when app comes back to foreground
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (sessionStorage.getItem('guglioquiz_redirecting') === 'true') return
        
        const updatedGame = await getGameByCode(code)
        if (updatedGame) {
          setGame(updatedGame)
          if (updatedGame.status === 'lobby') {
            sessionStorage.setItem('guglioquiz_redirecting', 'true')
            window.location.href = `/lobby/${updatedGame.code}`
            return
          }
        }
        const updatedPlayers = await getPlayers(gameIdForSub)
        setPlayers(updatedPlayers)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Poll to check if current player still exists
    let disconnectRetries = 0
    const MAX_DISCONNECT_RETRIES = 3
    
    const pollInterval = setInterval(async () => {
      if (sessionStorage.getItem('guglioquiz_redirecting') === 'true') {
        disconnectRetries = 0
        return
      }
      
      const updatedGame = await getGameByCode(code)
      if (updatedGame) {
        setGame(updatedGame)
        
        if (updatedGame.status === 'lobby') {
          sessionStorage.setItem('guglioquiz_redirecting', 'true')
          clearInterval(pollInterval)
          window.location.href = `/lobby/${updatedGame.code}`
          return
        }
      }
      
      const updatedPlayers = await getPlayers(gameIdForSub)
      setPlayers(updatedPlayers)
      
      const latestPlayerId = latestRef.current.currentPlayerId
      const stillExists = updatedPlayers.some(p => p.id === latestPlayerId)
      if (!stillExists && latestPlayerId) {
        if (sessionStorage.getItem('guglioquiz_redirecting') === 'true') {
          disconnectRetries = 0
          return
        }
        
        disconnectRetries++
        if (disconnectRetries < MAX_DISCONNECT_RETRIES) {
          return
        }
        
        clearInterval(pollInterval)
        sessionStorage.clear()
        toast.error('Sei stato rimosso dalla partita')
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      } else {
        disconnectRetries = 0
      }
    }, 1500)

    return () => {
      unsubscribe(gameChannel)
      unsubscribe(playersChannel)
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [gameIdForSub, code])

  // Subscribe to answers for current question
  useEffect(() => {
    if (!currentQuestion) return

    const channel = subscribeToAnswers(currentQuestion.id, setAnswers)

    return () => unsubscribe(channel)
  }, [currentQuestion])

  // Check if all players answered
  useEffect(() => {
    if (phase !== 'question' || !currentQuestion) return

    if (answers.length === players.length) {
      handleReveal()
    }
  }, [answers.length, players.length, phase, currentQuestion])

  const handleAnswerSelect = useCallback(
    async (answer: string) => {
      if (hasAnswered || !currentQuestion || !currentPlayerId) return

      const responseTime = Date.now() - questionStartTime

      setSelectedAnswer(answer)
      setHasAnswered(true)
      setIsTimerActive(false)
      setMyResponseTime(responseTime)

      await submitAnswerV3(
        currentQuestion.id,
        currentPlayerId,
        answer,
        false,
        responseTime
      )
    },
    [hasAnswered, currentQuestion, currentPlayerId, questionStartTime]
  )

  const handleTimeUp = useCallback(async () => {
    if (hasAnswered || !currentQuestion || !currentPlayerId || !currentPlayer || !game) return

    setHasAnswered(true)
    setIsTimerActive(false)
    setMyResponseTime(SCORING.TIME_LIMIT_MS)

    // Check if this counts as abstention or wrong answer
    const isAbstention = currentPlayer.abstentions_used < game.max_abstentions

    await submitAnswerV3(
      currentQuestion.id,
      currentPlayerId,
      "", // Usa stringa vuota per evitare errori del database
      isAbstention,
      SCORING.TIME_LIMIT_MS
    )
  }, [hasAnswered, currentQuestion, currentPlayerId, currentPlayer, game])

  const handleManualAbstain = async () => {
    if (phase !== 'question' || hasAnswered || !currentPlayer || !game) return
    
    // Check if player can abstain
    if (currentPlayer.abstentions_used >= game.max_abstentions) {
      toast.error('Hai esaurito le astensioni!')
      return
    }

    setHasAnswered(true)
    setSelectedAnswer(null)
    setMyResponseTime(0)

    try {
      await submitAnswerV3(
        currentQuestion!.id,
        currentPlayer.id,
        "", // Passiamo una stringa vuota invece di null
        true, // is_abstention
        0
      )
    } catch (error) {
      console.error('Error submitting manual abstention:', error)
      setHasAnswered(false)
      toast.error('Errore durante l\'astensione')
    }
  }

  const goToNextQuestion = useCallback(async () => {
    if (!game) return

    const nextIndex = currentQuestionIndex + 1
    setCurrentQuestionIndex(nextIndex)
    setSelectedAnswer(null)
    setHasAnswered(false)
    setAnswers([])
    setPhase('question')
    setIsTimerActive(true)
    setQuestionStartTime(Date.now())
    setQuestionScore(null)
    setMyResponseTime(null)
    
    if (isHost) {
      await updateCurrentQuestion(game.id, nextIndex + 1, true)
    }
  }, [game, currentQuestionIndex, isHost])

  const handleReveal = useCallback(async () => {
    // Read ALL values from the ref to avoid stale closures.
    // This is the critical fix: useCallback's dep array doesn't include
    // selectedAnswer, myResponseTime, answers etc., so reading them
    // directly from closure would give stale (null/empty) values.
    const {
      selectedAnswer: latestSelectedAnswer,
      myResponseTime: latestResponseTime,
      answers: latestAnswers,
      currentPlayerId: latestPlayerId,
      currentQuestionIndex: latestQIdx,
      players: latestPlayers,
      isHost: latestIsHost,
      game: latestGame,
      questions: latestQuestions,
    } = latestRef.current

    const latestQuestion = latestQuestions[latestQIdx]
    const latestPlayer = latestPlayers.find(p => p.id === latestPlayerId)

    if (!latestQuestion || !latestGame || !latestPlayer || !latestPlayerId) return
    
    // Prevent double calls using ref
    if (isRevealingRef.current) return
    isRevealingRef.current = true

    setPhase('reveal')
    setIsTimerActive(false)

    // Get the player's answer
    const myAnswer = latestAnswers.find(a => a.player_id === latestPlayerId)
    const actualSelectedAnswer = latestSelectedAnswer || myAnswer?.answer
    const actualResponseTime = latestResponseTime || myAnswer?.response_time_ms || SCORING.TIME_LIMIT_MS
    
    const isCorrect = actualSelectedAnswer === latestQuestion.correct_answer
    const didNotAnswer = !actualSelectedAnswer
    const canStillAbstain = latestPlayer.abstentions_used < latestGame.max_abstentions
    const isUntimed = latestGame.game_profile === 'untimed'

    let score = 0
    if (isCorrect) {
      score = isUntimed ? SCORING.CORRECT_UNTIMED : calculateCorrectPoints(actualResponseTime)
    } else if (didNotAnswer && canStillAbstain) {
      score = 0
    } else {
      if (isUntimed) {
        score = SCORING.WRONG_UNTIMED
      } else {
        const sortedByScore = [...latestPlayers].sort((a, b) => b.score - a.score)
        const position = sortedByScore.findIndex(p => p.id === latestPlayerId) + 1
        score = calculateWrongPoints(position, latestPlayers.length, latestQIdx === 0, actualResponseTime)
      }
    }

    setQuestionScore(score)

    // Process answers and update scores (host only)
    if (latestIsHost) {
      await processAnswers(
        latestGame.id,
        latestQuestion.id,
        latestQuestion.correct_answer,
        latestGame.max_abstentions,
        latestQIdx === 0,
        latestGame.game_profile || 'timed'
      )

      // Refresh players to get updated scores
      const updatedPlayers = await getPlayers(latestGame.id)
      setPlayers(updatedPlayers)
    }

    const processNextPhase = () => {
      // Re-read from ref in case state changed during the await above
      const { isHost: nowIsHost, game: nowGame } = latestRef.current
      const questionNum = latestQIdx + 1
      const isLastQuestion = questionNum === latestQuestions.length
      const showLeaderboard = questionNum % 5 === 0 || isLastQuestion

      if (isLastQuestion) {
        if (nowIsHost && nowGame) {
          syncLeaderboardPhase(nowGame.id, 'finished').catch(console.error)
        }
        setPhase('finished')
      } else if (showLeaderboard) {
        if (nowIsHost && nowGame) {
          syncLeaderboardPhase(nowGame.id, 'leaderboard').catch(console.error)
        }
        setPhase('leaderboard')
      } else {
        goToNextQuestion()
      }
    }

    // In untimed mode, we wait for host to click "Next"
    if (isUntimed) {
      isRevealingRef.current = false
      return
    }

    // Wait 3 seconds then show leaderboard or go to next question
    setTimeout(() => {
      processNextPhase()
      isRevealingRef.current = false
    }, 3000)
  // Minimal deps — actual values are read from latestRef
  }, [goToNextQuestion])


const handleNextFromLeaderboard = async () => {
    if (!game) return

    // Check if arcade is configured for this group of questions
    const arcadeGames = game.arcade_games as ArcadeGame[] | null
    const arcadeFreq = game.arcade_frequency || 5
    const questionNum = currentQuestionIndex + 1
    const shouldPlayArcade = arcadeGames && arcadeGames.length > 0 && questionNum % arcadeFreq === 0

    if (shouldPlayArcade && arcadeGames) {
      // Host picks the game and saves to DB so all players see the same
      const randomGame = arcadeGames[Math.floor(Math.random() * arcadeGames.length)]
      const newRound = arcadeRound + 1

      await setCurrentArcadeGameInDb(game.id, randomGame, newRound)

      setCurrentArcadeGame(randomGame)
      setArcadeRound(newRound)
      setHasCompletedArcade(false)
      setArcadeResults([])
      setPhase('arcade')
    } else {
      goToNextQuestion()
    }
  }

  const handleNewManche = async (resetScores: boolean) => {
    if (!game) return

    await resetPlayersForNewManche(game.id, resetScores)
    // Clear game settings so clients see "waiting for host" in lobby
    await clearGameSettingsForNewManche(game.id)
    await updateGameStatus(game.id, 'lobby')
    
    // Set flag to prevent beforeunload from removing player
    sessionStorage.setItem('guglioquiz_redirecting', 'true')
    
    // Host goes to settings to configure new manche, clients go to lobby
    if (isHost) {
      window.location.href = `/settings?code=${game.code}&manche=true`
    } else {
      window.location.href = `/lobby/${game.code}`
    }
  }

  const handleGoHome = () => {
    sessionStorage.clear()
    router.push('/')
  }

  // Arcade game completion handler
  const handleArcadeComplete = useCallback(async (rawScore: number) => {
    if (!game || !currentPlayerId || !currentArcadeGame) return

    setHasCompletedArcade(true)

    await submitArcadeResult(
      game.id,
      currentPlayerId,
      currentArcadeGame,
      arcadeRound,
      rawScore
    )
  }, [game, currentPlayerId, currentArcadeGame, arcadeRound])

  // Subscribe to arcade results when in arcade phase (with polling fallback)
  useEffect(() => {
    if (phase !== 'arcade' && phase !== 'arcade_results') return
    if (!game || arcadeRound === 0) return

    let isMounted = true
    let allCompleted = false

    async function fetchAndCheckResults() {
      if (!isMounted || allCompleted) return
      
      const results = await getArcadeResults(game.id, arcadeRound)
      if (!isMounted) return
      
      setArcadeResults(results)
      
      // Check if all players completed
      if (results.length === players.length && results.length > 0) {
        allCompleted = true
        if (isHost) {
          const isLowerBetter = ['reaction_time', 'memory_cards', 'speed_typing', 'sequenza_numerica', 'puzzle_slider'].includes(currentArcadeGame || '')
          await processArcadeResults(game.id, arcadeRound, currentArcadeGame || '', isLowerBetter)
          // Host refreshes players immediately after processing
          const updatedPlayers = await getPlayers(game.id)
          if (isMounted) setPlayers(updatedPlayers)
        } else {
          // Clients wait a bit for host to process, then refresh
          await new Promise(resolve => setTimeout(resolve, 1500))
          const updatedPlayers = await getPlayers(game.id)
          if (isMounted) setPlayers(updatedPlayers)
        }
        if (isMounted) setPhase('arcade_results')
      }
    }

    // Initial fetch
    fetchAndCheckResults()

    // Poll every 2 seconds as fallback
    const pollInterval = setInterval(fetchAndCheckResults, 2000)

    // Also subscribe to realtime
    const channel = subscribeToArcadeResults(game.id, arcadeRound, fetchAndCheckResults)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
      unsubscribe(channel)
    }
  }, [phase, game, arcadeRound, players.length, isHost, currentArcadeGame])

  const handleContinueFromArcade = async () => {
    if (game) {
      await clearCurrentArcadeGame(game.id)
    }
    setCurrentArcadeGame(null)
    setHasCompletedArcade(false)
    setArcadeResults([])

    // Go directly to next question after arcade
    goToNextQuestion()
  }

  const handleAbortMatch = async () => {
    if (!game || !isHost) return
    
    // Clear game settings, reset scores to 0, and go back to lobby
    await clearGameSettingsForNewManche(game.id)
    await resetPlayersForNewManche(game.id, true) // resetScores = true
    await updateGameStatus(game.id, 'lobby')
    
    // Set flag to prevent beforeunload from removing player
    sessionStorage.setItem('guglioquiz_redirecting', 'true')
    // Host goes to settings
    window.location.href = `/settings?code=${game.code}&manche=true`
  }

  // Loading state
  if (phase === 'loading') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground">
          {isGenerating ? 'Generazione domande in corso...' : 'Caricamento partita...'}
        </p>
        {!currentPlayerId && (
          <Button variant="outline" onClick={() => router.push('/')} className="mt-4">
            <Home className="h-4 w-4 mr-2" />
            Torna alla Home
          </Button>
        )}
      </main>
    )
  }

  // Arcade phase
  if ((phase === 'arcade' || phase === 'arcade_results') && currentPlayerId && currentArcadeGame && currentPlayer) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
        <ArcadeGameWrapper
          game={currentArcadeGame}
          playerId={currentPlayerId}
          playerName={currentPlayer.name}
          players={players}
          isHost={isHost}
          onComplete={handleArcadeComplete}
          onContinue={handleContinueFromArcade}
          allResults={arcadeResults}
          hasCompleted={hasCompletedArcade}
        />
      </main>
    )
  }

  // Leaderboard phase
  if (phase === 'leaderboard' && currentPlayerId) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
        <Leaderboard
          players={players}
          currentPlayerId={currentPlayerId}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          isHost={isHost}
          maxAbstentions={game?.max_abstentions}
          onContinue={handleNextFromLeaderboard}
        />
      </main>
    )
  }

  // Finished phase
  if (phase === 'finished' && currentPlayerId) {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
    const winner = sortedPlayers[0]
    const isWinner = winner?.id === currentPlayerId

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            {isWinner ? 'Hai vinto!' : 'Fine Partita!'}
          </h1>
          <p className="text-xl text-muted-foreground">
            Vincitore: {winner?.name} con {winner?.score} punti
          </p>
        </div>

        <Leaderboard
          players={players}
          currentPlayerId={currentPlayerId}
          questionNumber={questions.length}
          totalQuestions={questions.length}
          maxAbstentions={game?.max_abstentions}
        >
          {isHost ? (
            <>
              <Button
                onClick={() => handleNewManche(false)}
                size="lg"
                className="w-full h-14 text-sm md:text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 whitespace-normal"
              >
                <RotateCcw className="mr-2 h-5 w-5 flex-shrink-0" />
                <span>Nuova Manche (mantieni punteggi)</span>
              </Button>
              <Button
                onClick={() => handleNewManche(true)}
                size="lg"
                className="w-full h-14 text-sm md:text-lg font-bold whitespace-normal"
                variant="secondary"
              >
                <RotateCcw className="mr-2 h-5 w-5 flex-shrink-0" />
                <span>Nuova Manche (azzera punteggi)</span>
              </Button>
              <Button
                onClick={handleGoHome}
                size="lg"
                variant="outline"
                className="w-full h-14 text-lg font-bold"
              >
                <Home className="mr-2 h-5 w-5" />
                Torna alla Home
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  In attesa che l&apos;host avvii una nuova manche...
                </p>
              </div>
              <Button
                onClick={handleGoHome}
                size="lg"
                variant="outline"
                className="w-full h-14 text-lg font-bold"
              >
                <Home className="mr-2 h-5 w-5" />
                Torna alla Home
              </Button>
            </>
          )}
        </Leaderboard>
      </main>
    )
  }

  // Question/Reveal phase
  if (!currentQuestion || !game || !currentPlayer) {
    return null
  }

  const correctAnswer = currentQuestion.correct_answer

  return (
    <main className="min-h-screen flex flex-col p-4 md:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex flex-row items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary">
              {currentQuestionIndex + 1} / {questions.length}
            </Badge>
            <Badge variant="secondary" className="whitespace-nowrap">
              {TOPIC_LABELS[currentQuestion.topic as keyof typeof TOPIC_LABELS] ||
                currentQuestion.topic}
            </Badge>
          </div>

          <AbstentionDots
            total={game.max_abstentions}
            used={currentPlayer.abstentions_used}
          />
        </div>

        {/* Timer always centered with score positioned to its right */}
        <div className="relative flex justify-center items-center">
          {/* Timer - always centered, hidden if untimed */}
          {game.game_profile !== 'untimed' ? (
            <QuizTimer
              duration={15}
              onComplete={handleTimeUp}
              isActive={isTimerActive}
              questionKey={currentQuestionIndex}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 border-2 border-primary/30 rounded-full w-24 h-24 bg-primary/5">
              <span className="text-4xl">∞</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Relax</span>
            </div>
          )}

          
          {/* Question score (shown after reveal) - positioned to the right of timer */}
          {phase === 'reveal' && questionScore !== null && (
            <div className="absolute left-1/2 ml-16 flex items-baseline gap-2">
              <span className={cn(
                'text-3xl font-bold',
                questionScore > 0 && 'text-green-500',
                questionScore < 0 && 'text-red-500',
                questionScore === 0 && 'text-white'
              )}>
                {questionScore > 0 ? `+${questionScore}` : questionScore}
              </span>
              <span className="text-white text-lg">punti</span>
            </div>
          )}
        </div>

        {/* Question */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            {currentQuestion.image_url && (
              <div className="flex justify-center mb-4">
                <img 
                  src={currentQuestion.image_url} 
                  alt="Immagine domanda"
                  className="max-h-48 md:max-h-64 object-contain rounded-lg"
                />
              </div>
            )}
            <p className="text-xl md:text-2xl font-semibold text-foreground text-center text-balance">
              {currentQuestion.question_text}
            </p>
          </CardContent>
        </Card>

        {/* Answers */}
        <div className="grid gap-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === option
            const isCorrect = option === correctAnswer
            const showCorrect = phase === 'reveal' && isCorrect
            const showWrong = phase === 'reveal' && isSelected && !isCorrect

            return (
              <button
                key={`${currentQuestionIndex}-${index}`}
                onClick={() => handleAnswerSelect(option)}
                disabled={hasAnswered || !isClickable}
                className={cn(
                  'w-full p-4 md:p-5 rounded-xl text-left font-medium transition-all border-2 focus:outline-none',
                  'text-foreground',
                  // Default state
                  !hasAnswered &&
                    !isSelected &&
                    'bg-muted border-border hover:border-primary/50 hover:bg-muted/80',
                  // Selected (before reveal)
                  isSelected &&
                    phase !== 'reveal' &&
                    'bg-quiz-selected border-quiz-selected text-primary-foreground',
                  // Correct answer (reveal)
                  showCorrect &&
                    'bg-quiz-correct border-quiz-correct text-white animate-pulse-correct',
                  // Wrong answer selected (reveal)
                  showWrong && 'bg-quiz-selected border-quiz-selected text-primary-foreground',
                  // Non-selected answers stay the same (no visual change)
                  hasAnswered && !isSelected && !showCorrect && 'bg-muted border-border'
                )}
              >
                <span className="flex-1">{option}</span>
              </button>
            )
          })}
        </div>

        {/* Answer status indicator - no card wrapper */}
        {phase === 'reveal' && (
          <div className="text-center py-2">
            {selectedAnswer === correctAnswer ? (
              <p className="text-accent font-bold text-lg">Risposta corretta!</p>
            ) : selectedAnswer ? (
              <p className="text-destructive font-bold text-lg">Risposta sbagliata!</p>
            ) : game.game_profile === 'untimed' ? (
              <p className="text-muted-foreground font-bold text-lg">Astenuto!</p>
            ) : (
              <p className="text-muted-foreground font-bold text-lg">Tempo scaduto!</p>
            )}
          </div>
        )}

        {/* Abstain Button (Only in untimed mode and before answering) */}
        {game.game_profile === 'untimed' && phase === 'question' && !hasAnswered && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleManualAbstain}
              disabled={currentPlayer?.abstentions_used >= game.max_abstentions}
              className="w-full p-4 md:p-5 rounded-xl font-medium border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 gap-2"
            >
              <HandHelping className="h-5 w-5" />
              Astieniti ({game.max_abstentions - (currentPlayer?.abstentions_used || 0)} rimaste)
            </Button>
          </div>
        )}

        {/* Next Question Button (Host only, untimed mode, reveal phase) */}
        {isHost && game.game_profile === 'untimed' && phase === 'reveal' && (
          <div className="mt-8 flex justify-center">
            <Button
              size="xl"
              onClick={async () => {
                const questionNum = currentQuestionIndex + 1
                const isLastQuestion = questionNum === game.question_count
                const showLeaderboard = questionNum % 5 === 0 || isLastQuestion
                
                if (isLastQuestion) {
                  // Sync finished phase so non-host clients also transition
                  await syncLeaderboardPhase(game.id, 'finished')
                  setPhase('finished')
                } else if (showLeaderboard) {
                  // Sync leaderboard phase so non-host clients also transition
                  await syncLeaderboardPhase(game.id, 'leaderboard')
                  setPhase('leaderboard')
                } else {
                  goToNextQuestion()
                }
                isRevealingRef.current = false
              }}

              className="w-full max-w-md bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xl h-16 shadow-lg shadow-yellow-900/20"
            >
              Avanti
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        )}

        {/* Abort button - host only, inside its own card */}
        {isHost && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <Button
                onClick={handleAbortMatch}
                size="lg"
                className="w-full h-12 font-bold bg-purple-600 text-white hover:bg-purple-700"
              >
                Interrompi partita e torna a impostazioni
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
