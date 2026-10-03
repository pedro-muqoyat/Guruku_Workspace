import { getTeacherAttendanceData } from '@/app/actions/dashboard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Database } from '@/types/database.types'

import { LocalTime } from './LocalTime'

type TeacherAttendanceRow =
  Database['public']['Functions']['get_teacher_daily_attendance']['Returns'][number]

export async function TeacherAttendanceTable() {
  const result = await getTeacherAttendanceData()

  if (!result.success) {
    const title = result.status === 403 ? 'Akses Ditolak' : 'Data Tidak Tersedia'

    return (
      <section aria-live="polite" className="rounded-xl border bg-card p-6 shadow-sm" role="status">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Status Guru
            </p>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {result.status === 403 ? 'Anda tidak memiliki akses ke ringkasan ini.' : result.error}
        </p>
      </section>
    )
  }

  const rows = result.data ?? []

  return (
    <section aria-labelledby="teacher-attendance-heading" className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Status Guru
          </p>
          <h2 className="mt-1 text-xl font-semibold" id="teacher-attendance-heading">Teacher attendance</h2>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-background">Teacher</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total JP</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>In progress</TableHead>
              <TableHead>Planned</TableHead>
              <TableHead>Cancelled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-muted-foreground">
                  No attendance data is available for the selected range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row: TeacherAttendanceRow) => (
                <TableRow key={`${row.activity_date_utc ?? 'date'}-${row.guru_id ?? 'teacher'}`}>
                  <TableCell className="sticky left-0 z-10 bg-background font-medium">
                    {row.guru_id ? row.guru_id.slice(0, 8) : '—'}
                  </TableCell>
                  <TableCell>
                    <LocalTime date={row.activity_date_utc ?? undefined} />
                  </TableCell>
                  <TableCell>{row.total_jp ?? 0}</TableCell>
                  <TableCell>{row.completed_jp ?? 0}</TableCell>
                  <TableCell>{row.in_progress_jp ?? 0}</TableCell>
                  <TableCell>{row.planned_jp ?? 0}</TableCell>
                  <TableCell>{row.cancelled_jp ?? 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
