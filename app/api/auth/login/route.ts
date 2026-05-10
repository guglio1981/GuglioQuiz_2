import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Nome utente e password sono obbligatori' },
        { status: 400 }
      )
    }

    // Find user
    const { data: user, error } = await supabase
      .from('app_users')
      .select('id, username, avatar, avatar_url, email, password_hash')
      .eq('username', username.toLowerCase())
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Nome utente o password errati' },
        { status: 401 }
      )
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash)

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Nome utente o password errati' },
        { status: 401 }
      )
    }

    // Generate new session token - this invalidates previous sessions
    const sessionToken = crypto.randomUUID()
    
    // Update user with new session token
    await supabase
      .from('app_users')
      .update({ session_token: sessionToken })
      .eq('id', user.id)

    // Return user without password hash, with session token
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        avatar_url: user.avatar_url,
        email: user.email,
        session_token: sessionToken
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
