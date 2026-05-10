'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ProfileDialog } from '@/components/profile-dialog'
import { RulesDialog } from '@/components/rules-dialog'
import { IOSInstallPrompt } from '@/components/ios-install-prompt'
import { createGame, addPlayer, getGameByCode, getPlayers } from '@/lib/game-store'
import type { PlayerProfile, AvatarId } from '@/lib/types'
import { AVATAR_COLORS, AVATAR_ICONS, AVATARS } from '@/lib/types'
import { toast } from 'sonner'
import { Zap, Users, Trophy, Brain, Loader2, LogIn, Bell, BellOff, LogOut, Upload } from 'lucide-react'
import Link from 'next/link'
import { setupPushNotifications, isPushEnabled, forceUpdateServiceWorker, isNotificationDenied, unsubscribeFromPush } from '@/lib/push-notifications'

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [joinCode, setJoinCode] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [pendingGameCode, setPendingGameCode] = useState<string | null>(null)
  const [pendingGameProfile, setPendingGameProfile] = useState<'timed' | 'untimed'>('timed')
  const [isLoading, setIsLoading] = useState(false)
  const [savedProfile, setSavedProfile] = useState<PlayerProfile | null>(null)
  const [showRules, setShowRules] = useState(false)
  const [pendingLobbyRedirect, setPendingLobbyRedirect] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; username: string; avatar: string | null; avatar_url?: string | null } | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushDenied, setPushDenied] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetCode, setResetCode] = useState('')
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request')
  const [newPassword, setNewPassword] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupAvatar, setSignupAvatar] = useState<AvatarId | null>(null)
  const [signupAvatarUrl, setSignupAvatarUrl] = useState<string | null>(null)
  const [signupAvatarFile, setSignupAvatarFile] = useState<File | null>(null)
  const signupFileInputRef = useRef<HTMLInputElement>(null)

