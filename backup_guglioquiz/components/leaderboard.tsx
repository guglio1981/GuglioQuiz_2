'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AVATAR_COLORS, AVATAR_ICONS, type Player, type AvatarId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Trophy, Medal, Award } from 'lucide-react'

interface LeaderboardProps {
  players: Player[]
  currentPlayerId: string
  questionNumber: number
  totalQuestions: number
}

export function Leaderboard({
  players,
  currentPlayerId,
  questionNumber,
  totalQuestions,
}: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

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
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl transition-all',
              player.id === currentPlayerId
                ? 'bg-primary/20 border-2 border-primary'
                : 'bg-muted',
              index === 0 && 'ring-2 ring-yellow-500/50'
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

            {/* Name */}
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-foreground truncate block">
                {player.name}
              </span>
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
        ))}
      </CardContent>
    </Card>
  )
}
