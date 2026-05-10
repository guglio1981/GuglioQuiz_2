import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Get all users who have push subscriptions (notifications enabled)
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id')
    
    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return NextResponse.json({ users: [] })
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ users: [] })
    }
    
    // Get unique user IDs
    const userIds = [...new Set(subscriptions.map(s => s.user_id).filter(Boolean))]
    
    if (userIds.length === 0) {
      return NextResponse.json({ users: [] })
    }
    
    // Get user details
    const { data: users, error: userError } = await supabase
      .from('app_users')
      .select('id, username, avatar, avatar_url')
      .in('id', userIds)
    
    if (userError) {
      console.error('Error fetching users:', userError)
      return NextResponse.json({ users: [] })
    }
    
    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Error in notifications/users:', error)
    return NextResponse.json({ users: [] })
  }
}
