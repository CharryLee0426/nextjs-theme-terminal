import type { MDXComponents } from 'mdx/types'
import { CodeBlock } from '@/components/CodeBlock'
import { CustomImage } from '@/components/CustomImage'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Custom components for MDX
    pre: CodeBlock,
    img: CustomImage,
    // Style headings with terminal aesthetic
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-accent border-b-2 border-dotted border-accent pb-2 mb-4">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold text-accent mt-8 mb-4">
        {children}
      </h2>
    ),
    // Add more custom components as needed
    ...components,
  }
}