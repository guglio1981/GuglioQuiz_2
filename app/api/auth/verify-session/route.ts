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
      // Missing data - assume valid to avoid false disconnects
      return NextResponse.json({ valid: true })
    }

    // Check if session token matches
    const { data: user, error } = await supabase
      .from('app_users')
      .select('session_token')
      .eq('id', userId)
      .single()

    if (error || !user) {
      // DB error or user not found - assume valid to avoid false disconnects
      console.error('Session verify DB error:', error)
      return NextResponse.json({ valid: true })
    }

    // Only return invalid if we can confirm tokens don't match
    // and both tokens exist (not null/undefined)
    if (user.session_token && sessionToken && user.session_token !== sessionToken) {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Session verify error:', error)
    // On any error, assume valid to avoid false disconnects
    return NextResponse.json({ valid: true })
  }
}
