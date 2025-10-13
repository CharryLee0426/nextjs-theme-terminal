import Link from 'next/link'
import { getAllTags } from '@/lib/posts'

export const metadata = {
  title: 'Tags',
  description: 'All tags used in posts',
}

export default async function TagsPage() {
  const tags = await getAllTags()

  return (
    <div className="page">
      <h1 className="posts-title">Tags</h1>
      
      <div className="tags-list">
        {tags.map(({ tag, count }) => (
          <Link key={tag} href={`/tags/${tag}`} className="tag-item">
            <span className="tag-name">#{tag}</span>
            <span className="tag-count">({count})</span>
          </Link>
        ))}
      </div>
    </div>
  )
}