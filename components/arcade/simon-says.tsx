'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SimonSaysProps {
  onComplete: (level: number) => void
  playerName: string
}

const COLORS = ['red', 'blue', 'green', 'yellow'] as const
type Color = typeof COLORS[number]

const MAX_LEVELS = 8

const COLOR_CLASSES: Record<Color, { normal: string; active: string; label: string }> = {
  red:    { normal: 'bg-red-700',    active: 'bg-red-400 ring-4 ring-red-300 scale-105',    label: 'Rosso' },
  blue:   { normal: 'bg-blue-700',   active: 'bg-blue-400 ring-4 ring-blue-300 scale-105',  label: 'Blu' },
  green:  { normal: 'bg-green-700',  active: 'bg-green-400 ring-4 ring-green-300 scale-105', label: 'Verde' },
  yellow: { normal: 'bg-yellow-600', active: 'bg-yellow-300 ring-4 ring-yellow-200 scale-105', label: 'Giallo' },
}

export function SimonSays({ onComplete, playerName }: SimonSaysProps) {
  const [sequence, setSequence] = useState<Color[]>([])
  const [playerSequence, setPlayerSequence] = useState<Color[]>([])
  const [isShowingSequence, setIsShowingSequence] = useState(false)
  const [activeColor, setActiveColor] = useState<Color | null>(null)
  const [level, setLevel] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isWon, setIsWon] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const playSequence = useCallback(async (seq: Color[]) => {
    setIsShowingSequence(true)
    setPlayerSequence([])

    for (let i = 0; i < seq.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setActiveColor(seq[i])
      await new Promise(resolve => setTimeout(resolve, 500))
      setActiveColor(null)
    }

    setIsShowingSequence(false)
  }, [])

  const startGame = useCallback(() => {
    setIsStarted(true)
    setSequence([])
    setPlayerSequence([])
    setLevel(0)
    setIsGameOver(false)
    setIsWon(false)

    const firstColor = COLORS[Math.floor(Math.random() * COLORS.length)]
    const firstSeq = [firstColor]
    setSequence(firstSeq)
    setLevel(1)

    setTimeout(() => {
      playSequence(firstSeq)
    }, 600)
  }, [playSequence])

  const handleColorClick = (color: Color) => {
    if (isShowingSequence || isGameOver || isWon || !isStarted) return

    setActiveColor(color)
    setTimeout(() => setActiveColor(null), 200)

    const newPlayerSequence = [...playerSequence, color]
    setPlayerSequence(newPlayerSequence)

    const currentIndex = newPlayerSequence.length - 1

    // Wrong color
    if (newPlayerSequence[currentIndex] !== sequence[currentIndex]) {
      setIsGameOver(true)
      return
    }

    // Completed the sequence for this level
    if (newPlayerSequence.length === sequence.length) {
      const newLevel = level + 1

      // Won all levels
      if (newLevel > MAX_LEVELS) {
        setIsWon(true)
        return
      }

      setLevel(newLevel)
      const newColor = COLORS[Math.floor(Math.random() * COLORS.length)]
      const newSequence = [...sequence, newColor]
      setSequence(newSequence)

      setTimeout(() => {
        playSequence(newSequence)
      }, 1000)
    }
  }

  const handleFinish = () => {
    onComplete(isWon ? MAX_LEVELS : level)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (isGameOver || isWon) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg mb-2">{playerName}</h3>
          {isWon ? (
            <>
              <p className="text-4xl font-bold text-yellow-500 mb-2">Perfetto!</p>
              <p className="text-muted-foreground mb-4">
                Hai completato tutte e {MAX_LEVELS} le sequenze!
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold text-primary mb-2">
                Livello {level}
              </p>
              <p className="text-muted-foreground mb-4">
                Hai memorizzato {level} {level === 1 ? 'sequenza' : 'sequenze'} su {MAX_LEVELS}
              </p>
            </>
          )}
          <Button onClick={handleFinish} size="lg">
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
          <span>Simon Says</span>
          <span className="text-primary text-sm">
            Livello {level}/{MAX_LEVELS}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {!isStarted ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Memorizza e ripeti le sequenze di colori.<br />
              <span className="font-medium">{MAX_LEVELS} livelli totali.</span>
            </p>
            <Button onClick={startGame} size="lg">
              Inizia
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorClick(color)}
                  disabled={isShowingSequence}
                  className={`
                    aspect-square rounded-xl transition-all duration-150
                    ${activeColor === color
                      ? COLOR_CLASSES[color].active
                      : COLOR_CLASSES[color].normal
                    }
                    ${!isShowingSequence ? 'cursor-pointer hover:opacity-90 active:scale-95' : 'cursor-not-allowed opacity-70'}
                  `}
                  aria-label={COLOR_CLASSES[color].label}
                />
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {isShowingSequence ? 'Guarda la sequenza...' : 'Ripeti la sequenza!'}
            </p>

            {/* Progress dots */}
            <div className="flex justify-center gap-1 mt-3">
              {Array.from({ length: MAX_LEVELS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${i < level ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
