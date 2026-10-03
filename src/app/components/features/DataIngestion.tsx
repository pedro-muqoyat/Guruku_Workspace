'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
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
import type { ActionResponse } from '@/schemas/validation'

const CHUNK_SIZE = 100
const gradeTypeOptions = ['FORMATIF', 'SUMATIF', 'STS', 'SAS'] as const

type GradeType = (typeof gradeTypeOptions)[number]
type ParsedGradeRow = {
  line: number
  studentId: string
  score: string
}
type ImportError = {
  line: number
  message: string
}
type ParsedFileResult = {
  rows: ParsedGradeRow[]
  errors: ImportError[]
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function findHeaderValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const normalizedKey = normalizeHeader(key)
    const entry = Object.entries(row).find(([header]) => normalizeHeader(header) === normalizedKey)
    const value = entry?.[1]

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return undefined
}

function parseRowEntry(entry: Record<string, unknown>, index: number): ParsedGradeRow | null {
  const studentId = findHeaderValue(entry, ['studentid', 'student_id', 'student id', 'id_siswa', 'siswa'])
  const score = findHeaderValue(entry, ['score', 'nilai', 'nilai_akhir', 'grade', 'skor', 'nilai akhir'])

  if (!studentId || !score) {
    return null
  }

  return {
    line: index + 2,
    studentId,
    score,
  }
}

function normalizeCsvRows(text: string): ParsedFileResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => normalizeHeader(header),
  })

  if (parsed.data.length === 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: 'File CSV kosong atau tidak memiliki header yang dikenali.' }],
    }
  }

  const rows: ParsedGradeRow[] = []
  const errors: ImportError[] = []

  parsed.data.forEach((entry, index) => {
    const normalizedEntry = Object.fromEntries(
      Object.entries(entry ?? {}).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()])
    )

    const row = parseRowEntry(normalizedEntry, index)
    if (!row) {
      errors.push({
        line: index + 2,
        message: 'Baris tidak memiliki kolom studentId dan score yang valid.',
      })
      return
    }

    rows.push(row)
  })

  return { rows, errors }
}

async function normalizeWorkbookRows(file: File): Promise<ParsedFileResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const rows: ParsedGradeRow[] = []
  const errors: ImportError[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, {
      defval: '',
      raw: false,
    })

    jsonRows.forEach((entry, index) => {
      const normalizedEntry = Object.fromEntries(
        Object.entries(entry ?? {}).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()])
      )

      const row = parseRowEntry(normalizedEntry, index)
      if (!row) {
        errors.push({
          line: index + 2,
          message: 'Baris Excel tidak memiliki studentId dan score yang valid.',
        })
        return
      }

      rows.push(row)
    })
  }

  return { rows, errors }
}

async function normalizeUploadedFile(file: File): Promise<ParsedFileResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv' || file.type.includes('csv')) {
    return normalizeCsvRows(await file.text())
  }

  if (['xls', 'xlsx', 'xlsm'].includes(extension ?? '') || /excel|sheet/.test(file.type)) {
    return normalizeWorkbookRows(file)
  }

  return {
    rows: [],
    errors: [{ line: 1, message: 'Format file tidak didukung. Gunakan CSV, XLS, atau XLSX.' }],
  }
}

function mapFieldErrors<T>(response: ActionResponse<T>, rows: ParsedGradeRow[]): ImportError[] {
  if (!response.fieldErrors) {
    return rows.map((row) => ({
      line: row.line,
      message: response.error ?? 'Chunk gagal disimpan.',
    }))
  }

  const issues: ImportError[] = []
  const matchedIndexes = new Set<number>()

  for (const [field, messages] of Object.entries(response.fieldErrors)) {
    const match = /^grades\.(\d+)(?:\.|$)/.exec(field)
    if (!match) {
      continue
    }

    const index = Number(match[1])
    const row = rows[index]
    if (!row) {
      continue
    }

    matchedIndexes.add(index)
    issues.push({ line: row.line, message: messages.join(' ') })
  }

  rows.forEach((row, index) => {
    if (!matchedIndexes.has(index)) {
      issues.push({
        line: row.line,
        message: 'Baris ditolak karena validasi chunk gagal.',
      })
    }
  })

  return issues
}

