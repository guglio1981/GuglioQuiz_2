'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Timer } from 'lucide-react'

interface PuzzleSliderProps {
  onComplete: (timeMs: number, moves: number) => void
  playerName: string
  onGiveUp?: () => void
}

type Tile = number | null

const MAX_TIME_MS = 3 * 60 * 1000 // 3 minutes

export function PuzzleSlider({ onComplete, playerName, onGiveUp }: PuzzleSliderProps) {
  const [tiles, setTiles] = useState<Tile[]>([])
  const [moves, setMoves] = useState(0)
  const [startTime, setStartTime] = useState<number>(0)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isTimeOut, setIsTimeOut] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const gridSize = 3

  const isSolved = useCallback((currentTiles: Tile[]) => {
    const solution = [1, 2, 3, 4, 5, 6, 7, 8, null]
    return currentTiles.every((tile, index) => tile === solution[index])
  }, [])

  const shuffleTiles = useCallback(() => {
    let newTiles: Tile[] = [1, 2, 3, 4, 5, 6, 7, 8, null]
    for (let i = 0; i < 100; i++) {
      const emptyIndex = newTiles.indexOf(null)
      const row = Math.floor(emptyIndex / gridSize)
      const col = emptyIndex % gridSize
      const possibleMoves: number[] = []
      if (row > 0) possibleMoves.push(emptyIndex - gridSize)
      if (row < gridSize - 1) possibleMoves.push(emptyIndex + gridSize)
      if (col > 0) possibleMoves.push(emptyIndex - 1)
      if (col < gridSize - 1) possibleMoves.push(emptyIndex + 1)
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
      ;[newTiles[emptyIndex], newTiles[randomMove]] = [newTiles[randomMove], newTiles[emptyIndex]]
    }
    return newTiles
  }, [])

  const initializeGame = useCallback(() => {
    setTiles(shuffleTiles())
    setMoves(0)
    setIsStarted(false)
    setIsComplete(false)
    setIsTimeOut(false)
    setFinalTime(0)
    setElapsed(0)
  }, [shuffleTiles])

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  // Countdown timer
  useEffect(() => {
    if (!isStarted || isComplete || isTimeOut) return
    const interval = setInterval(() => {
      const el = Date.now() - startTime
      setElapsed(el)
      if (el >= MAX_TIME_MS) {
        setIsTimeOut(true)
        setFinalTime(MAX_TIME_MS)
        clearInterval(interval)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [isStarted, isComplete, isTimeOut, startTime])

  const handleTileClick = (index: number) => {
    if (tiles[index] === null || isComplete || isTimeOut) return

    if (!isStarted) {
      setIsStarted(true)
      setStartTime(Date.now())
    }

    const emptyIndex = tiles.indexOf(null)
    const row = Math.floor(index / gridSize)
    const col = index % gridSize
    const emptyRow = Math.floor(emptyIndex / gridSize)
    const emptyCol = emptyIndex % gridSize

    const isAdjacent =
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow)

    if (isAdjacent) {
      const newTiles = [...tiles]
      ;[newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]]
      setTiles(newTiles)
      setMoves(m => m + 1)

      if (isSolved(newTiles)) {
        const time = Date.now() - startTime
        setFinalTime(time)
        setIsComplete(true)
      }
    }
  }

  const handleFinish = () => {
    onComplete(finalTime, moves)
  }

  const handleGiveUp = () => {
    setIsTimeOut(true)
    setFinalTime(MAX_TIME_MS)
    onComplete(999999, moves)
  }

  const remaining = Math.max(0, MAX_TIME_MS - elapsed)
  const remainingSeconds = Math.ceil(remaining / 1000)
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const timerColor = remaining < 30000 ? 'text-red-500' : remaining < 60000 ? 'text-yellow-500' : 'text-primary'

  if (isComplete || isTimeOut) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg mb-2">{playerName}</h3>
          {isTimeOut ? (
            <>
              <p className="text-4xl font-bold text-red-500 mb-2">Tempo scaduto!</p>
              <p className="text-muted-foreground mb-4">Non hai completato il puzzle in 3 minuti</p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold text-primary mb-2">
                {(finalTime / 1000).toFixed(1)}s
              </p>
              <p className="text-muted-foreground mb-4">Completato in {moves} mosse</p>
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
          <span>Puzzle Slider</span>
          <div className="flex items-center gap-3 text-sm">
            <span>Mosse: {moves}</span>
            {isStarted && (
              <span className={`flex items-center gap-1 font-mono font-bold ${timerColor}`}>
                <Timer className="h-4 w-4" />
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-2 bg-muted p-2 rounded-lg">
          {tiles.map((tile, index) => (
            <button
              key={index}
              onClick={() => handleTileClick(index)}
              className={`
                aspect-square flex items-center justify-center text-2xl font-bold rounded-lg transition-all
                ${tile === null
                  ? 'bg-transparent cursor-default'
                  : 'bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer'
                }
              `}
            >
              {tile}
            </button>
          ))}
        </div>
        {!isStarted && (
          <p className="text-center text-muted-foreground mt-4 text-sm">
            Clicca le tessere per spostarle. Hai 3 minuti.
          </p>
        )}
        {isStarted && (
          <Button
            onClick={handleGiveUp}
            variant="destructive"
            className="w-full mt-4"
          >
            Rinuncio
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
