import type { Metadata } from 'next'
import { calculateFinalGrades } from '@/app/actions/grading'

export const metadata: Metadata = {
  title: 'Raport Kelas',
}

type RaporPageProps = {
  searchParams: Promise<{
    classId?: string | string[]
    subjectId?: string | string[]
  }>
}

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined
}

function formatScore(value: number | null) {
  if (value === null) {
    return 'Belum lengkap'
  }

  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default async function RaporPage({ searchParams }: RaporPageProps) {
  const params = await searchParams
  const classId = getSingleValue(params.classId)?.trim() ?? ''
  const subjectId = getSingleValue(params.subjectId)?.trim() ?? ''
  const result =
    classId && subjectId
      ? await calculateFinalGrades(classId, subjectId)
      : null

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Raport kelas</h1>
        <p className="text-sm text-muted-foreground">
          Rekap nilai per siswa berdasarkan data dan kebijakan yang berlaku.
        </p>
      </header>

      <section aria-label="Filter raport" className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <form action="/apps/rapor" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end" method="get">
          <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="classId">
            ID kelas
            <input
              className="h-10 min-w-0 rounded-md border border-border bg-background px-3 font-normal"
              defaultValue={classId}
              id="classId"
              name="classId"
              placeholder="UUID kelas"
              required
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="subjectId">
            ID mata pelajaran
            <input
              className="h-10 min-w-0 rounded-md border border-border bg-background px-3 font-normal"
              defaultValue={subjectId}
              id="subjectId"
              name="subjectId"
              placeholder="UUID mata pelajaran"
              required
            />
          </label>
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            type="submit"
          >
            Tampilkan raport
          </button>
        </form>
      </section>

      {result && !result.success && (
        <section aria-live="polite" className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {result.error ?? 'Raport tidak dapat dimuat.'}
        </section>
      )}

      {result?.success && result.data && (
        <section aria-labelledby="rapor-table-title" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold" id="rapor-table-title">
                {result.data.className}
              </h2>
              <p className="text-sm text-muted-foreground">
                Mata pelajaran {result.data.subjectId}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {result.data.grades.length.toLocaleString('id-ID')} siswa
            </p>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-3" scope="col">ID siswa</th>
                  <th className="px-3 py-3" scope="col">Status</th>
                  <th className="px-3 py-3 text-right" scope="col">Formatif</th>
                  <th className="px-3 py-3 text-right" scope="col">Presensi fisik</th>
                  <th className="px-3 py-3 text-right" scope="col">Sumatif</th>
                  <th className="px-3 py-3 text-right" scope="col">Nilai akhir</th>
                </tr>
              </thead>
              <tbody>
                {result.data.grades.map((grade) => (
                  <tr className="border-t border-border" key={grade.studentId}>
                    <th className="px-3 py-3 font-medium tabular-nums" scope="row">
                      {grade.studentId}
                    </th>
                    <td className="px-3 py-3">{grade.statusSiswa}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatScore(grade.formativeAverage)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatScore(grade.physicalAttendanceRate)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatScore(grade.summativeAverage)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      {formatScore(grade.finalGrade)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  )
}