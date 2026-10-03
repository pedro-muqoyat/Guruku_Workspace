'use client'

import { createBrowserClient } from '@supabase/ssr'
import { startTransition, useEffect, useState } from 'react'
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  SupabaseClient,
} from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type Notification = Database['public']['Tables']['notifications']['Row']
type Schedule = {
  id: string
  guru_id: string
  day_of_week: number
  start_time: string
  end_time: string
  classes: { name: string } | null
  user_profiles: { role: string } | null
}

type RealtimeWakaFeedProps = {
  dayLabel: string
  dateLabel: string
  initialNotifications: Pick<Notification, 'id' | 'message' | 'created_at'>[]
  notificationLoadError: boolean
  schedules: Schedule[]
  scheduleLoadError: boolean
  supabaseAnonKey: string
  supabaseUrl: string
  userId: string
}

type RealtimeStatus = 'connecting' | 'connected' | 'unavailable'

function isAbsenceMessage(message: string) {
  const normalized = message.toLocaleLowerCase('id-ID')
  return (
    normalized.includes('absen') ||
    normalized.includes('alpa') ||
    normalized.includes('tidak hadir')
  )
}

function isNotificationInsert(
  value: unknown,
  userId: string
): value is Notification {
  if (typeof value !== 'object' || value === null) return false

  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    record.user_id === userId &&
    typeof record.message === 'string' &&
    isAbsenceMessage(record.message) &&
    typeof record.created_at === 'string' &&
    record.is_read === false
  )
}

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

export default function RealtimeWakaFeed({
  dayLabel,
  dateLabel,
  initialNotifications,
  notificationLoadError,
  schedules,
  scheduleLoadError,
  supabaseAnonKey,
  supabaseUrl,
  userId,
}: RealtimeWakaFeedProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')

  useEffect(() => {
    let isActive = true
    let channel: RealtimeChannel | null = null
    let supabase: SupabaseClient<Database> | null = null

    void (async () => {
      let accessToken: string

      try {
        const response = await fetch('/api/auth/token', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!response.ok) throw new Error('Token exchange was rejected.')

        const payload: unknown = await response.json()
        if (
          typeof payload !== 'object' ||
          payload === null ||
          !('access_token' in payload) ||
          typeof payload.access_token !== 'string'
        ) {
          throw new Error('Token exchange returned an invalid response.')
        }

        accessToken = payload.access_token
      } catch {
        if (isActive) setRealtimeStatus('unavailable')
        return
      }

      if (!isActive) return

      supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      })
      supabase.realtime.setAuth(accessToken)

      channel = supabase
        .channel(`waka-notifications:${userId}`)
        .on<Notification>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload: RealtimePostgresInsertPayload<Notification>) => {
            if (!isNotificationInsert(payload.new, userId)) return

            startTransition(() => {
              setNotifications((current) => {
                if (current.some((notification) => notification.id === payload.new.id)) {
                  return current
                }

                return [
                  {
                    id: payload.new.id,
                    message: payload.new.message,
                    created_at: payload.new.created_at,
                  },
                  ...current,
                ].slice(0, 12)
              })
            })
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setRealtimeStatus('unavailable')
          }
        })
    })()

    return () => {
      isActive = false
      if (channel && supabase) void supabase.removeChannel(channel)
    }
  }, [supabaseAnonKey, supabaseUrl, userId])

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {dayLabel}, {dateLabel}
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Pemantauan kurikulum
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Notifikasi real-time: {realtimeStatus === 'connected' ? 'aktif' : realtimeStatus === 'connecting' ? 'menghubungkan' : 'tidak tersedia'}
        </p>
      </header>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section
          aria-labelledby="attendance-alerts-title"
          className="min-w-0 rounded-md border border-border bg-card"
        >
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold" id="attendance-alerts-title">
              Peringatan absensi
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Peringatan belum dibaca dalam tujuh hari terakhir.
            </p>
          </div>

          {notificationLoadError ? (
            <p className="p-5 text-sm text-destructive" role="status">
              Peringatan absensi tidak dapat dimuat.
            </p>
          ) : notifications.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              Tidak ada peringatan absensi terbaru.
            </p>
          ) : (
            <ul aria-live="polite" className="divide-y divide-border">
              {notifications.map((notification) => (
                <li className="space-y-2 px-4 py-4 sm:px-5" key={notification.id}>
                  <p className="text-sm font-medium text-foreground">
                    {notification.message}
                  </p>
                  <time
                    className="block text-xs text-muted-foreground"
                    dateTime={notification.created_at}
                  >
                    {formatAlertDate(notification.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="daily-schedule-title"
          className="min-w-0 rounded-md border border-border bg-card"
        >
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold" id="daily-schedule-title">
              Peta jadwal hari ini
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Jadwal mengajar {dayLabel.toLowerCase()}.
            </p>
          </div>

          {scheduleLoadError ? (
            <p className="p-5 text-sm text-destructive" role="status">
              Jadwal hari ini tidak dapat dimuat.
            </p>
          ) : schedules.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              Tidak ada jadwal mengajar hari ini.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {schedules.map((schedule) => (
                <li
                  className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-4 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] sm:px-5"
                  key={schedule.id}
                >
                  <p className="row-span-2 text-sm font-semibold tabular-nums text-foreground">
                    {formatTime(schedule.start_time)}–{formatTime(schedule.end_time)}
                  </p>
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">
                    {schedule.classes?.name ?? 'Kelas tidak tersedia'}
                  </p>
                  <p className="min-w-0 truncate text-xs text-muted-foreground sm:text-sm">
                    Pengajar {schedule.guru_id}
                  </p>
                  <p className="col-start-2 text-xs text-muted-foreground sm:col-start-3">
                    {schedule.user_profiles?.role ?? 'Profil tidak tersedia'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}