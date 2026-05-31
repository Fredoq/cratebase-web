import { describe, expect, it } from 'vitest'
import * as h from './test/appTestHarness'

h.setupAppTestHooks()

describe('App Discogs release autocomplete', () => {
  it('searches release candidates and prefills a new release only after review apply', async () => {
    window.history.pushState({}, '', '/releases')
    const fetchMock = h.vi.fn<Window['fetch']>().mockImplementation((input) => {
      const url = requestUrl(input)

      if (url.pathname === '/api/external-metadata/discogs/releases') {
        return Promise.resolve(
          h.jsonResponse({
            items: [
              {
                source: source('249504'),
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
      }

      if (url.pathname === '/api/external-metadata/discogs/releases/249504') {
        return Promise.resolve(h.jsonResponse(releaseDetail()))
      }

      throw new Error(`Unexpected request: ${url.pathname}`)
    })
    h.vi.stubGlobal('fetch', fetchMock)
    const user = h.userEvent.setup()
    h.render(<h.App />)

    await user.click(h.screen.getByRole('button', { name: 'Add release' }))
    const form = h.screen.getByRole('form', { name: 'Add release' })

    await user.type(
      h.within(form).getByLabelText('Title'),
      'Local working title',
    )
    await user.click(
      h.within(form).getByRole('button', { name: 'Search Discogs' }),
    )

    const lookup = h.within(form).getByRole('region', {
      name: 'Discogs release lookup',
    })
    await user.click(
      h.within(lookup).getByRole('button', { name: 'Search Discogs releases' }),
    )
    await user.click(
      await h.within(lookup).findByRole('button', {
        name: /review blue monday/i,
      }),
    )

    expect(h.within(form).getByLabelText('Title')).toHaveValue(
      'Local working title',
    )
    expect(
      await h.within(lookup).findByRole('heading', {
        name: 'Review Discogs candidate',
      }),
    ).toBeInTheDocument()
    expect(
      h.within(lookup).getAllByText('Data provided by Discogs.').length,
    ).toBeGreaterThan(0)
    expect(
      h.within(lookup).getByRole('link', { name: 'Open Discogs source' }),
    ).toHaveAttribute('href', 'https://www.discogs.com/release/249504')

    await user.click(
      h.within(lookup).getByRole('button', {
        name: 'Apply selected Discogs fields',
      }),
    )

    expect(h.within(form).getByLabelText('Title')).toHaveValue('Blue Monday')
    expect(h.within(form).getByText('Factory')).toBeInTheDocument()
    expect(h.within(form).getByText('FAC 73')).toBeInTheDocument()
    expect(h.within(form).getAllByText('Blue Monday').length).toBeGreaterThan(0)
    expect(
      h.within(form).getByRole('button', { name: 'Add record' }),
    ).toBeDisabled()
    expect(
      h.screen.queryByRole('complementary', { name: 'Blue Monday' }),
    ).not.toBeInTheDocument()
  })

  it('reviews an existing release update before applying selected field groups and provenance', async () => {
    window.history.pushState({}, '', '/releases?release=blue-monday')
    const fetchMock = h.vi.fn<Window['fetch']>().mockImplementation((input) => {
      const url = requestUrl(input)

      if (url.pathname === '/api/external-metadata/discogs/releases') {
        return Promise.resolve(
          h.jsonResponse({
            items: [
              {
                source: source('249504'),
                title: 'Blue Monday 12"',
                artists: ['New Order'],
                year: 1983,
                labels: ['Factory'],
                formats: ['Vinyl', '12"'],
                catalogNumber: 'FAC 73',
                barcodes: [],
              },
            ],
            limit: 25,
            total: 1,
          }),
        )
      }

      if (url.pathname === '/api/external-metadata/discogs/releases/249504') {
        return Promise.resolve(
          h.jsonResponse({
            ...releaseDetail(),
            title: 'Blue Monday 12"',
            draft: {
              ...releaseDetail().draft,
              title: 'Blue Monday 12"',
            },
          }),
        )
      }

      throw new Error(`Unexpected request: ${url.pathname}`)
    })
    h.vi.stubGlobal('fetch', fetchMock)
    const user = h.userEvent.setup()
    h.render(<h.App />)

    await user.click(
      h.screen.getByRole('button', { name: 'Update via Discogs' }),
    )
    const form = h.screen.getByRole('form', { name: 'Edit release' })
    const lookup = h.within(form).getByRole('region', {
      name: 'Discogs release lookup',
    })

    await user.click(
      h.within(lookup).getByRole('button', { name: 'Search Discogs releases' }),
    )
    await user.click(
      await h.within(lookup).findByRole('button', {
        name: /review blue monday 12/i,
      }),
    )

    expect(h.within(form).getByLabelText('Title')).toHaveValue('Blue Monday')

    await user.click(h.within(lookup).getByLabelText('Apply Core'))
    await user.click(h.within(lookup).getByLabelText('Apply External Source'))
    await user.click(
      h.within(lookup).getByRole('button', {
        name: 'Apply selected Discogs fields',
      }),
    )

    expect(h.within(form).getByLabelText('Title')).toHaveValue(
      'Blue Monday 12"',
    )

    await user.click(
      h.within(form).getByRole('button', { name: 'Save record' }),
    )

    const updatedRelease = h
      .getInitialCatalogStateForTests()
      ?.releases.find((release) => release.id === 'blue-monday')
    expect(updatedRelease).toMatchObject({
      title: 'Blue Monday 12"',
      externalSources: [
        {
          providerName: 'discogs',
          resourceType: 'release',
          externalId: '249504',
          sourceUrl: 'https://www.discogs.com/release/249504',
        },
      ],
    })
    expect(updatedRelease?.externalSources?.[0].appliedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    )
  })
})

function requestUrl(input: Parameters<Window['fetch']>[0]) {
  if (typeof input === 'string' || input instanceof URL) {
    return new URL(input, 'http://localhost')
  }

  return new URL(input.url, 'http://localhost')
}

function source(externalId: string) {
  return {
    providerName: 'discogs',
    resourceType: 'release',
    externalId,
    sourceUrl: `https://www.discogs.com/release/${externalId}`,
    attribution: 'Data provided by Discogs.',
  }
}

function releaseDetail() {
  return {
    source: source('249504'),
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
  }
}
