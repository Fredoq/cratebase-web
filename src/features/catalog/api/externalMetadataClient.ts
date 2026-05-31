import { assertNoCollectionIds, CatalogApiError } from './httpClient'

export type ExternalMetadataSourceDto = {
  providerName: string
  resourceType: string
  externalId: string
  sourceUrl: string
  attribution: string
}

export type ExternalSourceReference = {
  providerName: string
  resourceType: string
  externalId: string
  sourceUrl: string
  appliedAt?: string
}

export type DiscogsReleaseSearchParams = {
  query?: string
  artist?: string
  title?: string
  year?: string
  barcode?: string
  catalogNumber?: string
  limit?: number
}

export type DiscogsReleaseSearchResponse = {
  items: ExternalMetadataReleaseCandidateDto[]
  limit: number
  total: number
}

export type ExternalMetadataReleaseCandidateDto = {
  source: ExternalMetadataSourceDto
  title: string
  artists: string[]
  year?: number | null
  labels: string[]
  formats: string[]
  catalogNumber?: string | null
  barcodes: string[]
}

export type ExternalMetadataReleaseDetailDto =
  ExternalMetadataReleaseCandidateDto & {
    tracklist: ExternalMetadataReleaseTrackDto[]
    identifiers: ExternalMetadataReleaseIdentifierDto[]
    credits: ExternalMetadataReleaseCreditDto[]
    draft: ExternalMetadataReleaseDraftDto
  }

export type ExternalMetadataReleaseTrackDto = {
  title: string
  position?: string | null
  durationSeconds?: number | null
  artists: string[]
}

export type ExternalMetadataReleaseIdentifierDto = {
  type: string
  value: string
}

export type ExternalMetadataReleaseCreditDto = {
  name: string
  role: string
  trackTitle?: string | null
  trackPosition?: string | null
}

export type ExternalMetadataReleaseDraftDto = {
  title: string
  year?: number | null
  artistCredits: ExternalMetadataReleaseDraftArtistCreditDto[]
  labels: ExternalMetadataReleaseDraftLabelDto[]
  tracklist: ExternalMetadataReleaseDraftTrackDto[]
  externalSources: ExternalSourceReference[]
}

export type ExternalMetadataReleaseDraftArtistCreditDto = {
  name: string
  role: string
}

export type ExternalMetadataReleaseDraftLabelDto = {
  name: string
  catalogNumber?: string | null
  hasNoCatalogNumber: boolean
}

export type ExternalMetadataReleaseDraftTrackDto = {
  title: string
  position: number
  durationSeconds?: number | null
  artistCredits: ExternalMetadataReleaseDraftArtistCreditDto[]
}

export async function searchDiscogsReleases(
  params: DiscogsReleaseSearchParams,
) {
  const query = new URLSearchParams()
  appendTrimmed(query, 'query', params.query)
  appendTrimmed(query, 'artist', params.artist)
  appendTrimmed(query, 'title', params.title)
  appendTrimmed(query, 'year', params.year)
  appendTrimmed(query, 'barcode', params.barcode)
  appendTrimmed(query, 'catalogNumber', params.catalogNumber)
  query.set('limit', String(params.limit ?? 25))

  return getExternalMetadataJson<DiscogsReleaseSearchResponse>(
    `/api/external-metadata/discogs/releases?${query.toString()}`,
  )
}

export async function getDiscogsRelease(externalId: string) {
  return getExternalMetadataJson<ExternalMetadataReleaseDetailDto>(
    `/api/external-metadata/discogs/releases/${encodeURIComponent(
      externalId.trim(),
    )}`,
  )
}

async function getExternalMetadataJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    method: 'GET',
  })

  if (!response.ok) {
    throw await CatalogApiError.fromResponse(response)
  }

  const body = (await response.json()) as T
  assertNoCollectionIds(body)

  return body
}

function appendTrimmed(
  query: URLSearchParams,
  name: string,
  value: string | undefined,
) {
  const trimmed = value?.trim()
  if (trimmed) {
    query.set(name, trimmed)
  }
}
