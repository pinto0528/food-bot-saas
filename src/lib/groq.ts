import Groq from 'groq-sdk'
import type { LLMResponse, ToolCall } from './types'
import { CHAT_TOOLS } from './llm'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

export async function processWithGroq(
  messages: { role: string; content: string }[]
): Promise<LLMResponse | null> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: messages as any,
      temperature: 0.3,
      tools: CHAT_TOOLS,
      tool_choice: 'auto',
    })

    const choice = completion.choices[0]?.message
    if (!choice) return null

    const content = choice.content || ''
    const toolCalls: ToolCall[] = []

    if (choice.tool_calls) {
      for (const tc of choice.tool_calls) {
        if (tc.type === 'function') {
          toolCalls.push({
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments),
          })
        }
      }
    }

    return { content, toolCalls }
  } catch (err) {
    console.error('Groq error:', err)
    return null
  }
}
