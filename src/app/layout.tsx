import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Terminal',
    template: '%s | Terminal'
  },
  description: 'A terminal-inspired Next.js theme with MDX support',
  keywords: ['nextjs', 'mdx', 'blog', 'terminal', 'theme'],
  authors: [{ name: 'Chen Li' }],
  creator: 'Chen Li',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chenli.dev',
    title: 'Terminal',
    description: 'A terminal-inspired Next.js theme with MDX support',
    siteName: 'Terminal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terminal',
    description: 'A terminal-inspired Next.js theme with MDX support',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="container center">
          <Header />
          <main className="content">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
