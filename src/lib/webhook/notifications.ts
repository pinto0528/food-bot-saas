import { sendWhatsAppMessage } from '../whatsapp'

export function buildOrderNotification(
  customerPhone: string,
  items: { name: string; qty: number; price: number; notes?: string }[],
  total: number,
  notes?: string | null
): string {
  const itemLines = items
    .map((i) => `  ${getItemEmoji(i.name)} ${i.name} x${i.qty} - $${(i.price * i.qty).toFixed(2)}`)
    .join('\n')

  let msg = `NUEVO PEDIDO\n`
  msg += `Cliente: ${customerPhone}\n\n`
  msg += `Items:\n${itemLines}\n`
  msg += `\nTotal: $${total.toFixed(2)}`
  if (notes) msg += `\nNotas: ${notes}`
  msg += `\n\nResponde:\n1  Confirmar pedido\n2  Cancelar\n3  Llamar al cliente`
  return msg
}

export function buildConfirmationToCustomer(items: { name: string; qty: number; price: number }[], total: number): string {
  const itemLines = items
    .map((i) => `  ${i.name} x${i.qty} - $${(i.price * i.qty).toFixed(2)}`)
    .join('\n')

  return `Pedido confirmado. Gracias!\n\n${itemLines}\n\nTotal: $${total.toFixed(2)}\n\nTe avisaremos cuando este listo.`
}

export async function notifyRestaurant(
  restaurantPhone: string,
  customerPhone: string,
  items: { name: string; qty: number; price: number; notes?: string }[],
  total: number,
  notes?: string | null
): Promise<boolean> {
  const message = buildOrderNotification(customerPhone, items, total, notes)
  return sendWhatsAppMessage(restaurantPhone, message)
}

function getItemEmoji(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('hamburguesa')) return '\uD83C\uDF54'
  if (lower.includes('pizza')) return '\uD83C\uDF55'
  if (lower.includes('papas') || lower.includes('fritas')) return '\uD83C\uDF5F'
  if (lower.includes('ensalada')) return '\uD83E\uDD57'
  if (lower.includes('empanada')) return '\uD83E\uDD50'
  if (lower.includes('milanesa')) return '\uD83E\uDD69'
  if (lower.includes('cerveza')) return '\uD83C\uDF7A'
  if (lower.includes('coca') || lower.includes('sprite') || lower.includes('agua') || lower.includes('bebida')) return '\uD83E\uDD64'
  if (lower.includes('flan') || lower.includes('helado') || lower.includes('postre')) return '\uD83C\uDF68'
  if (lower.includes('cebolla') || lower.includes('aros')) return '\uD83C\uDF5F'
  return '\uD83C\uDF7D\uFE0F'
}
