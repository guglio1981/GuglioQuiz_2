import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { username, code, newPassword } = await request.json()

    if (!username || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Tutti i campi sono obbligatori' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La password deve essere di almeno 6 caratteri' },
        { status: 400 }
      )
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Verify reset code
    const { data: resetData, error: resetError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (resetError || !resetData) {
      return NextResponse.json(
        { error: 'Codice non valido o scaduto' },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    const { error: updateError } = await supabase
      .from('app_users')
      .update({ password_hash: passwordHash })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Errore durante l\'aggiornamento della password' },
        { status: 500 }
      )
    }

    // Mark reset code as used
    await supabase
      .from('password_resets')
      .update({ used: true })
      .eq('id', resetData.id)

    return NextResponse.json({ message: 'Password aggiornata con successo' })
  } catch (error) {
    console.error('Reset password confirm error:', error)
    return NextResponse.json(
      { error: 'Errore durante il reset della password' },
      { status: 500 }
    )
  }
}
