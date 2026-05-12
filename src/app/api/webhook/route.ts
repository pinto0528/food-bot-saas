import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint ready' })
}

export async function POST(request: Request) {
  const body = await request.json()
  return NextResponse.json({ received: true, body })
}
