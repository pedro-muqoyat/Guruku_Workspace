const { createServerClient } = require('@supabase/ssr')
const { loadEnvConfig } = require('@next/env')
const { performance } = require('node:perf_hooks')
const fixtures = require('./scripts/e2e-fixtures')

loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const email = process.env.E2E_TEST_EMAIL
const password = process.env.E2E_TEST_PASSWORD
const studentEmail = process.env.E2E_STUDENT_EMAIL || 'siswa@e2e.local'
const studentPassword = process.env.E2E_STUDENT_PASSWORD || 'password123'
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(message, code = 1) {
  console.error(message)
  process.exitCode = code
}

function assertLocalUrl(value, name) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} is invalid.`)
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error(`${name} must point to a local service.`)
  }
  return url
}

function summarizeActionResult(result) {
  if (!result || typeof result !== 'object') {
    return { validArray: false, rowCount: 0, fields: [], error: 'Invalid action payload' }
  }

  const hasSafePayload = 'success' in result && 'status' in result
  const rows = hasSafePayload ? (result.success ? result.data : []) : result.data

  const validArray = Array.isArray(rows) && rows.every(
    (row) => typeof row === 'object' && row !== null && !Array.isArray(row)
  )

  return {
    validArray,
    rowCount: Array.isArray(rows) ? rows.length : 0,
    fields: Array.isArray(rows) && rows[0] ? Object.keys(rows[0]) : [],
    ...(typeof result.success === 'boolean' ? { success: result.success } : {}),
    ...(typeof result.status === 'number' ? { status: result.status } : {}),
    ...(typeof result.error === 'string' ? { error: result.error } : {}),
  }
}

async function main() {
  for (const [name, value] of [
    ['classId', fixtures.classId],
    ['subjectId', fixtures.subjectId],
  ]) {
    if (typeof value !== 'string' || !uuidPattern.test(value)) {
      throw new Error(`E2E fixture ${name} must be a valid UUID before any network request.`)
    }
  }

  if (!supabaseUrl || !anonKey || !email || !password) {
    fail(
      'Required env is missing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, E2E_TEST_EMAIL, and E2E_TEST_PASSWORD.',
      2
    )
    return
  }

  let appUrl
  try {
    assertLocalUrl(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL')
    appUrl = assertLocalUrl(baseUrl, 'E2E_BASE_URL')
  } catch (error) {
    console.error(
      'E2E URL configuration failed:',
      error instanceof Error ? error.stack || error.message : error
    )
    process.exitCode = 2
    return
  }

  const cookieJar = new Map()
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookieOptions: {
      httpOnly: true,
      secure: supabaseUrl.startsWith('https://'),
      sameSite: 'lax',
      path: '/',
    },
    cookies: {
      getAll() {
        return Array.from(cookieJar, ([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          if (value) cookieJar.set(name, value)
          else cookieJar.delete(name)
        }
      },
    },
  })

  const loginStarted = performance.now()
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  const loginMs = Number((performance.now() - loginStarted).toFixed(1))

  if (authError || !authData.user) {
    console.error('Supabase Auth sign-in failed.', {
      httpStatus: authError?.status ?? null,
      code: authError?.code ?? 'NO_USER',
      latencyMs: loginMs,
    })
    process.exitCode = 1
    return
  }

  console.log('Supabase Auth', {
    httpStatus: 200,
    latencyMs: loginMs,
    authenticated: true,
  })

  const {
    data: { user: verifiedUser },
    error: verifyError,
  } = await supabase.auth.getUser()
  if (verifyError || !verifiedUser || verifiedUser.id !== authData.user.id) {
    fail('The Auth session could not be verified after sign-in.')
    return
  }

  const cookieHeader = Array.from(cookieJar, ([name, value]) => `${name}=${value}`).join('; ')
  const actionStarted = performance.now()
  let response

  try {
    response = await fetch(new URL('/api/e2e/dashboard-rpc', appUrl), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        classId: fixtures.classId,
        subjectId: fixtures.subjectId,
      }),
      cache: 'no-store',
    })
  } catch (error) {
    console.error(
      'Could not reach the local E2E action relay:',
      error instanceof Error ? error.stack || error.message : error
    )
    process.exitCode = 1
    return
  }

  const actionLatencyMs = Number((performance.now() - actionStarted).toFixed(1))
  let payload
  try {
    payload = await response.json()
  } catch (error) {
    console.error('The E2E relay response could not be parsed as JSON:', {
      httpStatus: response.status,
      latencyMs: actionLatencyMs,
      cause: error instanceof Error ? error.stack || error.message : error,
    })
    process.exitCode = 1
    return
  }

  console.log('RPC scope', { source: 'scripts/e2e-fixtures.js' })
  console.log('Dashboard Server Actions', {
    httpStatus: response.status,
    latencyMs: actionLatencyMs,
  })

  if (!response.ok || !Array.isArray(payload.results) || payload.results.length !== 3) {
    console.error('E2E relay failed.', {
      httpStatus: response.status,
      latencyMs: actionLatencyMs,
      payload,
    })
    process.exitCode = 1
    return
  }

  let failed = false
  for (const entry of payload.results) {
    const summary = summarizeActionResult(entry.result)
    const actionHttpStatus = entry.httpStatus ?? response.status
    const actionPassed =
      actionHttpStatus === 200 &&
      summary.success === true &&
      summary.validArray &&
      summary.rowCount > 0

    console.log(entry.action, {
      httpStatus: actionHttpStatus,
      latencyMs: entry.elapsedMs,
      ...summary,
      passed: actionPassed,
    })

    if (!actionPassed) {
      failed = true
      if (summary.error) console.error(`${entry.action} returned action error: ${summary.error}`)
    }
  }

  if (failed) process.exitCode = 1
  else console.log('Dashboard RPC E2E passed without action crashes.')

  if (!studentEmail || !studentPassword) {
    console.log('[STANDBY] Add E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD to .env.local before running the negative RBAC test.')
    return
  }

  const studentClient = createServerClient(supabaseUrl, anonKey, {
    cookieOptions: {
      httpOnly: true,
      secure: supabaseUrl.startsWith('https://'),
      sameSite: 'lax',
      path: '/',
    },
    cookies: {
      getAll() {
        return Array.from(cookieJar, ([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          if (value) cookieJar.set(name, value)
          else cookieJar.delete(name)
        }
      },
    },
  })

  const studentLogin = await studentClient.auth.signInWithPassword({
    email: studentEmail,
    password: studentPassword,
  })

  if (studentLogin.error || !studentLogin.data.user) {
    console.error('[STANDBY] Student auth is not configured for RBAC E2E validation.', {
      email: studentEmail,
      code: studentLogin.error?.code ?? 'NO_USER',
      status: studentLogin.error?.status ?? null,
      action: 'Add E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD to .env.local, then rerun the test.',
    })
    process.exitCode = 1
    return
  }

  const studentCookieHeader = Array.from(cookieJar, ([name, value]) => `${name}=${value}`).join('; ')
  const studentResponse = await fetch(new URL('/api/e2e/dashboard-rpc', appUrl), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      cookie: studentCookieHeader,
    },
    body: JSON.stringify({
      classId: fixtures.classId,
      subjectId: fixtures.subjectId,
    }),
    cache: 'no-store',
  })

  const studentPayload = await studentResponse.json()
  const teacherAttendanceResult = studentPayload?.results?.find((entry) => entry.action === 'getTeacherAttendanceData')
  const teacherAttendanceStatus = teacherAttendanceResult?.httpStatus ?? studentResponse.status
  const teacherAttendanceSafe = teacherAttendanceResult?.result

  console.log('Negative RBAC check', {
    role: 'student',
    email: studentEmail,
    responseStatus: studentResponse.status,
    actionStatus: teacherAttendanceStatus,
    payload: teacherAttendanceSafe,
  })

  if (teacherAttendanceStatus === 403 && teacherAttendanceSafe?.success === false && teacherAttendanceSafe?.status === 403) {
    console.log('Negative RBAC check passed: student was denied access to teacher attendance.')
    return
  }

  console.error('Negative RBAC check failed: unauthorized student should be blocked with status 403.', {
    payload: teacherAttendanceSafe,
  })
  process.exitCode = 1
}

main().catch((error) => {
  console.error(
    'Dashboard RPC E2E terminated unexpectedly:',
    error instanceof Error ? error.stack || error.message : error
  )
  process.exitCode = 1
})