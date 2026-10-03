'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitTeachingJournal } from '@/app/actions/teaching-journal'
import CardBox from '@/app/components/shared/CardBox'

export default function TeachingJournalForm() {
  const [sessionId, setSessionId] = useState('33333333-3333-4333-8333-333333333333')
  const [topic, setTopic] = useState('Pembelajaran dan refleksi hari ini')
  const [note, setNote] = useState('Siswa mengikuti kegiatan diskusi dan mengerjakan latihan dengan baik.')
  const [durationMinutes, setDurationMinutes] = useState(45)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback('')

    if (!sessionId.trim() || !topic.trim() || !note.trim()) {
      setFeedback('Session ID, topik, dan catatan wajib diisi.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitTeachingJournal({
        sessionId: sessionId.trim(),
        topic: topic.trim(),
        note: note.trim(),
        durationMinutes: Number(durationMinutes),
      })

      if (result.success) {
        setFeedback('Jurnal pembelajaran berhasil disimpan.')
      } else {
        setFeedback(result.error ?? 'Jurnal gagal disimpan.')
      }
    } catch {
      setFeedback('Terjadi kesalahan saat mengirim jurnal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <CardBox className="p-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sessionId">ID sesi kelas</Label>
            <Input
              id="sessionId"
              name="sessionId"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder="UUID sesi kelas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="durationMinutes">Durasi (menit)</Label>
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min={1}
              max={300}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value || 0))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="topic">Topik pembelajaran</Label>
          <Input
            id="topic"
            name="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Topik materi"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Catatan pembelajaran</Label>
          <textarea
            id="note"
            name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Tuliskan aktivitas, respons siswa, dan penilaian singkat"
          />
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan jurnal'}
          </Button>
        </div>

        {feedback && (
          <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
            {feedback}
          </p>
        )}
      </form>
    </CardBox>
  )
}
