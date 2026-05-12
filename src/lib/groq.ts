import Groq from 'groq-sdk'
import type { LLMResponse } from './types'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

export async function processWithGroq(
  messages: { role: string; content: string }[]
): Promise<LLMResponse | null> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: messages as any,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null

    return JSON.parse(content) as LLMResponse
  } catch (err) {
    console.error('Groq error:', err)
    return null
  }
}
