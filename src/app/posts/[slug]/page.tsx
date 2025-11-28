import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getAllPosts, getPostBySlug, getAdjacentPosts } from '@/lib/posts'
import { FormattedDate } from '@/components/FormattedDate'
import { MDXContent } from '@/components/MDXContent'

interface PostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  
  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.pubDate,
      modifiedTime: post.updatedDate,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  
  if (!post) {
    notFound()
  }

  const { prevPost, nextPost } = await getAdjacentPosts(slug)

  return (
    <article>
      <h1 className="post-title">{post.title}</h1>
      
      <div className="post-meta">
        <FormattedDate date={post.pubDate} />
        {post.author && <span className="post-author">{post.author}</span>}
        {post.updatedDate && (
          <span className="post-updated">
            Updated: <FormattedDate date={post.updatedDate} />
          </span>
        )}
        <span className="reading-time">{post.readingTime}</span>
      </div>
      
      {post.tags.length > 0 && (
        <div className="post-tags">
          {post.tags.map((tag) => (
            <Link key={tag} href={`/tags/${tag}`} className="tag-link">
              #{tag}
            </Link>
          ))}
        </div>
      )}
      
      {post.image && (
        <figure className="post-cover">
          <img src={post.image} alt={post.title} />
        </figure>
      )}
      
      <div className="post-content">
        <MDXContent source={post.content} />
      </div>
      
      {/* Post navigation */}
      <div className="pagination">
        <div className="pagination__title">
          <span className="pagination__title-h">Read other posts</span>
          <hr />
        </div>
        <div className="pagination__buttons">
          {prevPost && (
            <Link href={`/posts/${prevPost.slug}`} className="button inline prev">
              <ChevronLeft className="w-4 h-4" />
              <span className="button__text">{prevPost.title}</span>
            </Link>
          )}
          {prevPost && nextPost && <span>::</span>}
          {nextPost && (
            <Link href={`/posts/${nextPost.slug}`} className="button inline next">
              <span className="button__text">{nextPost.title}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}