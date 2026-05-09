import type { Metadata } from 'next'
import { MagicCanvas } from '@/components/MagicCanvas'

export const metadata: Metadata = {
  title: 'Canvas',
  description: 'Sketch on a canvas and transform the image with an LLM style workflow.',
}

export default function CanvasPage() {
  return <MagicCanvas />
}
