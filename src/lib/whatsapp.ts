type SendMessageFn = (to: string, text: string) => Promise<boolean>

let sendFn: SendMessageFn | null = null

export function registerSendMessage(fn: SendMessageFn): void {
  sendFn = fn
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  if (!sendFn) {
    console.error('WhatsApp sender not registered')
    return false
  }
  return sendFn(to, text)
}
