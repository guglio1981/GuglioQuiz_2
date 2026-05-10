'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { type ArcadeGame, ARCADE_GAME_LABELS } from '@/lib/types'
import { ReactionTime } from './reaction-time'
import { MemoryCards } from './memory-cards'
import { SpeedTyping } from './speed-typing'
import { SequenzaNumerica } from './sequenza-numerica'
import { SimonSays } from './simon-says'
import { PuzzleSlider } from './puzzle-slider'
import { Gamepad2, Trophy, Zap, Grid3X3, Keyboard, Hash, Circle, Puzzle, ArrowRight, HandHelping } from 'lucide-react'

// Scoring system - percentage based, scaled by difficulty
const MAX_ARCADE_POINTS = {
  puzzle_slider: 1000,
  memory_cards: 700,
  simon_says: 700,
  speed_typing: 500,
  sequenza_numerica: 400,
  reaction_time: 300,
}

// Game rules and descriptions
const GAME_RULES: Record<ArcadeGame, { icon: React.ReactNode; description: string; howToPlay: string; scoring: string }> = {
  reaction_time: {
    icon: <Zap className="h-8 w-8" />,
    description: 'Testa i tuoi riflessi!',
    howToPlay: 'Attendi che lo schermo diventi VERDE, poi clicca il piu velocemente possibile. Attenzione: se clicchi troppo presto perdi!',
    scoring: 'Vince chi ha il tempo di reazione piu basso in millisecondi.',
  },
  memory_cards: {
    icon: <Grid3X3 className="h-8 w-8" />,
    description: 'Trova le coppie!',
    howToPlay: 'Gira le carte e trova tutte le 8 coppie. Ricorda la posizione delle carte per finire nel minor tempo possibile.',
    scoring: 'Vince chi completa il gioco nel minor tempo.',
  },
  speed_typing: {
    icon: <Keyboard className="h-8 w-8" />,
    description: 'Scrivi piu veloce!',
    howToPlay: 'Scrivi le 5 parole mostrate il piu velocemente possibile. Ogni errore aggiunge 0.5 secondi di penalita.',
    scoring: 'Vince chi ha il tempo totale piu basso (tempo + penalita errori).',
  },
  sequenza_numerica: {
    icon: <Hash className="h-8 w-8" />,
    description: 'Tocca in ordine!',
    howToPlay: 'Tocca i numeri da 1 a 15 in ordine crescente. I numeri sono sparsi sullo schermo. Ogni errore aggiunge 1 secondo di penalita.',
    scoring: 'Vince chi ha il tempo totale piu basso (tempo + penalita errori).',
  },
  simon_says: {
    icon: <Circle className="h-8 w-8" />,
    description: 'Memorizza la sequenza!',
    howToPlay: 'Osserva la sequenza di colori che si illumina, poi ripetila nello stesso ordine. Ogni round la sequenza diventa piu lunga fino a 8 livelli!',
    scoring: 'Vince chi raggiunge il livello piu alto. A parita di livello, vince chi ha impiegato meno tempo.',
  },
  puzzle_slider: {
    icon: <Puzzle className="h-8 w-8" />,
    description: 'Ricomponi il puzzle!',
    howToPlay: 'Sposta le tessere per ordinare i numeri da 1 a 8. Clicca su una tessera adiacente allo spazio vuoto per spostarla. Hai 3 minuti di tempo!',
    scoring: 'Vince chi completa il puzzle nel minor tempo.',
  },
}

interface ArcadeGameWrapperProps {
  game: ArcadeGame
  playerId: string
  playerName: string
  players: { id: string; name: string; score: number }[]
  onComplete: (rawScore: number) => void
  onContinue: () => void
  isHost?: boolean
  allResults?: { player_id: string; raw_score: number; points_earned: number; position: number | null }[]
  hasCompleted?: boolean
}

