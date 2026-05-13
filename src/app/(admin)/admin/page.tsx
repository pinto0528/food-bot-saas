'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Store, ShoppingCart, AlertTriangle, TrendingUp } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadStats = async () => {
    const { data: restaurants } = await supabase.from('restaurants').select('id, status')
    const { data: orders } = await supabase.from('orders').select('id, status, created_at')
    const { data: errors } = await supabase.from('error_logs').select('id, created_at')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(today.getTime() - 7 * 86400000)
    const monthAgo = new Date(today.getTime() - 30 * 86400000)

    setStats({
      totalRestaurants: restaurants?.length || 0,
      activeRestaurants: restaurants?.filter((r: any) => r.status === 'active').length || 0,
      trialRestaurants: restaurants?.filter((r: any) => r.status === 'trial').length || 0,
      totalOrders: orders?.length || 0,
      ordersToday: orders?.filter((o: any) => new Date(o.created_at) >= today).length || 0,
      ordersWeek: orders?.filter((o: any) => new Date(o.created_at) >= weekAgo).length || 0,
      ordersMonth: orders?.filter((o: any) => new Date(o.created_at) >= monthAgo).length || 0,
      errors24h: errors?.filter((e: any) => new Date(e.created_at) >= today).length || 0,
    })
    setLoading(false)
  }

  useEffect(() => { loadStats() }, [])

  if (loading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>

  const cards = [
    { title: 'Restaurantes', value: `${stats.activeRestaurants}/${stats.totalRestaurants}`, sub: `${stats.trialRestaurants} en trial`, icon: Store },
    { title: 'Pedidos Hoy', value: stats.ordersToday, sub: `${stats.ordersWeek} esta semana · ${stats.ordersMonth} este mes`, icon: ShoppingCart },
    { title: 'Total Pedidos', value: stats.totalOrders, sub: 'histórico', icon: TrendingUp },
    { title: 'Errores 24h', value: stats.errors24h, sub: stats.errors24h > 0 ? 'Revisar logs' : 'Sin errores', icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel Super Admin</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
