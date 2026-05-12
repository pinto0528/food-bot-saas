import OpenAI from 'openai'
import type { LLMResponse } from './types'

export async function processWithOpenAI(
  messages: { role: string; content: string }[]
): Promise<LLMResponse | null> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null

    return JSON.parse(content) as LLMResponse
  } catch (err) {
    console.error('OpenAI error:', err)
    return null
  }
}
