'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'
import { getGameByCode, getPlayers, updatePlayerReady, subscribeToGame, subscribeToPlayers, unsubscribe, updateGameStatus, deletePlayer } from '@/lib/game-store'
import { TOPIC_LABELS, AVATAR_COLORS, AVATAR_ICONS, type Game, type Player, type AvatarId } from '@/lib/types'
import { toast } from 'sonner'
import { Copy, Check, Users, Play, Crown, MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    const playerId = sessionStorage.getItem('guglioquiz_playerId')
    if (!playerId) {
      router.push('/')
      return
    }
    setCurrentPlayerId(playerId)

    const loadGame = async () => {
      const gameData = await getGameByCode(code)
      if (!gameData) {
        toast.error('Partita non trovata')
        router.push('/')
        return
      }
      setGame(gameData)
      
      const playersData = await getPlayers(gameData.id)
      setPlayers(playersData)

      // Check if player already accepted rules
      const currentPlayer = playersData.find(p => p.id === playerId)
      if (currentPlayer && currentPlayer.ready) {
        setHasAcceptedRules(true)
      }
    }

    loadGame()
  }, [code, router])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!game) return

    const gameChannel = subscribeToGame(game.id, (updatedGame) => {
      setGame(updatedGame)
      if (updatedGame.status === 'playing') {
        // Use window.location for hard navigation to ensure page loads
        window.location.href = `/game/${game.code}`
      }
    })

    const playersChannel = subscribeToPlayers(game.id, setPlayers)

    return () => {
      unsubscribe(gameChannel)
      unsubscribe(playersChannel)
    }
  }, [game, router])

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Codice copiato!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareWhatsApp = () => {
    const gameUrl = typeof window !== 'undefined' ? `${window.location.origin}?code=${code}` : ''
    const message = `Unisciti a GuglioQuiz! Sfidami in un quiz multiplayer.\n\nCodice partita: ${code}\n\nEntra qui: ${gameUrl}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleAcceptRules = async () => {
    if (!currentPlayerId) return
    
    await updatePlayerReady(currentPlayerId, true)
    setHasAcceptedRules(true)
  }

  const handleRemovePlayer = async (playerId: string) => {
    const success = await deletePlayer(playerId)
    if (success) {
      toast.success('Giocatore rimosso')
    } else {
      toast.error('Errore nella rimozione del giocatore')
    }
  }

  const handleStartGame = async () => {
    if (!game) return
    
    const allReady = players.every(p => p.is_host || p.ready)
    if (!allReady) {
      toast.error('Tutti i giocatori devono accettare le regole')
      return
    }

    if (players.length < 1) {
      toast.error('Serve almeno 1 giocatore')
      return
    }

    setIsStarting(true)
    await updateGameStatus(game.id, 'playing')
    // Use window.location for hard navigation to ensure page loads
    window.location.href = `/game/${game.code}`
  }

  const currentPlayer = players.find(p => p.id === currentPlayerId)
  const isHost = currentPlayer?.is_host || false
  const allPlayersReady = players.every(p => p.is_host || p.ready)

  if (!game) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Caricamento...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header with code */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-6 text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Lobby</h1>
            <div className="space-y-2">
              <p className="text-muted-foreground">Codice partita</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-mono font-bold tracking-widest text-primary">
                  {code}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-accent" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShareWhatsApp}
                  className="shrink-0 hover:bg-[#25D366]/20 hover:border-[#25D366] hover:text-[#25D366]"
                  title="Condividi su WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Condividi questo codice con i tuoi amici
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Game settings summary */}
        <Card className="bg-card border-border">
          {game.topics.length === 0 ? (
            /* Waiting for host to configure new manche */
            <CardContent className="p-6">
              <div className="text-center space-y-3">
                <div className="animate-pulse">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="text-muted-foreground">
                  In attesa che l&apos;host configuri la nuova manche...
                </p>
              </div>
            </CardContent>
          ) : (
            /* Show rules when topics are set */
            <>
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-primary border-primary">
                    {game.question_count} domande
                  </Badge>
                  <Badge variant="outline" className="text-secondary border-secondary">
                    {game.difficulty === 'difficile' ? 'Difficile' : 'Intermedia'}
                  </Badge>
                  <Badge variant="outline" className="text-accent border-accent">
                    {game.max_abstentions} astensioni
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {game.topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {TOPIC_LABELS[topic as keyof typeof TOPIC_LABELS]}
                    </Badge>
                  ))}
                </div>

                {/* Accept button for non-host players */}
                {!isHost && !hasAcceptedRules && (
                  <Button
                    onClick={handleAcceptRules}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accetto le regole
                  </Button>
                )}
              </CardContent>
            </>
          )}
        </Card>

        {/* Ready message for non-host players */}
        {!isHost && hasAcceptedRules && game.topics.length > 0 && (
          <div className="text-center py-4 px-6 bg-muted rounded-xl border border-border">
            <p className="text-foreground font-semibold text-lg">
              Sei pronto! In attesa che l&apos;host avvii la partita...
            </p>
          </div>
        )}

        {/* Players list */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Giocatori ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-xl transition-colors',
                    player.id === currentPlayerId ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
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

                  {/* Name and status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {player.name}
                      </span>
                      {player.is_host && (
                        <Crown className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {player.is_host ? 'Host' : player.ready ? 'Pronto' : 'In attesa'}
                    </span>
                  </div>

                  {/* Ready indicator */}
                  {(player.ready || player.is_host) && (
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-accent-foreground" />
                    </div>
                  )}

                  {/* Remove button (host only, can't remove self) */}
                  {isHost && !player.is_host && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePlayer(player.id)}
                      className="shrink-0 h-8 w-8 text-destructive hover:bg-destructive/20 hover:text-destructive"
                      title="Rimuovi giocatore"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Start button (host only) */}
        {isHost && (
          <Button
            onClick={handleStartGame}
            disabled={isStarting || !allPlayersReady || players.length < 2}
            size="lg"
            className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Play className="mr-2 h-5 w-5" />
            {isStarting ? 'Avvio in corso...' : 'Inizia Partita'}
          </Button>
        )}

        
      </div>

      </main>
  )
}
