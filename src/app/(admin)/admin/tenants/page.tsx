'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Pencil, Search } from 'lucide-react'

interface Restaurant {
  id: string
  name: string
  phone: string
  waba_id: string | null
  waba_token: string | null
  phone_number_id: string | null
  webhook_verify_token: string | null
  status: 'active' | 'suspended' | 'trial'
  created_at: string
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  trial: 'bg-yellow-100 text-yellow-800',
}

const statusLabels: Record<string, string> = {
  active: 'Activo',
  suspended: 'Suspendido',
  trial: 'Trial',
}

const emptyForm = {
  name: '', phone: '', waba_id: '', waba_token: '', phone_number_id: '',
  webhook_verify_token: '', status: 'trial' as 'active' | 'suspended' | 'trial',
}

export default function TenantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Restaurant | null>(null)
  const [form, setForm] = useState(emptyForm)
  const supabase = createClient()
  const PAGE_SIZE = 10

  const fetch = async () => {
    const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false })
    setRestaurants((data as Restaurant[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const filtered = restaurants.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search)
  )
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true) }
  const openEdit = (r: Restaurant) => {
    setEditing(r)
    setForm({ name: r.name, phone: r.phone, waba_id: r.waba_id || '', waba_token: r.waba_token || '', phone_number_id: r.phone_number_id || '', webhook_verify_token: r.webhook_verify_token || '', status: r.status })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('El nombre es obligatorio'); return }
    if (editing) {
      const { error } = await supabase.from('restaurants').update(form).eq('id', editing.id)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Restaurante actualizado')
    } else {
      const { error } = await supabase.from('restaurants').insert(form)
      if (error) { toast.error('Error al crear'); return }
      toast.success('Restaurante creado')
    }
    setDialogOpen(false)
    fetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este restaurante? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('restaurants').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Restaurante eliminado')
    fetch()
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Nuevo Restaurante</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nombre o teléfono..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left p-3 font-medium">Nombre</th>
                <th className="text-left p-3 font-medium">Teléfono</th>
                <th className="text-left p-3 font-medium">Estado</th>
                <th className="text-left p-3 font-medium">Creado</th>
                <th className="text-right p-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-muted-foreground">{r.phone}</td>
                  <td className="p-3">
                    <Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-destructive">✕</Button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No se encontraron restaurantes</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {Math.ceil(filtered.length / PAGE_SIZE)}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(page + 1)}>Siguiente</Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar Restaurante' : 'Nuevo Restaurante'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="suspended">Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Business Account ID</Label>
              <Input value={form.waba_id} onChange={(e) => setForm({ ...form, waba_id: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>WABA Token</Label>
              <Input value={form.waba_token} onChange={(e) => setForm({ ...form, waba_token: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input value={form.phone_number_id} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Webhook Verify Token</Label>
                <Input value={form.webhook_verify_token} onChange={(e) => setForm({ ...form, webhook_verify_token: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Guardar Cambios' : 'Crear Restaurante'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
