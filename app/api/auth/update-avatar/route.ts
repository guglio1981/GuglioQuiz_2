import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, avatar, avatarUrl } = await request.json()

    if (!userId || (!avatar && !avatarUrl)) {
      return NextResponse.json(
        { error: 'ID utente e avatar/immagine sono obbligatori' },
        { status: 400 }
      )
    }

    // Build update object - if avatarUrl is set, clear avatar and vice versa
    const updateData: { avatar?: string | null; avatar_url?: string | null } = {}
    if (avatarUrl) {
      updateData.avatar_url = avatarUrl
      updateData.avatar = null
    } else if (avatar) {
      updateData.avatar = avatar
      updateData.avatar_url = null
    }

    const { data: updatedUser, error } = await supabase
      .from('app_users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, avatar, avatar_url')
      .single()

    if (error) {
      console.error('Error updating avatar:', error)
      return NextResponse.json(
        { error: 'Errore durante l\'aggiornamento dell\'avatar' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Update avatar error:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
