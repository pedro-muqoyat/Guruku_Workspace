'use client'

import { useActionState } from 'react'
import { submitAttendance } from '@/app/actions/attendance'
import { submitTeachingJournal } from '@/app/actions/teaching-journal'
import type { ActionResponse } from '@/schemas/validation'

type Student = {
  id: string
  statusSiswa: string | null
}

type GuruDailyFormProps = {
  sessionId: string | null
  className: string
  subjectId: string
  students: Student[]
}

type SubmitState = ActionResponse<{ updated: number }>

const initialState: SubmitState = { success: false }

async function submitJournalForm(
  _previousState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  return submitTeachingJournal({
    sessionId: formData.get('sessionId'),
    topic: formData.get('topic'),
    note: formData.get('note'),
    durationMinutes: Number(formData.get('durationMinutes')),
  })
}

async function submitAttendanceForm(
  _previousState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const rows = Array.from(formData.entries())
    .filter(([name]) => name.startsWith('attendance_'))
    .map(([name, status]) => ({
      studentId: name.slice('attendance_'.length),
      status,
    }))

  return submitAttendance({
    sessionId: formData.get('sessionId'),
    rows,
  })
}

function SubmitButton({
  pending,
  children,
}: {
  pending: boolean
  children: string
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? 'Menyimpan...' : children}
    </button>
  )
}

function FormFeedback({ state }: { state: SubmitState }) {
  if (state.success) {
    return (
      <p aria-live="polite" className="text-sm text-foreground" role="status">
        Perubahan tersimpan.
      </p>
    )
  }

  if (state.error) {
    return (
      <p aria-live="polite" className="text-sm text-destructive" role="alert">
        {state.error}
      </p>
    )
  }

  return null
}

export default function GuruDailyForm({
  sessionId,
  className,
  subjectId,
  students,
}: GuruDailyFormProps) {
  const [journalState, journalAction, journalPending] = useActionState(
    submitJournalForm,
    initialState
  )
  const [attendanceState, attendanceAction, attendancePending] = useActionState(
    submitAttendanceForm,
    initialState
  )

  return (
    <section className="min-w-0 rounded-md border border-border bg-card">
      <header className="border-b border-border px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold text-foreground">{className}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mata pelajaran {subjectId}
        </p>
      </header>

      {!sessionId ? (
        <p className="p-5 text-sm text-muted-foreground">
          Sesi kelas hari ini belum tersedia.
        </p>
      ) : (
      <div className="grid min-w-0 gap-6 p-4 sm:p-5 xl:grid-cols-2">
        <form action={journalAction} className="min-w-0 space-y-4">
          <input name="sessionId" type="hidden" value={sessionId} />
          <h3 className="text-sm font-semibold text-foreground">Jurnal mengajar</h3>

          <label className="grid gap-2 text-sm font-medium" htmlFor={`topic-${sessionId}`}>
            Topik pembelajaran
            <input
              autoComplete="off"
              className="h-11 min-w-0 rounded-md border border-input bg-background px-3 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              id={`topic-${sessionId}`}
              maxLength={120}
              name="topic"
              type="text"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium" htmlFor={`note-${sessionId}`}>
            Catatan kegiatan
            <textarea
              className="min-h-28 min-w-0 resize-y rounded-md border border-input bg-background p-3 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              id={`note-${sessionId}`}
              maxLength={2000}
              name="note"
              rows={4}
            />
          </label>

          <label className="grid max-w-48 gap-2 text-sm font-medium" htmlFor={`duration-${sessionId}`}>
            Durasi (menit)
            <input
              className="h-11 rounded-md border border-input bg-background px-3 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              defaultValue={45}
              id={`duration-${sessionId}`}
              max={300}
              min={1}
              name="durationMinutes"
              type="number"
            />
          </label>

          <FormFeedback state={journalState} />
          <SubmitButton pending={journalPending}>Simpan jurnal</SubmitButton>
        </form>

        <form action={attendanceAction} className="min-w-0 space-y-4">
          <input name="sessionId" type="hidden" value={sessionId} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Presensi siswa</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {students.length.toLocaleString('id-ID')} siswa
            </p>
          </div>

          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada siswa terdaftar di kelas ini.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {students.map((student) => (
                <li className="grid min-w-0 gap-2 py-3 sm:grid-cols-[minmax(6rem,1fr)_auto] sm:items-center" key={student.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {student.id}
                    </p>
                    {student.statusSiswa ? (
                      <p className="text-xs text-muted-foreground">{student.statusSiswa}</p>
                    ) : null}
                  </div>
                  <fieldset className="flex flex-wrap gap-x-3 gap-y-2" aria-label={`Presensi siswa ${student.id}`}>
                    {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((status, index) => (
                      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-foreground" key={status}>
                        <input
                          className="size-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          name={`attendance_${student.id}`}
                          required={index === 0}
                          type="radio"
                          value={status}
                        />
                        {status}
                      </label>
                    ))}
                  </fieldset>
                </li>
              ))}
            </ul>
          )}

          <FormFeedback state={attendanceState} />
          <SubmitButton pending={attendancePending}>Simpan presensi</SubmitButton>
        </form>
      </div>
      )}
    </section>
  )
}