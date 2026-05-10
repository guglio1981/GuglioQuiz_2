'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ReactionTimeProps {
  onComplete: (timeMs: number | null) => void
  playerName: string
}

export function ReactionTime({ onComplete, playerName }: ReactionTimeProps) {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'ready' | 'go' | 'result' | 'early'>('idle')
  const [startTime, setStartTime] = useState<number>(0)
  const [reactionTime, setReactionTime] = useState<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startWaiting = useCallback(() => {
    setPhase('ready')
    const delay = 2000 + Math.random() * 3000
    timeoutRef.current = setTimeout(() => {
      setStartTime(Date.now())
      setPhase('go')
    }, delay)
  }, [])

  const handleClick = useCallback(() => {
    if (phase === 'ready') {
      // Clicked too early
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setPhase('early')
    } else if (phase === 'go') {
      const time = Date.now() - startTime
      setReactionTime(time)
      setPhase('result')
    }
  }, [phase, startTime])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleFinish = () => {
    onComplete(reactionTime)
  }

  const handleRetry = () => {
    setPhase('idle')
    setReactionTime(null)
  }

  // Idle state — separate from the clickable area
  if (phase === 'idle') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Reaction Time</h3>
          <p className="text-muted-foreground mb-6">
            Clicca <strong>CLICCA!</strong> appena lo schermo diventa verde.<br />
            Non cliccare prima o perderai!
          </p>
          <Button size="lg" onClick={startWaiting}>
            Inizia
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardContent className="p-0">
        <div
          onClick={handleClick}
          className={`
            min-h-[300px] flex flex-col items-center justify-center select-none
            ${phase === 'ready' ? 'bg-red-500 cursor-pointer' : ''}
            ${phase === 'go' ? 'bg-green-500 cursor-pointer' : ''}
            ${phase === 'result' ? 'bg-primary' : ''}
            ${phase === 'early' ? 'bg-yellow-500' : ''}
          `}
        >
          {phase === 'ready' && (
            <div className="text-center text-white">
              <h3 className="text-3xl font-bold">Aspetta...</h3>
              <p className="text-white/80 mt-2">Non cliccare ancora!</p>
            </div>
          )}

          {phase === 'go' && (
            <div className="text-center text-white">
              <h3 className="text-5xl font-bold">CLICCA!</h3>
            </div>
          )}

          {phase === 'early' && (
            <div className="text-center text-black p-6">
              <h3 className="text-2xl font-bold mb-2">Troppo presto!</h3>
              <p className="mb-4">Hai cliccato prima del verde</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={(e) => { e.stopPropagation(); handleRetry() }} variant="outline">
                  Riprova
                </Button>
                <Button onClick={(e) => { e.stopPropagation(); handleFinish() }} variant="destructive">
                  Conferma (0 punti)
                </Button>
              </div>
            </div>
          )}

          {phase === 'result' && (
            <div className="text-center text-primary-foreground p-6">
              <h3 className="text-lg mb-1">{playerName}</h3>
              <p className="text-5xl font-bold mb-2">{reactionTime} ms</p>
              <p className="text-primary-foreground/80 mb-6">
                {reactionTime && reactionTime < 200 ? 'Incredibile!' :
                 reactionTime && reactionTime < 300 ? 'Ottimo!' :
                 reactionTime && reactionTime < 400 ? 'Buono!' : 'Puoi fare meglio!'}
              </p>
              <Button
                onClick={(e) => { e.stopPropagation(); handleFinish() }}
                variant="secondary"
                size="lg"
              >
                Conferma
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
