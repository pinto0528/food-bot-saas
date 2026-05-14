'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Restaurant {
  id: string
  name: string
}

interface OrderItem {
  name: string
  qty: number
  price: number
  notes?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ToolCall {
  name: string
  args: Record<string, any>
}

interface DebugInfo {
  llmInput: { role: string; content: string }[]
  llmResponse: { content: string; toolCalls: ToolCall[] } | null
  llmMs: number
}

interface ChatResponse {
  reply: string
  action: string
  cart: OrderItem[]
  history: { role: string; content: string; timestamp: string }[]
  debug: DebugInfo
}

export default function DemoClient({ restaurants }: { restaurants: Restaurant[] }) {
  const [selectedId, setSelectedId] = useState(restaurants[0]?.id || '')
  const [messages, setMessages] = useState<Message[]>([])
  const [cart, setCart] = useState<OrderItem[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [debug, setDebug] = useState<DebugInfo | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !selectedId || loading) return

    const text = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          restaurantId: selectedId,
          cart,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: new Date().toISOString(),
          })),
        }),
      })

      const data: ChatResponse = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      setCart(data.cart)
      setDebug(data.debug)
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error de conexion.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const resetChat = () => {
    setMessages([])
    setCart([])
    setDebug(null)
  }

  const selectedRestaurant = restaurants.find((r) => r.id === selectedId)
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <span className="text-xl font-bold shrink-0">FoodBot</span>
          <select
            className="border rounded-md px-3 py-1.5 text-sm"
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); resetChat() }}
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)}>
              {showDebug ? 'Ocultar Debug' : 'Debug'}
            </Button>
            <Button variant="outline" size="sm" onClick={resetChat}>
              Nueva
            </Button>
            <a href="/">
              <Button variant="ghost" size="sm">Volver</Button>
            </a>
          </div>
        </div>
      </header>

      <main className={`flex-1 container mx-auto px-4 py-6 flex gap-6 max-w-${showDebug ? '6xl' : '5xl'}`}>
        <div className="flex-1 flex flex-col border rounded-lg bg-card">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[65vh]">
            {messages.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                Escribe algo para probar el bot de <strong>{selectedRestaurant?.name}</strong>
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2 text-sm animate-pulse">
                  Pensando... {debug?.llmMs ? `(${(debug.llmMs / 1000).toFixed(1)}s)` : ''}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t p-4 flex gap-2">
            <input
              className="flex-1 border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Escribi tu pedido..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()}>
              Enviar
            </Button>
          </div>
        </div>

        {showDebug && debug && (
          <aside className="w-96 shrink-0 overflow-y-auto max-h-[75vh] space-y-3">
            <div className="border rounded-lg p-3 text-xs font-mono">
              <h4 className="font-semibold mb-1 not-italic">LLM Response</h4>
              <pre className="whitespace-pre-wrap break-words bg-muted p-2 rounded max-h-40 overflow-y-auto">
                {JSON.stringify(debug.llmResponse, null, 2)}
              </pre>
              <p className="text-muted-foreground mt-1">Tiempo: {(debug.llmMs / 1000).toFixed(1)}s</p>
            </div>

            <div className="border rounded-lg p-3 text-xs font-mono">
              <h4 className="font-semibold mb-1 not-italic">System Prompt (ultimo mensaje)</h4>
              <pre className="whitespace-pre-wrap break-words bg-muted p-2 rounded max-h-60 overflow-y-auto">
                {debug.llmInput.find((m) => m.role === 'system')?.content || '(vacio)'}
              </pre>
            </div>

            <div className="border rounded-lg p-3 text-xs font-mono">
              <h4 className="font-semibold mb-1 not-italic">LLM Input (completo)</h4>
              <pre className="whitespace-pre-wrap break-words bg-muted p-2 rounded max-h-40 overflow-y-auto">
                {JSON.stringify(debug.llmInput, null, 2)}
              </pre>
            </div>
          </aside>
        )}

        {!showDebug && (
          <aside className="w-72 shrink-0">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Carrito</h3>
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">Vacio</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, i) => (
                    <div key={i} className="text-sm flex justify-between">
                      <span>
                        {item.name} x{item.qty}
                      </span>
                      <span className="text-muted-foreground">
                        ${(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 font-semibold flex justify-between text-sm">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  )
}
