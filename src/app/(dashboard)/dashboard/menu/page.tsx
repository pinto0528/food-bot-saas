'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category: string | null
  available: boolean
}

const defaultForm = { name: '', description: '', price: 0, category: '', available: true }

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState(defaultForm)
  const supabase = createClient()

  const fetchItems = async () => {
    const { data: user, error: userErr } = await supabase.auth.getUser()
    if (userErr) { console.error('getUser error:', userErr); return }
    if (!user.user) { console.error('no user'); return }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.user.id)
      .single()
    if (profileErr) console.error('profile err:', profileErr)
    if (!profile?.restaurant_id) { console.error('no restaurant_id'); setLoading(false); return }

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', profile.restaurant_id)
      .order('category', { ascending: true })
    if (error) console.error('menu_items query err:', error)

    setItems((data as MenuItem[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const openEdit = (item: MenuItem) => {
    setEditing(item)
    setForm({ name: item.name, description: item.description || '', price: item.price, category: item.category || '', available: item.available })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('El nombre es obligatorio'); return }

    const { data: user } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.user!.id)
      .single()
    if (!profile?.restaurant_id) return

    if (editing) {
      const { error } = await supabase
        .from('menu_items')
        .update({ name: form.name, description: form.description || null, price: form.price, category: form.category || null, available: form.available })
        .eq('id', editing.id)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Item actualizado')
    } else {
      const { error } = await supabase
        .from('menu_items')
        .insert({ restaurant_id: profile.restaurant_id, name: form.name, description: form.description || null, price: form.price, category: form.category || null, available: form.available })
      if (error) { toast.error('Error al crear'); return }
      toast.success('Item creado')
    }

    setDialogOpen(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este item del menú?')) return
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Item eliminado')
    fetchItems()
  }

  const toggleAvailable = async (item: MenuItem) => {
    await supabase.from('menu_items').update({ available: !item.available }).eq('id', item.id)
    fetchItems()
  }

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[]

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menú</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay items en el menú</p>
          <p className="text-sm">Agregá tu primer item para empezar</p>
        </div>
      ) : (
        categories.length > 0 ? (
          categories.map((cat) => (
            <div key={cat}>
              <h2 className="font-semibold text-lg mb-3 capitalize">{cat}</h2>
              <div className="space-y-2">
                {items.filter((i) => i.category === cat).map((item) => (
                  <MenuItemRow key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleAvailable} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <MenuItemRow key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleAvailable} />
            ))}
          </div>
        )
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Item' : 'Nuevo Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Hamburguesa Clásica" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve descripción" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio</Label>
                <Input type="number" step="0.01" min="0" value={form.price || ''} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ej: Hamburguesas" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} />
              <Label>Disponible</Label>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editing ? 'Guardar Cambios' : 'Crear Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MenuItemRow({
  item,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onDelete: (id: string) => void
  onToggle: (item: MenuItem) => void
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${!item.available ? 'line-through text-muted-foreground' : ''}`}>
              {item.name}
            </span>
            {item.category && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{item.category}</span>
            )}
            {!item.available && (
              <span className="text-xs text-muted-foreground">(no disponible)</span>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground truncate">{item.description}</p>
          )}
        </div>
        <span className="font-semibold text-sm">${item.price.toFixed(2)}</span>
        <Switch checked={item.available} onCheckedChange={() => onToggle(item)} />
        <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardContent>
    </Card>
  )
}
