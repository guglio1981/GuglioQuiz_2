'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ProfileDialog } from '@/components/profile-dialog'
import { createGame, addPlayer, getGameByCode } from '@/lib/game-store'
import type { PlayerProfile } from '@/lib/types'
import { toast } from 'sonner'
import { Zap, Users, Trophy, Brain, Loader2 } from 'lucide-react'

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [joinCode, setJoinCode] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [pendingGameCode, setPendingGameCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [savedProfile, setSavedProfile] = useState<PlayerProfile | null>(null)

  // Load saved profile from localStorage and read code from URL
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setJoinCode(codeFromUrl.toUpperCase())
    }

    // Load saved profile from localStorage
    const storedProfile = localStorage.getItem('guglioquiz_saved_profile')
    if (storedProfile) {
      try {
        setSavedProfile(JSON.parse(storedProfile))
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [searchParams])

  const handleCreateGame = () => {
    setIsHost(true)
    setShowProfile(true)
  }

  const handleJoinGame = async () => {
    if (!joinCode.trim()) {
      toast.error('Inserisci un codice partita')
      return
    }

    setIsLoading(true)
    const game = await getGameByCode(joinCode.trim())
    setIsLoading(false)

    if (!game) {
      toast.error('Partita non trovata')
      return
    }

    if (game.status !== 'lobby') {
      toast.error('La partita e gia iniziata')
      return
    }

    setPendingGameCode(game.code)
    setIsHost(false)
    setShowProfile(true)
  }

  const handleProfileSubmit = async (profile: PlayerProfile) => {
    setIsLoading(true)

    // Save profile to localStorage for future use
    localStorage.setItem('guglioquiz_saved_profile', JSON.stringify(profile))

    try {
      if (isHost) {
        // Store profile in session and redirect to settings
        sessionStorage.setItem('guglioquiz_profile', JSON.stringify(profile))
        sessionStorage.setItem('guglioquiz_isHost', 'true')
        router.push('/settings')
      } else if (pendingGameCode) {
        // Join existing game
        const game = await getGameByCode(pendingGameCode)
        if (!game) {
          toast.error('Partita non trovata')
          setIsLoading(false)
          return
        }

        const player = await addPlayer(
          game.id,
          profile.name,
          profile.avatar,
          profile.avatarUrl,
          false
        )

        if (!player) {
          toast.error('Errore durante la registrazione')
          setIsLoading(false)
          return
        }

        sessionStorage.setItem('guglioquiz_playerId', player.id)
        sessionStorage.setItem('guglioquiz_gameId', game.id)
        sessionStorage.setItem('guglioquiz_profile', JSON.stringify(profile))
        router.push(`/lobby/${game.code}`)
      }
    } catch {
      toast.error('Si e verificato un errore')
    }

    setIsLoading(false)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo and tagline */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-balance">
            <span className="text-primary">Guglio</span>
            <span className="text-foreground">Quiz</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium text-pretty">
            Dove la conoscenza incontra la velocita
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-full border border-border">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">14 Argomenti</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-full border border-border">
            <Users className="w-4 h-4 text-secondary" />
            <span className="text-sm text-foreground">Multiplayer</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-full border border-border">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm text-foreground">15 Secondi</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-full border border-border">
            <Trophy className="w-4 h-4 text-chart-4" />
            <span className="text-sm text-foreground">Classifiche</span>
          </div>
        </div>

        {/* Action cards */}
        <div className="space-y-4">
          {/* Create game */}
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-6">
              <Button
                onClick={handleCreateGame}
                disabled={isLoading}
                size="lg"
                className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Crea Partita
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-3">
                Sei l&apos;host? Crea una nuova partita e invita i tuoi amici
              </p>
            </CardContent>
          </Card>

          {/* Join game */}
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-3">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Codice partita"
                  maxLength={6}
                  className="flex-1 h-14 text-lg text-center font-mono tracking-widest uppercase bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  onClick={handleJoinGame}
                  disabled={isLoading || !joinCode.trim()}
                  size="lg"
                  variant="secondary"
                  className="h-14 px-8 text-lg font-bold"
                >
                  Entra
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Hai ricevuto un codice? Inseriscilo qui per unirti alla partita
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rules preview */}
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-2">Come funziona</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Risposta corretta: +200 a +300 punti (in base alla velocita)</li>
              <li>• Risposta errata: da -50 a -200 punti (in base alla posizione)</li>
              <li>• Astensione: 0 punti (numero limitato)</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Profile dialog */}
      <ProfileDialog
        open={showProfile}
        onClose={() => setShowProfile(false)}
        onSubmit={handleProfileSubmit}
        title={isHost ? 'Crea il tuo profilo Host' : 'Unisciti alla partita'}
        description={
          isHost
            ? 'Come host potrai configurare la partita'
            : 'Scegli un nome e un avatar per giocare'
        }
        initialProfile={savedProfile}
      />
    </main>
  )
}

function LoadingFallback() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </main>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomePageContent />
    </Suspense>
  )
}
