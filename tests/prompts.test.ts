import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildGreetingPrompt } from '../src/lib/prompts'

const RESTAURANT = { name: 'El Buen Sabor' }
const MENU_ITEMS = [
  { name: 'Hamburguesa Clasica', description: 'Carne, lechuga, tomate', price: 8.5, category: 'Principales' },
  { name: 'Coca-Cola', description: 'Lata 355ml', price: 1.5, category: 'Bebidas' },
  { name: 'Papas Fritas', description: null, price: 3.5, category: 'Entradas' },
]

describe('buildSystemPrompt', () => {
  it('should include restaurant name', () => {
    const prompt = buildSystemPrompt(RESTAURANT, MENU_ITEMS, {}, [])
    expect(prompt).toContain('El Buen Sabor')
  })

  it('should include menu items with prices', () => {
    const prompt = buildSystemPrompt(RESTAURANT, MENU_ITEMS, {}, [])
    expect(prompt).toContain('Hamburguesa Clasica - $8.50')
    expect(prompt).toContain('Coca-Cola - $1.50')
    expect(prompt).toContain('Papas Fritas - $3.50')
    expect(prompt).toContain('--- Principales ---')
    expect(prompt).toContain('--- Bebidas ---')
    expect(prompt).toContain('--- Entradas ---')
  })

  it('should show empty cart when no context', () => {
    const prompt = buildSystemPrompt(RESTAURANT, MENU_ITEMS, {}, [])
    expect(prompt).toContain('Carrito vacio')
  })

  it('should show cart items and total when context has items', () => {
    const prompt = buildSystemPrompt(RESTAURANT, MENU_ITEMS, {
      items: [{ name: 'Hamburguesa Clasica', qty: 2, price: 8.5, notes: '' }],
    }, [])
    expect(prompt).toContain('Hamburguesa Clasica x2')
    expect(prompt).toContain('$17.00')
  })

  it('should include last messages from history', () => {
    const history = [
      { role: 'user' as const, content: 'hola', timestamp: '' },
      { role: 'assistant' as const, content: 'bienvenido', timestamp: '' },
    ]
    const prompt = buildSystemPrompt(RESTAURANT, MENU_ITEMS, {}, history)
    expect(prompt).toContain('user: hola')
    expect(prompt).toContain('assistant: bienvenido')
  })

  it('should include set_cart and add_to_cart instructions', () => {
    const prompt = buildSystemPrompt(RESTAURANT, MENU_ITEMS, {}, [])
    expect(prompt).toContain('add_to_cart')
    expect(prompt).toContain('set_cart')
    expect(prompt).toContain('remove_from_cart')
    expect(prompt).toContain('confirm_order')
    expect(prompt).toContain('cancel_order')
  })

  it('should not include JSON response instruction', () => {
    const prompt = buildSystemPrompt(RESTAURANT, MENU_ITEMS, {}, [])
    expect(prompt).not.toContain('"action"')
    expect(prompt).not.toContain('"message"')
  })
})

describe('buildGreetingPrompt', () => {
  it('should include restaurant name', () => {
    const prompt = buildGreetingPrompt(RESTAURANT, MENU_ITEMS)
    expect(prompt).toContain('El Buen Sabor')
  })

  it('should include menu items', () => {
    const prompt = buildGreetingPrompt(RESTAURANT, MENU_ITEMS)
    expect(prompt).toContain('Hamburguesa Clasica - $8.50')
  })

  it('should indicate first message context', () => {
    const prompt = buildGreetingPrompt(RESTAURANT, MENU_ITEMS)
    expect(prompt).toContain('primer mensaje')
  })

  it('should include tool instructions', () => {
    const prompt = buildGreetingPrompt(RESTAURANT, MENU_ITEMS)
    expect(prompt).toContain('add_to_cart')
    expect(prompt).toContain('set_cart')
  })
})
