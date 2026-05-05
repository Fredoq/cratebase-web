import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadCatalog } from './catalogApi'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

describe('catalog API adapter', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, '__cratebaseUseRealCatalogApi', {
      configurable: true,
      value: true,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__cratebaseUseRealCatalogApi')
    vi.unstubAllGlobals()
  })

  it('loads collection catalog data from authenticated API routes', async () => {
    const fetchMock = vi.fn<Window['fetch']>()
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: '00000000-0000-7000-8000-000000000001',
              type: 'person',
              name: 'Aphex Twin',
            },
          ],
          limit: 100,
          offset: 0,
          total: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: '00000000-0000-7000-8000-000000000002', name: 'Warp' }],
          limit: 100,
          offset: 0,
          total: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: '00000000-0000-7000-8000-000000000003',
              title: 'Selected Ambient Works 85-92',
              type: 'album',
              labelId: '00000000-0000-7000-8000-000000000002',
              year: 1992,
              genres: ['Ambient'],
              tags: ['lossless'],
            },
          ],
          limit: 100,
          offset: 0,
          total: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: '00000000-0000-7000-8000-000000000004',
              title: 'Polynomial-C',
              durationSeconds: 284,
              genres: ['IDM'],
              tags: ['album version'],
            },
          ],
          limit: 100,
          offset: 0,
          total: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: '00000000-0000-7000-8000-000000000005',
              targetType: 'release',
              targetId: '00000000-0000-7000-8000-000000000003',
              status: 'owned',
              medium: {
                type: 'cd',
                description: 'CD',
                path: null,
                format: null,
                discCount: 1,
              },
              condition: 'veryGood',
              storageLocation: 'CD shelf',
            },
          ],
          limit: 100,
          offset: 0,
          total: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: '00000000-0000-7000-8000-000000000006',
              contributorArtistId: '00000000-0000-7000-8000-000000000001',
              contributorName: 'Aphex Twin',
              targetType: 'release',
              targetId: '00000000-0000-7000-8000-000000000003',
              role: 'mainArtist',
            },
          ],
          limit: 100,
          offset: 0,
          total: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: [], limit: 100, offset: 0, total: 0 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: [], limit: 100, offset: 0, total: 0 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const catalog = await loadCatalog()

    expect(fetchMock).toHaveBeenCalledWith('/api/artists?limit=100&offset=0', {
      credentials: 'include',
      method: 'GET',
    })
    expect(catalog.artists[0]).toMatchObject({
      id: '00000000-0000-7000-8000-000000000001',
      name: 'Aphex Twin',
      type: 'Person',
    })
    expect(catalog.releases[0]).toMatchObject({
      artist: 'Aphex Twin',
      label: 'Warp',
      title: 'Selected Ambient Works 85-92',
    })
    expect(catalog.ownedItems[0]).toMatchObject({
      medium: 'CD',
      releaseTitle: 'Selected Ambient Works 85-92',
      status: 'Owned',
    })
  })

  it('rejects normal catalog responses that expose collection ids', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<Window['fetch']>().mockImplementation(() =>
        Promise.resolve(
          jsonResponse({
            items: [
              {
                id: '00000000-0000-7000-8000-000000000001',
                collectionId: '00000000-0000-7000-8000-000000000099',
                type: 'person',
                name: 'Leaked Artist',
              },
            ],
            limit: 100,
            offset: 0,
            total: 1,
          }),
        ),
      ),
    )

    await expect(loadCatalog()).rejects.toThrow(/collection ids/i)
  })
})
