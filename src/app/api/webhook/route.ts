import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleIncomingMessage } from '@/lib/webhook/handler'
import { logError } from '@/lib/webhook/errors'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token) {
    const supabase = createAdminClient()
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('webhook_verify_token')
      .eq('webhook_verify_token', token)
      .single()

    if (restaurant) {
      return new NextResponse(challenge, { status: 200 })
    }
  }

  return new NextResponse('Verification failed', { status: 403 })
}

export async function POST(request: Request) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()

    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const metadata = value?.metadata
    const messages = value?.messages

    if (!metadata || !messages?.[0]) {
      return NextResponse.json({ ok: true })
    }

    const msg = messages[0]
    if (msg.type !== 'text') {
      return NextResponse.json({ ok: true })
    }

    await handleIncomingMessage(supabase, {
      phone_number_id: metadata.phone_number_id,
      from: msg.from,
      text: msg.text.body,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook error:', errMsg)
    await logError(supabase, null, 'webhook', errMsg, { error: errMsg })
  }

  return NextResponse.json({ ok: true })
}
