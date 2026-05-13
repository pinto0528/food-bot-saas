'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'

export default function MonitoreoPage() {
  const [errors, setErrors] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [errRes, restRes] = await Promise.all([
        supabase.from('error_logs').select('*').gte('created_at', today.toISOString()).order('created_at', { ascending: false }).limit(50),
        supabase.from('restaurants').select('id, name, status'),
      ])

      setErrors((errRes.data as any[]) || [])
      setRestaurants((restRes.data as any[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>

  const errorCount = errors.length
  const hasErrors = errorCount > 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Monitoreo</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estado Webhook</CardTitle>
            {hasErrors ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={hasErrors ? 'destructive' : 'default'}>{hasErrors ? 'Con errores' : 'OK'}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Errores Hoy</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Restaurantes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{restaurants.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{restaurants.filter((r: any) => r.status === 'active').length} activos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Errores Recientes (últimas 24h)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {errors.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Sin errores en las últimas 24 horas</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-3 font-medium">Hora</th>
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {errors.slice(0, 20).map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3 text-xs">{new Date(e.created_at).toLocaleTimeString()}</td>
                    <td className="p-3"><Badge variant="outline">{e.type}</Badge></td>
                    <td className="p-3 text-muted-foreground max-w-xs truncate">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
