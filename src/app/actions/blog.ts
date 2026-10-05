'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getActionFieldErrors, type AppActionResult } from '@/lib/template-apps/action-result'
import type { Database } from '@/types/database.types'

const commentSchema = z.object({
  postSlug: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1).max(2000),
}).strict()

type BlogComment = Omit<Database['public']['Tables']['blog_comments']['Row'], 'user_id'>

export async function createBlogComment(input: unknown): Promise<AppActionResult<BlogComment>> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const parsed = commentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Komentar tidak valid.', fieldErrors: getActionFieldErrors(parsed.error.issues) }
  }

  const [{ data: profile }, { data: post, error: postError }] = await Promise.all([
    supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('blog_posts').select('slug').eq('slug', parsed.data.postSlug).not('published_at', 'is', null).maybeSingle(),
  ])
  if (postError || !post) return { success: false, error: 'Artikel tidak tersedia.' }

  const { data, error } = await supabase
    .from('blog_comments')
    .insert({
      post_slug: post.slug,
      user_id: user.id,
      author_name: profile?.full_name?.trim() || 'You',
      content: parsed.data.content,
    })
    .select('id, post_slug, author_name, content, created_at')
    .single()

  if (error || !data) return { success: false, error: 'Komentar tidak dapat disimpan.' }

  revalidatePath('/apps/blog/post')
  revalidatePath('/apps/blog/detail/[slug]', 'page')
  return { success: true, data }
}
