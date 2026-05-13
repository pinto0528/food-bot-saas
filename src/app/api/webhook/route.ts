import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint not used with Baileys' })
}

export async function POST() {
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint not used with Baileys' })
}
