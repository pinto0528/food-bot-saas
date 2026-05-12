import type { ConversationMessage, OrderItem } from './types'

interface MenuItem {
  name: string
  description: string | null
  price: number
  category: string
}

interface RestaurantInfo {
  name: string
}

export function buildSystemPrompt(
  restaurant: RestaurantInfo,
  menuItems: MenuItem[],
  context: { items?: OrderItem[] },
  history: ConversationMessage[]
): string {
  const menuByCategory = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const menuText = Object.entries(menuByCategory)
    .map(([cat, items]) =>
      `--- ${cat} ---\n${items
        .filter((i) => i.description)
        .map((i) => `${i.name} - $${i.price.toFixed(2)}`)
        .join('\n')}`
    )
    .join('\n\n')

  const cart = context.items || []
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartText =
    cart.length > 0
      ? cart.map((i) => `${i.name} x${i.qty} = $${(i.price * i.qty).toFixed(2)}`).join('\n') +
        `\nTotal parcial: $${total.toFixed(2)}`
      : 'Carrito vacio'

  const lastMessages = history.slice(-6).map((m) => `${m.role}: ${m.content}`).join('\n')

  return `Eres un asistente de pedidos para ${restaurant.name}. Ayudas a clientes a hacer pedidos por WhatsApp.

MENU DEL RESTAURANTE:
${menuText}

ESTADO ACTUAL DEL PEDIDO:
${cartText}

ULTIMOS MENSAJES:
${lastMessages}

INSTRUCCIONES:
- Responde SIEMPRE en español, amigable y conciso
- Si el cliente pide algo del menu, responde con action "add_item"
- Si pide algo que no existe en el menu, sugierele alternativas similares
- NUNCA inventes items o precios que no esten en el menu
- Cuando el cliente quiera confirmar el pedido, usa action "confirm_order"
- Si no entendiste, usa action "ask_clarify"
- Para saludos usa action "greeting"

Responde SOLO con JSON valido en este formato:
{
  "action": "add_item" | "remove_item" | "show_summary" | "confirm_order" | "ask_clarify" | "cancel" | "greeting",
  "message": "texto amigable para el cliente",
  "items": [{"name": "nombre exacto del menu", "qty": 1, "notes": "observaciones"}],
  "clarification_needed": false
}`
}

export function buildGreetingPrompt(restaurant: RestaurantInfo, menuItems: MenuItem[]): string {
  const categories = [...new Set(menuItems.map((i) => i.category))]
  return `Eres un asistente de pedidos para ${restaurant.name}.

Categorias del menu: ${categories.join(', ')}

El cliente acaba de escribir por primera vez. Saluda amablemente y presenta las categorias disponibles.

Responde SOLO con JSON:
{
  "action": "greeting",
  "message": "texto de bienvenida mostrando categorias",
  "items": [],
  "clarification_needed": false
}`
}
