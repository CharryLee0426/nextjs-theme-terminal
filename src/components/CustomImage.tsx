import Image from 'next/image'

interface CustomImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
}

export function CustomImage({ src, alt, width, height, className }: CustomImageProps) {
  // Handle external URLs
  if (src.startsWith('http')) {
    return (
      <img 
        src={src} 
        alt={alt} 
        className={className}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    )
  }

  // Handle local images with Next.js Image component
  return (
    <Image
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 400}
      className={className}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  )
}