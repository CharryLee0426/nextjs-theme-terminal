import middleware, { config } from '@/middleware'
import { convexAuthNextjsMiddleware } from '@convex-dev/auth/nextjs/server'

jest.mock('@convex-dev/auth/nextjs/server', () => ({
  convexAuthNextjsMiddleware: jest.fn(() => 'mock-middleware-handler'),
}))

const mockedConvexAuth = jest.mocked(convexAuthNextjsMiddleware)

describe('middleware', () => {
  it('delegates to convexAuthNextjsMiddleware with 30-day session cookie', () => {
    expect(mockedConvexAuth).toHaveBeenCalledTimes(1)
    expect(mockedConvexAuth).toHaveBeenCalledWith(undefined, {
      cookieConfig: { maxAge: 60 * 60 * 24 * 30 },
    })
  })

  it('exports the handler returned by convexAuthNextjsMiddleware', () => {
    expect(middleware).toBe('mock-middleware-handler')
  })

  it('exports matcher for app routes and Convex auth API', () => {
    expect(config).toEqual({
      matcher: [
        '/((?!.*\\..*|_next).*)',
        '/',
        '/api/auth',
        '/api/auth/:path*',
      ],
    })
  })
})
