import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { createAdminClient } from '../supabase/admin'
import { registerSendMessage } from '../whatsapp'
import { handleIncomingMessage } from '../webhook/handler'
import { logError } from '../webhook/errors'
import { setQR, setConnectionStatus } from './qr-store'
import * as path from 'path'
import * as fs from 'fs'

const RESTAURANT_ID = process.env.BOT_RESTAURANT_ID || ''
const SESSIONS_DIR = process.env.BOT_SESSIONS_DIR || './sessions'

export async function startBot(): Promise<void> {
  const supabase = createAdminClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', RESTAURANT_ID)
    .single()

  if (!restaurant) {
    console.error(`Restaurant not found: ${RESTAURANT_ID}`)
    process.exit(1)
  }

  const sessionDir = path.join(SESSIONS_DIR, RESTAURANT_ID)
  fs.mkdirSync(sessionDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  })

  registerSendMessage(async (to: string, text: string) => {
    try {
      const jid = `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`
      await sock.sendMessage(jid, { text })
      return true
    } catch (err) {
      console.error('Baileys send error:', err)
      return false
    }
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      setQR(qr)
      setConnectionStatus('connecting')
      console.log('QR received (scan with WhatsApp)')
    }

    if (connection === 'close') {
      setConnectionStatus('disconnected')
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut

      if (shouldReconnect) {
        console.log('Connection closed, reconnecting...')
        setTimeout(() => startBot(), 5000)
      } else {
        console.log('Logged out, QR needed')
        setQR(null)
      }
    }

    if (connection === 'open') {
      setConnectionStatus('connected')
      setQR(null)
      console.log(`WhatsApp connected for ${restaurant.name}`)
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      if (!msg.message?.conversation && !msg.message?.extendedTextMessage?.text) continue

      const from = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

      try {
        await handleIncomingMessage(supabase, restaurant, from, text)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Message handler error:', errMsg)
        await logError(supabase, restaurant.id, 'whatsapp', errMsg, { from, text })
      }
    }
  })

  console.log(`Bot started for ${restaurant.name}`)
}
