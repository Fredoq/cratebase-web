import { describe, expect, it, vi } from 'vitest'
import {
  getDiscogsRelease,
  searchDiscogsReleases,
} from './api/externalMetadataClient'
import { CatalogApiError } from './api/httpClient'
import * as h from './catalogApiTestHarness'

h.setupCatalogApiAdapterTests()

describe('external metadata API client', () => {
  it('searches Discogs releases with trimmed collection-scoped query params', async () => {
    const fetchMock = vi.fn<Window['fetch']>().mockResolvedValue(
      h.jsonResponse({
        items: [
          {
            source: source('release', '249504'),
            title: 'Blue Monday',
            artists: ['New Order'],
            year: 1983,
            labels: ['Factory'],
            formats: ['Vinyl', '12"'],
            catalogNumber: 'FAC 73',
            barcodes: ['5016839200371'],
          },
        ],
        limit: 25,
        total: 1,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await searchDiscogsReleases({
      query: ' factory ',
      artist: ' New Order ',
      title: ' Blue Monday ',
      year: ' 1983 ',
      barcode: ' 5016839200371 ',
      catalogNumber: ' FAC 73 ',
      limit: 25,
    })

    const url = requestUrl(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/api/external-metadata/discogs/releases')
    expect(url.searchParams.get('query')).toBe('factory')
    expect(url.searchParams.get('artist')).toBe('New Order')
    expect(url.searchParams.get('title')).toBe('Blue Monday')
    expect(url.searchParams.get('year')).toBe('1983')
    expect(url.searchParams.get('barcode')).toBe('5016839200371')
    expect(url.searchParams.get('catalogNumber')).toBe('FAC 73')
    expect(url.searchParams.get('limit')).toBe('25')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      method: 'GET',
    })
    expect(result.items[0]).toMatchObject({
      title: 'Blue Monday',
      source: {
        providerName: 'discogs',
        attribution: 'Data provided by Discogs.',
      },
    })
  })

  it('loads Discogs release detail draft data and rejects collection id leaks', async () => {
    const fetchMock = vi.fn<Window['fetch']>()
    fetchMock
      .mockResolvedValueOnce(
        h.jsonResponse({
          source: source('release', '249504'),
          title: 'Blue Monday',
          artists: ['New Order'],
          year: 1983,
          labels: ['Factory'],
          formats: ['Vinyl', '12"'],
          tracklist: [
            {
              title: 'Blue Monday',
              position: 'A',
              durationSeconds: 449,
              artists: ['New Order'],
            },
          ],
          identifiers: [{ type: 'Barcode', value: '5016839200371' }],
          barcodes: ['5016839200371'],
          catalogNumber: 'FAC 73',
          credits: [{ name: 'New Order', role: 'Written-By' }],
          draft: {
            title: 'Blue Monday',
            year: 1983,
            artistCredits: [{ name: 'New Order', role: 'mainArtist' }],
            labels: [
              {
                name: 'Factory',
                catalogNumber: 'FAC 73',
                hasNoCatalogNumber: false,
              },
            ],
            tracklist: [
              {
                title: 'Blue Monday',
                position: 1,
                durationSeconds: 449,
                artistCredits: [{ name: 'New Order', role: 'mainArtist' }],
              },
            ],
            externalSources: [
              {
                providerName: 'discogs',
                resourceType: 'release',
                externalId: '249504',
                sourceUrl: 'https://www.discogs.com/release/249504',
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(
        h.jsonResponse({
          collectionId: '00000000-0000-7000-8000-000000000099',
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const detail = await getDiscogsRelease('249504')

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/external-metadata/discogs/releases/249504',
    )
    expect(detail.draft.tracklist[0]).toMatchObject({
      title: 'Blue Monday',
      position: 1,
      durationSeconds: 449,
    })
    expect(detail.draft.externalSources[0]).toMatchObject({
      providerName: 'discogs',
      resourceType: 'release',
      externalId: '249504',
    })
    await expect(getDiscogsRelease('leaky')).rejects.toThrow(/collection ids/i)
  })

  it('surfaces safe provider errors without losing retry-after', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<Window['fetch']>().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'external_metadata.rate_limited',
            message: 'External metadata provider is rate limited',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
            status: 429,
          },
        ),
      ),
    )

    await expect(
      searchDiscogsReleases({ query: 'Factory' }),
    ).rejects.toMatchObject({
      status: 429,
      code: 'external_metadata.rate_limited',
      retryAfter: '60',
    } satisfies Partial<CatalogApiError>)
  })
})

function source(resourceType: string, externalId: string) {
  return {
    providerName: 'discogs',
    resourceType,
    externalId,
    sourceUrl: `https://www.discogs.com/${resourceType}/${externalId}`,
    attribution: 'Data provided by Discogs.',
  }
}

function requestUrl(input: Parameters<Window['fetch']>[0]) {
  if (typeof input === 'string' || input instanceof URL) {
    return new URL(input, 'http://localhost')
  }

  return new URL(input.url, 'http://localhost')
}
