import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const playerId = searchParams.get('playerId')

  if (!playerId) {
    return NextResponse.json({ error: 'Missing playerId' }, { status: 400 })
  }

  // Check if player is host - don't remove host
  const { data: player } = await supabase
    .from('players')
    .select('is_host')
    .eq('id', playerId)
    .single()

  if (player?.is_host) {
    return NextResponse.json({ message: 'Host cannot be removed' })
  }

  // Delete the player
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// Also support POST for sendBeacon
export async function POST(request: Request) {
  return GET(request)
}
