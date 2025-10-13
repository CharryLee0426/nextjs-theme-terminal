import { PostCard } from '@/components/PostCard'
import { getAllPosts } from '@/lib/posts'

export const metadata = {
  title: 'All Posts',
  description: 'Browse all blog posts',
}

export default async function PostsPage() {
  const posts = await getAllPosts()

  return (
    <div className="posts">
      <h1 className="posts-title">All Posts</h1>
      <div className="posts-list">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))
        ) : (
          <div className="no-posts">
            <p>No posts found. Start writing your first post!</p>
          </div>
        )}
      </div>
    </div>
  )
}