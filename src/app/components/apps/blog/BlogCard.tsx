'use client'
import { format } from 'date-fns'
import { GoDot } from 'react-icons/go'
import { Icon } from '@iconify/react'
import CardBox from '../../shared/CardBox'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'

import type { BlogPostDTO } from '@/lib/template-apps/data'

interface Btype {
  post: BlogPostDTO
  index?: number
}

const BlogCard = ({ post }: Btype) => {
  // Destructure with default values for optional fields
  const {
    cover_image: coverImg = '',
    title = '',
    comments = [],
    category = '',
    published_at,
  } = post

  return (
    <div className='lg:col-span-4 md:col-span-6 col-span-12'>
      <CardBox className='p-0 overflow-hidden group card-hover'>
        <div className='relative'>
          <Link href={`/apps/blog/detail/${post.slug}`}>
            <div className='overflow-hidden h-[240px]'>
              {coverImg ? (
                <Image
                  src={coverImg}
                  alt={title || 'blog image'}
                  height={240}
                  width={500}
                  className='w-full'
                />
              ) : (
                <div className='w-full h-[240px] bg-gray-200' /> // fallback if no image
              )}
            </div>
            <Badge className='absolute bottom-8 end-6 rounded-md bg-white text-black'>
              2 min Read
            </Badge>
          </Link>

        </div>

        <div className='px-6 pb-6'>
          {category && (
            <Badge variant='gray' className='mt-3 rounded-md'>
              {category}
            </Badge>
          )}

          <h5 className='text-xl py-6 group-hover:text-primary'>
            <Link href={`/apps/blog/detail/${post.slug}`} className='line-clamp-2'>
              {title}
            </Link>
          </h5>

          <div className='flex gap-3'>
            <div className='flex gap-2 items-center text-muted-foreground text-[15px]'>
              <Icon icon='tabler:message-2' height='18' className='text-foreground' />{' '}
              {comments.length}
            </div>
            <div className='ms-auto flex gap-2 items-center text-muted-foreground text-[15px]'>
              <GoDot size='16' className='text-foreground' />
              <small>{published_at ? format(new Date(published_at), 'E, MMM d') : ''}</small>
            </div>
          </div>
        </div>
      </CardBox>
    </div>
  )
}

export default BlogCard
