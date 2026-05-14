import type { MenuItem, OrderItem, ConversationState, IntentResult, StateResult } from './types'

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function formatItems(items: OrderItem[]): string {
  return items.map(i => `${i.qty}x ${i.name} ($${(i.qty * i.price).toFixed(2)})`).join(', ')
}

function formatCart(cart: OrderItem[]): string {
  if (cart.length === 0) return '*Carrito vacío*'
  const lines = cart.map(i => `• ${i.qty}x ${i.name} — $${(i.qty * i.price).toFixed(2)}`)
  const total = cart.reduce((sum, i) => sum + i.qty * i.price, 0)
  return lines.join('\n') + `\n\n*Total: $${total.toFixed(2)}*`
}

function formatMenuSummary(items: MenuItem[]): string {
  return items.map(i => `• ${i.name} ($${i.price.toFixed(2)})`).join('\n')
}

function addItems(cart: OrderItem[], items: OrderItem[]): OrderItem[] {
  const result = [...cart]
  for (const item of items) {
    const idx = result.findIndex(i => normalize(i.name) === normalize(item.name))
    if (idx >= 0) {
      result[idx] = { ...result[idx], qty: result[idx].qty + item.qty }
    } else {
      result.push(item)
    }
  }
  return result
}

function setItems(items: OrderItem[]): OrderItem[] {
  const merged: Record<string, OrderItem> = {}
  for (const item of items) {
    const key = normalize(item.name)
    if (merged[key]) {
      merged[key].qty += item.qty
    } else {
      merged[key] = { ...item }
    }
  }
  return Object.values(merged)
}

function removeItems(cart: OrderItem[], names: string[]): OrderItem[] {
  const normalizedNames = names.map(n => normalize(n))
  return cart.filter(i => !normalizedNames.includes(normalize(i.name)))
}

function handleGreeting(
  intent: IntentResult,
  cart: OrderItem[],
  menuItems: MenuItem[],
  validItems: OrderItem[],
  invalidItems: string[]
): StateResult {
  switch (intent.intent) {
    case 'chitchat':
    case 'add_item':
    case 'set_cart': {
      const newCart = intent.intent === 'set_cart' ? setItems(validItems) : addItems(cart, validItems)
      const added = formatItems(newCart)
      let reply = `¡Bien! Agregué al pedido: ${added}.`
      if (invalidItems.length > 0) reply += `\n\nNo tenemos: ${invalidItems.join(', ')}. Solo aceptamos items del menú.`
      reply += '\n\n¿Querés algo más? 🙌'
      return { reply, action: 'update', cart: newCart, state: 'ADD_MORE', invalidItems }
    }
    case 'remove_item':
      return { reply: 'Tu carrito está vacío. ¿Qué te gustaría pedir? 😊', action: 'none', cart, state: 'ORDERING' }
    case 'show_summary':
    case 'confirm':
      return { reply: 'Aún no has agregado nada al carrito. Decime qué querés comer 😊', action: 'none', cart, state: 'ORDERING' }
    case 'cancel':
      return { reply: 'No hay problema. ¡Cuando quieras pedir, decime "hola"! 👋', action: 'reset', cart: [], state: 'CANCEL' }
  }
}

function handleOrdering(
  intent: IntentResult,
  cart: OrderItem[],
  menuItems: MenuItem[],
  validItems: OrderItem[],
  invalidItems: string[]
): StateResult {
  switch (intent.intent) {
    case 'add_item': {
      const newCart = addItems(cart, validItems)
      const added = formatItems(validItems)
      let reply = `Listo, agregué: ${added}.`
      if (invalidItems.length > 0) reply += `\n\nNo tenemos: ${invalidItems.join(', ')}.`
      reply += '\n\n¿Querés agregar algo más?'
      return { reply, action: 'update', cart: newCart, state: 'ADD_MORE', invalidItems }
    }
    case 'set_cart': {
      const newCart = setItems(validItems)
      let reply = 'Perfecto, dejé el pedido así:\n' + formatCart(newCart)
      if (invalidItems.length > 0) reply += `\n\nNo tenemos: ${invalidItems.join(', ')}.`
      reply += '\n\n¿Querés agregar algo más?'
      return { reply, action: 'update', cart: newCart, state: 'ADD_MORE', invalidItems }
    }
    case 'remove_item': {
      const removedNames = intent.items?.map(i => i.name) || []
      const newCart = removeItems(cart, removedNames)
      const removed = removedNames.join(', ')
      if (newCart.length === 0) {
        return { reply: `Saqué del carrito: ${removed}. Ahora está vacío. ¿Qué más querés pedir?`, action: 'update', cart: newCart, state: 'ORDERING' }
      }
      return { reply: `Listo, saqué: ${removed}.\n\n${formatCart(newCart)}\n\n¿Algo más?`, action: 'update', cart: newCart, state: 'ADD_MORE' }
    }
    case 'show_summary':
      return { reply: `Este es tu pedido:\n\n${formatCart(cart)}\n\n¿Querés agregar algo más o confirmar?`, action: 'none', cart, state: 'ADD_MORE' }
    case 'confirm':
      if (cart.length === 0) return { reply: 'Tu carrito está vacío. Agregá algo antes de confirmar 😊', action: 'none', cart, state: 'ORDERING' }
      return {
        reply: '¡Perfecto! Te leo el pedido para confirmar:\n\n' + formatCart(cart) + '\n\nDecime "sí" para confirmar o "no" para cambiar algo.',
        action: 'confirm_pending',
        cart,
        state: 'CONFIRM'
      }
    case 'cancel':
      return { reply: 'Pedido cancelado. ¡Cuando quieras volver a pedir, decime "hola"! 👋', action: 'reset', cart: [], state: 'CANCEL' }
    case 'chitchat':
      if (cart.length === 0) return { reply: '😊 ¿Qué te gustaría comer hoy?', action: 'none', cart, state: 'ORDERING' }
      return { reply: '😊 ¿Querés agregar algo más a tu pedido?', action: 'none', cart, state: 'ADD_MORE' }
  }
}

