import type { LLMResponse, ToolCall } from './types'
import { processWithGroq } from './groq'
import { processWithOpenAI } from './openai'

export const CHAT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'add_to_cart',
      description: 'Agregar uno o mas items al carrito del pedido',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nombre exacto del item segun el menu' },
                qty: { type: 'number', description: 'Cantidad a pedir' },
                notes: { type: 'string', description: 'Observaciones ej: sin cebolla, bien cocida' },
              },
              required: ['name', 'qty'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_from_cart',
      description: 'Sacar uno o mas items del carrito del pedido',
      parameters: {
        type: 'object',
        properties: {
          names: {
            type: 'array',
            items: { type: 'string' },
            description: 'Nombres exactos de los items a sacar',
          },
        },
        required: ['names'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'show_summary',
      description: 'Mostrar el resumen del pedido actual',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'confirm_order',
      description: 'Confirmar el pedido. Solo llamar cuando el cliente diga explicitamente que quiere confirmar (ej: "confirmo", "si mandalo", "dale confirmalo")',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_order',
      description: 'Cancelar todo el pedido actual',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_cart',
      description: 'Reemplazar TODO el carrito con una nueva seleccion de items. USAR SOLO cuando el cliente quiera CAMBIAR su pedido (ej: "no, quiero solo 2 hamburguesas", "mejor poneme 3 cocas y una hamburguesa"). Esto BORRA todo lo anterior y pone solo lo nuevo.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nombre exacto del item segun el menu' },
                qty: { type: 'number', description: 'Cantidad' },
                notes: { type: 'string', description: 'Observaciones ej: sin cebolla, bien cocida' },
              },
              required: ['name', 'qty'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
]

export async function processWithLLM(
  messages: { role: string; content: string }[]
): Promise<LLMResponse | null> {
  if (process.env.OPENAI_API_KEY) {
    return processWithOpenAI(messages)
  }
  return processWithGroq(messages)
}
