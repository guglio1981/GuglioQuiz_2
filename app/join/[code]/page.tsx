'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { getGameByCode, addPlayer } from '@/lib/game-store'
import { ProfileDialog } from '@/components/profile-dialog'
import { RulesDialog } from '@/components/rules-dialog'
import { type PlayerProfile, type Game } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [savedProfile, setSavedProfile] = useState<PlayerProfile | null>(null)
  const [user, setUser] = useState<{ username: string; avatar?: string; avatar_url?: string } | null>(null)

  useEffect(() => {
    // Check if user already has a playerId for this game
    const existingPlayerId = sessionStorage.getItem('guglioquiz_playerId')
    const existingGameCode = sessionStorage.getItem('guglioquiz_gameCode')
    
    if (existingPlayerId && existingGameCode === code.toUpperCase()) {
      // Already joined this game, go directly to lobby
      router.push(`/lobby/${code}`)
      return
    }

    // Load saved profile
    const storedProfile = localStorage.getItem('guglioquiz_saved_profile')
    if (storedProfile) {
      try {
        setSavedProfile(JSON.parse(storedProfile))
      } catch {
        // Invalid JSON
      }
    }

    // Check if logged in
    const storedUser = localStorage.getItem('guglioquiz_user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch {
        // Invalid JSON
      }
    }

    // Load game
    const loadGame = async () => {
      const gameData = await getGameByCode(code.toUpperCase())
      if (!gameData) {
        toast.error('Partita non trovata')
        router.push('/')
        return
      }
      
      if (gameData.status !== 'lobby') {
        toast.error('La partita è già iniziata')
        router.push('/')
        return
      }
      
      setGame(gameData)
      setLoading(false)
      setShowProfile(true)
    }

    loadGame()
  }, [code, router])

  const handleProfileSubmit = async (profile: PlayerProfile) => {
    if (!game) return

    try {
      // For logged-in users, use their profile avatar
      const finalProfile = user ? {
        name: user.username,
        avatar: user.avatar as import('@/lib/types').AvatarId || profile.avatar,
        avatarUrl: user.avatar_url || profile.avatarUrl
      } : profile
      
      // Save profile
      localStorage.setItem('guglioquiz_saved_profile', JSON.stringify(finalProfile))
      
      // Join the game
      const player = await addPlayer(game.id, finalProfile.name, finalProfile.avatar, finalProfile.avatarUrl || null, false)
      
      if (!player) {
        toast.error('Errore durante l\'accesso alla partita')
        return
      }
      
      // Save to sessionStorage
      sessionStorage.setItem('guglioquiz_playerId', player.id)
      sessionStorage.setItem('guglioquiz_profile', JSON.stringify(finalProfile))
      sessionStorage.setItem('guglioquiz_isHost', 'false')
      sessionStorage.setItem('guglioquiz_gameCode', game.code)
      
      // Show rules dialog before going to lobby
      setShowProfile(false)
      setShowRules(true)
    } catch (error) {
      console.error('Error joining game:', error)
      toast.error('Errore durante l\'accesso alla partita')
    }
  }
  
  const handleAcceptRules = () => {
    setShowRules(false)
    toast.success('Ti sei unito alla partita!')
    router.push(`/lobby/${code}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Caricamento partita...</p>
        </div>
      </div>
    )
  }

  const profileForDialog = user ? {
    name: user.username,
    avatar: user.avatar as import('@/lib/types').AvatarId || null,
    avatarUrl: user.avatar_url || null
  } : savedProfile

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <ProfileDialog
        open={showProfile}
        onClose={() => router.push('/')}
        onSubmit={handleProfileSubmit}
        title="Unisciti alla partita"
        description={user ? 'Conferma il tuo profilo per giocare' : 'Scegli un nome e un avatar per giocare'}
        initialProfile={profileForDialog}
        lockedName={user?.username || null}
        lockedAvatar={!!user && !!(user.avatar || user.avatar_url)}
      />
      
      <RulesDialog open={showRules} onAccept={handleAcceptRules} gameProfile={(game?.game_profile as 'timed' | 'untimed') || 'timed'} />
    </div>
  )
}
