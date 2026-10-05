import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type BlogPostDTO = Pick<
  Database['public']['Tables']['blog_posts']['Row'],
  'slug' | 'title' | 'content' | 'cover_image' | 'category' | 'is_featured' | 'published_at'
> & {
  comments: BlogCommentDTO[]
}

export type BlogCommentDTO = Pick<
  Database['public']['Tables']['blog_comments']['Row'],
  'id' | 'post_slug' | 'author_name' | 'content' | 'created_at'
>

export type NoteDTO = Pick<
  Database['public']['Tables']['notes']['Row'],
  'id' | 'title' | 'color' | 'created_at' | 'updated_at'
>

export type TicketDTO = Pick<
  Database['public']['Tables']['tickets']['Row'],
  'id' | 'ticket_title' | 'ticket_description' | 'status' | 'ticket_date' | 'created_at'
> & { owner_name: string }

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Unauthorized')
  return { supabase, user }
}

export async function getPublishedBlogPosts(): Promise<BlogPostDTO[]> {
  const { supabase } = await getAuthenticatedClient()
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('slug, title, content, cover_image, category, is_featured, published_at')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })

  if (error) throw new Error('Blog posts are unavailable')
  if (!posts?.length) return []

  const slugs = posts.map((post) => post.slug)
  const { data: comments, error: commentsError } = await supabase
    .from('blog_comments')
    .select('id, post_slug, author_name, content, created_at')
    .in('post_slug', slugs)
    .order('created_at', { ascending: true })

  if (commentsError) throw new Error('Blog comments are unavailable')

  return posts.map((post) => ({
    ...post,
    comments: (comments ?? []).filter((comment) => comment.post_slug === post.slug),
  }))
}

export async function getPublishedBlogPost(slug: string): Promise<BlogPostDTO | null> {
  const posts = await getPublishedBlogPosts()
  return posts.find((post) => post.slug === slug) ?? null
}

export async function getOwnedNotes(): Promise<NoteDTO[]> {
  const { supabase, user } = await getAuthenticatedClient()
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, color, created_at, updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) throw new Error('Notes are unavailable')
  return data ?? []
}

export async function getOwnedTickets(): Promise<TicketDTO[]> {
  const { supabase, user } = await getAuthenticatedClient()
  const [{ data: tickets, error }, { data: profile }] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, ticket_title, ticket_description, status, ticket_date, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ])

  if (error) throw new Error('Tickets are unavailable')
  return (tickets ?? []).map((ticket) => ({
    ...ticket,
    owner_name: profile?.full_name?.trim() || 'You',
  }))
}
