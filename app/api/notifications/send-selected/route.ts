import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  'mailto:info@guglioquiz.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userIds, gameCode, hostName } = await request.json()
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Nessun utente selezionato' },
        { status: 400 }
      )
    }
    
    if (!gameCode) {
      return NextResponse.json(
        { error: 'Codice partita mancante' },
        { status: 400 }
      )
    }
    
    // Get subscriptions for selected users
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)
    
    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json(
        { error: 'Errore nel recupero delle sottoscrizioni' },
        { status: 500 }
      )
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'Nessuna sottoscrizione trovata per gli utenti selezionati' },
        { status: 404 }
      )
    }
    
    // Get the origin from the request headers
    const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/$/, '').split('/').slice(0, 3).join('/') || ''
    
    const payload = JSON.stringify({
      title: 'Invito a GuglioQuiz!',
      body: `${hostName} ti ha invitato a giocare! Clicca per entrare direttamente nella partita.`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        gameCode
      }
    })
    
    let successCount = 0
    let failCount = 0
    
    // Send notifications to all selected users' subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          payload
        )
        successCount++
      } catch (err: unknown) {
        const error = err as { statusCode?: number }
        console.error('Error sending notification:', error)
        failCount++
        
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        }
      }
    })
    
    await Promise.all(sendPromises)
    
    if (successCount === 0) {
      return NextResponse.json(
        { error: 'Nessuna notifica inviata con successo' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: `Notifica inviata a ${successCount} utent${successCount === 1 ? 'e' : 'i'}`,
      success: successCount,
      failed: failCount
    })
  } catch (error) {
    console.error('Error in send-selected:', error)
    return NextResponse.json(
      { error: 'Errore nell\'invio delle notifiche' },
      { status: 500 }
    )
  }
}
