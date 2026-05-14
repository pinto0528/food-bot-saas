import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processChatMessage } from '@/lib/chat'
import { logChatInteraction } from '@/lib/debug-logger'
import { logError } from '@/lib/webhook/errors'

export async function POST(request: Request) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const { message, restaurantId, cart, history } = body

    if (!message || !restaurantId) {
      return NextResponse.json({ error: 'message and restaurantId required' }, { status: 400 })
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const result = await processChatMessage(
      supabase,
      restaurant,
      message,
      cart || [],
      history || []
    )

    logChatInteraction({
      restaurantName: restaurant.name,
      userMessage: message,
      systemPrompt: result.systemPrompt,
      llmInput: result.llmInput,
      llmResponse: result.llmResponse,
      llmMs: result.llmMs,
      toolCalls: result.llmResponse?.toolCalls || [],
      cartBefore: cart || [],
      cartAfter: result.cart,
      reply: result.reply,
      action: result.action,
      invalidItems: result.invalidItems,
    })

    return NextResponse.json({
      reply: result.reply,
      action: result.action,
      cart: result.cart,
      history: result.history,
      debug: {
        llmInput: result.llmInput,
        llmResponse: result.llmResponse,
        llmMs: result.llmMs,
      },
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Chat error:', errMsg)
    return NextResponse.json({ error: errMsg, debug: null }, { status: 500 })
  }
}
