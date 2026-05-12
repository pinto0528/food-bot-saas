export async function sendWhatsAppMessage(
  token: string,
  phoneNumberId: string,
  to: string,
  text: string
): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('WhatsApp send error:', err)
      return false
    }

    return true
  } catch (err) {
    console.error('WhatsApp send exception:', err)
    return false
  }
}
