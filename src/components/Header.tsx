'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Terminal } from 'lucide-react'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <header className="header">
      <div className="container">
        <div className="header__inner">
          {/* Terminal-style logo */}
          <div className="header__logo">
            <Link href="/" className="logo">
              <span className="logo__mark">
                <Terminal size={20} />
              </span>
              <span className="logo__text">terminal</span>
              <span className="logo__cursor"></span>
            </Link>
          </div>
        
        {/* Mobile menu button */}
        <button 
          className="menu-trigger"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        
          {/* Desktop navigation */}
          <nav className="menu">
            <ul className="menu__inner">
              <li><Link href="/about">about</Link></li>
              <li><Link href="/posts">posts</Link></li>
              <li><Link href="/tags">tags</Link></li>
            </ul>
          </nav>
        </div>
        
        {/* Mobile menu */}
        <nav className={`menu-mobile ${isMenuOpen ? 'menu-mobile--open' : ''}`}>
          <ul className="menu-mobile__inner">
            <li><Link href="/about" onClick={() => setIsMenuOpen(false)}>about</Link></li>
            <li><Link href="/posts" onClick={() => setIsMenuOpen(false)}>posts</Link></li>
            <li><Link href="/tags" onClick={() => setIsMenuOpen(false)}>tags</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}