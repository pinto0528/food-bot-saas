import { createAdminClient } from '@/lib/supabase/admin'
import DemoClient from './demo-client'

export const dynamic = 'force-dynamic'

export default async function DemoPage() {
  const supabase = createAdminClient()

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name')
    .in('status', ['active', 'trial'])

  return <DemoClient restaurants={restaurants || []} />
}
