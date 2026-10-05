import BlogCard from './BlogCard'
import BlogFeaturedCard from './BlogFeaturedCard'
import type { BlogPostDTO } from '@/lib/template-apps/data'

const BlogListing = ({ posts }: { posts: BlogPostDTO[] }) => {
  const blogPosts = posts.filter((post) => !post.is_featured)
  const featuredPosts = posts.filter((post) => post.is_featured)

  return (
    <div className='grid grid-cols-12 gap-6'>
      {featuredPosts.map((post, index) => (
        <BlogFeaturedCard index={index} post={post} key={post.slug} />
      ))}
      {blogPosts.map((post) => (
        <BlogCard post={post} key={post.slug} />
      ))}
    </div>
  )
}

export default BlogListing
