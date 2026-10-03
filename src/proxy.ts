import { createServerClient } from '@supabase/ssr'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { authCookieOptions } from '@/lib/supabase/auth-cookie-options'

function redirectWithSession(
  request: NextRequest,
  response: NextResponse,
  pathname: string
) {
  const redirectResponse = NextResponse.redirect(new URL(pathname, request.url), 303)

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie)
  })
  ;['cache-control', 'expires', 'pragma', 'content-security-policy'].forEach((name) => {
    const value = response.headers.get(name)
    if (value) redirectResponse.headers.set(name, value)
  })

  return redirectResponse
}

export async function proxy(request: NextRequest) {
  const dashboardPath = request.nextUrl.pathname.startsWith('/apps/')
  const requestHeaders = new Headers(request.headers)
  let contentSecurityPolicy: string | null = null

  if (dashboardPath) {
    const nonce = Buffer.from(randomUUID()).toString('base64')
    const developmentPolicy = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let supabaseOrigin = ''
    let realtimeOrigin = ''

    if (supabaseUrl) {
      try {
        const projectUrl = new URL(supabaseUrl)
        supabaseOrigin = projectUrl.origin
        realtimeOrigin = `${projectUrl.protocol === 'https:' ? 'wss:' : 'ws:'}//${projectUrl.host}`
      } catch {
        supabaseOrigin = ''
      }
    }

    contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentPolicy}`,
      `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
      'img-src \'self\' data: blob: https:',
      'font-src \'self\' data: https:',
      `connect-src 'self' ${supabaseOrigin} ${realtimeOrigin} ${developmentPolicy ? 'ws:' : ''}`.trim(),
      'worker-src \'self\' blob:',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "manifest-src 'self'",
    ].join('; ')

    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)
  }

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  if (contentSecurityPolicy) {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy)
  }

  const loginPath = request.nextUrl.pathname === '/auth/login'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (loginPath) return response
    return redirectWithSession(request, response, '/auth/login')
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({
          request: { headers: requestHeaders },
        })
        if (contentSecurityPolicy) {
          response.headers.set('Content-Security-Policy', contentSecurityPolicy)
        }
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value)
        })
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (loginPath) {
    if (!error && user) {
      return redirectWithSession(request, response, '/apps/dashboard')
    }

    return response
  }

  if (error || !user) {
    return redirectWithSession(request, response, '/auth/login')
  }

  return response
}

export const config = {
  matcher: ['/apps/:path*', '/auth/login'],
}