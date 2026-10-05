import BlogListing from '@/app/components/apps/blog/BlogListing'
import { getPublishedBlogPosts } from '@/lib/template-apps/data'

const BlogPost = async () => {
  const posts = await getPublishedBlogPosts()

  if (posts.length === 0) {
    return <p className="py-6 text-center text-muted-foreground">Belum ada artikel yang diterbitkan.</p>
  }

  return (
    <BlogListing posts={posts} />
  )
}

export default BlogPost