export default function DataIngestion() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [taskName, setTaskName] = useState('')
  const [gradeType, setGradeType] = useState<GradeType>('FORMATIF')
  const [status, setStatus] = useState('Pilih file CSV atau Excel untuk mulai memproses.')
  const [errors, setErrors] = useState<ImportError[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [totalRows, setTotalRows] = useState(0)
  const [processedRows, setProcessedRows] = useState(0)
  const [progress, setProgress] = useState(0)

  const resetState = () => {
    setErrors([])
    setTotalRows(0)
    setProcessedRows(0)
    setProgress(0)
  }

  const processChunkedUpload = async (rows: ParsedGradeRow[]) => {
    if (rows.length === 0) {
      setStatus('Tidak ada baris valid yang siap dikirim.')
      return
    }

    if (!subjectId.trim() || !taskName.trim()) {
      setStatus('ID mata pelajaran dan nama tugas wajib diisi.')
      return
    }

    const allErrors: ImportError[] = []
    const totalChunks = Math.ceil(rows.length / CHUNK_SIZE)
    let successfulRows = 0

    setIsRunning(true)
    resetState()

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const chunk = rows.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE)
      const payload = {
        subjectId: subjectId.trim(),
        taskName: taskName.trim(),
        gradeType,
        grades: chunk.map((row) => ({
          studentId: row.studentId.trim(),
          score: Number(row.score),
        })),
      }

      setStatus(`Mengirim chunk ${chunkIndex + 1}/${totalChunks} (${chunk.length} baris)...`)

      const response = await upsertGrades(payload)

      if (response.success) {
        successfulRows += chunk.length
        setProcessedRows(successfulRows)
        setProgress(Math.round((successfulRows / rows.length) * 100))
        continue
      }

      const chunkErrors = mapFieldErrors(response, chunk)
      allErrors.push(...chunkErrors)
      setErrors([...allErrors])
      setStatus(`Chunk ${chunkIndex + 1} gagal; melanjutkan ke chunk berikut.`)
    }

    setProgress(100)
    setStatus(
      allErrors.length > 0
        ? `Impor selesai dengan ${allErrors.length} baris gagal; lihat log.`
        : 'Impor selesai. Semua baris berhasil dikirim.'
    )
    setIsRunning(false)
  }

  const handleSelectedFile = async (file?: File) => {
    if (!file) {
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    const supported = ['csv', 'xls', 'xlsx', 'xlsm']

    if (!supported.includes(extension ?? '') && !/excel|sheet|csv/.test(file.type)) {
      setStatus('Format file tidak didukung. Gunakan CSV, XLS, atau XLSX.')
      return
    }

    resetState()
    setFileName(file.name)
    setStatus('Membaca file di browser...')

    try {
      const { rows, errors: parseErrors } = await normalizeUploadedFile(file)
      setErrors(parseErrors)
      setTotalRows(rows.length)

      if (rows.length === 0) {
        setStatus('File tidak berisi baris data yang valid.')
        return
      }

      setStatus(`${rows.length.toLocaleString()} baris siap dikirim dengan batch 100.`)
      await processChunkedUpload(rows)
    } catch {
      setStatus('File gagal dibaca di browser. Coba file lain.')
      setIsRunning(false)
    }
  }

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="subjectId">ID mata pelajaran</Label>
          <Input
            id="subjectId"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            placeholder="UUID mata pelajaran"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taskName">Nama tugas</Label>
          <Input
            id="taskName"
            value={taskName}
            onChange={(event) => setTaskName(event.target.value)}
            placeholder="Contoh: Tugas 1"
          />
        </div>

        <div className="space-y-2">
          <Label>Komponen nilai</Label>
          <Select value={gradeType} onValueChange={(value) => setGradeType(value as GradeType)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih komponen" />
            </SelectTrigger>
            <SelectContent>
              {gradeTypeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${dragging ? 'border-primary bg-primary/5' : 'border-border'}`}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragging(false)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void handleSelectedFile(event.dataTransfer.files[0])
        }}
      >
        <p className="text-base font-medium">Seret file CSV/Excel ke area ini</p>
        <p className="mt-1 text-sm text-muted-foreground">
          File diparse di browser lalu dikirim ke server per 100 baris untuk menjaga performa.
        </p>

        <input
          ref={fileInputRef}
          accept=".csv,.xls,.xlsx,.xlsm,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => void handleSelectedFile(event.target.files?.[0])}
          type="file"
        />

        <Button className="mt-4" disabled={isRunning} onClick={() => fileInputRef.current?.click()} type="button">
          Pilih file
        </Button>

        {fileName && <p className="mt-3 text-sm text-muted-foreground">File aktif: {fileName}</p>}
      </div>

      <div className="space-y-2" aria-live="polite">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>{status}</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {processedRows.toLocaleString()} / {totalRows.toLocaleString()} baris berhasil dikirim
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <div className="flex items-center justify-between bg-muted px-3 py-2 text-sm font-medium">
          <span>Log baris gagal</span>
          <span>{errors.length}</span>
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2" scope="col">Baris</th>
                <th className="px-3 py-2" scope="col">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {errors.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={2}>
                    Tidak ada baris gagal.
                  </td>
                </tr>
              ) : (
                errors.map((error, index) => (
                  <tr className="border-t border-border" key={`${error.line}-${index}`}>
                    <td className="px-3 py-2 tabular-nums">{error.line}</td>
                    <td className="px-3 py-2 text-foreground">{error.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
