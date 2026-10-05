'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { createBlogComment } from '@/app/actions/blog'
import type { BlogCommentDTO } from '@/lib/template-apps/data'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import BlogComment from './BlogCommnets'

type OptimisticComment = BlogCommentDTO

export default function BlogComments({
  postSlug,
  initialComments,
}: {
  postSlug: string
  initialComments: BlogCommentDTO[]
}) {
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    initialComments,
    (comments: OptimisticComment[], comment: OptimisticComment) => [comment, ...comments]
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const submitComment = (formData: FormData) => {
    const content = String(formData.get('content') ?? '').trim()
    if (!content) return

    startTransition(async () => {
      setError(null)
      addOptimisticComment({
        id: `optimistic-${Date.now()}`,
        post_slug: postSlug,
        author_name: 'You',
        content,
        created_at: new Date().toISOString(),
      })

      const result = await createBlogComment({ postSlug, content })
      if (!result.success) setError(result.error)
    })
  }

  return (
    <section className="mt-6 rounded-md border border-border bg-card p-6">
      <h2 className="mb-2 text-xl font-semibold">Komentar</h2>
      <form action={submitComment} className="space-y-3">
        <Textarea
          aria-label="Tulis komentar"
          name="content"
          maxLength={2000}
          placeholder="Tulis komentar..."
          required
          rows={4}
        />
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button disabled={isPending} type="submit">
          {isPending ? 'Mengirim...' : 'Kirim komentar'}
        </Button>
      </form>

      <div aria-live="polite" className="mt-6 space-y-4">
        {optimisticComments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada komentar.</p>
        ) : (
          optimisticComments.map((comment) => <BlogComment comment={comment} key={comment.id} />)
        )}
      </div>
    </section>
  )
}
