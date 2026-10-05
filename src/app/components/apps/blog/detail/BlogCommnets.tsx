'use client'

import { format } from 'date-fns'
import type { BlogCommentDTO } from '@/lib/template-apps/data'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function BlogComment({ comment }: { comment: BlogCommentDTO }) {
  const name = comment.author_name || '?'

  return (
    <article className="mt-5 rounded-md bg-muted p-5">
      <div className="flex items-center gap-3">
        <Avatar><AvatarFallback>{name[0]}</AvatarFallback></Avatar>
        <h3 className="text-base font-medium">{name}</h3>
        <time className="text-sm text-muted-foreground" dateTime={comment.created_at}>
          {format(new Date(comment.created_at), 'E, MMM d')}
        </time>
      </div>
      <p className="py-4 text-ld">{comment.content}</p>
    </article>
  )
}