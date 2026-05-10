'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SpeedTypingProps {
  onComplete: (timeMs: number, errors: number) => void
  playerName: string
}

const WORDS = [
  'velocita', 'computer', 'telefono', 'tastiera', 'schermo',
  'finestra', 'programma', 'internet', 'messaggio', 'risposta',
  'domanda', 'giocatore', 'vittoria', 'punteggio', 'partita',
  'squadra', 'campione', 'record', 'livello', 'bonus'
]

export function SpeedTyping({ onComplete, playerName }: SpeedTypingProps) {
  const [currentWord, setCurrentWord] = useState('')
  const [userInput, setUserInput] = useState('')
  const [wordsCompleted, setWordsCompleted] = useState(0)
  const [errors, setErrors] = useState(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const targetWords = 5

  const getRandomWord = () => {
    return WORDS[Math.floor(Math.random() * WORDS.length)]
  }

  useEffect(() => {
    setCurrentWord(getRandomWord())
  }, [])

  const handleStart = () => {
    setIsStarted(true)
    setStartTime(Date.now())
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase()
    setUserInput(value)

    if (value === currentWord) {
      const completed = wordsCompleted + 1
      setWordsCompleted(completed)
      setUserInput('')
      
      if (completed >= targetWords) {
        const time = Date.now() - startTime
        setFinalTime(time)
        setIsComplete(true)
      } else {
        setCurrentWord(getRandomWord())
      }
    } else if (value.length > 0 && !currentWord.startsWith(value)) {
      setErrors(e => e + 1)
    }
  }

  const handleFinish = () => {
    onComplete(finalTime, errors)
  }

  if (isComplete) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg mb-2">{playerName}</h3>
          <p className="text-4xl font-bold text-primary mb-2">
            {(finalTime / 1000).toFixed(1)}s
          </p>
          <p className="text-muted-foreground mb-4">
            {targetWords} parole - {errors} errori
          </p>
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
        <CardTitle className="text-center flex justify-between">
          <span>Speed Typing</span>
          <span className="text-primary">{wordsCompleted}/{targetWords}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {!isStarted ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Scrivi {targetWords} parole il piu velocemente possibile
            </p>
            <Button onClick={handleStart} size="lg">
              Inizia
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold tracking-wider mb-4">
                {currentWord.split('').map((char, i) => (
                  <span
                    key={i}
                    className={
                      i < userInput.length
                        ? userInput[i] === char
                          ? 'text-green-500'
                          : 'text-red-500'
                        : 'text-foreground'
                    }
                  >
                    {char}
                  </span>
                ))}
              </p>
            </div>
            <Input
              ref={inputRef}
              value={userInput}
              onChange={handleInputChange}
              placeholder="Scrivi qui..."
              className="text-center text-lg"
              autoComplete="off"
              autoCapitalize="off"
            />
            <p className="text-center text-sm text-muted-foreground">
              Errori: {errors}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
