const { createServerClient } = require('@supabase/ssr')
const { loadEnvConfig } = require('@next/env')
const { performance } = require('node:perf_hooks')

loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const email = process.env.E2E_TEST_EMAIL
const password = process.env.E2E_TEST_PASSWORD
const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000'

if (!supabaseUrl || !anonKey || !email || !password) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, E2E_TEST_EMAIL, and E2E_TEST_PASSWORD in the environment.'
  )
  process.exit(2)
}

const cookieJar = new Map()

function cookieHeader() {
  return Array.from(cookieJar, ([name, value]) => `${name}=${value}`).join('; ')
}

function storeResponseCookies(response) {
  const setCookies = response.headers.getSetCookie?.() ?? []

  for (const setCookie of setCookies) {
    const pair = setCookie.split(';', 1)[0]
    const separator = pair.indexOf('=')
    if (separator < 0) continue

    const name = pair.slice(0, separator)
    const value = pair.slice(separator + 1)
    if (value) cookieJar.set(name, value)
    else cookieJar.delete(name)
  }
}

function measure(label, startedAt, details) {
  console.log(label, {
    ...details,
    responseMs: Number((performance.now() - startedAt).toFixed(1)),
  })
}

async function main() {
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

  const authStartedAt = performance.now()
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    console.error('Authentication failed.', {
      code: authError?.code ?? 'NO_AUTH_USER',
      responseMs: Number((performance.now() - authStartedAt).toFixed(1)),
    })
    process.exitCode = 1
    return
  }

  measure('Supabase sign-in', authStartedAt, { authenticated: true })

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Profile lookup failed.', { code: profileError.code })
    process.exitCode = 1
    return
  }

  const role = profile?.role.trim().toUpperCase() ?? 'NO_PROFILE'
  console.log('Authenticated profile role:', role)

  const wakaStartedAt = performance.now()
  const wakaResponse = await fetch(`${baseUrl}/apps/waka`, {
    headers: { cookie: cookieHeader(), accept: 'text/html' },
    redirect: 'manual',
  })
  storeResponseCookies(wakaResponse)

  const wakaExpectedStatus = role === 'WAKA' ? 200 : 404
  measure('Waka dashboard', wakaStartedAt, {
    role,
    status: wakaResponse.status,
    expectedStatus: wakaExpectedStatus,
    passed: wakaResponse.status === wakaExpectedStatus,
  })

  if (wakaResponse.status !== wakaExpectedStatus) {
    process.exitCode = 1
  }

  const classId = process.env.E2E_RAPOR_CLASS_ID ?? '00000000-0000-0000-0000-000000000001'
  const subjectId = process.env.E2E_RAPOR_SUBJECT_ID ?? '00000000-0000-0000-0000-000000000002'
  const raporUrl = new URL('/apps/rapor', baseUrl)
  raporUrl.searchParams.set('classId', classId)
  raporUrl.searchParams.set('subjectId', subjectId)

  const raporStartedAt = performance.now()
  const raporResponse = await fetch(raporUrl, {
    headers: { cookie: cookieHeader(), accept: 'text/html' },
    redirect: 'manual',
  })
  const raporBody = await raporResponse.text()
  storeResponseCookies(raporResponse)

  measure('Rapor calculation action', raporStartedAt, {
    role,
    status: raporResponse.status,
    passed: raporResponse.status < 500,
    result:
      raporResponse.status >= 500
        ? 'server-error'
        : raporBody.includes('Anda tidak memiliki akses')
          ? 'role-denied'
          : raporBody.includes('Belum lengkap')
            ? 'calculation-rendered'
            : 'completed-without-server-error',
  })

  if (raporResponse.status >= 500) {
    process.exitCode = 1
  }
}

main().catch(() => {
  console.error('E2E request failed before completion.')
  process.exitCode = 1
})