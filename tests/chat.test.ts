import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ProcessResult } from '../src/lib/chat'

const MENU = [
  { name: 'Hamburguesa Clasica', description: 'Carne', price: 8.5, category: 'Principales' },
  { name: 'Hamburguesa Completa', description: 'Completa', price: 10.0, category: 'Principales' },
  { name: 'Coca-Cola', description: 'Lata', price: 1.5, category: 'Bebidas' },
  { name: 'Papas Fritas', description: null, price: 3.5, category: 'Entradas' },
]

const RESTAURANT = { id: 'r1', name: 'El Buen Sabor', phone: '123' }

const mockSupabaseEq2 = vi.fn().mockResolvedValue({ data: MENU, error: null })
const mockSupabaseEq1 = vi.fn().mockReturnValue({ eq: mockSupabaseEq2 })
const mockSupabaseSelect = vi.fn().mockReturnValue({ eq: mockSupabaseEq1 })
const mockSupabaseFrom = vi.fn().mockReturnValue({ select: mockSupabaseSelect })

vi.mock('../src/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockSupabaseFrom }),
}))

vi.mock('../src/lib/llm', () => ({
  processWithLLM: vi.fn(),
  CHAT_TOOLS: [],
}))

import { processWithLLM } from '../src/lib/llm'

async function runTest(
  message: string,
  cart: { name: string; qty: number; price: number; notes: string }[],
  history: { role: string; content: string; timestamp: string }[],
  mockResponse: any
): Promise<ProcessResult> {
  vi.mocked(processWithLLM).mockResolvedValue(mockResponse)

  const { processChatMessage } = await import('../src/lib/chat')
  return processChatMessage(
    { from: mockSupabaseFrom } as any,
    RESTAURANT,
    message,
    cart as any,
    history as any
  )
}

