import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ exists: false })
    }

    // Check if username exists in app_users table
    const { data, error } = await supabase
      .from('app_users')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Error checking username:', error)
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({ exists: !!data })
  } catch (error) {
    console.error('Check username error:', error)
    return NextResponse.json({ exists: false })
  }
}
