import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@guglioquiz.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: Request) {
  try {
    const { hostId, gameCode, hostName } = await request.json()

    if (!hostId || !gameCode) {
      return NextResponse.json(
        { error: 'Host ID e codice partita sono obbligatori' },
        { status: 400 }
      )
    }

    // Get all push subscriptions for registered users (except the host)
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription, user_id')
      .not('user_id', 'is', null)
      .neq('user_id', hostId)

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json(
        { error: 'Errore nel recupero delle iscrizioni' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ 
        sent: 0, 
        message: 'Nessun utente registrato con notifiche attive' 
      })
    }

    const payload = JSON.stringify({
      title: 'GuglioQuiz - Nuova Partita!',
      body: `${hostName || 'Un utente'} ti ha invitato a giocare!`,
      icon: '/icon-192.png',
      badge: '/favicon.png',
      data: {
        url: `/join/${gameCode}`,
        gameCode
      }
    })

    let sent = 0
    let failed = 0

    // Send notifications to all subscribed users
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            JSON.parse(sub.subscription),
            payload
          )
          sent++
        } catch (err: any) {
          console.error('Push notification error:', err)
          failed++
          
          // Remove invalid subscriptions
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('subscription', sub.subscription)
          }
        }
      })
    )

    return NextResponse.json({ 
      sent, 
      failed,
      total: subscriptions.length,
      message: `Notifiche inviate a ${sent} utenti` 
    })
  } catch (error) {
    console.error('Broadcast notification error:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'invio delle notifiche' },
      { status: 500 }
    )
  }
}
