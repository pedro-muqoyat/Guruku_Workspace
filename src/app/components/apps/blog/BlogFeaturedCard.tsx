import Link from 'next/link'
import { Icon } from '@iconify/react'
import { GoDot } from 'react-icons/go'
import { format } from 'date-fns'
import type { BlogPostDTO } from '@/lib/template-apps/data'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Btype {
  post: BlogPostDTO
  index: number
}

const BlogFeaturedCard = ({ post, index }: Btype) => {
  // Destructure with default values to avoid undefined
  const {
    cover_image: coverImg = '',
    title = '',
    comments = [],
    category = '',
    published_at,
  } = post

  const mainPost = index === 0

  return (
    <>
      {post ? (
        <div
          className={`lg:col-span-${
            mainPost ? 8 : 4
          } md:col-span-12 col-span-12`}>
          <Card className='w-full h-[400px] p-0 overflow-hidden flex-row shadow-none feature-card relative card-hover border-none'>
            {/* Background Image */}
            <div className='absolute inset-0'>
              {coverImg ? (
                <img
                  src={coverImg}
                  alt={title || 'blog image'}
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='w-full h-full bg-gray-200' /> // fallback
              )}
              <div className='absolute inset-0 bg-black opacity-50 mix-blend-multiply'></div>
            </div>

            {/* Content */}
            <div className='absolute inset-0 p-6 flex flex-col justify-between'>
              <div className='flex justify-between items-center'>
                {category && (
                  <Badge className='rounded-md bg-primary text-white'>
                    {category}
                  </Badge>
                )}
              </div>

              <div>
                <h2 className='text-2xl text-white my-6'>
                  <Link href={`/apps/blog/detail/${post.slug}`}>{title}</Link>
                </h2>
                <div className='flex gap-3'>
                  <div className='flex gap-2 items-center text-white text-[15px]'>
                    <Icon icon='tabler:message-2' height='18' />{' '}
                    {comments.length}
                  </div>
                  <div className='ms-auto flex gap-2 items-center text-white text-[15px]'>
                    <GoDot size='16' />
                    <small>{published_at ? format(new Date(published_at), 'E, MMM d') : ''}</small>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  )
}

export default BlogFeaturedCard
