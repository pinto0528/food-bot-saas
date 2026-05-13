let currentQR: string | null = null
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected'

export function setQR(qr: string | null): void {
  currentQR = qr
}

export function setConnectionStatus(status: 'disconnected' | 'connecting' | 'connected'): void {
  connectionStatus = status
}

export function getQR(): string | null {
  return currentQR
}

export function getConnectionStatus(): string {
  return connectionStatus
}
