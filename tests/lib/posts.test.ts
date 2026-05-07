import fs from 'fs'
import path from 'path'
import {
  getAdjacentPosts,
  getAllPosts,
  getAllTags,
  getPostBySlug,
  getPostsByTag,
} from '@/lib/posts'

jest.mock('fs', () => ({
  __esModule: true,
  default: {
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
  },
}))

const postsDir = path.join(process.cwd(), 'content/posts')
const mockFs = jest.mocked(fs)

function frontmatterDoc(body: string, fm: Record<string, unknown>) {
  const lines = ['---']
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map(t => `"${t}"`).join(', ')}]`)
    } else if (typeof v === 'boolean') {
      lines.push(`${k}: ${v}`)
    } else {
      lines.push(`${k}: "${v}"`)
    }
  }
  lines.push('---')
  lines.push(body)
  return lines.join('\n')
}

describe('posts lib', () => {
  beforeEach(() => {
    mockFs.existsSync.mockReset()
    mockFs.readdirSync.mockReset()
    mockFs.readFileSync.mockReset()
  })

  describe('getAllPosts', () => {
    it('returns empty array when posts directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false)

      await expect(getAllPosts()).resolves.toEqual([])
    })

    it('parses mdx/md files, skips drafts, sorts by pubDate descending', async () => {
      mockFs.existsSync.mockImplementation(p => p === postsDir)

      mockFs.readdirSync.mockReturnValue(['older.mdx', 'newer.md', 'skip.mdx'])

      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const name = String(filePath).split(path.sep).pop()
        if (name === 'older.mdx') {
          return frontmatterDoc('Old body.', {
            title: 'Old',
            pubDate: '2024-01-01',
            tags: ['x'],
            draft: false,
          })
        }
        if (name === 'newer.md') {
          return frontmatterDoc('New body.', {
            title: 'New',
            pubDate: '2025-01-01',
            tags: ['y'],
            draft: false,
          })
        }
        if (name === 'skip.mdx') {
          return frontmatterDoc('Draft.', {
            title: 'Draft',
            pubDate: '2026-01-01',
            tags: [],
            draft: true,
          })
        }
        throw new Error(`unexpected read ${filePath}`)
      })

      const posts = await getAllPosts()

      expect(posts).toHaveLength(2)
      expect(posts[0].slug).toBe('newer')
      expect(posts[0].title).toBe('New')
      expect(posts[1].slug).toBe('older')
      expect(posts[1].tags).toEqual(['x'])
      expect(posts.every(p => typeof p.wordCount === 'number')).toBe(true)
    })

    it('defaults missing tags and draft', async () => {
      mockFs.existsSync.mockImplementation(p => p === postsDir)
      mockFs.readdirSync.mockReturnValue(['minimal.mdx'])
      mockFs.readFileSync.mockReturnValue(
        frontmatterDoc('Hi.', {
          title: 'T',
          pubDate: '2024-05-05',
        }),
      )

      const posts = await getAllPosts()
      expect(posts[0].tags).toEqual([])
      expect(posts[0].draft).toBe(false)
    })
  })

  describe('getPostBySlug', () => {
    it('reads .mdx when present', async () => {
      const mdxPath = path.join(postsDir, 'hello.mdx')
      mockFs.existsSync.mockImplementation(p => p === mdxPath)
      mockFs.readFileSync.mockReturnValue(
        frontmatterDoc('Content here.', {
          title: 'Hello',
          pubDate: '2024-01-01',
          tags: ['a'],
        }),
      )

      const post = await getPostBySlug('hello')
      expect(post).not.toBeNull()
      expect(post!.slug).toBe('hello')
      expect(post!.content.trim()).toBe('Content here.')
      expect(post!.title).toBe('Hello')
    })

    it('falls back to .md when mdx is missing', async () => {
      const mdxPath = path.join(postsDir, 'only.mdx')
      const mdPath = path.join(postsDir, 'only.md')
      mockFs.existsSync.mockImplementation(p => {
        if (p === mdxPath) return false
        if (p === mdPath) return true
        return false
      })
      mockFs.readFileSync.mockReturnValue(
        frontmatterDoc('Md body.', {
          title: 'Md',
          pubDate: '2024-02-02',
          tags: [],
        }),
      )

      const post = await getPostBySlug('only')
      expect(post).not.toBeNull()
      expect(post!.content.includes('Md body.')).toBe(true)
    })

    it('returns null when neither file exists', async () => {
      mockFs.existsSync.mockReturnValue(false)
      await expect(getPostBySlug('missing')).resolves.toBeNull()
    })

    it('returns null when read throws', async () => {
      const mdxPath = path.join(postsDir, 'bad.mdx')
      mockFs.existsSync.mockImplementation(p => p === mdxPath)
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('disk')
      })
      await expect(getPostBySlug('bad')).resolves.toBeNull()
    })
  })

  describe('getAllTags', () => {
    it('aggregates tag counts and sorts alphabetically', async () => {
      mockFs.existsSync.mockImplementation(p => p === postsDir)
      mockFs.readdirSync.mockReturnValue(['a.mdx', 'b.mdx'])
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const name = String(filePath).split(path.sep).pop()
        if (name === 'a.mdx') {
          return frontmatterDoc('A', {
            title: 'A',
            pubDate: '2024-01-01',
            tags: ['zebra', 'alpha'],
          })
        }
        if (name === 'b.mdx') {
          return frontmatterDoc('B', {
            title: 'B',
            pubDate: '2024-02-02',
            tags: ['alpha'],
          })
        }
        throw new Error('unexpected')
      })

      const tags = await getAllTags()
      expect(tags).toEqual([
        { tag: 'alpha', count: 2 },
        { tag: 'zebra', count: 1 },
      ])
    })
  })

  describe('getPostsByTag', () => {
    it('filters posts containing the tag', async () => {
      mockFs.existsSync.mockImplementation(p => p === postsDir)
      mockFs.readdirSync.mockReturnValue(['one.mdx', 'two.mdx'])
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const name = String(filePath).split(path.sep).pop()
        if (name === 'one.mdx') {
          return frontmatterDoc('1', {
            title: 'One',
            pubDate: '2024-01-01',
            tags: ['rust'],
          })
        }
        if (name === 'two.mdx') {
          return frontmatterDoc('2', {
            title: 'Two',
            pubDate: '2024-02-02',
            tags: ['go'],
          })
        }
        throw new Error('unexpected')
      })

      const filtered = await getPostsByTag('rust')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].slug).toBe('one')
    })
  })

  describe('getAdjacentPosts', () => {
    it('maps prev to older post and next to newer in sorted list', async () => {
      mockFs.existsSync.mockImplementation(p => p === postsDir)
      mockFs.readdirSync.mockReturnValue(['old.mdx', 'mid.mdx', 'new.mdx'])
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const name = String(filePath).split(path.sep).pop()
        const map: Record<string, { pubDate: string; title: string }> = {
          'old.mdx': { pubDate: '2024-01-01', title: 'Old' },
          'mid.mdx': { pubDate: '2024-06-01', title: 'Mid' },
          'new.mdx': { pubDate: '2024-12-01', title: 'New' },
        }
        const entry = map[name as string]
        if (!entry) throw new Error('unexpected')
        return frontmatterDoc('x', {
          title: entry.title,
          pubDate: entry.pubDate,
          tags: [],
        })
      })

      const adj = await getAdjacentPosts('mid')
      expect(adj.prevPost?.slug).toBe('old')
      expect(adj.nextPost?.slug).toBe('new')
    })

    it('when slug is missing: prevPost follows index -1 edge rule', async () => {
      mockFs.existsSync.mockImplementation(p => p === postsDir)
      mockFs.readdirSync.mockReturnValue(['a.mdx'])
      mockFs.readFileSync.mockReturnValue(
        frontmatterDoc('x', {
          title: 'A',
          pubDate: '2024-01-01',
          tags: [],
        }),
      )

      const adj = await getAdjacentPosts('nope')
      // currentIndex === -1: prevPost becomes posts[0], nextPost stays null.
      expect(adj.prevPost?.slug).toBe('a')
      expect(adj.nextPost).toBeNull()
    })
  })
})
