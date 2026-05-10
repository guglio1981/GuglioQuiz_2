import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { username, password, email, avatar, avatarUrl } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Nome utente e password sono obbligatori' },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Il nome utente deve avere almeno 3 caratteri' },
        { status: 400 }
      )
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'La password deve avere almeno 4 caratteri' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Nome utente gia in uso' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const { data: newUser, error } = await supabase
      .from('app_users')
      .insert({
        username: username.toLowerCase(),
        password_hash: passwordHash,
        email: email || null,
        avatar: avatar || null,
        avatar_url: avatarUrl || null
      })
      .select('id, username, avatar, avatar_url, email')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: 'Errore durante la registrazione' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: newUser })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
