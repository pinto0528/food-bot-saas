export type RestaurantStatus = 'active' | 'suspended' | 'trial'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
export type ConversationStatus = 'ordering' | 'checkout' | 'closed'
export type UserRole = 'super_admin' | 'restaurant_owner'
export type ErrorLogType = 'webhook' | 'llm' | 'whatsapp' | 'auth'

export interface MenuItemInput {
  name: string
  description?: string
  price: number
  category: string
  available?: boolean
}

export interface MenuItem {
  name: string
  price: number
  description: string | null
  category: string
}

export interface OrderItem {
  name: string
  qty: number
  price: number
  notes?: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface OrderContext {
  items: OrderItem[]
}

export interface ToolCall {
  name: string
  args: Record<string, any>
}

export interface LLMResponse {
  content: string
  toolCalls: ToolCall[]
}

export type ConversationState =
  | 'GREETING'
  | 'ORDERING'
  | 'ADD_MORE'
  | 'CONFIRM'
  | 'DONE'
  | 'CANCEL'

export type IntentType =
  | 'add_item'
  | 'set_cart'
  | 'remove_item'
  | 'show_summary'
  | 'confirm'
  | 'cancel'
  | 'chitchat'

export interface IntentResult {
  intent: IntentType
  items?: { name: string; qty?: number }[]
  text?: string
}

export interface StateResult {
  reply: string
  action: string
  cart: OrderItem[]
  state: ConversationState
  invalidItems?: string[]
}
