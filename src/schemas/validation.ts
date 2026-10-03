import { z } from 'zod'

const uuidSchema = z.string().uuid()

const attendanceRowSchema = z
  .object({
    studentId: uuidSchema,
    status: z.enum(['Hadir', 'Sakit', 'Izin', 'Alpa']),
  })
  .strict()

export const attendanceSchema = z
  .object({
    sessionId: uuidSchema,
    rows: z.array(attendanceRowSchema).min(1).max(200),
  })
  .strict()
  .superRefine(({ rows }, context) => {
    const studentIds = new Set<string>()

    rows.forEach((row, index) => {
      if (studentIds.has(row.studentId)) {
        context.addIssue({
          code: 'custom',
          path: ['rows', index, 'studentId'],
          message: 'Siswa tidak boleh muncul lebih dari sekali.',
        })
      }

      studentIds.add(row.studentId)
    })
  })

const gradeRowSchema = z
  .object({
    studentId: uuidSchema,
    score: z.number().finite().min(0).max(100),
  })
  .strict()

export const gradesSchema = z
  .object({
    subjectId: uuidSchema,
    gradeType: z.enum(['FORMATIF', 'SUMATIF', 'STS', 'SAS']),
    taskName: z.string().trim().min(1).max(120),
    grades: z.array(gradeRowSchema).min(1).max(200),
  })
  .strict()
  .superRefine(({ grades }, context) => {
    const studentIds = new Set<string>()

    grades.forEach((grade, index) => {
      if (studentIds.has(grade.studentId)) {
        context.addIssue({
          code: 'custom',
          path: ['grades', index, 'studentId'],
          message: 'Siswa tidak boleh muncul lebih dari sekali dalam satu grid.',
        })
      }

      studentIds.add(grade.studentId)
    })
  })

export type ActionResponse<T> = {
  success: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string[]>
}

export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((fieldErrors, issue) => {
    const field = issue.path.length > 0 ? issue.path.join('.') : '_form'
    fieldErrors[field] ??= []
    fieldErrors[field].push(issue.message)
    return fieldErrors
  }, {})
}