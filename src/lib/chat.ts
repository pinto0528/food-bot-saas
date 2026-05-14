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

const ARTICLE_WORDS = new Set(['un', 'una', 'el', 'la', 'los', 'las', 'del'])
const MENU_KEYWORDS = new Set([
  'hamburguesa', 'hamburguesas', 'coca', 'cocas', 'cola', 'papas', 'fritas',
  'milanesa', 'napolitana', 'ensalada', 'caesar', 'aros', 'cebolla', 'flan',
  'dulce', 'leche', 'helado', 'agua', 'mineral', 'completa', 'completas',
])

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function lookupPrice(menuItems: MenuItemInfo[], name: string): number {
  const match = menuItems.find((m) => normalize(m.name) === normalize(name))
  return match?.price || 0
}

function lookupName(menuItems: MenuItemInfo[], name: string): string | null {
  const match = menuItems.find((m) => normalize(m.name) === normalize(name))
  return match?.name || null
}

function generateAutoReply(toolCalls: ToolCall[]): string {
  const parts: string[] = []
  for (const tc of toolCalls) {
    switch (tc.name) {
      case 'add_to_cart': {
        for (const item of tc.args?.items || []) {
          parts.push(`${item.qty}x ${item.name}${item.notes ? ` (${item.notes})` : ''}`)
        }
        break
      }
      case 'remove_from_cart': {
        for (const name of tc.args?.names || []) {
          parts.push(`${name}`)
        }
        break
      }
      case 'set_cart': {
        for (const item of tc.args?.items || []) {
          parts.push(`${item.qty}x ${item.name}`)
        }
        break
      }
      case 'confirm_order':
        return 'Perfecto, pedido confirmado!'
      case 'cancel_order':
        return 'Pedido cancelado.'
      case 'show_summary':
        return 'Aca tenes el resumen de tu pedido.'
    }
  }
  if (parts.length === 0) return ''
  if (toolCalls[0]?.name === 'add_to_cart') return `Listo, agregue: ${parts.join(', ')}.`
  if (toolCalls[0]?.name === 'remove_from_cart') return `Listo, saque: ${parts.join(', ')}.`
  if (toolCalls[0]?.name === 'set_cart') return `Listo, cambie el pedido a: ${parts.join(', ')}.`
  return ''
}

function extractMenuItems(message: string, menuItems: { name: string; price: number }[]): { name: string; qty: number }[] {
  const normalized = normalize(message)
  const words = normalized.split(/\s+/)

  const results: { name: string; qty: number }[] = []
  let qtyBuffer = 0

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (/^\d+$/.test(w)) {
      qtyBuffer = parseInt(w, 10)
      continue
    }
    if (ARTICLE_WORDS.has(w)) continue

    for (const menuItem of menuItems) {
      const menuWords = normalize(menuItem.name).split(/\s+/)
      let match = true
      for (let j = 0; j < menuWords.length; j++) {
        if (i + j >= words.length || words[i + j] !== menuWords[j]) {
          match = false
          break
        }
      }
      if (match) {
        results.push({ name: menuItem.name, qty: qtyBuffer || 1 })
        qtyBuffer = 0
        i += menuWords.length - 1
        break
      }
    }

    if (MENU_KEYWORDS.has(w)) {
      qtyBuffer = 0
    }
  }

  return results
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
          const existing = updatedCart.find((i) => normalize(i.name) === normalize(item.name))
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
          (i) => !names.some((n: string) => normalize(i.name) === normalize(n))
        )
        break
      }
      case 'set_cart': {
        const newItems = tc.args?.items || []
        const merged: Record<string, { item: typeof newItems[0], validName: string, price: number }> = {}
        for (const item of newItems) {
          const exactName = lookupName(menuItems, item.name)
          if (!exactName) {
            invalidItems.push(item.name)
            continue
          }
          const price = lookupPrice(menuItems, item.name)
          const key = normalize(exactName)
          if (merged[key]) {
            merged[key].item.qty += item.qty
          } else {
            merged[key] = { item: { ...item }, validName: exactName, price }
          }
        }
        updatedCart = Object.values(merged).map(({ item, validName, price }) => ({
          name: validName,
          qty: item.qty,
          price,
          notes: item.notes || '',
        }))
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

  if (!reply && llmResponse.toolCalls.length > 0) {
    reply = generateAutoReply(llmResponse.toolCalls)
  }

  if (action === 'none' && llmResponse.toolCalls.length === 0) {
    const mentioned = extractMenuItems(message, menuItems)
    if (mentioned.length > 0) {
      action = 'add_item'
      for (const item of mentioned) {
        const existing = updatedCart.find((i) => normalize(i.name) === normalize(item.name))
        if (existing) {
          existing.qty += item.qty
        } else {
          const price = lookupPrice(menuItems, item.name)
          updatedCart.push({ name: item.name, qty: item.qty, price, notes: '' })
        }
      }
      if (!reply) {
        reply = generateAutoReply([{ name: 'add_to_cart', args: { items: mentioned } }])
      }
    }
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
