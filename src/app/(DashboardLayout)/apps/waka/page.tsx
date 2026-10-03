import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import RealtimeWakaFeed from '@/app/components/features/RealtimeWakaFeed'

export const metadata: Metadata = {
  title: 'Pemantauan Waka Kurikulum',
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

function formatAlertDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export default async function WakaPage() {
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

  if (profileError || profile?.role.trim().toUpperCase() !== 'WAKA') {
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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session || session.user.id !== user.id) {
    notFound()
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [notificationsResult, schedulesResult] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, message, created_at')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .gte('created_at', sevenDaysAgo)
      .or(
        'message.ilike.%absen%,message.ilike.%alpa%,message.ilike.%tidak hadir%'
      )
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('schedules')
      .select(
        'id, guru_id, day_of_week, start_time, end_time, classes!schedules_class_id_fkey(name), user_profiles!schedules_guru_id_fkey(role)'
      )
      .eq('day_of_week', dayOfWeek)
      .order('start_time', { ascending: true }),
  ])

  const dayLabel = weekdayLabels[dayOfWeek]
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(now)

  return (
    <RealtimeWakaFeed
      dayLabel={dayLabel}
      initialNotifications={notificationsResult.data ?? []}
      notificationLoadError={Boolean(notificationsResult.error)}
      schedules={schedulesResult.data ?? []}
      scheduleLoadError={Boolean(schedulesResult.error)}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
      userId={user.id}
      dateLabel={dateLabel}
    />
  )
}