import type { LLMResponse } from './types'
import { processWithGroq } from './groq'
import { processWithOpenAI } from './openai'

export async function processWithLLM(
  messages: { role: string; content: string }[]
): Promise<LLMResponse | null> {
  if (process.env.OPENAI_API_KEY) {
    return processWithOpenAI(messages)
  }
  return processWithGroq(messages)
}
