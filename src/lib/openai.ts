import OpenAI from 'openai'
import type { LLMResponse, ToolCall } from './types'
import { CHAT_TOOLS } from './llm'

export async function processWithOpenAI(
  messages: { role: string; content: string }[]
): Promise<LLMResponse | null> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
    console.error('OpenAI error:', err)
    return null
  }
}
