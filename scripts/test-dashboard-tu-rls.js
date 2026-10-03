const { randomUUID } = require('node:crypto')
const { loadEnvConfig } = require('@next/env')
const { createClient } = require('@supabase/supabase-js')

loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function requireLocalUrl(value, name) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} is missing or invalid.`)
  }

  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error(`${name} must point to a local Supabase instance.`)
  }
}

async function getBaselineCount(admin, table) {
  const { count, error } = await admin
    .from(table)
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw new Error(`Could not verify ${table} fixture rows (${error.code}).`)
  }

  if (!count) {
    throw new Error(`Cannot prove ${table} RLS: service-role baseline is empty.`)
  }

  return count
}

function assertDenied(table, baselineCount, result) {
  if (result.error?.code === '42501') {
    console.log(`[DENIED] role=TU table=${table} result=SQLSTATE 42501 baseline=${baselineCount}`)
    return
  }

  if (result.error) {
    throw new Error(`Unexpected ${table} query error (${result.error.code}).`)
  }

  const rowCount = result.data?.length ?? 0
  if (rowCount !== 0) {
    throw new Error(`RLS FAILURE: TU read ${rowCount} row(s) from ${table}.`)
  }

  console.log(`[DENIED] role=TU table=${table} result=0 rows baseline=${baselineCount}`)
}

async function main() {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.')
  }

  requireLocalUrl(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const baselineCounts = {
    students: await getBaselineCount(admin, 'students'),
    student_grades: await getBaselineCount(admin, 'student_grades'),
  }

  const disposableEmail = `tu-rls-${randomUUID()}@e2e.local`
  const disposablePassword = `${randomUUID()}Aa1!`
  let userId

  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: disposableEmail,
      password: disposablePassword,
      email_confirm: true,
      user_metadata: { full_name: 'TU RLS E2E' },
    })

    if (createError || !created.user) {
      throw new Error(`Could not create disposable TU identity (${createError?.code ?? 'NO_USER'}).`)
    }

    userId = created.user.id
    const { error: profileError } = await admin.from('user_profiles').upsert({
      id: userId,
      full_name: 'TU RLS E2E',
      role: 'TU',
    })

    if (profileError) {
      throw new Error(`Could not assign disposable TU role (${profileError.code}).`)
    }

    const tuClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: login, error: loginError } = await tuClient.auth.signInWithPassword({
      email: disposableEmail,
      password: disposablePassword,
    })

    if (loginError || !login.user) {
      throw new Error(`Could not authenticate disposable TU identity (${loginError?.code ?? 'NO_USER'}).`)
    }

    const { data: verified, error: verifyError } = await tuClient.auth.getUser()
    if (verifyError || verified.user?.id !== userId) {
      throw new Error('Disposable TU session did not verify against Supabase Auth.')
    }

    console.log(`[RLS] Authenticated role=TU user=${userId}`)
    console.log('[RLS] Non-empty service-role baselines', baselineCounts)

    const [studentsResult, gradesResult] = await Promise.all([
      tuClient.from('students').select('id').limit(1),
      tuClient.from('student_grades').select('id').limit(1),
    ])

    assertDenied('students', baselineCounts.students, studentsResult)
    assertDenied('student_grades', baselineCounts.student_grades, gradesResult)
    console.log('[PASS] Direct TU reads were blocked by the database RLS policies.')
  } finally {
    if (userId) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(userId)
      if (cleanupError) {
        console.error(`[WARN] Could not delete disposable TU identity (${cleanupError.code}).`)
      }
    }
  }
}

main().catch((error) => {
  console.error('[FAIL] TU RLS verification failed:', error instanceof Error ? error.message : 'Unknown error.')
  process.exitCode = 1
})