import { notFound } from 'next/navigation'
import { PostCard } from '@/components/PostCard'
import { getAllTags, getPostsByTag } from '@/lib/posts'

interface TagPageProps {
  params: { tag: string }
}

export async function generateStaticParams() {
  const tags = await getAllTags()
  return tags.map((tagData) => ({
    tag: tagData.tag,
  }))
}

export async function generateMetadata({ params }: TagPageProps) {
  return {
    title: `Tag: ${params.tag}`,
    description: `All posts tagged with "${params.tag}"`,
  }
}

export default async function TagPage({ params }: TagPageProps) {
  const posts = await getPostsByTag(params.tag)
  
  if (posts.length === 0) {
    notFound()
  }

  return (
    <div className="posts">
      <h1 className="posts-title">
        <span style={{ color: 'var(--foreground)' }}>
          Posts for: <span style={{ color: 'var(--accent)' }}>#{params.tag}</span>
        </span>
      </h1>
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} />
      ))}
    </div>
  )
}