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
import { upsertGrades } from '@/app/actions/grading'
import CardBox from '@/app/components/shared/CardBox'

const gradeTypes = ['FORMATIF', 'SUMATIF', 'STS', 'SAS'] as const

type GradeRow = {
  studentId: string
  score: string
}

const initialRows: GradeRow[] = [
  { studentId: '11111111-1111-4111-8111-111111111111', score: '87' },
  { studentId: '22222222-2222-4222-8222-222222222222', score: '92' },
]

export default function GradeMatrixForm() {
  const [subjectId, setSubjectId] = useState('44444444-4444-4444-8444-444444444444')
  const [taskName, setTaskName] = useState('Tugas 1')
  const [gradeType, setGradeType] = useState<(typeof gradeTypes)[number]>('FORMATIF')
  const [rows, setRows] = useState<GradeRow[]>(initialRows)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')

  const readyCount = useMemo(
    () => rows.filter((row) => row.studentId.trim().length > 0 && row.score.trim().length > 0).length,
    [rows]
  )

  const updateRow = (index: number, field: 'studentId' | 'score', value: string) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    )
  }

  const addRow = () => {
    setRows((current) => [...current, { studentId: '', score: '' }])
  }

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback('')

    const normalizedRows = rows
      .filter((row) => row.studentId.trim().length > 0 && row.score.trim().length > 0)
      .map((row) => ({
        studentId: row.studentId.trim(),
        score: Number(row.score),
      }))

    if (!subjectId.trim() || !taskName.trim() || normalizedRows.length === 0) {
      setFeedback('ID mata pelajaran, nama tugas, dan minimal satu nilai wajib diisi.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await upsertGrades({
        subjectId: subjectId.trim(),
        gradeType,
        taskName: taskName.trim(),
        grades: normalizedRows,
      })

      if (result.success) {
        setFeedback(`Nilai berhasil disimpan untuk ${result.data?.updated ?? normalizedRows.length} siswa.`)
      } else {
        setFeedback(result.error ?? 'Nilai gagal disimpan.')
      }
    } catch {
      setFeedback('Terjadi kesalahan saat mengirim data nilai.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <CardBox className="p-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="subjectId">ID mata pelajaran</Label>
            <Input
              id="subjectId"
              name="subjectId"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              placeholder="UUID mata pelajaran"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskName">Nama tugas</Label>
            <Input
              id="taskName"
              name="taskName"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              placeholder="Contoh: Tugas 1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gradeType">Komponen nilai</Label>
            <Select
              name="gradeType"
              value={gradeType}
              onValueChange={(value) => setGradeType(value as (typeof gradeTypes)[number])}
            >
              <SelectTrigger id="gradeType" className="w-full">
                <SelectValue placeholder="Pilih komponen" />
              </SelectTrigger>
              <SelectContent>
                {gradeTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Matriks nilai</h3>
            <Button type="button" variant="outline" onClick={addRow}>
              Tambah siswa
            </Button>
          </div>

          {rows.map((row, index) => (
            <div
              className="grid gap-4 rounded-md border border-border p-4 md:grid-cols-[1.7fr_1fr_auto]"
              key={`grade-row-${index}`}
            >
              <div className="space-y-2">
                <Label htmlFor={`grade-student-${index}`}>Student ID</Label>
                <Input
                  id={`grade-student-${index}`}
                  name={`grades.${index}.studentId`}
                  value={row.studentId}
                  onChange={(event) => updateRow(index, 'studentId', event.target.value)}
                  placeholder="UUID siswa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`grade-score-${index}`}>Skor</Label>
                <Input
                  id={`grade-score-${index}`}
                  name={`grades.${index}.score`}
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={row.score}
                  onChange={(event) => updateRow(index, 'score', event.target.value)}
                  placeholder="0-100"
                />
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
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-sm text-muted-foreground">
            {readyCount} nilai siap dikirim.
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan nilai'}
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
