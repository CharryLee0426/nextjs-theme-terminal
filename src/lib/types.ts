export interface PostFrontmatter {
  title: string
  description?: string
  pubDate: string
  updatedDate?: string
  author?: string
  image?: string
  externalLink?: string
  tags: string[]
  draft?: boolean
}

export interface Post extends PostFrontmatter {
  slug: string
  content: string
  readingTime: string
  wordCount: number
}

export type PostWithoutContent = Omit<Post, 'content'>