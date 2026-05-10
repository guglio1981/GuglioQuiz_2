'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AVATARS, AVATAR_COLORS, AVATAR_ICONS, type AvatarId, type PlayerProfile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Upload, User } from 'lucide-react'

interface ProfileDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (profile: PlayerProfile) => void
  title?: string
  description?: string
  initialProfile?: PlayerProfile | null
}

export function ProfileDialog({
  open,
  onClose,
  onSubmit,
  title = 'Crea il tuo profilo',
  description = 'Scegli un nome e un avatar per giocare',
  initialProfile,
}: ProfileDialogProps) {
  const [name, setName] = useState(initialProfile?.name || '')
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(initialProfile?.avatar || null)
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(initialProfile?.avatarUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update state when initialProfile changes
  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name || '')
      setSelectedAvatar(initialProfile.avatar || null)
      setCustomAvatarUrl(initialProfile.avatarUrl || null)
    }
  }, [initialProfile])

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

  const handleSubmit = () => {
    if (!name.trim()) return
    if (!selectedAvatar && !customAvatarUrl) return

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
            <Label htmlFor="name" className="text-foreground">Nome giocatore</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inserisci il tuo nome..."
              maxLength={20}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Avatar selection */}
          <div className="space-y-3">
            <Label className="text-foreground">Scegli un avatar</Label>
            <div className="grid grid-cols-5 gap-3">
              {AVATARS.map((avatarId) => (
                <button
                  key={avatarId}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(avatarId)
                    setCustomAvatarUrl(null)
                  }}
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all',
                    AVATAR_COLORS[avatarId].bg,
                    selectedAvatar === avatarId
                      ? 'ring-4 ring-primary ring-offset-2 ring-offset-card scale-110'
                      : 'hover:scale-105'
                  )}
                >
                  {AVATAR_ICONS[avatarId]}
                </button>
              ))}
            </div>
          </div>

          {/* Custom photo upload */}
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
          disabled={!isValid}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="lg"
        >
          Continua
        </Button>
      </DialogContent>
    </Dialog>
  )
}
