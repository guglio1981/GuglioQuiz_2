'use client'

import { useState, useEffect, useCallback, use } from 'react'
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
  submitAnswer,
  getAnswersForQuestion,
  processAnswers,
  subscribeToGame,
  subscribeToPlayers,
  subscribeToAnswers,
  unsubscribe,
  updateCurrentQuestion,
  updateGameStatus,
  resetPlayersForNewManche,
  clearGameSettingsForNewManche,
} from '@/lib/game-store'
import {
  TOPIC_LABELS,
  AVATAR_COLORS,
  AVATAR_ICONS,
  SCORING,
  type Game,
  type Player,
  type Question,
  type Answer,
  type AvatarId,
} from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ArrowRight, RotateCcw, Home, Loader2 } from 'lucide-react'

type GamePhase = 'loading' | 'question' | 'reveal' | 'leaderboard' | 'finished'

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
      console.log('[v0] loadGame started')
      const gameData = await getGameByCode(code)
      console.log('[v0] gameData:', gameData?.id)
      if (!gameData) {
        toast.error('Partita non trovata')
        router.push('/')
        return
      }
      setGame(gameData)

      const playersData = await getPlayers(gameData.id)
      console.log('[v0] playersData:', playersData.length)
      setPlayers(playersData)

      // Check if questions already exist
      let questionsData = await getQuestions(gameData.id)
      console.log('[v0] questionsData:', questionsData.length)

      // If no questions, generate them (host only does this)
      const currentPlayerData = playersData.find((p) => p.id === playerId)
      console.log('[v0] currentPlayerData isHost:', currentPlayerData?.is_host)
      
      if (questionsData.length === 0 && currentPlayerData?.is_host) {
        console.log('[v0] Generating questions...')
        console.log('[v0] Topics:', gameData.topics, 'Count:', gameData.question_count)
        setIsGenerating(true)
        try {
          console.log('[v0] Fetching API...')
          const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topics: gameData.topics,
              count: gameData.question_count,
              difficulty: gameData.difficulty,
            }),
          })

          console.log('[v0] Response received, status:', response.status)
          const responseData = await response.json()
          console.log('[v0] Response parsed, length:', responseData?.length)

          if (!response.ok) {
            throw new Error(responseData.details || responseData.error || 'Failed to generate questions')
          }

          if (!Array.isArray(responseData) || responseData.length === 0) {
            throw new Error('No questions generated')
          }

          console.log('[v0] Saving questions to DB...')
          questionsData = await saveQuestions(gameData.id, responseData)
          console.log('[v0] Questions saved:', questionsData.length)
        } catch (err) {
          console.error('[v0] Error:', err)
          toast.error(`Errore: ${err instanceof Error ? err.message : 'Generazione domande fallita'}`)
          router.push('/')
          return
        }
        setIsGenerating(false)
        console.log('[v0] Generation complete')
      }

      // Wait for questions if not host
      if (questionsData.length === 0) {
        // Poll for questions
        const pollInterval = setInterval(async () => {
          const polledQuestions = await getQuestions(gameData.id)
          if (polledQuestions.length > 0) {
            clearInterval(pollInterval)
            setQuestions(polledQuestions)
            setPhase('question')
            setIsTimerActive(true)
            setQuestionStartTime(Date.now())
          }
        }, 1000)

        return () => clearInterval(pollInterval)
      }

      setQuestions(questionsData)
      setPhase('question')
      setIsTimerActive(true)
      setQuestionStartTime(Date.now())
    }

    loadGame()
  }, [code, router])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!game) return

    const gameChannel = subscribeToGame(game.id, (updatedGame) => {
      setGame(updatedGame)
      
      // If game status changed to lobby, redirect to lobby (only for non-host players)
      // Host will be redirected to settings by handleNewManche
      if (updatedGame.status === 'lobby' && !isHost) {
        window.location.href = `/lobby/${game.code}`
        return
      }
      
      // Sync question index with host's current_question (for non-host players)
      if (!isHost && updatedGame.current_question > 0) {
        const serverQuestionIndex = updatedGame.current_question - 1
        if (serverQuestionIndex !== currentQuestionIndex && serverQuestionIndex < questions.length) {
          // Host moved to next question, sync client
          setCurrentQuestionIndex(serverQuestionIndex)
          setSelectedAnswer(null)
          setHasAnswered(false)
          setAnswers([])
          setPhase('question')
          setIsTimerActive(true)
          setQuestionStartTime(Date.now())
        }
      }
    })
    const playersChannel = subscribeToPlayers(game.id, setPlayers)

    return () => {
      unsubscribe(gameChannel)
      unsubscribe(playersChannel)
    }
  }, [game, isHost, currentQuestionIndex, questions.length])

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

      await submitAnswer(
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

    // Check if this counts as abstention or wrong answer
    const isAbstention = currentPlayer.abstentions_used < game.max_abstentions

    await submitAnswer(
      currentQuestion.id,
      currentPlayerId,
      null,
      isAbstention,
      SCORING.TIME_LIMIT_MS
    )
  }, [hasAnswered, currentQuestion, currentPlayerId, currentPlayer, game])

  const handleReveal = useCallback(async () => {
    if (!currentQuestion || !game) return

    setPhase('reveal')
    setIsTimerActive(false)

    // Process answers and update scores (host only)
    if (isHost) {
      await processAnswers(
        currentQuestion.id,
        currentQuestion.correct_answer,
        players,
        game.max_abstentions,
        currentQuestionIndex === 0
      )

      // Refresh players to get updated scores
      const updatedPlayers = await getPlayers(game.id)
      setPlayers(updatedPlayers)
    }

    // Wait 3 seconds then check if we show leaderboard
    setTimeout(() => {
      const questionNum = currentQuestionIndex + 1
      const isLastQuestion = questionNum === questions.length
      const showLeaderboard = questionNum % 5 === 0 || isLastQuestion

      if (isLastQuestion) {
        setPhase('finished')
      } else if (showLeaderboard) {
        setPhase('leaderboard')
      } else {
        goToNextQuestion()
      }
    }, 3000)
  }, [currentQuestion, game, isHost, players, currentQuestionIndex, questions.length])

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

    if (isHost) {
      await updateCurrentQuestion(game.id, nextIndex + 1)
    }
  }, [game, currentQuestionIndex, isHost])

  const handleNextFromLeaderboard = () => {
    goToNextQuestion()
  }

  const handleNewManche = async (resetScores: boolean) => {
    if (!game) return

    await resetPlayersForNewManche(game.id, resetScores)
    // Clear game settings so clients see "waiting for host" in lobby
    await clearGameSettingsForNewManche(game.id)
    await updateGameStatus(game.id, 'lobby')
    
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

  // Leaderboard phase
  if (phase === 'leaderboard' && currentPlayerId) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
        <Leaderboard
          players={players}
          currentPlayerId={currentPlayerId}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
        />

        {isHost && (
          <Button
            onClick={handleNextFromLeaderboard}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ArrowRight className="mr-2 h-5 w-5" />
            Prossima Domanda
          </Button>
        )}

        {!isHost && (
          <p className="text-muted-foreground">
            In attesa che l&apos;host continui...
          </p>
        )}
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
        />

        {isHost && (
          <div className="flex flex-col gap-3 w-full max-w-md">
            <Button
              onClick={() => handleNewManche(false)}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Nuova Manche (mantieni punteggi)
            </Button>
            <Button
              onClick={() => handleNewManche(true)}
              size="lg"
              variant="secondary"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Nuova Manche (azzera punteggi)
            </Button>
            <Button onClick={handleGoHome} size="lg" variant="outline">
              <Home className="mr-2 h-5 w-5" />
              Torna alla Home
            </Button>
          </div>
        )}

        {!isHost && (
          <Button onClick={handleGoHome} size="lg" variant="outline">
            <Home className="mr-2 h-5 w-5" />
            Torna alla Home
          </Button>
        )}
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
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-primary border-primary">
                {currentQuestionIndex + 1} / {questions.length}
              </Badge>
              <Badge variant="secondary">
                {TOPIC_LABELS[currentQuestion.topic as keyof typeof TOPIC_LABELS] ||
                  currentQuestion.topic}
              </Badge>
            </div>
          </div>

          <AbstentionDots
            total={game.max_abstentions}
            used={currentPlayer.abstentions_used}
          />
        </div>

        {/* Timer */}
        <div className="flex justify-center">
          <QuizTimer
            duration={15}
            onComplete={handleTimeUp}
            isActive={isTimerActive}
            questionKey={currentQuestionIndex}
          />
        </div>

        {/* Question */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
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
                key={index}
                onClick={() => handleAnswerSelect(option)}
                disabled={hasAnswered}
                className={cn(
                  'w-full p-4 md:p-5 rounded-xl text-left font-medium transition-all border-2',
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
                  // Disabled styling
                  hasAnswered && !isSelected && !showCorrect && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                      showCorrect
                        ? 'bg-white/20'
                        : showWrong
                        ? 'bg-black/20'
                        : isSelected
                        ? 'bg-black/20'
                        : 'bg-border'
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{option}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Answer status indicator */}
        {phase === 'reveal' && (
          <div className="text-center">
            {selectedAnswer === correctAnswer ? (
              <p className="text-accent font-bold text-lg">Risposta corretta!</p>
            ) : selectedAnswer ? (
              <p className="text-destructive font-bold text-lg">Risposta sbagliata!</p>
            ) : (
              <p className="text-muted-foreground font-bold text-lg">Tempo scaduto!</p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
