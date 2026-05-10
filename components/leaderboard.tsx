'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AVATAR_COLORS, AVATAR_ICONS, type Player, type AvatarId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Trophy, Medal, Award, ArrowRight } from 'lucide-react'
import { AbstentionDots } from '@/components/abstention-dots'

interface LeaderboardProps {
  players: Player[]
  currentPlayerId: string
  questionNumber: number
  totalQuestions: number
  isHost?: boolean
  maxAbstentions?: number
  onContinue?: () => void
  children?: React.ReactNode
}

export function Leaderboard({
  players,
  currentPlayerId,
  questionNumber,
  totalQuestions,
  isHost = false,
  maxAbstentions,
  onContinue,
  children,
}: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Stable tiebreaker: earlier join time first (prevents UI oscillation)
    return a.created_at.localeCompare(b.created_at)
  })

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-500" />
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">
            {index + 1}
          </span>
        )
    }
  }

  return (
    <Card className="bg-card border-border w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold text-foreground">
          Classifica
        </CardTitle>
        <p className="text-muted-foreground">
          Dopo {questionNumber} di {totalQuestions} domande
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedPlayers.map((player, index) => {
          const safeCurrentId = (currentPlayerId ?? '').trim()
          const isCurrentPlayer = safeCurrentId.length > 0 && player.id.trim() === safeCurrentId
          return (
          <div
            key={player.id}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl',
              isCurrentPlayer
                ? 'bg-primary/20 border-2 border-primary'
                : 'bg-muted border-2 border-transparent'
            )}
          >
            {/* Rank */}
            <div className="shrink-0">{getRankIcon(index)}</div>

            {/* Avatar */}
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0',
                player.avatar
                  ? AVATAR_COLORS[player.avatar as AvatarId]?.bg || 'bg-muted'
                  : 'bg-muted'
              )}
            >
              {player.avatar_url ? (
                <img
                  src={player.avatar_url}
                  alt={player.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : player.avatar ? (
                AVATAR_ICONS[player.avatar as AvatarId]
              ) : (
                '?'
              )}
            </div>

            {/* Name and Abstentions */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="font-semibold text-foreground truncate block">
                {player.name}
              </span>
              {maxAbstentions !== undefined && maxAbstentions > 0 && (
                <div className="scale-75 origin-left mt-0.5">
                  <AbstentionDots 
                    total={maxAbstentions} 
                    used={player.abstentions_used || 0} 
                  />
                </div>
              )}
            </div>

            {/* Score */}
            <div className="text-right shrink-0">
              <span
                className={cn(
                  'text-xl font-bold tabular-nums',
                  player.score >= 0 ? 'text-accent' : 'text-destructive'
                )}
              >
                {player.score > 0 && '+'}
                {player.score}
              </span>
            </div>
          </div>
        )})}
        
        {isHost && onContinue && (
          <Button
            onClick={onContinue}
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
          >
            <ArrowRight className="mr-2 h-5 w-5" />
            Avanti
          </Button>
        )}
        {!isHost && !children && (
          <p className="text-center text-sm text-muted-foreground pt-2">
            In attesa che l&apos;host continui...
          </p>
        )}
        {children && (
          <div className="space-y-3 pt-2">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
