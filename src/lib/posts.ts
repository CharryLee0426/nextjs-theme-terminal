import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import { Post, PostFrontmatter, PostWithoutContent } from './types'

const postsDirectory = path.join(process.cwd(), 'content/posts')

export async function getAllPosts(): Promise<PostWithoutContent[]> {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.mdx') || fileName.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.(mdx|md)$/, '')
      const fullPath = path.join(postsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data, content } = matter(fileContents)
      
      const frontmatter = data as PostFrontmatter
      const stats = readingTime(content)
      
      return {
        slug,
        ...frontmatter,
        pubDate: frontmatter.pubDate,
        tags: frontmatter.tags || [],
        draft: frontmatter.draft || false,
        readingTime: stats.text,
        wordCount: stats.words,
      } as PostWithoutContent
    })
    .filter(post => !post.draft)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  return allPostsData
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`)
    let fileContents: string
    
    if (fs.existsSync(fullPath)) {
      fileContents = fs.readFileSync(fullPath, 'utf8')
    } else {
      const mdPath = path.join(postsDirectory, `${slug}.md`)
      if (fs.existsSync(mdPath)) {
        fileContents = fs.readFileSync(mdPath, 'utf8')
      } else {
        return null
      }
    }
    
    const { data, content } = matter(fileContents)
    const frontmatter = data as PostFrontmatter
    const stats = readingTime(content)
    
    return {
      slug,
      content,
      ...frontmatter,
      tags: frontmatter.tags || [],
      draft: frontmatter.draft || false,
      readingTime: stats.text,
      wordCount: stats.words,
    } as Post
  } catch {
    return null
  }
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getAllPosts()
  const tagCounts: Record<string, number> = {}
  
  posts.forEach(post => {
    post.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })
  
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag))
}

export async function getPostsByTag(tag: string): Promise<PostWithoutContent[]> {
  const posts = await getAllPosts()
  return posts.filter(post => post.tags.includes(tag))
}

// Get adjacent posts for navigation
export async function getAdjacentPosts(currentSlug: string): Promise<{
  prevPost: PostWithoutContent | null
  nextPost: PostWithoutContent | null
}> {
  const posts = await getAllPosts()
  const currentIndex = posts.findIndex(post => post.slug === currentSlug)
  
  return {
    prevPost: currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null,
    nextPost: currentIndex > 0 ? posts[currentIndex - 1] : null,
  }
}