import type { Metadata } from 'next'
import AttendanceForm from '@/app/components/apps/attendance/AttendanceForm'

export const metadata: Metadata = {
  title: 'Absensi',
}

export default function AttendancePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Absensi kelas</h1>
        <p className="text-sm text-muted-foreground">
          Catat kehadiran siswa per sesi yang ditugaskan kepada Anda.
        </p>
      </header>

      <AttendanceForm />
    </section>
  )
}
