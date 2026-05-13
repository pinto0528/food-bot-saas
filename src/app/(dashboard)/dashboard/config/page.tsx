'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Lock } from 'lucide-react'

export default function ConfigPage() {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user.user.id)
        .single()

      if (!profile?.restaurant_id) return

      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', profile.restaurant_id)
        .single()

      setRestaurant(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Restaurante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nombre</span>
            <span className="font-medium">{restaurant?.name || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Teléfono</span>
            <span className="font-medium">{restaurant?.phone || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dirección</span>
            <span className="font-medium">{restaurant?.address || '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estado</span>
            <Badge variant={restaurant?.waba_token ? 'default' : 'secondary'}>
              {restaurant?.waba_token ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
          {restaurant?.phone_number_id && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID de Número</span>
              <span className="font-medium font-mono text-xs">{restaurant.phone_number_id}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plan actual</span>
            <Badge variant="outline">Trial</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          <a href="/dashboard/cambiar-contrasena">
            <Button variant="outline" className="w-full">
              <Lock className="h-4 w-4 mr-2" />
              Cambiar Contraseña
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
