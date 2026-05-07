import { normalizeImageFileForUpload } from '@/lib/heicNormalize'
import heic2any from 'heic2any'

jest.mock('heic2any', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockedHeic2any = jest.mocked(heic2any)

describe('normalizeImageFileForUpload', () => {
  beforeEach(() => {
    mockedHeic2any.mockReset()
  })

  it('returns the original file when not HEIC/HEIF', async () => {
    const file = new File(['x'], 'pic.png', { type: 'image/png' })
    const out = await normalizeImageFileForUpload(file)
    expect(out).toBe(file)
    expect(mockedHeic2any).not.toHaveBeenCalled()
  })

  it('detects HEIC by filename extension', async () => {
    const jpegBlob = new Blob(['fake-jpeg'], { type: 'image/jpeg' })
    mockedHeic2any.mockResolvedValue(jpegBlob)

    const file = new File(['raw'], 'vacation.HEIC', { type: '' })
    const out = await normalizeImageFileForUpload(file)

    expect(mockedHeic2any).toHaveBeenCalledWith({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92,
    })
    expect(out.name).toBe('vacation.jpg')
    expect(out.type).toBe('image/jpeg')
  })

  it('detects HEIF by MIME type', async () => {
    const jpegBlob = new Blob(['x'], { type: 'image/jpeg' })
    mockedHeic2any.mockResolvedValue(jpegBlob)

    const file = new File(['raw'], 'blob.bin', { type: 'image/heif' })
    const out = await normalizeImageFileForUpload(file)

    expect(mockedHeic2any).toHaveBeenCalled()
    // Basename does not end in .heic/.heif — suffix is appended, not replaced.
    expect(out.name).toBe('blob.bin.jpg')
  })

  it('uses first blob when heic2any returns an array', async () => {
    const first = new Blob(['a'], { type: 'image/jpeg' })
    const second = new Blob(['b'], { type: 'image/jpeg' })
    mockedHeic2any.mockResolvedValue([first, second])

    const file = new File(['raw'], 'shot.heif', { type: '' })
    const out = await normalizeImageFileForUpload(file)

    expect(out.size).toBe(first.size)
    expect(out.name).toBe('shot.jpg')
  })

  it('names output image.jpg when basename is empty after stripping extension', async () => {
    mockedHeic2any.mockResolvedValue(new Blob(['z'], { type: 'image/jpeg' }))
    const file = new File(['raw'], '.heic', { type: '' })
    const out = await normalizeImageFileForUpload(file)
    expect(out.name).toBe('image.jpg')
  })
})
