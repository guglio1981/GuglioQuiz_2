'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AVATAR_COLORS, AVATAR_ICONS, type AvatarId } from '@/lib/types'
import { toast } from 'sonner'
import { UserPlus, Users, Check, Send } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AppUser {
  id: string
  username: string
  avatar: AvatarId | null
}

interface InviteFriendsModalProps {
  gameCode: string
}

export function InviteFriendsModal({ gameCode }: InviteFriendsModalProps) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<AppUser[]>([])
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set())
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<AppUser | null>(null)

  useEffect(() => {
    if (open) {
      loadFriends()
    }
  }, [open])

  const loadFriends = async () => {
    setIsLoading(true)

    // Get user from localStorage
    const storedUser = localStorage.getItem('guglioquiz_user')
    if (!storedUser) {
      setIsLoading(false)
      return
    }

    try {
      const userData = JSON.parse(storedUser)
      setUser(userData)

      // Get accepted friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select(`
          id,
          requester_id,
          addressee_id,
          requester:app_users!friendships_requester_id_fkey(id, username, avatar),
          addressee:app_users!friendships_addressee_id_fkey(id, username, avatar)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userData.id},addressee_id.eq.${userData.id}`)

      if (friendships) {
        const friendsList = friendships.map((f: any) => {
          return f.requester_id === userData.id ? f.addressee : f.requester
        })
        setFriends(friendsList as AppUser[])
      }
    } catch {
      // Invalid user data
    }

    setIsLoading(false)
  }

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev)
      if (newSet.has(friendId)) {
        newSet.delete(friendId)
      } else {
        newSet.add(friendId)
      }
      return newSet
    })
  }

  const sendInvites = async () => {
    if (selectedFriends.size === 0 || !user) return

    setIsSending(true)

    try {
      const res = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedFriends),
          title: 'Invito a partita!',
          body: `${user.username} ti ha invitato a giocare a GuglioQuiz!`,
          url: `/join/${gameCode}`,
          gameCode: gameCode
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Inviti inviati a ${data.sent} amici!`)
        setOpen(false)
        setSelectedFriends(new Set())
      } else {
        toast.error('Errore nell\'invio degli inviti')
      }
    } catch {
      toast.error('Errore di connessione')
    }

    setIsSending(false)
  }

  const renderAvatar = (userObj: AppUser) => {
    if (userObj.avatar && AVATAR_COLORS[userObj.avatar as AvatarId]) {
      const emoji = AVATAR_ICONS[userObj.avatar as AvatarId]
      const colors = AVATAR_COLORS[userObj.avatar as AvatarId]
      return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${colors.bg}`}>
          {emoji}
        </div>
      )
    }
    return (
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Users className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          title="Invita amici"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invita amici</DialogTitle>
          <DialogDescription>
            Invia una notifica ai tuoi amici per invitarli alla partita
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !user ? (
            <p className="text-center text-muted-foreground py-4">
              Devi effettuare il login per invitare amici
            </p>
          ) : friends.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Non hai ancora amici. Aggiungili dalla pagina Amici!
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {friends.map(friend => {
                  const isSelected = selectedFriends.has(friend.id)
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${isSelected
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {renderAvatar(friend)}
                        <span className="font-medium">{friend.username}</span>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>

              <Button
                onClick={sendInvites}
                disabled={selectedFriends.size === 0 || isSending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? 'Invio in corso...' : `Invia inviti (${selectedFriends.size})`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
