import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import GuruDailyForm from '@/app/components/features/GuruDailyForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Kegiatan Guru Hari Ini',
}

const weekdayNumbers = new Map([
  ['Sun', 0],
  ['Mon', 1],
  ['Tue', 2],
  ['Wed', 3],
  ['Thu', 4],
  ['Fri', 5],
  ['Sat', 6],
])

const weekdayLabels = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
]

function formatTime(value: string) {
  return value.slice(0, 5)
}

export default async function GuruPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    notFound()
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role.trim().toUpperCase() !== 'GURU') {
    notFound()
  }

  const now = new Date()
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
  }).format(now)
  const dayOfWeek = weekdayNumbers.get(weekday)

  if (dayOfWeek === undefined) {
    notFound()
  }

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const { data: schedules, error: schedulesError } = await supabase
    .from('schedules')
    .select(
      'id, class_id, subject_id, day_of_week, start_time, end_time, classes!schedules_class_id_fkey(name)'
    )
    .eq('guru_id', user.id)
    .eq('day_of_week', dayOfWeek)
    .order('start_time', { ascending: true })

  if (schedulesError) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Kegiatan hari ini</h1>
        <p className="text-sm text-destructive" role="status">
          Jadwal mengajar tidak dapat dimuat.
        </p>
      </section>
    )
  }

  const scheduleIds = schedules.map((schedule) => schedule.id)
  const classIds = [...new Set(schedules.map((schedule) => schedule.class_id))]
  const [sessionsResult, studentsResult] = scheduleIds.length > 0
    ? await Promise.all([
        supabase
          .from('class_sessions')
          .select('id, schedule_id, session_date')
          .in('schedule_id', scheduleIds)
          .eq('session_date', today),
        supabase
          .from('students')
          .select('id, class_id, status_siswa')
          .in('class_id', classIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ]

  const dayLabel = weekdayLabels[dayOfWeek]
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(now)

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {dayLabel}, {dateLabel}
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Kegiatan hari ini</h1>
        </div>
        <p className="text-sm text-muted-foreground">Guru mata pelajaran</p>
      </header>

      {sessionsResult.error || studentsResult.error ? (
        <p className="text-sm text-destructive" role="status">
          Data kelas hari ini tidak dapat dimuat.
        </p>
      ) : schedules.length === 0 ? (
        <p className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
          Tidak ada jadwal mengajar hari ini.
        </p>
      ) : (
        <div className="space-y-5">
          {schedules.map((schedule) => {
            const session = sessionsResult.data?.find(
              (candidate) => candidate.schedule_id === schedule.id
            )
            const students = (studentsResult.data ?? [])
              .filter((student) => student.class_id === schedule.class_id)
              .map((student) => ({
                id: student.id,
                statusSiswa: student.status_siswa,
              }))

            return (
              <div className="space-y-2" key={schedule.id}>
                <p className="text-sm font-medium tabular-nums text-muted-foreground">
                  {formatTime(schedule.start_time)}–{formatTime(schedule.end_time)}
                </p>
                <GuruDailyForm
                  className={schedule.classes?.name ?? 'Kelas tidak tersedia'}
                  sessionId={session?.id ?? null}
                  students={students}
                  subjectId={schedule.subject_id}
                />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}