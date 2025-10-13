import Link from 'next/link'

export const metadata = {
  title: 'About',
  description: 'About CharryLee - Software Developer & Terminal Enthusiast',
}

export default function AboutPage() {
  return (
    <div className="page framed">
      <div className="terminal-header">
        <span className="terminal-prompt">charry@terminal:~$</span>
        <span className="terminal-command">whoami</span>
      </div>
      
      <h1>About Me</h1>
      
      <section className="about-section">
        <h2>👋 Hello, I&apos;m CharryLee</h2>
        <p>
          Welcome to my digital terminal! I&apos;m a passionate software developer who loves 
          building elegant solutions and exploring the intersection of technology and creativity.
        </p>
      </section>

      <section className="about-section">
        <h2>💻 What I Do</h2>
        <p>
          I specialize in full-stack development with a focus on modern web technologies. 
          My toolkit includes JavaScript/TypeScript, React, Next.js, Node.js, and various 
          other frameworks and tools that help bring ideas to life.
        </p>
        <ul>
          <li>🚀 Frontend Development (React, Next.js, TypeScript)</li>
          <li>⚡ Backend Development (Node.js, APIs, Databases)</li>
          <li>🎨 UI/UX Design & Implementation</li>
          <li>🔧 DevOps & Deployment</li>
          <li>📱 Mobile Development</li>
        </ul>
      </section>

      <section className="about-section">
        <h2>🌟 Current Focus</h2>
        <p>
          Currently exploring the latest in web development, contributing to open source 
          projects, and building tools that make developers&apos; lives easier. I&apos;m particularly 
          interested in:
        </p>
        <ul>
          <li>Modern React patterns and performance optimization</li>
          <li>Server-side rendering and static site generation</li>
          <li>Developer experience and tooling</li>
          <li>Terminal-based applications and CLI tools</li>
        </ul>
      </section>

      <section className="about-section">
        <h2>🎯 Philosophy</h2>
        <p>
          I believe in writing clean, maintainable code and creating user experiences 
          that are both functional and delightful. Every project is an opportunity to 
          learn something new and push the boundaries of what&apos;s possible.
        </p>
      </section>

      <section className="about-section">
        <h2>📫 Get In Touch</h2>
        <p>
          Feel free to reach out if you&apos;d like to collaborate on a project, discuss 
          technology, or just say hello!
        </p>
        <div className="contact-links">
          <a href="https://github.com/CharryLee0426" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <span className="separator">•</span>
          <a href="mailto:contact@example.com">Email</a>
          <span className="separator">•</span>
          <Link href="/posts">Blog</Link>
        </div>
      </section>

      <div className="terminal-footer">
        <span className="terminal-prompt">charry@terminal:~$</span>
        <span className="terminal-command">echo &quot;Thanks for visiting!&quot;</span>
        <div className="terminal-output">Thanks for visiting!</div>
      </div>
    </div>
  )
}