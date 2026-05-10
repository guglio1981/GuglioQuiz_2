import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { username, email } = await request.json()

    if (!username && !email) {
      return NextResponse.json(
        { error: 'Nome utente o email obbligatorio' },
        { status: 400 }
      )
    }

    // Find user by username or email
    let query = supabase.from('app_users').select('id, username, email')
    
    if (username) {
      query = query.eq('username', username.toLowerCase())
    } else if (email) {
      query = query.eq('email', email.toLowerCase())
    }
    
    const { data: user, error } = await query.single()

    if (error || !user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        message: 'Se l\'utente esiste, riceverai un codice di reset' 
      })
    }
    
    // Check if user has an email set
    const hasEmail = !!user.email

    // Generate reset token (6 digit code)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString()
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store reset token
    await supabase
      .from('password_resets')
      .upsert({
        user_id: user.id,
        token: resetToken,
        code: resetCode,
        expires_at: expiresAt.toISOString(),
        used: false
      }, { onConflict: 'user_id' })

    // If user has email, send the code via email
    if (hasEmail && user.email) {
      try {
        await resend.emails.send({
          from: 'GuglioQuiz <onboarding@resend.dev>',
          to: user.email,
          subject: 'Codice di recupero password - GuglioQuiz',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6366f1;">Recupero Password GuglioQuiz</h2>
              <p>Ciao <strong>${user.username}</strong>,</p>
              <p>Hai richiesto di reimpostare la tua password. Usa il seguente codice:</p>
              <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${resetCode}</span>
              </div>
              <p>Il codice scade tra <strong>15 minuti</strong>.</p>
              <p>Se non hai richiesto tu questo reset, ignora questa email.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">GuglioQuiz - Il quiz multiplayer</p>
            </div>
          `
        })
        
        return NextResponse.json({ 
          message: `Codice inviato a ${user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`,
          hasEmail: true
        })
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // If email fails, fall back to showing the code
        return NextResponse.json({ 
          message: 'Errore nell\'invio email. Ecco il codice:',
          code: resetCode,
          hasEmail: true
        })
      }
    }
    
    // No email configured - show code directly (for demo/testing)
    return NextResponse.json({ 
      message: 'Nessuna email configurata per questo account',
      code: resetCode,
      hasEmail: false
    })
  } catch (error) {
    console.error('Reset password request error:', error)
    return NextResponse.json(
      { error: 'Errore durante la richiesta di reset' },
      { status: 500 }
    )
  }
}