export function ArcadeGameWrapper({
  game,
  playerId,
  playerName,
  players,
  onComplete,
  onContinue,
  isHost = false,
  allResults = [],
  hasCompleted: externalHasCompleted = false,
}: ArcadeGameWrapperProps) {
  const [internalHasCompleted, setInternalHasCompleted] = useState(false)
  const [myRawScore, setMyRawScore] = useState<number | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  
  const hasCompleted = externalHasCompleted || internalHasCompleted
  const allPlayersCompleted = allResults.length === players.length && allResults.length > 0

  const handleReactionTimeComplete = (timeMs: number | null) => {
    const rawScore = timeMs ?? 99999 // Failed = very high score
    setMyRawScore(rawScore)
    setInternalHasCompleted(true)
    onComplete(rawScore)
  }

  const handleMemoryCardsComplete = (timeMs: number, moves: number) => {
    setMyRawScore(timeMs)
    setInternalHasCompleted(true)
    onComplete(timeMs)
  }

  const handleSpeedTypingComplete = (timeMs: number, errors: number) => {
    const rawScore = timeMs + (errors * 500) // 500ms penalty per error
    setMyRawScore(rawScore)
    setInternalHasCompleted(true)
    onComplete(rawScore)
  }

  const handleSequenzaComplete = (timeMs: number, errors: number) => {
    const rawScore = timeMs + (errors * 1000) // 1s penalty per error
    setMyRawScore(rawScore)
    setInternalHasCompleted(true)
    onComplete(rawScore)
  }

  const handleSimonSaysComplete = (level: number) => {
    // For Simon Says, higher is better, but we store as negative to sort consistently
    // Actually, let's store the level directly and handle sorting in processArcadeResults
    setMyRawScore(level)
    setInternalHasCompleted(true)
    onComplete(level)
  }

  const handlePuzzleSliderComplete = (timeMs: number, moves: number) => {
    setMyRawScore(timeMs)
    setInternalHasCompleted(true)
    onComplete(timeMs)
  }

  // Show rules popup before starting the game (MUST BE FIRST)
  if (!gameStarted) {
    const rules = GAME_RULES[game]
    const maxPoints = MAX_ARCADE_POINTS[game]
    
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2 text-primary">
            {rules.icon}
          </div>
          <CardTitle className="text-xl">{ARCADE_GAME_LABELS[game]}</CardTitle>
          <p className="text-muted-foreground">{rules.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* How to play */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">Come si gioca:</h4>
            <p className="text-sm text-muted-foreground">{rules.howToPlay}</p>
          </div>

          {/* How scoring works */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">Come si vince:</h4>
            <p className="text-sm text-muted-foreground">{rules.scoring}</p>
          </div>
          
          {/* Scoring */}
          <div className="bg-primary/10 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-sm text-primary">Punteggio:</h4>
            <p className="text-sm text-muted-foreground">
              Massimo <span className="font-bold text-primary">+{maxPoints}</span> punti
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Il tuo punteggio dipende dalla tua performance relativa agli altri giocatori. Chi ha la miglior performance riceve il 100% dei punti.
            </p>
          </div>
          
          <Button 
            onClick={() => setGameStarted(true)} 
            className="w-full" 
            size="lg"
          >
            <Gamepad2 className="mr-2 h-5 w-5" />
            Inizia il Gioco
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Show waiting screen if completed but not all players done
  if (hasCompleted && !allPlayersCompleted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <Gamepad2 className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <p className="text-lg font-medium">Completato!</p>
          {myRawScore !== null && (
            <p className="text-muted-foreground">
              {game === 'simon_says' 
                ? `Hai raggiunto il livello ${myRawScore}`
                : `Tempo: ${(myRawScore / 1000).toFixed(2)}s`
              }
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Attendi gli altri giocatori... ({allResults.length}/{players.length})
          </p>
        </CardContent>
      </Card>
    )
  }

  // Show results when all players completed
  if (allPlayersCompleted) {
    const isLowerBetter = game !== 'simon_says'
    
    // Sort by position (already calculated server-side)
    const leaderboard = [...allResults]
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
      .map(r => {
        const player = players.find(p => p.id === r.player_id)
        return {
          ...r,
          playerName: player?.name || 'Sconosciuto',
        }
      })

    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Risultati {ARCADE_GAME_LABELS[game]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {leaderboard.map((result, index) => (
              <div
                key={result.player_id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.player_id === playerId ? 'bg-primary/20 border border-primary' : 'bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    index === 2 ? 'text-amber-600' : ''
                  }`}>
                    {index + 1}.
                  </span>
                  <span>{result.playerName}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary">+{result.points_earned}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {isLowerBetter 
                      ? `${(result.raw_score / 1000).toFixed(1)}s`
                      : `Lv.${result.raw_score}`
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {isHost && (
            <Button 
              onClick={onContinue} 
              className="w-full"
              size="lg"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Avanti
            </Button>
          )}
          
          {!isHost && (
            <p className="text-center text-sm text-muted-foreground">
              In attesa che l&apos;host continui...
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

// Show the actual game
  return (
    <div className="w-full">
      {game === 'reaction_time' && (
        <ReactionTime onComplete={handleReactionTimeComplete} playerName={playerName} />
      )}
      {game === 'memory_cards' && (
        <MemoryCards onComplete={handleMemoryCardsComplete} playerName={playerName} />
      )}
      {game === 'speed_typing' && (
        <SpeedTyping onComplete={handleSpeedTypingComplete} playerName={playerName} />
      )}
      {game === 'sequenza_numerica' && (
        <SequenzaNumerica onComplete={handleSequenzaComplete} playerName={playerName} />
      )}
      {game === 'simon_says' && (
        <SimonSays onComplete={handleSimonSaysComplete} playerName={playerName} />
      )}
      {game === 'puzzle_slider' && (
        <PuzzleSlider onComplete={handlePuzzleSliderComplete} playerName={playerName} />
      )}
    </div>
  )
}

export { ARCADE_SCORES }
