import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import type { ConversationMessage, OrderItem, ToolCall } from './types'
import { buildSystemPrompt, buildGreetingPrompt } from './prompts'
import { processWithLLM } from './llm'

interface MenuItemInfo {
  name: string
  price: number
}

export interface ProcessResult {
  reply: string
  action: string
  cart: OrderItem[]
  history: ConversationMessage[]
  systemPrompt: string
  llmInput: { role: string; content: string }[]
  llmResponse: { content: string; toolCalls: ToolCall[] } | null
  llmMs: number
  invalidItems: string[]
}

const ACTION_MAP: Record<string, string> = {
  add_to_cart: 'add_item',
  remove_from_cart: 'remove_item',
  set_cart: 'set_item',
  show_summary: 'show_summary',
  confirm_order: 'confirm_order',
  cancel_order: 'cancel',
}

function lookupPrice(menuItems: MenuItemInfo[], name: string): number {
  const match = menuItems.find((m) => m.name.toLowerCase() === name.toLowerCase())
  return match?.price || 0
}

function lookupName(menuItems: MenuItemInfo[], name: string): string | null {
  const match = menuItems.find((m) => m.name.toLowerCase() === name.toLowerCase())
  return match?.name || null
}

export async function processChatMessage(
  supabase: SupabaseClient<Database>,
  restaurant: any,
  message: string,
  cart: OrderItem[],
  history: ConversationMessage[]
): Promise<ProcessResult> {
  const userMessage: ConversationMessage = {
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  }
  const messages = [...history, userMessage]

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('name, description, price, category')
    .eq('restaurant_id', restaurant.id)
    .eq('available', true)

  if (!menuItems || menuItems.length === 0) {
    const reply = 'El menu no esta disponible en este momento.'
    const assistantMsg: ConversationMessage = { role: 'assistant', content: reply, timestamp: new Date().toISOString() }
    return {
      reply, action: 'error', cart, history: [...messages, assistantMsg],
      systemPrompt: '', llmInput: [], llmResponse: null, llmMs: 0, invalidItems: [],
    }
  }

  const isFirstMessage = messages.length <= 1
  const systemPrompt = isFirstMessage
    ? buildGreetingPrompt(restaurant, menuItems)
    : buildSystemPrompt(restaurant, menuItems, { items: cart }, history)

  const llmInput = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
  ]

  const llmStart = Date.now()
  const llmResponse = await processWithLLM(llmInput)
  const llmMs = Date.now() - llmStart

  if (!llmResponse) {
    const reply = 'Disculpa, no pude procesar tu mensaje. Intenta de nuevo.'
    const assistantMsg: ConversationMessage = { role: 'assistant', content: reply, timestamp: new Date().toISOString() }
    return {
      reply, action: 'error', cart, history: [...messages, assistantMsg],
      systemPrompt, llmInput, llmResponse: null, llmMs, invalidItems: [],
    }
  }

  let reply = llmResponse.content
  let updatedCart = [...cart]
  let action = 'none'
  let invalidItems: string[] = []

  for (const tc of llmResponse.toolCalls) {
    const mappedAction = ACTION_MAP[tc.name]
    if (!mappedAction) continue

    action = mappedAction

    switch (tc.name) {
      case 'add_to_cart': {
        const items = tc.args?.items || []
        for (const item of items) {
          const exactName = lookupName(menuItems, item.name)
          if (!exactName) {
            invalidItems.push(item.name)
            continue
          }
          const price = lookupPrice(menuItems, item.name)
          const existing = updatedCart.find((i) => i.name.toLowerCase() === item.name.toLowerCase())
          if (existing) {
            existing.qty += item.qty
            if (item.notes) existing.notes = item.notes
          } else {
            updatedCart.push({
              name: exactName,
              qty: item.qty,
              price,
              notes: item.notes || '',
            })
          }
        }
        break
      }
      case 'remove_from_cart': {
        const names = tc.args?.names || []
        updatedCart = updatedCart.filter(
          (i) => !names.some((n: string) => n.toLowerCase() === i.name.toLowerCase())
        )
        break
      }
      case 'set_cart': {
        const newItems = tc.args?.items || []
        updatedCart = []
        for (const item of newItems) {
          const exactName = lookupName(menuItems, item.name)
          if (!exactName) {
            invalidItems.push(item.name)
            continue
          }
          const price = lookupPrice(menuItems, item.name)
          updatedCart.push({
            name: exactName,
            qty: item.qty,
            price,
            notes: item.notes || '',
          })
        }
        break
      }
      case 'confirm_order':
      case 'cancel_order':
        updatedCart = []
        break
    }
  }

  if (invalidItems.length > 0) {
    reply += `\n\nNo tenemos: ${invalidItems.join(', ')}. Solo aceptamos items del menu.`
  }

  const assistantMsg: ConversationMessage = {
    role: 'assistant',
    content: reply,
    timestamp: new Date().toISOString(),
  }

  return {
    reply,
    action,
    cart: updatedCart,
    history: [...messages, assistantMsg],
    systemPrompt,
    llmInput,
    llmResponse,
    llmMs,
    invalidItems,
  }
}
