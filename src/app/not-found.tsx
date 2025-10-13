import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="page framed" style={{ textAlign: 'center' }}>
      <h1>404</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link href="/" className="button">
        Go back home
      </Link>
    </div>
  )
}