import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, sessionToken } = await request.json()

    if (!userId || !sessionToken) {
      return NextResponse.json(
        { error: 'Parametri mancanti' },
        { status: 400 }
      )
    }

    // Verify user and session token
    const { data: user, error: verifyError } = await supabase
      .from('app_users')
      .select('id')
      .eq('id', userId)
      .eq('session_token', sessionToken)
      .single()

    if (verifyError || !user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    // Delete user
    const { error: deleteError } = await supabase
      .from('app_users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json(
        { error: 'Errore durante l\'eliminazione del profilo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete profile error:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
