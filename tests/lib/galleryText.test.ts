import {
  GALLERY_BODY_PREVIEW_MAX,
  GALLERY_TITLE_PREVIEW_MAX,
  truncateText,
} from '@/lib/galleryText'

describe('truncateText', () => {
  it('returns trimmed text when within limit', () => {
    expect(truncateText('  hello  ', 10)).toBe('hello')
  })

  it('truncates with ellipsis when longer than maxChars', () => {
    expect(truncateText('abcdefghijklmnop', 8)).toBe('abcde...')
  })

  it('handles maxChars smaller than ellipsis length', () => {
    expect(truncateText('abcdef', 2)).toBe('...')
  })
})

describe('gallery preview constants', () => {
  it('exports positive limits', () => {
    expect(GALLERY_TITLE_PREVIEW_MAX).toBeGreaterThan(0)
    expect(GALLERY_BODY_PREVIEW_MAX).toBeGreaterThan(0)
  })
})
