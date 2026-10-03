'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { authCookieOptions } from '@/lib/supabase/auth-cookie-options'
import { z } from 'zod'
import {
  gradesSchema,
  toFieldErrors,
  type ActionResponse,
} from '@/schemas/validation'
import type { Database } from '@/types/database.types'

type GradeCategory = 'FORMATIF' | 'SUMATIF' | 'STS' | 'SAS'
type StudentType = 'Reguler' | 'Atlet'

type FinalGradePreview = {
  studentId: string
  statusSiswa: StudentType
  formativeAverage: number | null
  physicalAttendanceRate: number | null
  attendanceScore: number | null
  presentMeetings: number
  totalMeetings: number
  summativeAverage: number | null
  weights: {
    formative: number
    attendance: number
    summative: number
  }
  finalGrade: number | null
}

type GradeComponents = {
  formative: number[]
  summative: number[]
  presentMeetings: number
  totalMeetings: number
  isAthlete: boolean
}

const calculationInputSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
})

function expandScientificNotation(value: number) {
  const [coefficient, exponentValue] = value.toString().toLowerCase().split('e')
  if (exponentValue === undefined) {
    return coefficient
  }

  const exponent = Number(exponentValue)
  const [whole, fraction = ''] = coefficient.split('.')
  const digits = `${whole}${fraction}`
  const decimalPosition = whole.length + exponent

  if (decimalPosition <= 0) {
    return `0.${'0'.repeat(-decimalPosition)}${digits}`
  }

  if (decimalPosition >= digits.length) {
    return `${digits}${'0'.repeat(decimalPosition - digits.length)}`
  }

  return `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`
}

function toHundredths(
  value: Database['public']['Tables']['student_grades']['Row']['score'] | string | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    return null
  }

  const text = typeof value === 'number' ? expandScientificNotation(value) : value.trim()
  const match = /^(\d+)(?:\.(\d*))?$/.exec(text)
  if (!match) {
    return null
  }

  const whole = BigInt(match[1])
  const fraction = match[2] ?? ''
  let hundredths = whole * BigInt('100') + BigInt((fraction + '00').slice(0, 2))

  if ((fraction[2] ?? '0') >= '5') {
    hundredths += BigInt('1')
  }

  if (hundredths > BigInt('10000')) {
    return null
  }

  return Number(hundredths)
}

function roundedDivide(numerator: bigint, denominator: bigint) {
  if (denominator <= BigInt('0')) {
    return null
  }

  return Number((numerator + denominator / BigInt('2')) / denominator)
}

function meanHundredths(values: number[]) {
  if (values.length === 0) {
    return null
  }

  const total = values.reduce((sum, value) => sum + BigInt(value), BigInt('0'))
  return roundedDivide(total, BigInt(values.length))
}

function calculateGradeComponents({
  formative,
  summative,
  presentMeetings,
  totalMeetings,
  isAthlete,
}: GradeComponents) {
  const formativeAverage = meanHundredths(formative)
  const summativeAverage = meanHundredths(summative)
  const physicalAttendanceRate = totalMeetings > 0
    ? roundedDivide(BigInt(presentMeetings) * BigInt('10000'), BigInt(totalMeetings))
    : null
  const attendanceScore = isAthlete ? 10000 : physicalAttendanceRate
  const weights = isAthlete
    ? { formative: 40, attendance: 0, summative: 60 }
    : { formative: 35, attendance: 25, summative: 40 }

  if (formativeAverage === null || summativeAverage === null || attendanceScore === null) {
    return {
      formativeAverage,
      physicalAttendanceRate,
      attendanceScore,
      summativeAverage,
      weights,
      finalGrade: null,
    }
  }

  const weightedHundredths =
    BigInt(formativeAverage) * BigInt(weights.formative) +
    BigInt(attendanceScore) * BigInt(weights.attendance) +
    BigInt(summativeAverage) * BigInt(weights.summative)

  return {
    formativeAverage,
    physicalAttendanceRate,
    attendanceScore,
    summativeAverage,
    weights,
    finalGrade: roundedDivide(weightedHundredths, BigInt('100')),
  }
}

