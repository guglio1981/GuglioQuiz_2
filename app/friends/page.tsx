'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, Check, Users, Edit2, Loader2, Upload } from 'lucide-react'
import { AVATAR_COLORS, AVATAR_ICONS, AVATARS, type AvatarId } from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AppUser {
  id: string
  username: string
  avatar: AvatarId | null
  avatar_url?: string | null
  email?: string | null
}

export default function FriendsPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(null)
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null)
  const [customAvatarFile, setCustomAvatarFile] = useState<File | null>(null)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [isSavingEmail, setIsSavingEmail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    // Check auth from localStorage
    const storedUser = localStorage.getItem('guglioquiz_user')
    if (!storedUser) {
      toast.error('Devi effettuare il login')
      router.push('/')
      return
    }
    try {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setUserEmail(userData.email || '')
      setIsLoading(false)
    } catch {
      router.push('/')
    }
  }, [router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error('L\'immagine deve essere inferiore a 500KB')
        return
      }
      setCustomAvatarFile(file)
      setSelectedAvatar(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCustomAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateEmail = async () => {
    if (!user) return
    
    // Basic email validation
    if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      toast.error('Inserisci un\'email valida')
      return
    }
    
    setIsSavingEmail(true)
    try {
      const res = await fetch('/api/auth/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: userEmail || null })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        toast.error(data.error || 'Errore durante l\'aggiornamento')
        return
      }
      
      // Update local state and localStorage
      const updatedUser = { ...user, email: userEmail || null }
      setUser(updatedUser)
      localStorage.setItem('guglioquiz_user', JSON.stringify(updatedUser))
      
      toast.success(userEmail ? 'Email aggiornata!' : 'Email rimossa')
      setIsEditingEmail(false)
    } catch {
      toast.error('Errore di connessione')
    } finally {
      setIsSavingEmail(false)
    }
  }

  const handleUpdateAvatar = async () => {
    if (!user || (!selectedAvatar && !customAvatarFile)) return
    
    setIsSavingAvatar(true)
    try {
      let uploadedAvatarUrl = null
      
      // If custom image, upload it first
      if (customAvatarFile) {
        const formData = new FormData()
        formData.append('file', customAvatarFile)
        formData.append('username', user.username)
        
        const uploadRes = await fetch('/api/upload-avatar', {
          method: 'POST',
          body: formData
        })
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          uploadedAvatarUrl = uploadData.url
        } else {
          toast.error('Errore durante il caricamento dell\'immagine')
          setIsSavingAvatar(false)
          return
        }
      }
      
      const res = await fetch('/api/auth/update-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          avatar: selectedAvatar,
          avatarUrl: uploadedAvatarUrl
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        toast.error(data.error || 'Errore durante l\'aggiornamento')
        return
      }
      
      // Update local state and localStorage
      const updatedUser = { 
        ...user, 
        avatar: selectedAvatar || null,
        avatar_url: uploadedAvatarUrl || null
      }
      setUser(updatedUser)
      localStorage.setItem('guglioquiz_user', JSON.stringify(updatedUser))
      
      // Also update saved profile if exists
      const savedProfile = localStorage.getItem('guglioquiz_saved_profile')
      if (savedProfile) {
        const profile = JSON.parse(savedProfile)
        profile.avatar = selectedAvatar || null
        profile.avatarUrl = uploadedAvatarUrl || null
        localStorage.setItem('guglioquiz_saved_profile', JSON.stringify(profile))
      }
      
      toast.success('Profilo aggiornato!')
      setIsEditingAvatar(false)
      setCustomAvatarUrl(null)
      setCustomAvatarFile(null)
    } catch {
      toast.error('Errore di connessione')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Il tuo profilo</h1>
        </div>

        {/* Profile / Avatar section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Modifica il tuo avatar o immagine profilo</CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditingAvatar ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {user?.avatar_url ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  ) : user?.avatar && AVATAR_COLORS[user.avatar as AvatarId] ? (
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${AVATAR_COLORS[user.avatar as AvatarId].bg}`}>
                      {AVATAR_ICONS[user.avatar as AvatarId]}
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-lg text-foreground">{user?.username}</p>
                    <p className="text-xs text-muted-foreground">Nome utente</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedAvatar(user?.avatar as AvatarId || null)
                    setCustomAvatarUrl(null)
                    setCustomAvatarFile(null)
                    setIsEditingAvatar(true)
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Scegli un avatar:</p>
                <div className="grid grid-cols-5 gap-3">
                  {AVATARS.map((avatarId) => (
                    <button
                      key={avatarId}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(avatarId)
                        setCustomAvatarUrl(null)
                        setCustomAvatarFile(null)
                      }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${AVATAR_COLORS[avatarId].bg} ${
                        selectedAvatar === avatarId && !customAvatarUrl
                          ? 'ring-4 ring-primary ring-offset-2 ring-offset-card scale-110'
                          : 'hover:scale-105'
                      }`}
                    >
                      {AVATAR_ICONS[avatarId]}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">oppure carica un&apos;immagine:</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Carica foto
                  </Button>
                  {customAvatarUrl && (
                    <div className="w-12 h-12 rounded-full overflow-hidden ring-4 ring-primary">
                      <img src={customAvatarUrl} alt="Anteprima" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditingAvatar(false)
                      setCustomAvatarUrl(null)
                      setCustomAvatarFile(null)
                    }}
                    disabled={isSavingAvatar}
                  >
                    Annulla
                  </Button>
                  <Button 
                    onClick={handleUpdateAvatar}
                    disabled={isSavingAvatar || (!selectedAvatar && !customAvatarFile)}
                  >
                    {isSavingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Salva
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email for password recovery */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email per recupero password</CardTitle>
            <CardDescription>Aggiungi un&apos;email per poter recuperare la password in caso di smarrimento</CardDescription>
          </CardHeader>
          <CardContent>
            {!isEditingEmail ? (
              <div className="flex items-center justify-between">
                <div>
                  {user?.email ? (
                    <p className="text-foreground">{user.email}</p>
                  ) : (
                    <p className="text-muted-foreground">Nessuna email configurata</p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setUserEmail(user?.email || '')
                    setIsEditingEmail(true)
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {user?.email ? 'Modifica' : 'Aggiungi'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="La tua email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    L&apos;email viene usata solo per il recupero password
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditingEmail(false)
                      setUserEmail(user?.email || '')
                    }}
                    disabled={isSavingEmail}
                  >
                    Annulla
                  </Button>
                  <Button 
                    onClick={handleUpdateEmail}
                    disabled={isSavingEmail}
                  >
                    {isSavingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Salva
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        </div>
    </main>
  )
}