// Read code from URL when searchParams changes
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setJoinCode(codeFromUrl.toUpperCase())
    }
  }, [searchParams])
  
  // Listen for window focus to detect navigation from service worker
  useEffect(() => {
    const checkUrlForCode = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const codeFromUrl = urlParams.get('code')
      if (codeFromUrl && codeFromUrl.toUpperCase() !== joinCode) {
        setJoinCode(codeFromUrl.toUpperCase())
      }
    }
    
    // Check on focus (when coming from notification click)
    window.addEventListener('focus', checkUrlForCode)
    
    // Also check on visibilitychange (for mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUrlForCode()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Check immediately on mount
    checkUrlForCode()
    
    return () => {
      window.removeEventListener('focus', checkUrlForCode)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [joinCode])
  
  // Load saved profile from localStorage
  useEffect(() => {

    // Load saved profile from localStorage
    const storedProfile = localStorage.getItem('guglioquiz_saved_profile')
    let savedProfileData: PlayerProfile | null = null
    if (storedProfile) {
      try {
        savedProfileData = JSON.parse(storedProfile)
        setSavedProfile(savedProfileData)
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Check auth status from localStorage
    const storedUser = localStorage.getItem('guglioquiz_user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        
        // Set user immediately
        setUser(userData)
        // Combine user data with saved profile (keep avatar from saved profile if exists)
        const capitalizedName = userData.username.charAt(0).toUpperCase() + userData.username.slice(1)
        setSavedProfile({
          name: capitalizedName,
          avatar: savedProfileData?.avatar || userData.avatar as any,
          avatarUrl: savedProfileData?.avatarUrl || null
        })
        
        // Force update service worker and check push status
        forceUpdateServiceWorker().then(() => {
          isPushEnabled().then(setPushEnabled).catch(() => setPushEnabled(false))
          setPushDenied(isNotificationDenied())
        })
        
        // Verify session is still valid (not logged in elsewhere) - async check
        if (userData.id && userData.session_token) {
          const checkSession = () => {
            fetch('/api/auth/verify-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                userId: userData.id, 
                sessionToken: userData.session_token 
              })
            })
            .then(res => res.json())
            .then(data => {
              if (!data.valid) {
                // Session invalid - user logged in elsewhere
                localStorage.removeItem('guglioquiz_user')
                setUser(null)
                setSavedProfile(null)
                setPushEnabled(false)
                toast.error('Sei stato disconnesso perché hai effettuato l\'accesso su un altro dispositivo')
              }
            })
            .catch(() => {
              // Network error, keep user logged in
            })
          }
          
          // Check immediately
          checkSession()
          
          // Then check every 10 seconds for real-time logout
          const sessionInterval = setInterval(checkSession, 10000)
          return () => clearInterval(sessionInterval)
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [])

  const handleCreateGame = () => {
    setIsHost(true)
    setShowProfile(true)
  }

  const handleLogout = async () => {
    // Disable push notifications on logout
    if (pushEnabled) {
      await unsubscribeFromPush()
      setPushEnabled(false)
    }
    // Clear all user data including saved profile for logged users
    localStorage.removeItem('guglioquiz_user')
    localStorage.removeItem('guglioquiz_profile')
    setUser(null)
    setSavedProfile(null)
    toast.success('Disconnesso')
  }

  const handleTogglePush = async () => {
    if (pushEnabled) {
      // Disable notifications
      const success = await unsubscribeFromPush()
      if (success) {
        setPushEnabled(false)
        toast.success('Notifiche disattivate')
      } else {
        toast.error('Errore nella disattivazione delle notifiche')
      }
    } else {
      // Enable notifications
      const result = await setupPushNotifications()
      if (result.success) {
        setPushEnabled(true)
        toast.success('Notifiche attivate!')
      } else if (result.error === 'denied') {
        toast.error(
          'Le notifiche sono state bloccate dalle impostazioni del dispositivo. Per attivarle, vai nelle Impostazioni del browser o del telefono e consenti le notifiche per questo sito.',
          { duration: 8000 }
        )
      } else {
        toast.error('Non è stato possibile attivare le notifiche')
      }
    }
  }

  const handleAcceptRules = () => {
    setShowRules(false)
    if (pendingLobbyRedirect) {
      router.push(pendingLobbyRedirect)
      setPendingLobbyRedirect(null)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginUsername || !loginPassword) return

    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Errore durante il login')
        setLoginLoading(false)
        return
      }

      // Save user to localStorage
      localStorage.setItem('guglioquiz_user', JSON.stringify(data.user))
      setUser(data.user)
      setSavedProfile({
        name: data.user.username,
        avatar: data.user.avatar as any,
        avatarUrl: null
      })
      toast.success('Accesso effettuato!')
      setLoginUsername('')
      setLoginPassword('')
    } catch {
      toast.error('Errore di connessione')
    }
    setLoginLoading(false)
  }

  const handleSignupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error('L\'immagine deve essere inferiore a 500KB')
        return
      }
      setSignupAvatarFile(file)
      setSignupAvatar(null) // Clear emoji avatar
      const reader = new FileReader()
      reader.onloadend = () => {
        setSignupAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginUsername.trim() || !loginPassword) return
    if (!signupAvatar && !signupAvatarFile) {
      toast.error('Seleziona un avatar o carica una foto profilo')
      return
    }

    setLoginLoading(true)
    try {
      let avatarUrl = null
      
      // If user uploaded a custom image, upload it first
      if (signupAvatarFile) {
        const formData = new FormData()
        formData.append('file', signupAvatarFile)
        formData.append('username', loginUsername)
        
        const uploadRes = await fetch('/api/upload-avatar', {
          method: 'POST',
          body: formData
        })
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          avatarUrl = uploadData.url
        }
      }
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: loginUsername, 
          password: loginPassword, 
          email: signupEmail || null,
          avatar: signupAvatar,
          avatarUrl: avatarUrl
        })
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Errore durante la registrazione')
        setLoginLoading(false)
        return
      }

      // Save user to localStorage and auto-login
      localStorage.setItem('guglioquiz_user', JSON.stringify(data.user))
      setUser(data.user)
      setSavedProfile({
        name: data.user.username,
        avatar: data.user.avatar as any,
        avatarUrl: data.user.avatar_url || null
      })
      toast.success('Registrazione completata!')
      setShowSignUp(false)
      setLoginUsername('')
      setLoginPassword('')
      setSignupEmail('')
      setSignupAvatar(null)
      setSignupAvatarUrl(null)
      setSignupAvatarFile(null)
    } catch {
      toast.error('Errore di connessione')
    }
    setLoginLoading(false)
  }

  const handleRequestReset = async () => {
    if (!loginUsername.trim()) {
      toast.error('Inserisci il tuo nome utente')
      return
    }
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername })
      })
      const data = await res.json()
      if (res.ok) {
        // Show message and proceed to code entry
        if (data.code) {
          // No email configured - show code directly
          toast.success(`Codice di reset: ${data.code}`)
        } else {
          // Email sent
          toast.success(data.message || 'Codice inviato! Controlla la tua email')
        }
        setResetStep('confirm')
      } else {
        toast.info(data.message || 'Se l\'utente esiste, riceverai un codice')
      }
    } catch {
      toast.error('Errore di connessione')
    }
    setLoginLoading(false)
  }

  const handleConfirmReset = async () => {
    if (!loginUsername.trim() || !resetCode.trim() || !newPassword.trim()) {
      toast.error('Compila tutti i campi')
      return
    }
    if (newPassword.length < 6) {
      toast.error('La password deve essere di almeno 6 caratteri')
      return
    }
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, code: resetCode, newPassword })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Password aggiornata! Ora puoi accedere')
        setShowResetPassword(false)
        setResetStep('request')
        setResetCode('')
        setNewPassword('')
      } else {
        toast.error(data.error || 'Errore durante il reset')
      }
    } catch {
      toast.error('Errore di connessione')
    }
    setLoginLoading(false)
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
    setPendingGameProfile((game.game_profile as 'timed' | 'untimed') || 'timed')
    setIsHost(false)
    setShowProfile(true)
  }

  const handleProfileSubmit = async (profile: PlayerProfile) => {
    setIsLoading(true)

    // Save profile to localStorage for future use
    localStorage.setItem('guglioquiz_saved_profile', JSON.stringify(profile))
    
    // Also update avatar in user record if logged in
    if (user) {
      const updatedUser = { ...user, avatar: profile.avatar }
      localStorage.setItem('guglioquiz_user', JSON.stringify(updatedUser))
      setUser(updatedUser)
    }

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

        // Double-check that game is still in lobby (not started)
        if (game.status !== 'lobby') {
          toast.error('La partita è già in corso, non puoi unirti')
          setIsLoading(false)
          setShowProfile(false)
          return
        }

        // Check for duplicate name, avatar or photo
        const existingPlayers = await getPlayers(game.id)
        const duplicateName = existingPlayers.some(p => p.name.toLowerCase() === profile.name.toLowerCase())
        if (duplicateName) {
          toast.error('Esiste già un giocatore con questo nome. Scegline un altro.')
          setIsLoading(false)
          return
        }
        
        if (profile.avatar) {
          const duplicateAvatar = existingPlayers.some(p => p.avatar === profile.avatar)
          if (duplicateAvatar) {
            toast.error('Esiste già un giocatore con questo avatar. Scegline un altro.')
            setIsLoading(false)
            return
          }
        }

        if (profile.avatarUrl) {
          const duplicatePhoto = existingPlayers.some(p => p.avatar_url === profile.avatarUrl)
          if (duplicatePhoto) {
            toast.error('Esiste già un giocatore con questa foto. Scegline un\'altra.')
            setIsLoading(false)
            return
          }
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
        
        // Show rules popup before going to lobby
        setPendingLobbyRedirect(`/lobby/${game.code}`)
        setShowRules(true)
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

      <div className="w-full max-w-md space-y-4 relative z-10">
        {/* Logo and tagline */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-balance">
            <span className="text-primary">Guglio</span>
            <span className="text-foreground">Quiz</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium text-pretty">
            Rispondi veloce. Vinci tutto.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-full border border-border">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">29 Argomenti</span>
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
                Crea Manche
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-3">
                Sei l&apos;host? Crea una nuova manche e invita i tuoi amici
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
                  className="h-14 px-8 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90"
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

        {/* Auth section */}
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            {user ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">Sei loggato come:</p>
                  <div className="flex flex-col items-center gap-2">
                    {user.avatar_url ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden">
                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                    ) : user.avatar && AVATAR_COLORS[user.avatar as AvatarId] ? (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${AVATAR_COLORS[user.avatar as AvatarId].bg}`}>
                        {AVATAR_ICONS[user.avatar as AvatarId]}
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-lg font-semibold text-foreground">
                      {user.username}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Link href="/friends">
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-1" />
                      Profilo
                    </Button>
                  </Link>
<Button
                  variant={pushEnabled ? "default" : pushDenied ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleTogglePush}
                  title={pushEnabled ? "Notifiche attive" : pushDenied ? "Notifiche bloccate - clicca per info" : "Attiva notifiche"}
                  >
                  {pushDenied ? (
                    <BellOff className="h-4 w-4" />
                  ) : (
                    <Bell className={`h-4 w-4 ${pushEnabled ? "text-primary-foreground" : ""}`} />
                  )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={showSignUp ? handleSignUp : handleLogin} className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-foreground">
                    {showSignUp ? 'Registrati' : 'Accedi'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {showSignUp ? 'Crea il tuo account GuglioQuiz' : 'Accedi al tuo account GuglioQuiz'}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Nome utente</label>
                    <Input
                      type="text"
                      placeholder="Il tuo nome utente"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="mt-1 h-12 text-base bg-input border-border text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Input
                      type="password"
                      placeholder="La tua password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="mt-1 h-12 text-base bg-input border-border text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                  
                  {/* Email field - only shown during signup */}
                  {showSignUp && (
                    <div>
                      <label className="text-sm font-medium text-foreground">Email (per recupero password)</label>
                      <Input
                        type="email"
                        placeholder="La tua email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="mt-1 h-12 text-base bg-input border-border text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Opzionale - usata solo per recuperare la password</p>
                    </div>
                  )}
                  
                  {/* Avatar selection - only shown during signup */}
                  {showSignUp && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          Scegli il tuo avatar <span className="text-destructive">*</span>
                        </label>
                        <div className="grid grid-cols-5 gap-2 mt-3">
                          {AVATARS.map((avatarId) => (
                            <button
                              key={avatarId}
                              type="button"
                              onClick={() => {
                                setSignupAvatar(avatarId)
                                setSignupAvatarUrl(null)
                                setSignupAvatarFile(null)
                              }}
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${AVATAR_COLORS[avatarId].bg} ${
                                signupAvatar === avatarId && !signupAvatarUrl
                                  ? 'ring-2 ring-primary ring-offset-1 ring-offset-card scale-110'
                                  : 'hover:scale-105'
                              }`}
                            >
                              {AVATAR_ICONS[avatarId]}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-sm text-muted-foreground">oppure</span>
                        <input
                          ref={signupFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleSignupFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => signupFileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Carica foto
                        </Button>
                        {signupAvatarUrl && (
                          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary">
                            <img
                              src={signupAvatarUrl}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90" 
                  disabled={loginLoading || !loginUsername.trim() || !loginPassword}
                >
                  {loginLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <LogIn className="h-5 w-5 mr-2" />
                  )}
                  {showSignUp ? 'Registrati' : 'Accedi'}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {showSignUp ? 'Hai gia un account? ' : 'Non hai un account? '}
                  <button
                    type="button"
                    onClick={() => setShowSignUp(!showSignUp)}
                    className="text-primary hover:underline font-medium"
                  >
                    {showSignUp ? 'Accedi' : 'Registrati'}
                  </button>
                </p>
                {!showSignUp && (
                  <p className="text-center text-sm">
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-muted-foreground hover:text-primary hover:underline"
                    >
                      Password dimenticata?
                    </button>
                  </p>
                )}
              </form>
            )}
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
            ? user ? 'Conferma il tuo profilo per iniziare' : 'Come host potrai configurare la partita'
            : user ? 'Conferma il tuo profilo per giocare' : 'Scegli un nome e un avatar per giocare'
        }
        initialProfile={user ? {
          name: user.username,
          avatar: (user.avatar as AvatarId) || null,
          avatarUrl: user.avatar_url || null
        } : savedProfile}
        lockedName={user?.username || null}
        lockedAvatar={!!user}
      />

      {/* Rules dialog for clients */}
      <RulesDialog open={showRules} onAccept={handleAcceptRules} gameProfile={pendingGameProfile} />
      
      {/* iOS PWA install prompt for push notifications */}
      <IOSInstallPrompt />
      
      {/* Password Reset Dialog */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">
                  {resetStep === 'request' ? 'Recupera Password' : 'Inserisci Codice'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {resetStep === 'request' 
                    ? 'Inserisci il tuo nome utente per ricevere un codice di reset'
                    : 'Inserisci il codice ricevuto e la nuova password'
                  }
                </p>
              </div>
              
              {resetStep === 'request' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Nome utente</label>
                    <Input
                      type="text"
                      placeholder="Il tuo nome utente"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleRequestReset} className="w-full" disabled={loginLoading}>
                    {loginLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Richiedi Codice
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Codice di reset</label>
                    <Input
                      type="text"
                      placeholder="123456"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Nuova password</label>
                    <Input
                      type="password"
                      placeholder="Almeno 6 caratteri"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleConfirmReset} className="w-full" disabled={loginLoading}>
                    {loginLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Cambia Password
                  </Button>
                </div>
              )}
              
              <div className="flex justify-between">
                {resetStep === 'confirm' && (
                  <Button variant="ghost" size="sm" onClick={() => setResetStep('request')}>
                    Indietro
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowResetPassword(false)
                    setResetStep('request')
                    setResetCode('')
                    setNewPassword('')
                  }}
                  className="ml-auto"
                >
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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
