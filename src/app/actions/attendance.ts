'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { authCookieOptions } from '@/lib/supabase/auth-cookie-options'
import {
  attendanceSchema,
  toFieldErrors,
  type ActionResponse,
} from '@/schemas/validation'

export async function submitAttendance(
  input: unknown
): Promise<ActionResponse<{ updated: number }>> {
  const parsed = attendanceSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: 'Data absensi tidak valid.',
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
        error: 'Anda tidak memiliki akses untuk mencatat absensi.',
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
      .select('id, class_id, guru_id')
      .eq('id', session.schedule_id)
      .maybeSingle()

    if (scheduleError || !schedule || schedule.guru_id !== user.id) {
      return {
        success: false,
        error: 'Sesi kelas tidak ditugaskan kepada Anda.',
      }
    }

    const studentIds = parsed.data.rows.map((row) => row.studentId)
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', schedule.class_id)
      .in('id', studentIds)

    if (studentsError || students?.length !== studentIds.length) {
      return {
        success: false,
        error: 'Satu atau lebih siswa tidak berada di kelas sesi ini.',
      }
    }

    const { error: upsertError } = await supabase
      .from('attendance_logs')
      .upsert(
        parsed.data.rows.map((row) => ({
          session_id: parsed.data.sessionId,
          student_id: row.studentId,
          status: row.status,
        })),
        { onConflict: 'session_id,student_id' }
      )

    if (upsertError) {
      return {
        success: false,
        error: 'Absensi gagal disimpan. Periksa data dan coba lagi.',
      }
    }

    revalidatePath('/apps/attendance')

    return {
      success: true,
      data: { updated: parsed.data.rows.length },
    }
  } catch {
    return { success: false, error: 'Terjadi kesalahan saat menyimpan absensi.' }
  }
}