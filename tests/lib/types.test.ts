import type { Post, PostFrontmatter, PostWithoutContent } from '@/lib/types'

/**
 * Runtime smoke tests: ensures exported types stay assignable for typical shapes.
 * (Interfaces compile away; this mainly guards exports and documents expectations.)
 */
describe('types module exports', () => {
  it('accepts a minimal PostFrontmatter', () => {
    const fm: PostFrontmatter = {
      title: 'Hello',
      pubDate: '2024-01-01',
      tags: ['note'],
    }
    expect(fm.tags).toHaveLength(1)
  })

  it('accepts Post with computed fields', () => {
    const post: Post = {
      slug: 'hello',
      title: 'Hello',
      pubDate: '2024-01-01',
      tags: [],
      content: '# Hi',
      readingTime: '1 min read',
      wordCount: 2,
    }
    expect(post.slug).toBe('hello')
  })

  it('PostWithoutContent omits content', () => {
    const summary: PostWithoutContent = {
      slug: 'hello',
      title: 'Hello',
      pubDate: '2024-01-01',
      tags: [],
      readingTime: '1 min read',
      wordCount: 2,
    }
    expect('content' in summary).toBe(false)
  })
})
