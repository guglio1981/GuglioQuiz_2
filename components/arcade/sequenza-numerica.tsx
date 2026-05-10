'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SequenzaNumericaProps {
  onComplete: (timeMs: number, errors: number) => void
  playerName: string
}

export function SequenzaNumerica({ onComplete, playerName }: SequenzaNumericaProps) {
  const [numbers, setNumbers] = useState<{ value: number; x: number; y: number; found: boolean }[]>([])
  const [nextNumber, setNextNumber] = useState(1)
  const [errors, setErrors] = useState(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const totalNumbers = 15

  const initializeGame = useCallback(() => {
    const nums: { value: number; x: number; y: number; found: boolean }[] = []
    const positions: { x: number; y: number }[] = []
    
    for (let i = 1; i <= totalNumbers; i++) {
      let x: number, y: number
      let attempts = 0
      do {
        x = Math.random() * 80 + 10 // 10-90%
        y = Math.random() * 80 + 10 // 10-90%
        attempts++
      } while (
        attempts < 50 &&
        positions.some(p => Math.abs(p.x - x) < 15 && Math.abs(p.y - y) < 15)
      )
      
      positions.push({ x, y })
      nums.push({ value: i, x, y, found: false })
    }
    
    setNumbers(nums)
    setNextNumber(1)
    setErrors(0)
    setIsStarted(false)
    setIsComplete(false)
  }, [])

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  const handleNumberClick = (value: number) => {
    if (!isStarted) {
      setIsStarted(true)
      setStartTime(Date.now())
    }

    if (value === nextNumber) {
      const newNumbers = numbers.map(n => 
        n.value === value ? { ...n, found: true } : n
      )
      setNumbers(newNumbers)
      
      if (value === totalNumbers) {
        const time = Date.now() - startTime
        setFinalTime(time)
        setIsComplete(true)
      } else {
        setNextNumber(value + 1)
      }
    } else {
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
            {errors} errori
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
          <span>Sequenza Numerica</span>
          <span className="text-primary">Trova: {nextNumber}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="relative bg-muted rounded-lg" style={{ height: '300px' }}>
          {numbers.map((num) => (
            <button
              key={num.value}
              onClick={() => handleNumberClick(num.value)}
              disabled={num.found}
              className={`
                absolute w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                ${num.found 
                  ? 'bg-green-500 text-white scale-75 opacity-50' 
                  : 'bg-primary text-primary-foreground hover:scale-110 cursor-pointer'
                }
              `}
              style={{
                left: `calc(${num.x}% - 20px)`,
                top: `calc(${num.y}% - 20px)`,
              }}
            >
              {num.value}
            </button>
          ))}
        </div>
        {!isStarted && (
          <p className="text-center text-muted-foreground mt-4">
            Clicca i numeri in ordine crescente (1, 2, 3...)
          </p>
        )}
        {isStarted && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            Errori: {errors}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
