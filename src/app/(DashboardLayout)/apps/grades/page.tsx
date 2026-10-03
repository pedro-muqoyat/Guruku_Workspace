import type { Metadata } from 'next'
import GradesEntryTabs from '@/app/components/features/GradesEntryTabs'

export const metadata: Metadata = {
  title: 'Penilaian',
}

export default function GradesPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Input nilai</h1>
        <p className="text-sm text-muted-foreground">
          Submit matriks nilai per mata pelajaran, tugas, dan komponen penilaian.
        </p>
      </header>

      <GradesEntryTabs />
    </section>
  )
}
