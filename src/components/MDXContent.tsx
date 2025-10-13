import { MDXRemote } from 'next-mdx-remote/rsc'
import { CodeBlock } from './CodeBlock'
import { CustomImage } from './CustomImage'
import { Callout } from './Callout'
import { YouTubeEmbed } from './YouTubeEmbed'

interface MDXContentProps {
  source: string
}

const components = {
  pre: CodeBlock,
  img: CustomImage,
  Callout,
  YouTube: YouTubeEmbed,
  // Custom heading with anchor links
  h2: ({ children, ...props }: any) => (
    <h2 id={slugify(children)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 id={slugify(children)} {...props}>
      {children}
    </h3>
  ),
  // Custom link component
  a: ({ href, children, ...props }: any) => {
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

function slugify(text: any): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

export function MDXContent({ source }: MDXContentProps) {
  return <MDXRemote source={source} components={components} />
}