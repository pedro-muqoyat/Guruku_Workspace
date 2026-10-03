'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitAttendance } from '@/app/actions/attendance'
import CardBox from '@/app/components/shared/CardBox'

const defaultStatuses = ['Hadir', 'Sakit', 'Izin', 'Alpa'] as const

type AttendanceRow = {
  studentId: string
  status: (typeof defaultStatuses)[number]
}

const initialRows: AttendanceRow[] = [
  { studentId: '11111111-1111-4111-8111-111111111111', status: 'Hadir' },
  { studentId: '22222222-2222-4222-8222-222222222222', status: 'Izin' },
]

export default function AttendanceForm() {
  const [sessionId, setSessionId] = useState('33333333-3333-4333-8333-333333333333')
  const [rows, setRows] = useState<AttendanceRow[]>(initialRows)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')

  const hasAnyStudent = useMemo(
    () => rows.some((row) => row.studentId.trim().length > 0),
    [rows]
  )

  const updateRow = (index: number, field: 'studentId' | 'status', value: string) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: field === 'status' ? (value as AttendanceRow['status']) : value,
            }
          : row
      )
    )
  }

  const addRow = () => {
    setRows((current) => [...current, { studentId: '', status: 'Hadir' }])
  }

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback('')

    const normalizedRows = rows
      .filter((row) => row.studentId.trim().length > 0)
      .map((row) => ({
        studentId: row.studentId.trim(),
        status: row.status,
      }))

    if (!sessionId.trim() || normalizedRows.length === 0) {
      setFeedback('Session ID dan minimal satu siswa wajib diisi.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitAttendance({
        sessionId: sessionId.trim(),
        rows: normalizedRows,
      })

      if (result.success) {
        setFeedback(`Absensi berhasil disimpan untuk ${result.data?.updated ?? normalizedRows.length} siswa.`)
      } else {
        setFeedback(result.error ?? 'Absensi gagal disimpan.')
      }
    } catch {
      setFeedback('Terjadi kesalahan saat mengirim absensi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <CardBox className="p-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
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

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Daftar absensi</h3>
            <Button type="button" variant="outline" onClick={addRow}>
              Tambah siswa
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Belum ada data siswa. Tambahkan baris baru untuk mengisi absensi.
            </p>
          ) : (
            rows.map((row, index) => (
              <div
                className="grid gap-4 rounded-md border border-border p-4 md:grid-cols-[1.7fr_1fr_auto]"
                key={`attendance-row-${index}`}
              >
                <div className="space-y-2">
                  <Label htmlFor={`studentId-${index}`}>Student ID</Label>
                  <Input
                    id={`studentId-${index}`}
                    name={`rows.${index}.studentId`}
                    value={row.studentId}
                    onChange={(event) => updateRow(index, 'studentId', event.target.value)}
                    placeholder="UUID siswa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`status-${index}`}>Status</Label>
                  <Select
                    name={`rows.${index}.status`}
                    value={row.status}
                    onValueChange={(value) => updateRow(index, 'status', value)}
                  >
                    <SelectTrigger id={`status-${index}`} className="w-full">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outlineerror"
                    className="w-full md:w-auto"
                    onClick={() => removeRow(index)}
                    disabled={rows.length === 1}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">
            {hasAnyStudent ? `${rows.filter((row) => row.studentId.trim()).length} siswa siap disimpan.` : 'Belum ada siswa yang siap disimpan.'}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan absensi'}
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
