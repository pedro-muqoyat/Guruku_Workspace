import DataIngestion from '@/app/components/features/DataIngestion'

export const metadata = {
  title: 'Impor Data Akademik',
}

export default function DataIngestionPage() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Impor Data Akademik</h1>
      </header>
      <DataIngestion />
    </section>
  )
}