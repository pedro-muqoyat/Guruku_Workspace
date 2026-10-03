'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { authCookieOptions } from '@/lib/supabase/auth-cookie-options'
import { z } from 'zod'
import {
  toFieldErrors,
  type ActionResponse,
} from '@/schemas/validation'

const teachingJournalSchema = z
  .object({
    sessionId: z.string().trim().uuid(),
    topic: z.string().trim().min(1).max(120),
    note: z.string().trim().min(1).max(2000),
    durationMinutes: z.number().int().min(1).max(300),
  })
  .strict()

export async function submitTeachingJournal(
  input: unknown
): Promise<ActionResponse<{ updated: number }>> {
  const parsed = teachingJournalSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: 'Catatan pembelajaran tidak valid.',
      fieldErrors: toFieldErrors(parsed.error),
    }
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: authCookieOptions,
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Sesi pengguna tidak valid.' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || profile?.role !== 'GURU') {
      return {
        success: false,
        error: 'Anda tidak memiliki akses untuk menulis jurnal mengajar.',
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from('class_sessions')
      .select('id, schedule_id')
      .eq('id', parsed.data.sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return {
        success: false,
        error: 'Sesi kelas tidak ditemukan atau tidak dapat diakses.',
      }
    }

    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('id, guru_id')
      .eq('id', session.schedule_id)
      .maybeSingle()

    if (scheduleError || !schedule || schedule.guru_id !== user.id) {
      return {
        success: false,
        error: 'Sesi kelas tidak ditugaskan kepada Anda.',
      }
    }

    const { error: insertError } = await supabase.from('teaching_journals').upsert(
      {
        session_id: parsed.data.sessionId,
        topic: parsed.data.topic,
        notes: parsed.data.note,
        duration_minutes: parsed.data.durationMinutes,
      },
      { onConflict: 'session_id' }
    )

    if (insertError) {
      return {
        success: false,
        error: 'Jurnal pembelajaran gagal disimpan.',
      }
    }

    revalidatePath('/apps/journal')

    return {
      success: true,
      data: { updated: 1 },
    }
  } catch {
    return { success: false, error: 'Terjadi kesalahan saat menyimpan jurnal.' }
  }
}
