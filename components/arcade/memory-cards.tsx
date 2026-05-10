'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const MAX_TIME_MS = 3 * 60 * 1000 // 3 minutes

interface MemoryCardsProps {
  onComplete: (timeMs: number, moves: number) => void
  playerName: string
}

const EMOJIS = ['🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🏆', '🎸']

interface CardItem {
  id: number
  emoji: string
  isFlipped: boolean
  isMatched: boolean
}

export function MemoryCards({ onComplete, playerName }: MemoryCardsProps) {
  const [cards, setCards] = useState<CardItem[]>([])
  const [flippedIndexes, setFlippedIndexes] = useState<number[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [moves, setMoves] = useState(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isTimeOut, setIsTimeOut] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const initializeGame = useCallback(() => {
    const gameEmojis = [...EMOJIS, ...EMOJIS]
    const shuffled = gameEmojis
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5)

    setCards(shuffled)
    setFlippedIndexes([])
    setIsLocked(false)
    setMoves(0)
    setIsStarted(false)
    setIsComplete(false)
    setIsTimeOut(false)
    setFinalTime(0)
    setElapsed(0)
  }, [])

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  // Start countdown timer once game starts
  useEffect(() => {
    if (!isStarted || isComplete || isTimeOut) return

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTime)
    }, 100)

    return () => stopTimer()
  }, [isStarted, isComplete, isTimeOut, startTime, stopTimer])

  // Auto-timeout when time expires
  useEffect(() => {
    if (isStarted && elapsed >= MAX_TIME_MS && !isComplete && !isTimeOut) {
      stopTimer()
      setIsTimeOut(true)
      setFinalTime(MAX_TIME_MS)
      onComplete(MAX_TIME_MS, moves)
    }
  }, [elapsed, isStarted, isComplete, isTimeOut, moves, onComplete, stopTimer])

  const handleCardClick = (index: number) => {
    if (isLocked || isTimeOut) return
    if (cards[index].isFlipped || cards[index].isMatched) return

    if (!isStarted) {
      setIsStarted(true)
      setStartTime(Date.now())
    }

    setCards(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], isFlipped: true }
      return updated
    })

    const newFlipped = [...flippedIndexes, index]
    setFlippedIndexes(newFlipped)

    if (newFlipped.length === 2) {
      setIsLocked(true)
      setMoves(m => m + 1)
      const [firstIdx, secondIdx] = newFlipped

      setCards(prev => {
        const firstEmoji = prev[firstIdx].emoji
        const secondEmoji = prev[secondIdx].emoji

        if (firstEmoji === secondEmoji) {
          const matched = [...prev]
          matched[firstIdx] = { ...matched[firstIdx], isMatched: true }
          matched[secondIdx] = { ...matched[secondIdx], isMatched: true }

          const allMatched = matched.every(c => c.isMatched)
          if (allMatched) {
            const time = Date.now() - startTime
            stopTimer()
            setFinalTime(time)
            setIsComplete(true)
          }

          setTimeout(() => {
            setFlippedIndexes([])
            setIsLocked(false)
          }, 300)

          return matched
        } else {
          setTimeout(() => {
            setCards(prev2 => {
              const reset = [...prev2]
              reset[firstIdx] = { ...reset[firstIdx], isFlipped: false }
              reset[secondIdx] = { ...reset[secondIdx], isFlipped: false }
              return reset
            })
            setFlippedIndexes([])
            setIsLocked(false)
          }, 800)

          return prev
        }
      })
    }
  }

  const handleGiveUp = () => {
    stopTimer()
    setIsTimeOut(true)
    setFinalTime(MAX_TIME_MS)
    onComplete(999999, moves)
  }

  const handleFinish = () => {
    onComplete(finalTime, moves)
  }

  // Remaining time display
  const remaining = Math.max(0, MAX_TIME_MS - elapsed)
  const remainingSeconds = Math.ceil(remaining / 1000)
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const isUrgent = remaining < 30000 && isStarted

  if (isComplete) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg mb-2">{playerName}</h3>
          <p className="text-4xl font-bold text-primary mb-2">
            {(finalTime / 1000).toFixed(1)}s
          </p>
          <p className="text-muted-foreground mb-4">
            Completato in {moves} mosse
          </p>
          <Button onClick={handleFinish} size="lg" className="w-full">
            Conferma
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-center flex justify-between items-center">
          <span>Memory Cards</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Mosse: {moves}</span>
            {isStarted && (
              <span className={`font-mono text-sm font-bold ${isUrgent ? 'text-destructive' : 'text-primary'}`}>
                {timeDisplay}
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              disabled={isLocked || card.isMatched || isTimeOut}
              className={`
                aspect-square flex items-center justify-center text-2xl rounded-lg transition-all
                ${card.isFlipped || card.isMatched
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 cursor-pointer'
                }
                ${card.isMatched ? 'opacity-40' : ''}
              `}
            >
              {(card.isFlipped || card.isMatched) ? card.emoji : '?'}
            </button>
          ))}
        </div>
        {!isStarted && (
          <p className="text-center text-muted-foreground text-sm">
            Clicca una carta per iniziare. Hai 3 minuti.
          </p>
        )}
        {isStarted && (
          <Button
            onClick={handleGiveUp}
            variant="destructive"
            className="w-full"
          >
            Rinuncio
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
