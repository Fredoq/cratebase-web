import { describe, expect, it } from 'vitest'
import * as h from './test/appTestHarness'

h.setupAppTestHooks()

describe('App server-backed navigation', () => {
  it('does not hydrate the full catalog when navigating across server-backed workspaces', async () => {
    h.clearCatalogForTests()
    h.vi.stubGlobal('__cratebaseUseRealCatalogApi', true)
    const fetchMock = h.mockFetch(
      ...Array.from({ length: 8 }, h.emptySearchResponse),
      h.emptyImportSessionsResponse(),
      h.defaultDictionaryListResponse(),
      h.defaultRatingCriteriaListResponse(),
    )
    const user = h.userEvent.setup()
    h.render(<h.App />)

    await h.screen.findByText('No matching catalog entries.')

    const routeExpectations = [
      ['Releases', 2],
      ['Tracks', 3],
      ['Artists', 4],
      ['Labels', 5],
      ['Playlists', 6],
      ['Owned Items', 7],
      ['Relations', 8],
      ['Imports', 9],
      ['Exports', 9],
      ['Settings', 11],
    ] as const

    for (const [routeName, expectedCallCount] of routeExpectations) {
      await user.click(h.screen.getByRole('link', { name: routeName }))
      expect(
        h.within(h.screen.getByRole('banner')).getByRole('heading', {
          name: routeName,
        }),
      ).toBeInTheDocument()
      await h.waitFor(() => {
        expect(fetchMock.mock.calls).toHaveLength(expectedCallCount)
      })
    }

    const urls = fetchMock.mock.calls.map(([input]) =>
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url,
    )

    expect(urls.filter((url) => url.startsWith('/api/search?'))).toHaveLength(8)
    expect(urls).toContain('/api/imports?limit=100&offset=0')
    expect(urls).toContain('/api/settings/dictionaries?limit=100&offset=0')
    expect(urls).toContain('/api/rating-criteria?limit=100&offset=0')
    for (const listPath of [
      '/api/artists?',
      '/api/labels?',
      '/api/releases?',
      '/api/tracks?',
      '/api/owned-items?',
      '/api/credits?',
      '/api/artist-relations?',
      '/api/track-relations?',
      '/api/playlists?',
      '/api/ratings?',
    ]) {
      expect(urls.some((url) => url.startsWith(listPath))).toBe(false)
    }
  })
})
