import { NextResponse } from 'next/server'
import { getQR, getConnectionStatus } from '@/lib/baileys/qr-store'

export async function GET() {
  return NextResponse.json({
    qr: getQR(),
    status: getConnectionStatus(),
  })
}
