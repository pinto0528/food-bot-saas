import * as fs from 'fs'
import * as path from 'path'

const LOG_DIR = process.env.DEBUG_LOG_DIR || './logs/chat'

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function logChatInteraction(data: {
  restaurantName: string
  userMessage: string
  systemPrompt: string
  llmInput: any[]
  llmResponse: any
  llmMs: number
  toolCalls: any[]
  cartBefore: any[]
  cartAfter: any[]
  reply: string
  action: string
  invalidItems: string[]
}) {
  try {
    ensureDir(LOG_DIR)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${timestamp}_${data.restaurantName.replace(/\s+/g, '_')}.json`
    const filepath = path.join(LOG_DIR, filename)

    const entry = {
      timestamp: new Date().toISOString(),
      restaurant: data.restaurantName,
      userMessage: data.userMessage,
      systemPrompt: data.systemPrompt,
      llmInput: data.llmInput,
      llmResponse: data.llmResponse,
      llmMs: data.llmMs,
      toolCalls: data.toolCalls,
      cartBefore: data.cartBefore,
      cartAfter: data.cartAfter,
      reply: data.reply,
      action: data.action,
      invalidItems: data.invalidItems,
    }

    fs.writeFileSync(filepath, JSON.stringify(entry, null, 2), 'utf-8')
  } catch (err) {
    console.error('Debug log write failed:', err)
  }
}