function runGradingEngineRuntimeTest() {
  const regular = calculateGradeComponents({
    formative: [8000],
    summative: [9000],
    presentMeetings: 1,
    totalMeetings: 2,
    isAthlete: false,
  })
  const athleteWithNoPhysicalAttendance = calculateGradeComponents({
    formative: [8000],
    summative: [9000],
    presentMeetings: 0,
    totalMeetings: 2,
    isAthlete: true,
  })
  const athleteWithFullPhysicalAttendance = calculateGradeComponents({
    formative: [8000],
    summative: [9000],
    presentMeetings: 2,
    totalMeetings: 2,
    isAthlete: true,
  })

  if (
    regular.finalGrade !== 7650 ||
    athleteWithNoPhysicalAttendance.finalGrade !== 8600 ||
    athleteWithNoPhysicalAttendance.finalGrade !== athleteWithFullPhysicalAttendance.finalGrade
  ) {
    throw new Error('Grading engine runtime simulation failed.')
  }

  console.info('[grading-engine] Runtime simulation passed: regular 50% attendance; athlete 0% attendance.')
}

if (process.env.NODE_ENV !== 'production') {
  runGradingEngineRuntimeTest()
}

function formatGrade(hundredths: number | null) {
  return hundredths === null ? null : hundredths / 100
}

function getStudentType(
  status: Database['public']['Tables']['students']['Row']['status_siswa']
): StudentType | null {
  const normalized = status?.trim().toLowerCase()
  if (normalized === 'atlet' || normalized === 'siswa atlet') {
    return 'Atlet'
  }
  if (normalized === 'reguler' || normalized === 'regular') {
    return 'Reguler'
  }
  return null
}

function getGradeCategory(
  value: Database['public']['Tables']['student_grades']['Row']['grade_type']
): GradeCategory | null {
  const normalized = value.trim().toUpperCase()
  return ['FORMATIF', 'SUMATIF', 'STS', 'SAS'].includes(normalized)
    ? (normalized as GradeCategory)
    : null
}

