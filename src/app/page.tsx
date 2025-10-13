import { PostCard } from '@/components/PostCard'
import { getAllPosts } from '@/lib/posts'

export default async function HomePage() {
  const posts = await getAllPosts()

  return (
    <>
      <div className="index-content framed">
        <h1 id="hello-there">👋 Hello, I&apos;m CharryLee</h1>
        <p>
          Welcome to my digital terminal! I&apos;m a passionate software developer who loves 
          building elegant solutions with modern web technologies like React, Next.js, and TypeScript.
        </p>
        <p>
          Here you&apos;ll find my thoughts on development, tutorials, and projects I&apos;m working on. 
          Feel free to explore my posts below or <a href="/about">learn more about me</a>!
        </p>
        <p>
          <span className="terminal-prompt">charry@terminal:~$</span> 
          <span className="terminal-command">echo &quot;Happy coding!&quot;</span>
        </p>
      </div>
      
      <div className="posts">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </>
  )
}
