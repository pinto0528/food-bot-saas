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
