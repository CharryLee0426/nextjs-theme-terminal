'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CodeBlockProps {
  children: React.ReactNode
  className?: string
  title?: string
}

interface ReactElementWithProps {
  props: {
    children: React.ReactNode
  }
}

export function CodeBlock({ children, className, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    const code = extractTextFromChildren(children)
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const extractTextFromChildren = (children: React.ReactNode): string => {
    if (typeof children === 'string') return children
    if (typeof children === 'number') return children.toString()
    if (Array.isArray(children)) {
      return children.map(extractTextFromChildren).join('')
    }
    if (children && typeof children === 'object' && 'props' in children) {
      return extractTextFromChildren((children as ReactElementWithProps).props.children)
    }
    return ''
  }

  return (
    <div className="code-block">
      {title && <div className="code-title">{title}</div>}
      <div style={{ position: 'relative' }}>
        <pre className={className}>
          <code>{children}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="copy-button"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}