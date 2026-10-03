import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
} satisfies HeadersInit

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: privateHeaders }
      )
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session || session.user.id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: privateHeaders }
      )
    }

    return NextResponse.json(
      { access_token: session.access_token },
      { headers: privateHeaders }
    )
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: privateHeaders }
    )
  }
}