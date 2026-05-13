import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { email, password, name, restaurant_id } = await request.json()

  if (!email || !password || !restaurant_id) {
    return NextResponse.json({ error: 'email, password, and restaurant_id are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Create auth user
  const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Assign restaurant_id to profile (trigger already created the profile row)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ restaurant_id, name: name || null, role: 'restaurant_owner' })
    .eq('id', authUser.user.id)

  if (profileError) {
    // Cleanup: delete auth user if profile update fails
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ id: authUser.user.id, email })
}
