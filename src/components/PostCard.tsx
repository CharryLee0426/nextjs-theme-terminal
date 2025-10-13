import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { FormattedDate } from './FormattedDate'
import { PostWithoutContent } from '@/lib/types'

interface PostCardProps {
  post: PostWithoutContent
}

export function PostCard({ post }: PostCardProps) {
  const postUrl = post.externalLink || `/posts/${post.slug}`
  const isExternal = !!post.externalLink

  return (
    <article className="post on-list">
      <h2 className="post-title">
        {isExternal ? (
          <a 
            href={postUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            {post.title}
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <Link href={postUrl}>{post.title}</Link>
        )}
      </h2>
      
      <div className="post-meta">
        <FormattedDate date={post.pubDate} className="post-date" />
        {post.author && (
          <span className="post-author">{post.author}</span>
        )}
        <span className="reading-time">{post.readingTime}</span>
      </div>
      
      {post.description && (
        <p className="post-description">{post.description}</p>
      )}
      
      {post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((tag, index) => (
            <span key={tag}>
              <Link href={`/tags/${tag}`} className="tag-link">
                #{tag}
              </Link>
              {index < post.tags.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}