describe('processChatMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseEq2.mockResolvedValue({ data: MENU, error: null })
  })

  describe('Categoria A: Flujo basico', () => {
    it('A1: saludo sin tool call', async () => {
      const result = await runTest('hola', [], [], {
        content: 'Bienvenido!',
        toolCalls: [],
      })
      expect(result.action).toBe('none')
      expect(result.reply).toContain('Bienvenido')
    })

    it('A2: add_to_cart con items nuevos', async () => {
      const result = await runTest('quiero 2 hamburguesas clasicas', [], [], {
        content: 'Agregado!',
        toolCalls: [
          { name: 'add_to_cart', args: { items: [{ name: 'Hamburguesa Clasica', qty: 2 }] } },
        ],
      })
      expect(result.action).toBe('add_item')
      expect(result.cart).toHaveLength(1)
      expect(result.cart[0].name).toBe('Hamburguesa Clasica')
      expect(result.cart[0].qty).toBe(2)
      expect(result.cart[0].price).toBe(8.5)
    })

    it('A3: add_to_cart sobre items existentes acumula', async () => {
      const existingCart = [
        { name: 'Hamburguesa Clasica', qty: 2, price: 8.5, notes: '' },
      ]
      const result = await runTest('agrega 2 mas', existingCart, [], {
        content: 'Agregadas!',
        toolCalls: [
          { name: 'add_to_cart', args: { items: [{ name: 'Hamburguesa Clasica', qty: 2 }] } },
        ],
      })
      expect(result.cart[0].qty).toBe(4)
    })
  })

  describe('Categoria B: Reemplazo de carrito (set_cart)', () => {
    it('B1: set_cart reemplaza todo el carrito', async () => {
      const existingCart = [
        { name: 'Hamburguesa Clasica', qty: 4, price: 8.5, notes: '' },
        { name: 'Coca-Cola', qty: 2, price: 1.5, notes: '' },
      ]
      const result = await runTest('nono quiero solo 2 hamburguesas', existingCart, [], {
        content: 'Listo!',
        toolCalls: [
          { name: 'set_cart', args: { items: [{ name: 'Hamburguesa Clasica', qty: 2 }] } },
        ],
      })
      expect(result.action).toBe('set_item')
      expect(result.cart).toHaveLength(1)
      expect(result.cart[0].qty).toBe(2)
    })

    it('B2: set_cart con items mixtos', async () => {
      const existingCart = [
        { name: 'Hamburguesa Clasica', qty: 4, price: 8.5, notes: '' },
        { name: 'Coca-Cola', qty: 2, price: 1.5, notes: '' },
      ]
      const result = await runTest('mejor 3 cocas y 2 papas', existingCart, [], {
        content: 'Hecho!',
        toolCalls: [
          { name: 'set_cart', args: { items: [
            { name: 'Coca-Cola', qty: 3 },
            { name: 'Papas Fritas', qty: 2 },
          ]}},
        ],
      })
      expect(result.cart).toHaveLength(2)
      expect(result.cart.find(i => i.name === 'Coca-Cola')?.qty).toBe(3)
      expect(result.cart.find(i => i.name === 'Papas Fritas')?.qty).toBe(2)
    })
  })

  describe('Categoria C: Acumulacion espuria', () => {
    it('C1: respuesta sin tool call no modifica carrito', async () => {
      const existingCart = [
        { name: 'Hamburguesa Clasica', qty: 2, price: 8.5, notes: '' },
        { name: 'Coca-Cola', qty: 1, price: 1.5, notes: '' },
      ]
      const result = await runTest('ok gracias', existingCart, [], {
        content: 'De nada!',
        toolCalls: [],
      })
      expect(result.action).toBe('none')
      expect(result.cart).toEqual(existingCart)
    })
  })

  describe('Categoria D: Edge cases', () => {
    it('D1: item invalido se reporta y no se agrega', async () => {
      const result = await runTest('agrega una pizza', [], [], {
        content: 'No tenemos pizza',
        toolCalls: [
          { name: 'add_to_cart', args: { items: [{ name: 'Pizza', qty: 1 }] } },
        ],
      })
      expect(result.invalidItems).toContain('Pizza')
      expect(result.cart).toHaveLength(0)
    })

    it('D2: remove_from_cart saca items', async () => {
      const existingCart = [
        { name: 'Hamburguesa Clasica', qty: 2, price: 8.5, notes: '' },
        { name: 'Coca-Cola', qty: 2, price: 1.5, notes: '' },
      ]
      const result = await runTest('saca las cocas', existingCart, [], {
        content: 'Sacadas!',
        toolCalls: [
          { name: 'remove_from_cart', args: { names: ['Coca-Cola'] } },
        ],
      })
      expect(result.action).toBe('remove_item')
      expect(result.cart).toHaveLength(1)
      expect(result.cart[0].name).toBe('Hamburguesa Clasica')
    })

    it('D3: cancel_order vacia el carrito', async () => {
      const existingCart = [{ name: 'Hamburguesa Clasica', qty: 4, price: 8.5, notes: '' }]
      const result = await runTest('cancela todo', existingCart, [], {
        content: 'Cancelado!',
        toolCalls: [{ name: 'cancel_order', args: {} }],
      })
      expect(result.action).toBe('cancel')
      expect(result.cart).toHaveLength(0)
    })

    it('D4: pregunta fuera del menu responde sin tool call', async () => {
      const result = await runTest('a que hora abren', [], [], {
        content: 'No tengo esa informacion',
        toolCalls: [],
      })
      expect(result.action).toBe('none')
    })

    it('D5: confirm_order limpia el carrito', async () => {
      const existingCart = [{ name: 'Hamburguesa Clasica', qty: 2, price: 8.5, notes: '' }]
      const result = await runTest('confirmo', existingCart, [], {
        content: 'Pedido confirmado!',
        toolCalls: [{ name: 'confirm_order', args: {} }],
      })
      expect(result.action).toBe('confirm_order')
      expect(result.cart).toHaveLength(0)
    })
  })

  describe('Categoria E: Primer mensaje compuesto', () => {
    it('E1: saludo + pedido procesa items', async () => {
      const result = await runTest('hola quiero 4 hamburguesas clasicas', [], [], {
        content: 'Claro!',
        toolCalls: [
          { name: 'add_to_cart', args: { items: [{ name: 'Hamburguesa Clasica', qty: 4 }] } },
        ],
      })
      expect(result.action).toBe('add_item')
      expect(result.cart[0].qty).toBe(4)
    })
  })

  describe('Manejo de errores', () => {
    it('menu vacio da error', async () => {
      mockSupabaseEq2.mockResolvedValue({ data: [], error: null })
      const { processChatMessage } = await import('../src/lib/chat')
      const result = await processChatMessage(
        { from: mockSupabaseFrom } as any,
        RESTAURANT,
        'hola', [], []
      )
      expect(result.action).toBe('error')
      expect(result.reply).toContain('menu no esta disponible')
    })

    it('LLM nulo da error', async () => {
      vi.mocked(processWithLLM).mockResolvedValue(null)
      const { processChatMessage } = await import('../src/lib/chat')
      const result = await processChatMessage(
        { from: mockSupabaseFrom } as any,
        RESTAURANT,
        'hola', [], []
      )
      expect(result.action).toBe('error')
    })
  })

  describe('set_cart con items invalidos', () => {
    it('rechaza items invalidos y conserva los validos', async () => {
      const existingCart = [{ name: 'Hamburguesa Clasica', qty: 4, price: 8.5, notes: '' }]
      const result = await runTest('nono quiero pizza y 2 hamburguesas', existingCart, [], {
        content: 'No tenemos pizza!',
        toolCalls: [
          { name: 'set_cart', args: { items: [
            { name: 'Pizza', qty: 1 },
            { name: 'Hamburguesa Clasica', qty: 2 },
          ]}},
        ],
      })
      expect(result.invalidItems).toContain('Pizza')
      expect(result.cart).toHaveLength(1)
      expect(result.cart[0].qty).toBe(2)
    })
  })
})
