'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { authCookieOptions } from '@/lib/supabase/auth-cookie-options'

async function createSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

async function authenticate(
  formData: FormData
): Promise<{ error: string | null }> {
  const emails = formData.getAll('email')
  const passwords = formData.getAll('password')
  const email = emails[0]
  const password = passwords[0]

  if (
    emails.length !== 1 ||
    passwords.length !== 1 ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return { error: 'Email atau kata sandi tidak sesuai.' }
  }

  let failed = false

  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    failed = Boolean(error)
  } catch {
    failed = true
  }

  if (failed) {
    return { error: 'Email atau kata sandi tidak sesuai.' }
  }

  redirect('/apps/dashboard')
}

export async function signIn(formData: FormData) {
  return authenticate(formData)
}

export async function signInWithState(
  _previousState: { error: string | null },
  formData: FormData
) {
  return authenticate(formData)
}

export async function signOut() {
  let failed = false

  try {
    const supabase = await createSupabaseClient()
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    failed = Boolean(error)
  } catch {
    failed = true
  }

  redirect(failed ? '/auth/login?error=signout' : '/auth/login')
}