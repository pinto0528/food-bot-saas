import type { LLMResponse, OrderItem } from './types'
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
  waba_token: string | null
  phone_number_id: string | null
}

export async function executeAction(
  supabase: SupabaseClient<Database>,
  llmResponse: LLMResponse,
  conversation: Conversation,
  restaurant: Restaurant
) {
  const context = (conversation.context as any) || {}
  const items: OrderItem[] = (context.items as OrderItem[]) || []

  switch (llmResponse.action) {
    case 'add_item': {
      if (llmResponse.items) {
        for (const newItem of llmResponse.items) {
          const existing = items.find(
            (i) => i.name.toLowerCase() === newItem.name.toLowerCase()
          )
          if (existing) {
            existing.qty += newItem.qty
            if (newItem.notes) existing.notes = newItem.notes
          } else {
            items.push({
              name: newItem.name,
              qty: newItem.qty,
              price: newItem.price || 0,
              notes: newItem.notes || '',
            })
          }
        }
      }
      await supabase
        .from('conversations')
        .update({ context: { ...context, items }, updated_at: new Date().toISOString() })
        .eq('id', conversation.id)
      break
    }

    case 'remove_item': {
      const updatedItems = items.filter(
        (i) => !llmResponse.items?.some((r) => r.name.toLowerCase() === i.name.toLowerCase())
      )
      await supabase
        .from('conversations')
        .update({ context: { ...context, items: updatedItems }, updated_at: new Date().toISOString() })
        .eq('id', conversation.id)
      break
    }

    case 'confirm_order': {
      const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
      const { error } = await supabase.from('orders').insert({
        restaurant_id: restaurant.id,
        conversation_id: conversation.id,
        customer_phone: (conversation.messages as any)?.[0]?.role === 'user'
          ? extractCustomerPhone(conversation.messages as any) : '',
        customer_name: null,
        items: items as any,
        total,
        notes: null,
        status: 'pending',
      })
      if (!error) {
        await supabase
          .from('conversations')
          .update({ status: 'closed', context: { items: [] }, updated_at: new Date().toISOString() })
          .eq('id', conversation.id)
      }
      break
    }

    case 'show_summary':
    case 'ask_clarify':
    case 'cancel':
    case 'greeting':
      break
  }
}

function extractCustomerPhone(messages: any[]): string {
  return ''
}
