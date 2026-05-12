'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Phone, CheckCircle, CookingPot, Package, Truck } from 'lucide-react'
import { toast } from 'sonner'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

interface OrderItem {
  name: string
  qty: number
  price: number
  notes?: string
}

interface Order {
  id: string
  customer_phone: string
  customer_name: string | null
  items: OrderItem[]
  total: number
  status: OrderStatus
  created_at: string
  notes: string | null
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
}

const nextActions: Record<OrderStatus, { status: OrderStatus; label: string; icon: any }[]> = {
  pending: [{ status: 'confirmed', label: 'Confirmar', icon: CheckCircle }],
  confirmed: [{ status: 'preparing', label: 'Preparando', icon: CookingPot }],
  preparing: [{ status: 'ready', label: 'Listo', icon: Package }],
  ready: [{ status: 'delivered', label: 'Entregado', icon: Truck }],
  delivered: [],
  cancelled: [],
}

const statusFilters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Listos' },
]

function OrderCard({ order, onUpdate }: { order: Order; onUpdate: () => void }) {
  const supabase = createClient()

  const handleStatusChange = async (newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id)
    if (error) {
      toast.error('Error al actualizar estado')
    } else {
      toast.success(`Pedido ${statusLabels[newStatus].toLowerCase()}`)
      onUpdate()
    }
  }

  const timeAgo = () => {
    const minutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `Hace ${minutes} min`
    return `Hace ${Math.floor(minutes / 60)}h`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {order.customer_name || 'Cliente'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{timeAgo()}</span>
            <Badge className={statusColors[order.status]}>
              {statusLabels[order.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left py-1 font-medium">Item</th>
              <th className="text-center py-1 font-medium">Cant</th>
              <th className="text-right py-1 font-medium">Precio</th>
            </tr>
          </thead>
          <tbody>
            {(order.items as OrderItem[]).map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-1">
                  {item.name}
                  {item.notes && (
                    <span className="text-xs text-muted-foreground ml-1">({item.notes})</span>
                  )}
                </td>
                <td className="text-center py-1">{item.qty}</td>
                <td className="text-right py-1">${(item.price * item.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-medium">
              <td colSpan={2} className="pt-2">Total</td>
              <td className="text-right pt-2">${order.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {order.notes && (
          <p className="text-xs text-muted-foreground mb-3">Nota: {order.notes}</p>
        )}

        <div className="flex gap-2 flex-wrap">
          {nextActions[order.status].map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.status}
                size="sm"
                onClick={() => handleStatusChange(action.status)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {action.label}
              </Button>
            )
          })}
          {order.status === 'pending' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleStatusChange('cancelled')}
            >
              Cancelar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(order.customer_phone)
              toast.success('Número copiado')
            }}
          >
            <Phone className="h-3 w-3 mr-1" />
            Llamar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const supabase = createClient()

  const fetchOrders = async () => {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.user.id)
      .single()

    if (!profile?.restaurant_id) return

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', profile.restaurant_id)
      .order('created_at', { ascending: false })
      .limit(50)

    setOrders((data as Order[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        {statusFilters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1 text-xs">
                ({orders.filter((o) => o.status === f.value).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No hay pedidos {filter !== 'all' ? 'con este estado' : 'todavía'}</p>
          <p className="text-sm">Los pedidos aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} onUpdate={fetchOrders} />
          ))}
        </div>
      )}
    </div>
  )
}
