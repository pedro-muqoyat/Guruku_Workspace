'use server'

import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type DashboardActionResult<T> =
  | { success: true; data: T; status: 200 }
  | { success: false; error: string; status: 400 | 403 | 500; data: [] }

type TeacherAttendanceData =
  Database['public']['Functions']['get_teacher_daily_attendance']['Returns'][number]
type StudentRankingData =
  Database['public']['Functions']['get_daily_student_rankings']['Returns'][number]

const classIdSchema = z.string().uuid()
const subjectIdSchema = z.string().uuid()

function ok<T>(data: T): DashboardActionResult<T> {
  return { success: true, data, status: 200 }
}

function unauthorized<T>(): DashboardActionResult<T> {
  return { success: false, error: 'Unauthorized access', status: 403, data: [] }
}

function databaseError<T>(): DashboardActionResult<T> {
  return { success: false, error: 'Database error', status: 500, data: [] }
}

function toUtcDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dateRange(days: number) {
  const end = new Date()
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  return { p_from: toUtcDay(start), p_to: toUtcDay(end) }
}

function isUnauthorizedRpcError(error: { code: string }) {
  return error.code === '42501'
}

function isAllowedRole(role: string | null | undefined, allowedRoles: string[]) {
  return Boolean(role && allowedRoles.includes(role.toUpperCase()))
}

export async function getTeacherAttendanceData(): Promise<
  DashboardActionResult<TeacherAttendanceData[]>
> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return unauthorized()

    const [profileResult, rpcResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.rpc('get_teacher_daily_attendance', { ...dateRange(30) }),
    ])

    if (profileResult.error) return databaseError()
    if (!isAllowedRole(profileResult.data?.role, ['ADMIN', 'WAKA', 'TU', 'GURU'])) {
      return unauthorized()
    }
    if (rpcResult.error) {
      return isUnauthorizedRpcError(rpcResult.error) ? unauthorized() : databaseError()
    }

    return ok((rpcResult.data ?? []) as TeacherAttendanceData[])
  } catch {
    return databaseError()
  }
}

export async function getClassProgressData(
  classId: string
): Promise<DashboardActionResult<StudentRankingData[]>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return unauthorized()

    const parsedClassId = classIdSchema.safeParse(classId)
    if (!parsedClassId.success) return { success: false, error: 'Invalid class identifier', status: 400, data: [] }

    const [profileResult, rpcResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.rpc('get_daily_student_rankings', {
        ...dateRange(30),
        p_class_id: parsedClassId.data,
      }),
    ])

    if (profileResult.error) return databaseError()
    if (!isAllowedRole(profileResult.data?.role, [
      'ADMIN',
      'WAKA',
      'GURU',
      'WALI',
      'WALIKELAS',
      'WALI_KELAS',
    ])) {
      return unauthorized()
    }
    if (rpcResult.error) {
      return isUnauthorizedRpcError(rpcResult.error) ? unauthorized() : databaseError()
    }

    return ok((rpcResult.data ?? []) as StudentRankingData[])
  } catch {
    return databaseError()
  }
}

export async function getTopStudentsData(
  subjectId: string
): Promise<DashboardActionResult<StudentRankingData[]>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return unauthorized()

    const parsedSubjectId = subjectIdSchema.safeParse(subjectId)
    if (!parsedSubjectId.success) return { success: false, error: 'Invalid subject identifier', status: 400, data: [] }

    const [profileResult, rpcResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.rpc('get_daily_student_rankings', {
        ...dateRange(30),
        p_subject_id: parsedSubjectId.data,
      }),
    ])

    if (profileResult.error) return databaseError()
    if (!isAllowedRole(profileResult.data?.role, [
      'ADMIN',
      'WAKA',
      'GURU',
      'WALI',
      'WALIKELAS',
      'WALI_KELAS',
    ])) {
      return unauthorized()
    }
    if (rpcResult.error) {
      return isUnauthorizedRpcError(rpcResult.error) ? unauthorized() : databaseError()
    }

    return ok((rpcResult.data ?? []) as StudentRankingData[])
  } catch {
    return databaseError()
  }
}