import { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../database.types'
import type { ConversationMessage, OrderItem } from '../types'
import { buildSystemPrompt, buildGreetingPrompt } from '../prompts'
import { processWithLLM } from '../llm'
import { executeAction } from '../actions'
import { sendWhatsAppMessage } from '../whatsapp'
import { notifyRestaurant, buildConfirmationToCustomer } from './notifications'
import { logError } from './errors'

interface WebhookPayload {
  phone_number_id: string
  from: string
  text: string
}

export async function handleIncomingMessage(
  supabase: SupabaseClient<Database>,
  payload: WebhookPayload
) {
  const { phone_number_id, from, text } = payload

  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('phone_number_id', phone_number_id)
    .single()

  if (restError || !restaurant) {
    await logError(supabase, null, 'webhook', 'Restaurant not found', {
      phone_number_id,
      from,
    })
    return
  }

  if (restaurant.status === 'suspended') return

  if (from === restaurant.phone) {
    await handleRestaurantResponse(supabase, restaurant, text)
    return
  }

  const { data: existingConv } = await supabase
    .from('conversations')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('customer_phone', from)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let conversation = existingConv || null

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        restaurant_id: restaurant.id,
        customer_phone: from,
        status: 'ordering',
        messages: [],
        context: { items: [] },
      })
      .select()
      .single()

    conversation = newConv || null
    if (!conversation) {
      await logError(supabase, restaurant.id, 'webhook', 'Failed to create conversation', { from })
      return
    }
  }

  if (conversation.status === 'closed') {
    await supabase
      .from('conversations')
      .update({ status: 'ordering', context: { items: [] }, messages: [], updated_at: new Date().toISOString() })
      .eq('id', conversation.id)
    conversation.status = 'ordering'
    conversation.context = { items: [] }
    conversation.messages = []
  }

  const userMessage: ConversationMessage = {
    role: 'user',
    content: text,
    timestamp: new Date().toISOString(),
  }
  const existingMessages = Array.isArray(conversation.messages) ? (conversation.messages as unknown as ConversationMessage[]) : []
  const messages = [...existingMessages, userMessage]

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('name, description, price, category')
    .eq('restaurant_id', restaurant.id)
    .eq('available', true)

  if (!menuItems || menuItems.length === 0) {
    const reply = 'El menu no esta disponible en este momento. Por favor intenta mas tarde.'
    await sendWhatsAppMessage(restaurant.waba_token || '', restaurant.phone_number_id || '', from, reply)
    const assistantMsg: ConversationMessage = { role: 'assistant', content: reply, timestamp: new Date().toISOString() }
    await supabase
      .from('conversations')
      .update({ messages: [...messages, assistantMsg] as unknown as Json, updated_at: new Date().toISOString() })
      .eq('id', conversation.id)
    return
  }

  const convContext = (typeof conversation.context === 'object' && conversation.context !== null
    ? conversation.context as unknown as { items?: OrderItem[] }
    : { items: [] })

  const isFirstMessage = messages.length <= 1
  const systemPrompt = isFirstMessage
    ? buildGreetingPrompt(restaurant, menuItems)
    : buildSystemPrompt(restaurant, menuItems, convContext, messages.slice(0, -1) as ConversationMessage[])

  const llmInput = [
    { role: 'system', content: systemPrompt },
    ...(isFirstMessage ? [] : messages.slice(-10).map((m: any) => ({ role: m.role, content: m.content }))),
  ]

  const llmResponse = await processWithLLM(llmInput)

  if (!llmResponse) {
    const fallback = 'Estoy procesando tu pedido, un momento por favor.'
    await sendWhatsAppMessage(restaurant.waba_token || '', restaurant.phone_number_id || '', from, fallback)
    await logError(supabase, restaurant.id, 'llm', 'LLM returned null response', { from, text })
    return
  }

  // Save current cart state before executeAction (confirm_order clears it)
  const currentItems: OrderItem[] = convContext.items || []

  await executeAction(supabase, llmResponse, conversation, restaurant)

  const replyText = llmResponse.content
  await sendWhatsAppMessage(restaurant.waba_token || '', restaurant.phone_number_id || '', from, replyText)

  const hasConfirm = llmResponse.toolCalls.some((tc) => tc.name === 'confirm_order')
  if (hasConfirm) {
    const total = currentItems.reduce((sum, i) => sum + i.price * i.qty, 0)
    await notifyRestaurant(
      restaurant.waba_token || '',
      restaurant.phone_number_id || '',
      restaurant.phone,
      from,
      currentItems,
      total
    )
  }

  const assistantMsg: ConversationMessage = {
    role: 'assistant',
    content: replyText,
    timestamp: new Date().toISOString(),
  }
  await supabase
    .from('conversations')
    .update({ messages: [...messages, assistantMsg] as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', conversation.id)
}

async function handleRestaurantResponse(
  supabase: SupabaseClient<Database>,
  restaurant: any,
  text: string
) {
  const trimmed = text.trim()

  const { data: order } = await supabase
    .from('orders')
    .select('*, conversations!inner(customer_phone)')
    .eq('restaurant_id', restaurant.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!order) return

  if (trimmed === '1') {
    await supabase
      .from('orders')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', order.id)

    const confirmation = buildConfirmationToCustomer(
      order.items as any[],
      order.total
    )
    await sendWhatsAppMessage(
      restaurant.waba_token || '',
      restaurant.phone_number_id || '',
      (order as any).conversations?.customer_phone || '',
      confirmation
    )
  } else if (trimmed === '2') {
    await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', order.id)

    await sendWhatsAppMessage(
      restaurant.waba_token || '',
      restaurant.phone_number_id || '',
      (order as any).conversations?.customer_phone || '',
      'Tu pedido fue cancelado. Si necesitas ayuda, escribe de nuevo.'
    )
  } else if (trimmed === '3') {
    const customerPhone = (order as any).conversations?.customer_phone
    if (customerPhone) {
      await sendWhatsAppMessage(
        restaurant.waba_token || '',
        restaurant.phone_number_id || '',
        restaurant.phone,
        `Numero del cliente: ${customerPhone}`
      )
    }
  }
}
