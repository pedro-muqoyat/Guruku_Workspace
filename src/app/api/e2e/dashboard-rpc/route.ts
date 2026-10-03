import { NextResponse } from 'next/server'
import { performance } from 'node:perf_hooks'
import { z } from 'zod'
import {
  getClassProgressData,
  getTeacherAttendanceData,
  getTopStudentsData,
} from '@/app/actions/dashboard'

const inputSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
})

function actionStatus(result: unknown) {
  if (!result || typeof result !== 'object') {
    return 502
  }

  const maybe = result as {
    success?: boolean
    status?: number
    error?: string
    data?: unknown
  }

  if ('success' in maybe) {
    return typeof maybe.status === 'number' ? maybe.status : 502
  }

  if ('error' in maybe) {
    const message = maybe.error
    if (message === 'Unauthorized access') return 403
    if (message === 'Invalid class identifier' || message === 'Invalid subject identifier') {
      return 400
    }
    return 502
  }

  return Array.isArray(maybe.data) ? 200 : 502
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse(null, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        error: {
          kind: 'invalid_json',
          message: 'Request body must contain valid JSON.',
        },
      },
      { status: 400, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    )
  }

  const parsed = inputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          kind: 'validation',
          message: 'Test scope identifiers must be valid UUIDs.',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
          })),
        },
      },
      { status: 400, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    )
  }

  try {
    const startedAt = performance.now()
    const teacherAttendance = await getTeacherAttendanceData()
    const teacherAttendanceMs = Number((performance.now() - startedAt).toFixed(1))

    const classStartedAt = performance.now()
    const classProgress = await getClassProgressData(parsed.data.classId)
    const classProgressMs = Number((performance.now() - classStartedAt).toFixed(1))

    const topStartedAt = performance.now()
    const topStudents = await getTopStudentsData(parsed.data.subjectId)
    const topStudentsMs = Number((performance.now() - topStartedAt).toFixed(1))

    return NextResponse.json(
      {
        results: [
          {
            action: 'getTeacherAttendanceData',
            httpStatus: actionStatus(teacherAttendance),
            elapsedMs: teacherAttendanceMs,
            result: teacherAttendance,
          },
          {
            action: 'getClassProgressData',
            httpStatus: actionStatus(classProgress),
            elapsedMs: classProgressMs,
            result: classProgress,
          },
          {
            action: 'getTopStudentsData',
            httpStatus: actionStatus(topStudents),
            elapsedMs: topStudentsMs,
            result: topStudents,
          },
        ],
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          kind: 'relay_failure',
          message: error instanceof Error ? error.message : 'Dashboard action relay failed.',
        },
      },
      { status: 500, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    )
  }
}