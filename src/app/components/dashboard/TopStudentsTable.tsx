import { getTopStudentsData } from '@/app/actions/dashboard'
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

type RankingRow = Database['public']['Functions']['get_daily_student_rankings']['Returns'][number]

export async function TopStudentsTable({ subjectId }: { subjectId: string }) {
  const result = await getTopStudentsData(subjectId)

  if (!result.success) {
    const title = result.status === 403 ? 'Akses Ditolak' : 'Data Tidak Tersedia'

    return (
      <section aria-live="polite" className="rounded-xl border bg-card p-6 shadow-sm" role="status">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Ranking
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
    <section aria-labelledby="top-students-heading" className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Ranking
          </p>
          <h2 className="mt-1 text-xl font-semibold" id="top-students-heading">Top students</h2>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-background">Student</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Daily points</TableHead>
              <TableHead>Scored items</TableHead>
              <TableHead>Rank</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  No ranking data is available for the active subject.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row: RankingRow) => (
                <TableRow key={`${row.activity_date_utc ?? 'date'}-${row.student_id ?? 'student'}-${row.class_id ?? 'class'}`}>
                  <TableCell className="sticky left-0 z-10 bg-background font-medium">
                    {row.student_id ? row.student_id.slice(0, 8) : '—'}
                  </TableCell>
                  <TableCell>
                    <LocalTime date={row.activity_date_utc ?? undefined} />
                  </TableCell>
                  <TableCell>{row.daily_points === null ? '—' : Number(row.daily_points)}</TableCell>
                  <TableCell>{Number(row.scored_items ?? 0)}</TableCell>
                  <TableCell>{Number(row.rank_in_class_subject ?? 0)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
