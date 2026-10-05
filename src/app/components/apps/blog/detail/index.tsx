import { format } from 'date-fns'
import CardBox from '@/app/components/shared/CardBox'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import type { BlogPostDTO } from '@/lib/template-apps/data'
import BlogComments from './BlogComments'

export default function BlogDetailData({ post }: { post: BlogPostDTO }) {
  return (
    <>
      <CardBox className="overflow-hidden p-0">
        {post.cover_image && (
          <div className="relative max-h-[440px] overflow-hidden">
            <Image
              src={post.cover_image}
              alt={post.title}
              height={440}
              width={1500}
              className="w-full object-cover object-center"
            />
          </div>
        )}
        <div className="px-6 pb-6 pt-5">
          <Badge variant="gray">{post.category}</Badge>
          <h1 className="my-5 text-2xl font-semibold md:text-4xl">{post.title}</h1>
          <p className="text-sm text-muted-foreground">
            Diterbitkan {post.published_at ? format(new Date(post.published_at), 'd MMM yyyy') : ''}
          </p>
          <div className="mt-6 whitespace-pre-wrap leading-7">{post.content}</div>
        </div>
      </CardBox>
      <BlogComments postSlug={post.slug} initialComments={post.comments} />
    </>
  )
}