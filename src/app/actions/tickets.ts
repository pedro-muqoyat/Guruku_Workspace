'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getActionFieldErrors, type AppActionResult } from '@/lib/template-apps/action-result'
import type { Database } from '@/types/database.types'

const createTicketSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  date: z.string().date(),
}).strict()
const ticketIdSchema = z.string().uuid()
type Ticket = Database['public']['Tables']['tickets']['Row']
type TicketWithOwner = Ticket & { owner_name: string }

export async function createTicket(input: unknown): Promise<AppActionResult<TicketWithOwner>> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const parsed = createTicketSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Tiket tidak valid.', fieldErrors: getActionFieldErrors(parsed.error.issues) }

  const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle()
  const { data, error } = await supabase.from('tickets').insert({
    owner_id: user.id,
    ticket_title: parsed.data.title,
    ticket_description: parsed.data.description,
    ticket_date: parsed.data.date,
  }).select('id, owner_id, ticket_title, ticket_description, status, ticket_date, created_at').single()

  if (error || !data) return { success: false, error: 'Tiket tidak dapat dibuat.' }
  revalidatePath('/apps/tickets')
  revalidatePath('/apps/tickets/create')
  return { success: true, data: { ...data, owner_name: profile?.full_name?.trim() || 'You' } }
}

export async function deleteTicket(id: unknown): Promise<AppActionResult<{ id: string }>> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const parsedId = ticketIdSchema.safeParse(id)
  if (!parsedId.success) return { success: false, error: 'ID tiket tidak valid.' }

  const { data, error } = await supabase.from('tickets').delete()
    .eq('id', parsedId.data).eq('owner_id', user.id).select('id').maybeSingle()
  if (error || !data) return { success: false, error: 'Tiket tidak ditemukan atau tidak dapat dihapus.' }

  revalidatePath('/apps/tickets')
  return { success: true, data }
}
