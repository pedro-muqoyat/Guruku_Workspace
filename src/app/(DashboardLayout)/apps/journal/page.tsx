import type { Metadata } from 'next'
import TeachingJournalForm from '@/app/components/apps/journal/TeachingJournalForm'

export const metadata: Metadata = {
  title: 'Jurnal Mengajar',
}

export default function JournalPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Jurnal mengajar</h1>
        <p className="text-sm text-muted-foreground">
          Catat topik, durasi, dan refleksi pembelajaran per sesi yang ditugaskan.
        </p>
      </header>

      <TeachingJournalForm />
    </section>
  )
}
