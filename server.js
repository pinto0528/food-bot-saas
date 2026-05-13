const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  // Start WhatsApp bot (Baileys) in the same process
  if (!dev && process.env.BOT_RESTAURANT_ID) {
    try {
      const { startBot } = require('./src/lib/baileys/bot')
      startBot().catch((err: Error) => {
        console.error('WhatsApp bot failed:', err)
      })
    } catch (err) {
      console.error('Failed to load WhatsApp bot:', err)
    }
  }

  createServer((req: any, res: any) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  }).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
