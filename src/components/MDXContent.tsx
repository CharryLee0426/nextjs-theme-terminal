import { MDXRemote } from 'next-mdx-remote/rsc'
import { CodeBlock } from './CodeBlock'
import { CustomImage } from './CustomImage'
import { Callout } from './Callout'
import { YouTubeEmbed } from './YouTubeEmbed'
import remarkGfm from 'remark-gfm'

interface MDXContentProps {
  source: string
}

interface HeadingProps {
  children: React.ReactNode
  [key: string]: unknown
}

interface LinkProps {
  href?: string
  children: React.ReactNode
  [key: string]: unknown
}

const components = {
  pre: CodeBlock,
  img: CustomImage,
  Callout,
  YouTube: YouTubeEmbed,
  // Custom heading with anchor links
  h2: ({ children, ...props }: HeadingProps) => (
    <h2 id={slugify(children)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: HeadingProps) => (
    <h3 id={slugify(children)} {...props}>
      {children}
    </h3>
  ),
  // Custom link component
  a: ({ href, children, ...props }: LinkProps) => {
    const isExternal = href?.startsWith('http')
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    )
  },
}

function slugify(text: React.ReactNode): string {
  return text
    ?.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-') || ''
}

export function MDXContent({ source }: MDXContentProps) {
  return <MDXRemote source={source} components={components} options={{mdxOptions: {remarkPlugins: [remarkGfm]}}} />
}