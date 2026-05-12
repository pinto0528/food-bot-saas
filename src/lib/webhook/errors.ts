import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import type { ErrorLogType } from '../types'

export async function logError(
  supabase: SupabaseClient<Database>,
  restaurantId: string | null,
  type: ErrorLogType,
  message: string,
  details?: any
) {
  try {
    await supabase.from('error_logs').insert({
      restaurant_id: restaurantId,
      type,
      message,
      details: details || null,
    })
  } catch (err) {
    console.error('Failed to log error:', err)
  }
}
