import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp'
import BlogDetailData from '@/app/components/apps/blog/detail'
import { getPublishedBlogPost } from '@/lib/template-apps/data'
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Blog Details',
}

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Blog Detail',
  },
]
const BlogDetail = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const post = await getPublishedBlogPost(slug)

  return (
    <>
      <BreadcrumbComp title='Blog Detail' items={BCrumb} />
      {post ? <BlogDetailData post={post} /> : <p className="py-6 text-center font-semibold">Artikel tidak ditemukan.</p>}
    </>
  )
}

export default BlogDetail
