import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utente obbligatorio' },
        { status: 400 }
      )
    }

    // Update user email
    const { data: updatedUser, error } = await supabase
      .from('app_users')
      .update({ email: email || null })
      .eq('id', userId)
      .select('id, username, avatar, avatar_url, email')
      .single()

    if (error) {
      console.error('Update email error:', error)
      return NextResponse.json(
        { error: 'Errore durante l\'aggiornamento' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Update email error:', error)
    return NextResponse.json(
      { error: 'Errore del server' },
      { status: 500 }
    )
  }
}
