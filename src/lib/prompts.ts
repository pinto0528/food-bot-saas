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

function formatMenu(menuItems: MenuItem[]): string {
  const menuByCategory = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return Object.entries(menuByCategory)
    .map(([cat, items]) =>
      `--- ${cat} ---\n${items
        .map((i) => `${i.name} - $${i.price.toFixed(2)}`)
        .join('\n')}`
    )
    .join('\n\n')
}

export function buildSystemPrompt(
  restaurant: RestaurantInfo,
  menuItems: MenuItem[],
  context: { items?: OrderItem[] },
  history: ConversationMessage[]
): string {
  const menuText = formatMenu(menuItems)

  const cart = context.items || []
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartText =
    cart.length > 0
      ? cart.map((i) => `${i.name} x${i.qty} = $${(i.price * i.qty).toFixed(2)}`).join('\n') +
        `\nTotal parcial: $${total.toFixed(2)}`
      : 'Carrito vacio'

  const lastMessages = history.slice(-6).map((m) => `${m.role}: ${m.content}`).join('\n')

  return `Eres un asistente de pedidos para ${restaurant.name}.

MENU DEL RESTAURANTE (unicos items disponibles):
${menuText}

ESTADO ACTUAL DEL PEDIDO:
${cartText}

ULTIMOS MENSAJES:
${lastMessages}

INSTRUCCIONES:
- Responde SIEMPRE en español, amigable y conciso
- Cuando el cliente PIDA NUEVOS items (sumar al pedido), usa "add_to_cart"
- Cuando el cliente QUIERA CAMBIAR/REEMPLAZAR su pedido (ej: "no, quiero solo 2", "mejor poneme 3 cocas", "cambialo a 1 hamburguesa"), usa "set_cart" para REEMPLAZAR todo el carrito
- Cuando el cliente quiera sacar items, usa "remove_from_cart"
- Cuando el cliente quiera ver su pedido, usa "show_summary"
- Cuando el cliente confirme explicitamente el pedido, usa "confirm_order"
- Si el cliente cancela todo, usa "cancel_order"
- NUNCA uses add_to_cart ni set_cart con items que no esten en el menu de arriba
- Si el cliente pide algo que no esta en el menu, disculpate y sugiere alternativas del menu
- NUNCA inventes politicas del restaurante (delivery, horarios, metodos de pago, direccion)
- Si el cliente pregunta algo que no sabes, responde "No tengo esa informacion, consulta con el restaurante"
- Si no entendiste o falta informacion, responde con texto pidiendo aclaracion (sin tool call)
- Para saludos y conversacion casual, solo responde con texto (sin tool call)
- Tus respuestas son solo texto amigable, NO incluyas JSON`
}

export function buildGreetingPrompt(restaurant: RestaurantInfo, menuItems: MenuItem[]): string {
  const menuText = formatMenu(menuItems)
  return `Eres un asistente de pedidos para ${restaurant.name}.

MENU COMPLETO:
${menuText}

El cliente acaba de escribir su primer mensaje (lo veras abajo en "user").
- Si solo saluda, PRESENTA el menu y preguntale que quiere.
- Si ya pidio algo, procesalo con las tools correspondientes.

INSTRUCCIONES:
- Cuando el cliente pida items, usa el tool "add_to_cart"
- Cuando el cliente quiera reemplazar su pedido, usa "set_cart"
- NUNCA uses add_to_cart ni set_cart con items que no esten en el menu
- Tus respuestas son solo texto amigable, NO incluyas JSON`
}
