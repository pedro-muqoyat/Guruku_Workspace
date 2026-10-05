'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getActionFieldErrors, type AppActionResult } from '@/lib/template-apps/action-result'
import type { Database } from '@/types/database.types'

const noteInputSchema = z.object({
  title: z.string().trim().min(1).max(10000),
  color: z.enum(['primary', 'warning', 'error', 'success', 'secondary']),
}).strict()
const noteIdSchema = z.string().uuid()
type Note = Database['public']['Tables']['notes']['Row']

export async function createNote(input: unknown): Promise<AppActionResult<Note>> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const parsed = noteInputSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Catatan tidak valid.', fieldErrors: getActionFieldErrors(parsed.error.issues) }

  const { data, error } = await supabase.from('notes').insert({
    owner_id: user.id,
    title: parsed.data.title,
    color: parsed.data.color,
  }).select('id, owner_id, title, color, created_at, updated_at').single()

  if (error || !data) return { success: false, error: 'Catatan tidak dapat dibuat.' }
  revalidatePath('/apps/notes')
  return { success: true, data }
}

export async function updateNote(id: unknown, input: unknown): Promise<AppActionResult<Note>> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const parsedId = noteIdSchema.safeParse(id)
  const parsed = noteInputSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    const issues = [
      ...(!parsedId.success ? parsedId.error.issues : []),
      ...(!parsed.success ? parsed.error.issues : []),
    ]
    return { success: false, error: 'Catatan tidak valid.', fieldErrors: getActionFieldErrors(issues) }
  }

  const { data, error } = await supabase.from('notes').update({
    title: parsed.data.title,
    color: parsed.data.color,
    updated_at: new Date().toISOString(),
  }).eq('id', parsedId.data).eq('owner_id', user.id)
    .select('id, owner_id, title, color, created_at, updated_at').maybeSingle()

  if (error || !data) return { success: false, error: 'Catatan tidak ditemukan atau tidak dapat diperbarui.' }
  revalidatePath('/apps/notes')
  return { success: true, data }
}

export async function deleteNote(id: unknown): Promise<AppActionResult<{ id: string }>> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const parsedId = noteIdSchema.safeParse(id)
  if (!parsedId.success) return { success: false, error: 'ID catatan tidak valid.' }

  const { data, error } = await supabase.from('notes').delete()
    .eq('id', parsedId.data).eq('owner_id', user.id).select('id').maybeSingle()
  if (error || !data) return { success: false, error: 'Catatan tidak ditemukan atau tidak dapat dihapus.' }

  revalidatePath('/apps/notes')
  return { success: true, data }
}
