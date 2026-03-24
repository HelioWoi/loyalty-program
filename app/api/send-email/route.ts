import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key-for-build')

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured at runtime
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'dummy-key-for-build') {
      return NextResponse.json({ error: 'Email service not configured. Please add RESEND_API_KEY to environment variables.' }, { status: 503 })
    }

    const { recipients, subject, message, fromEmail } = await request.json()
    
    if (!recipients || !subject || !message || !fromEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const results = await Promise.allSettled(
      recipients.map(async (recipient: { email: string; name: string }) => {
        const personalizedMessage = message.replace(/{name}/g, recipient.name)
        
        return await resend.emails.send({
          from: fromEmail,
          to: [recipient.email],
          subject,
          html: personalizedMessage.replace(/\n/g, '<br>')
        })
      })
    )
    
    const success = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    return NextResponse.json({ success, failed, total: recipients.length })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
  }
}
