import type { LLMResponse, OrderItem, ToolCall } from './types'
import type { Database, Json } from './database.types'
import { SupabaseClient } from '@supabase/supabase-js'

interface Conversation {
  id: string
  restaurant_id: string
  context: Json
  messages: Json
  status: string
}

interface Restaurant {
  id: string
  name: string
  phone: string
}

const ACTION_MAP: Record<string, string> = {
  add_to_cart: 'add_item',
  remove_from_cart: 'remove_item',
  set_cart: 'set_item',
  show_summary: 'show_summary',
  confirm_order: 'confirm_order',
  cancel_order: 'cancel',
}

function lookupPrice(menuItems: { name: string; price: number }[], name: string): number {
  const match = menuItems.find((m) => m.name.toLowerCase() === name.toLowerCase())
  return match?.price || 0
}

function lookupName(menuItems: { name: string; price: number }[], name: string): string | null {
  const match = menuItems.find((m) => m.name.toLowerCase() === name.toLowerCase())
  return match?.name || null
}

export async function executeAction(
  supabase: SupabaseClient<Database>,
  llmResponse: LLMResponse,
  conversation: Conversation,
  restaurant: Restaurant
) {
  const context = (conversation.context as any) || {}
  const items: OrderItem[] = (context.items as OrderItem[]) || []

  // Look up menu items once for validation
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('name, price')
    .eq('restaurant_id', restaurant.id)
    .eq('available', true)

  let updatedItems = [...items]
  let invalidItems: string[] = []

  for (const tc of llmResponse.toolCalls) {
    const mappedAction = ACTION_MAP[tc.name]
    if (!mappedAction) continue

    switch (tc.name) {
      case 'add_to_cart': {
        const newItems = tc.args?.items || []
        for (const item of newItems) {
          const exactName = lookupName(menuItems || [], item.name)
          if (!exactName) {
            invalidItems.push(item.name)
            continue
          }
          const price = lookupPrice(menuItems || [], item.name)
          const existing = updatedItems.find((i) => i.name.toLowerCase() === item.name.toLowerCase())
          if (existing) {
            existing.qty += item.qty
            if (item.notes) existing.notes = item.notes
          } else {
            updatedItems.push({
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
        updatedItems = updatedItems.filter(
          (i) => !names.some((n: string) => n.toLowerCase() === i.name.toLowerCase())
        )
        break
      }
      case 'set_cart': {
        const newItems = tc.args?.items || []
        updatedItems = []
        for (const item of newItems) {
          const exactName = lookupName(menuItems || [], item.name)
          if (!exactName) {
            invalidItems.push(item.name)
            continue
          }
          const price = lookupPrice(menuItems || [], item.name)
          updatedItems.push({
            name: exactName,
            qty: item.qty,
            price,
            notes: item.notes || '',
          })
        }
        break
      }
      case 'cancel_order':
        updatedItems = []
        break
      case 'confirm_order': {
        const total = updatedItems.reduce((sum, i) => sum + i.price * i.qty, 0)
        const { error } = await supabase.from('orders').insert({
          restaurant_id: restaurant.id,
          conversation_id: conversation.id,
          customer_phone: (conversation.messages as any)?.[0]?.role === 'user'
            ? extractCustomerPhone(conversation.messages as any) : '',
          customer_name: null,
          items: updatedItems as any,
          total,
          notes: null,
          status: 'pending',
        })
        if (!error) {
          updatedItems = []
          await supabase
            .from('conversations')
            .update({ status: 'closed', context: { items: [] }, updated_at: new Date().toISOString() })
            .eq('id', conversation.id)
        }
        break
      }
    }
  }

  // Save updated cart to DB (only if not confirm_order which already saved)
  const hasConfirm = llmResponse.toolCalls.some((tc) => tc.name === 'confirm_order')
  if (!hasConfirm) {
    await supabase
      .from('conversations')
      .update({ context: { ...context, items: updatedItems }, updated_at: new Date().toISOString() })
      .eq('id', conversation.id)
  }

  if (invalidItems.length > 0) {
    console.warn('Invalid items rejected:', invalidItems)
  }
}

function extractCustomerPhone(messages: any[]): string {
  return ''
}
