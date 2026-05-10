'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AVATARS, AVATAR_COLORS, AVATAR_ICONS, type AvatarId, type PlayerProfile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Upload, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (profile: PlayerProfile) => void
  title?: string
  description?: string
  initialProfile?: PlayerProfile | null
  lockedName?: string | null // If set, name is not editable (for logged-in users)
  lockedAvatar?: boolean // If true, avatar is not editable (for logged-in users)
}

export function ProfileDialog({
  open,
  onClose,
  onSubmit,
  title = 'Crea il tuo profilo',
  description = 'Scegli un nome e un avatar per giocare',
  initialProfile,
  lockedName,
  lockedAvatar = false,
}: ProfileDialogProps) {
  // Capitalize first letter of name
  const formatName = (n: string) => n.charAt(0).toUpperCase() + n.slice(1)
  const [name, setName] = useState(lockedName ? formatName(lockedName) : (initialProfile?.name || ''))
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>((initialProfile?.avatar as AvatarId) || null)
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(initialProfile?.avatarUrl || null)
  const [isChecking, setIsChecking] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update state when initialProfile or lockedName changes
  useEffect(() => {
    if (lockedName) {
      setName(formatName(lockedName))
    } else if (initialProfile) {
      setName(initialProfile.name || '')
    }
    if (initialProfile) {
      setSelectedAvatar((initialProfile.avatar as AvatarId) || null)
      setCustomAvatarUrl(initialProfile.avatarUrl || null)
    }
  }, [initialProfile, lockedName])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCustomAvatarUrl(reader.result as string)
        setSelectedAvatar(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    if (!selectedAvatar && !customAvatarUrl) return

    // If user is not logged in (no lockedName), check if username is already taken
    if (!lockedName) {
      setIsChecking(true)
      try {
        const response = await fetch('/api/auth/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: name.trim() })
        })
        const data = await response.json()
        
        if (data.exists) {
          toast.error('Questo nome utente e gia registrato. Scegli un altro nome o effettua il login.')
          setIsChecking(false)
          return
        }
      } catch (error) {
        // If check fails, proceed anyway
        console.error('Username check failed:', error)
      }
      setIsChecking(false)
    }

    onSubmit({
      name: name.trim(),
      avatar: selectedAvatar,
      avatarUrl: customAvatarUrl,
    })
  }

  const isValid = name.trim().length > 0 && (selectedAvatar || customAvatarUrl)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Nome utente</Label>
            {lockedName ? (
              <div className="space-y-1">
                <p className="text-foreground font-medium text-lg">{name}</p>
                <p className="text-xs text-muted-foreground">Nome utente associato al tuo account</p>
              </div>
            ) : (
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Inserisci il tuo nome utente..."
                maxLength={20}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            )}
          </div>

          {/* Avatar selection */}
          <div className="space-y-3">
            <Label className="text-foreground">
              {lockedAvatar ? 'Il tuo avatar' : 'Scegli un avatar'}
            </Label>
            {lockedAvatar && (initialProfile?.avatar || initialProfile?.avatarUrl) ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center text-3xl',
                    initialProfile?.avatar ? AVATAR_COLORS[initialProfile.avatar as AvatarId].bg : 'bg-border'
                  )}
                >
                  {initialProfile?.avatarUrl ? (
                    <img
                      src={initialProfile.avatarUrl}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : initialProfile?.avatar ? (
                    AVATAR_ICONS[initialProfile.avatar as AvatarId]
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Puoi modificare l&apos;avatar nella tua area privata
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {AVATARS.map((avatarId) => (
                  <button
                    key={avatarId}
                    type="button"
                    onClick={() => {
                      if (!lockedAvatar) {
                        setSelectedAvatar(avatarId)
                        setCustomAvatarUrl(null)
                      }
                    }}
                    disabled={lockedAvatar}
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all',
                      AVATAR_COLORS[avatarId].bg,
                      selectedAvatar === avatarId
                        ? 'ring-4 ring-primary ring-offset-2 ring-offset-card scale-110'
                        : 'hover:scale-105',
                      lockedAvatar && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {AVATAR_ICONS[avatarId]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom photo upload - hidden if avatar is locked */}
          {!lockedAvatar && (
            <div className="space-y-3">
              <Label className="text-foreground">Oppure carica una foto</Label>
              <div className="flex items-center gap-4">
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
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Carica foto
                </Button>
                {customAvatarUrl && (
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-4 ring-primary ring-offset-2 ring-offset-card">
                    <img
                      src={customAvatarUrl}
                      alt="Avatar personalizzato"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-xl">
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center text-3xl',
                selectedAvatar ? AVATAR_COLORS[selectedAvatar].bg : 'bg-border'
              )}
            >
              {customAvatarUrl ? (
                <img
                  src={customAvatarUrl}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : selectedAvatar ? (
                AVATAR_ICONS[selectedAvatar]
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">
                {name || 'Il tuo nome'}
              </p>
              <p className="text-sm text-muted-foreground">Pronto a giocare!</p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || isChecking}
          size="lg"
          className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isChecking ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Verifica...
            </>
          ) : (
            'Continua'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