export async function calculateFinalGrades(
  classId: string,
  subjectId: string
): Promise<ActionResponse<{
  classId: string
  className: string
  subjectId: string
  grades: FinalGradePreview[]
}>> {
  const parsed = calculationInputSchema.safeParse({ classId, subjectId })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Kelas atau mata pelajaran tidak valid.',
      fieldErrors: toFieldErrors(parsed.error),
    }
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
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

    if (profileError || !profile) {
      return { success: false, error: 'Sesi pengguna tidak valid.' }
    }

    const role = profile.role.trim().toUpperCase()
    const isTeacher = role === 'GURU'
    const isHomeroomTeacher = role === 'WALIKELAS' || role === 'WALI_KELAS'

    if (!isTeacher && !isHomeroomTeacher) {
      return { success: false, error: 'Anda tidak memiliki akses untuk melihat raport.' }
    }

    if (isHomeroomTeacher) {
      const { data: classAssignment, error: assignmentError } = await supabase
        .from('user_roles')
        .select('class_id, roles!inner(key)')
        .eq('user_id', user.id)
        .eq('class_id', parsed.data.classId)
        .in('roles.key', ['WALIKELAS', 'WALI_KELAS'])
        .limit(1)
        .maybeSingle()

      if (assignmentError || !classAssignment) {
        return { success: false, error: 'Kelas tidak ditugaskan kepada Anda.' }
      }
    }

    const scheduleQuery = supabase
      .from('schedules')
      .select('id')
      .eq('class_id', parsed.data.classId)
      .eq('subject_id', parsed.data.subjectId)
    const { data: schedules, error: scheduleError } = isTeacher
      ? await scheduleQuery.eq('guru_id', user.id)
      : await scheduleQuery

    if (scheduleError || !schedules?.length) {
      return { success: false, error: 'Kelas dan mata pelajaran tidak ditugaskan kepada Anda.' }
    }

    const [
      { data: classRecord, error: classError },
      { data: students, error: studentsError },
      { data: sessions, error: sessionsError },
    ] =
      await Promise.all([
        supabase
          .from('classes')
          .select('id, name')
          .eq('id', parsed.data.classId)
          .maybeSingle(),
        supabase
          .from('students')
          .select('id, status_siswa')
          .eq('class_id', parsed.data.classId),
        supabase
          .from('class_sessions')
          .select('id')
          .in('schedule_id', schedules.map((schedule) => schedule.id))
          .eq('state', 'completed'),
      ])

    if (classError || !classRecord) {
      return { success: false, error: 'Kelas tidak ditemukan atau tidak dapat diakses.' }
    }

    if (studentsError || !students) {
      return { success: false, error: 'Data siswa kelas gagal dimuat.' }
    }

    if (sessionsError || !sessions) {
      return { success: false, error: 'Data sesi kelas gagal dimuat.' }
    }

    const sessionIds = sessions.map((session) => session.id)
    const [{ data: gradeRows, error: gradesError }, attendanceResult] = await Promise.all([
      supabase
        .from('student_grades')
        .select('student_id, score, grade_type, students!inner(class_id)')
        .eq('subject_id', parsed.data.subjectId)
        .eq('students.class_id', parsed.data.classId),
      sessionIds.length > 0
        ? supabase
            .from('attendance_logs')
            .select('student_id, status')
            .in('session_id', sessionIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (gradesError || !gradeRows) {
      return { success: false, error: 'Matriks nilai kelas gagal dimuat.' }
    }

    if (attendanceResult.error || !attendanceResult.data) {
      return { success: false, error: 'Log absensi sesi kelas gagal dimuat.' }
    }

    const componentsByStudent = new Map<string, GradeComponents>()

    for (const student of students) {
      const statusSiswa = getStudentType(student.status_siswa)
      if (!statusSiswa) {
        return {
          success: false,
          error: `Status siswa ${student.id} belum ditetapkan sebagai Reguler atau Atlet.`,
        }
      }

      componentsByStudent.set(student.id, {
        formative: [],
        summative: [],
        presentMeetings: 0,
        totalMeetings: sessionIds.length,
        isAthlete: statusSiswa === 'Atlet',
      })
    }

    for (const grade of gradeRows) {
      const category = getGradeCategory(grade.grade_type)
      const score = toHundredths(grade.score)
      const components = componentsByStudent.get(grade.student_id)

      if (!category || score === null || !components) {
        return { success: false, error: 'Ditemukan catatan nilai yang tidak valid.' }
      }

      if (category === 'FORMATIF') {
        components.formative.push(score)
      } else {
        components.summative.push(score)
      }
    }

    for (const attendance of attendanceResult.data) {
      const components = componentsByStudent.get(attendance.student_id)
      if (components && attendance.status === 'Hadir') {
        components.presentMeetings += 1
      }
    }

    const grades = students.map((student): FinalGradePreview => {
      const statusSiswa = getStudentType(student.status_siswa)!
      const components = componentsByStudent.get(student.id)!
      const result = calculateGradeComponents(components)

      return {
        studentId: student.id,
        statusSiswa,
        formativeAverage: formatGrade(result.formativeAverage),
        physicalAttendanceRate: formatGrade(result.physicalAttendanceRate),
        attendanceScore: formatGrade(result.attendanceScore),
        presentMeetings: components.presentMeetings,
        totalMeetings: components.totalMeetings,
        summativeAverage: formatGrade(result.summativeAverage),
        weights: result.weights,
        finalGrade: formatGrade(result.finalGrade),
      }
    })

    return {
      success: true,
      data: {
        classId: parsed.data.classId,
        className: classRecord.name,
        subjectId: parsed.data.subjectId,
        grades,
      },
    }
  } catch {
    return { success: false, error: 'Terjadi kesalahan saat menghitung nilai akhir.' }
  }
}

export async function upsertGrades(
  input: unknown
): Promise<ActionResponse<{ updated: number }>> {
  const parsed = gradesSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: 'Data nilai tidak valid.',
      fieldErrors: toFieldErrors(parsed.error),
    }
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
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
        error: 'Anda tidak memiliki akses untuk mengubah nilai.',
      }
    }

    const { data: schedules, error: scheduleError } = await supabase
      .from('schedules')
      .select('class_id')
      .eq('guru_id', user.id)
      .eq('subject_id', parsed.data.subjectId)

    if (scheduleError || !schedules?.length) {
      return {
        success: false,
        error: 'Mata pelajaran tidak ditugaskan kepada Anda.',
      }
    }

    const classIds = [...new Set(schedules.map((schedule) => schedule.class_id))]
    const studentIds = parsed.data.grades.map((grade) => grade.studentId)
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .in('class_id', classIds)
      .in('id', studentIds)

    if (studentsError || students?.length !== studentIds.length) {
      return {
        success: false,
        error: 'Satu atau lebih siswa di luar penugasan Anda.',
      }
    }

    const { error: upsertError } = await supabase
      .from('student_grades')
      .upsert(
        parsed.data.grades.map((grade) => ({
          student_id: grade.studentId,
          subject_id: parsed.data.subjectId,
          grade_type: parsed.data.gradeType,
          task_name: parsed.data.taskName,
          score: grade.score,
        })),
        { onConflict: 'student_id,subject_id,grade_type,task_name' }
      )

    if (upsertError) {
      return {
        success: false,
        error: 'Nilai gagal disimpan. Periksa data dan coba lagi.',
      }
    }

    revalidatePath('/apps/grades')

    return {
      success: true,
      data: { updated: parsed.data.grades.length },
    }
  } catch {
    return { success: false, error: 'Terjadi kesalahan saat menyimpan nilai.' }
  }
}