function handleAddMore(
  intent: IntentResult,
  cart: OrderItem[],
  _menuItems: MenuItem[],
  validItems: OrderItem[],
  invalidItems: string[]
): StateResult {
  switch (intent.intent) {
    case 'add_item': {
      const newCart = addItems(cart, validItems)
      const added = formatItems(validItems)
      let reply = `Agregué: ${added}.`
      if (invalidItems.length > 0) reply += `\n\nNo tenemos: ${invalidItems.join(', ')}.`
      reply += '\n\n¿Algo más? 🙌'
      return { reply, action: 'update', cart: newCart, state: 'ADD_MORE', invalidItems }
    }
    case 'set_cart': {
      const newCart = setItems(validItems)
      let reply = 'Dejé el pedido así:\n' + formatCart(newCart)
      if (invalidItems.length > 0) reply += `\n\nNo tenemos: ${invalidItems.join(', ')}.`
      reply += '\n\n¿Algo más?'
      return { reply, action: 'update', cart: newCart, state: 'ADD_MORE', invalidItems }
    }
    case 'remove_item': {
      const removedNames = intent.items?.map(i => i.name) || []
      const newCart = removeItems(cart, removedNames)
      if (newCart.length === 0) {
        return { reply: 'El carrito quedó vacío. ¿Qué más querés pedir?', action: 'update', cart: newCart, state: 'ORDERING' }
      }
      return { reply: `Listo.\n\n${formatCart(newCart)}\n\n¿Algo más?`, action: 'update', cart: newCart, state: 'ADD_MORE' }
    }
    case 'show_summary':
      return { reply: `Tu pedido:\n\n${formatCart(cart)}\n\n¿Querés agregar algo más o confirmar?`, action: 'none', cart, state: 'ADD_MORE' }
    case 'confirm':
      if (cart.length === 0) return { reply: 'El carrito está vacío. Agregá algo antes de confirmar 😊', action: 'none', cart, state: 'ORDERING' }
      return {
        reply: 'Confirmamos:\n\n' + formatCart(cart) + '\n\nDecime "sí" para confirmar o "no" para cambiar algo.',
        action: 'confirm_pending',
        cart,
        state: 'CONFIRM'
      }
    case 'cancel':
      return { reply: 'Pedido cancelado. ¡Cuando quieras, decime "hola"! 👋', action: 'reset', cart: [], state: 'CANCEL' }
    case 'chitchat':
      return { reply: '😊 ¿Querés agregar algo más o confirmar el pedido?', action: 'none', cart, state: 'ADD_MORE' }
  }
}

function handleConfirm(
  intent: IntentResult,
  cart: OrderItem[],
  _menuItems: MenuItem[],
  _validItems: OrderItem[],
  _invalidItems: string[]
): StateResult {
  switch (intent.intent) {
    case 'confirm':
      return {
        reply: `¡Gracias por tu pedido! 🙌🎉\n\n${formatCart(cart)}\n\nEnseguida lo preparamos.`,
        action: 'confirm_order',
        cart,
        state: 'DONE'
      }
    case 'cancel':
      return { reply: 'Ok, volvamos a armarlo. ¿Qué querés modificar?', action: 'none', cart, state: 'ORDERING' }
    case 'chitchat':
    default:
      return {
        reply: '¿Confirmamos el pedido?\n\n' + formatCart(cart) + '\n\nDecime "sí" para confirmar o "no" para cambiar algo.',
        action: 'none',
        cart,
        state: 'CONFIRM'
      }
  }
}

function handleDoneCancel(
  _intent: IntentResult,
  _cart: OrderItem[],
  menuItems: MenuItem[]
): StateResult {
  return {
    reply:
      '¡Hola de nuevo! ¿Qué te gustaría pedir hoy? 😊\n\n' +
      'Este es nuestro menú:\n' +
      formatMenuSummary(menuItems),
    action: 'greeting',
    cart: [],
    state: 'GREETING'
  }
}

export function processState(
  state: ConversationState,
  intent: IntentResult,
  cart: OrderItem[],
  menuItems: MenuItem[]
): StateResult {
  const validItems: OrderItem[] = []
  const invalidItems: string[] = []

  if (intent.items && (intent.intent === 'add_item' || intent.intent === 'set_cart')) {
    for (const item of intent.items) {
      const menuItem = menuItems.find(m => normalize(m.name) === normalize(item.name || ''))
      if (menuItem) {
        validItems.push({ name: menuItem.name, qty: item.qty || 1, price: menuItem.price })
      } else if (item.name) {
        invalidItems.push(item.name)
      }
    }
  }

  switch (state) {
    case 'GREETING':
      return handleGreeting(intent, cart, menuItems, validItems, invalidItems)
    case 'ORDERING':
      return handleOrdering(intent, cart, menuItems, validItems, invalidItems)
    case 'ADD_MORE':
      return handleAddMore(intent, cart, menuItems, validItems, invalidItems)
    case 'CONFIRM':
      return handleConfirm(intent, cart, menuItems, validItems, invalidItems)
    case 'DONE':
    case 'CANCEL':
      return handleDoneCancel(intent, cart, menuItems)
  }
}
