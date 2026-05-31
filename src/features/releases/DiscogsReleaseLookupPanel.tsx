import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  CatalogApiError,
  getDiscogsRelease,
  searchDiscogsReleases,
  type ExternalMetadataReleaseCandidateDto,
  type ExternalMetadataReleaseDetailDto,
} from '../catalog/catalogApi'

export type DiscogsApplyGroups = {
  core: boolean
  artists: boolean
  labels: boolean
  tracklist: boolean
  externalSource: boolean
}

export type DiscogsSearchSeed = {
  artist: string
  catalogNumber: string
  title: string
  year: string
}

export type DiscogsCurrentRelease = {
  artists: string
  externalSourceCount: number
  labels: string
  title: string
  trackCount: number
  year: string
}

type DiscogsReleaseLookupPanelProps = {
  current: DiscogsCurrentRelease
  isOpen: boolean
  mode: 'create' | 'update'
  searchSeed: DiscogsSearchSeed
  onApplyDraft: (
    detail: ExternalMetadataReleaseDetailDto,
    groups: DiscogsApplyGroups,
  ) => void
  onOpenChange: (isOpen: boolean) => void
}

const emptyGroups: DiscogsApplyGroups = {
  core: false,
  artists: false,
  labels: false,
  tracklist: false,
  externalSource: false,
}

export function DiscogsReleaseLookupPanel({
  current,
  isOpen,
  mode,
  searchSeed,
  onApplyDraft,
  onOpenChange,
}: DiscogsReleaseLookupPanelProps) {
  const [query, setQuery] = useState('')
  const [artist, setArtist] = useState(searchSeed.artist)
  const [title, setTitle] = useState(searchSeed.title)
  const [year, setYear] = useState(searchSeed.year)
  const [barcode, setBarcode] = useState('')
  const [catalogNumber, setCatalogNumber] = useState(searchSeed.catalogNumber)
  const [status, setStatus] = useState('')
  const [candidates, setCandidates] = useState<
    ExternalMetadataReleaseCandidateDto[]
  >([])
  const [selectedDetail, setSelectedDetail] =
    useState<ExternalMetadataReleaseDetailDto | null>(null)
  const [applyGroups, setApplyGroups] = useState<DiscogsApplyGroups>(() =>
    defaultGroups(mode),
  )
  const wasOpen = useRef(false)

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setArtist(searchSeed.artist)
      setTitle(searchSeed.title)
      setYear(searchSeed.year)
      setCatalogNumber(searchSeed.catalogNumber)
    }

    wasOpen.current = isOpen
  }, [isOpen, searchSeed])

  async function handleSearch() {
    setStatus('Searching Discogs release candidates.')
    setSelectedDetail(null)

    try {
      const result = await searchDiscogsReleases({
        query,
        artist,
        title,
        year,
        barcode,
        catalogNumber,
        limit: 25,
      })

      setCandidates(result.items)
      setStatus(
        result.items.length > 0
          ? `${result.total} candidate${result.total === 1 ? '' : 's'} found.`
          : 'No Discogs release candidates found.',
      )
    } catch (error) {
      setCandidates([])
      setStatus(externalMetadataErrorMessage(error))
    }
  }

  async function reviewCandidate(
    candidate: ExternalMetadataReleaseCandidateDto,
  ) {
    setStatus(`Loading Discogs detail for ${candidate.title}.`)

    try {
      const detail = await getDiscogsRelease(candidate.source.externalId)
      setSelectedDetail(detail)
      setApplyGroups(defaultGroups(mode))
      setStatus(`Review loaded for ${detail.title}.`)
    } catch (error) {
      setSelectedDetail(null)
      setStatus(externalMetadataErrorMessage(error))
    }
  }

  function updateApplyGroup(group: keyof DiscogsApplyGroups, checked: boolean) {
    setApplyGroups((groups) => ({ ...groups, [group]: checked }))
  }

  const hasSelectedGroup = Object.values(applyGroups).some(Boolean)

  return (
    <section
      className="manual-entry-wide release-form-section discogs-release-lookup"
      aria-label="Discogs release lookup"
      role="region"
    >
      <div className="release-form-section-header">
        <div>
          <h3>Discogs</h3>
          <p>Search release candidates and review fields before applying.</p>
        </div>
        <button
          className="button button-secondary button-compact"
          type="button"
          onClick={() => onOpenChange(!isOpen)}
        >
          <Search size={14} aria-hidden="true" />
          {isOpen ? 'Hide Discogs' : 'Search Discogs'}
        </button>
      </div>

      {isOpen ? (
        <>
          <div className="discogs-search-form">
            <label>
              <span>Discogs query</span>
              <input
                aria-label="Discogs query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span>Discogs artist</span>
              <input
                aria-label="Discogs artist"
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
              />
            </label>
            <label>
              <span>Discogs title</span>
              <input
                aria-label="Discogs title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              <span>Discogs year</span>
              <input
                aria-label="Discogs year"
                inputMode="numeric"
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            </label>
            <label>
              <span>Discogs barcode</span>
              <input
                aria-label="Discogs barcode"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
              />
            </label>
            <label>
              <span>Discogs catalog number</span>
              <input
                aria-label="Discogs catalog number"
                value={catalogNumber}
                onChange={(event) => setCatalogNumber(event.target.value)}
              />
            </label>
            <button
              className="button button-secondary button-compact"
              type="button"
              onClick={() => {
                void handleSearch()
              }}
            >
              <Search size={14} aria-hidden="true" />
              Search Discogs releases
            </button>
          </div>

          {status ? (
            <p className="discogs-lookup-status" role="status">
              {status}
            </p>
          ) : null}

          {candidates.length > 0 ? (
            <div className="discogs-candidate-list">
              {candidates.map((candidate) => (
                <article
                  className="discogs-candidate"
                  key={candidate.source.externalId}
                >
                  <div>
                    <strong>{candidate.title}</strong>
                    <p>
                      {candidate.artists.join(', ') || 'Unknown artist'} ·{' '}
                      {candidate.year ?? 'Unknown year'} ·{' '}
                      {candidate.labels.join(', ') || 'Unknown label'}
                    </p>
                    <p>
                      {[...candidate.formats, candidate.catalogNumber]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {candidate.barcodes.length > 0 ? (
                      <p>Barcodes: {candidate.barcodes.join(', ')}</p>
                    ) : null}
                    <p>{candidate.source.attribution}</p>
                  </div>
                  <div className="discogs-candidate-actions">
                    <a
                      className="detail-link"
                      href={candidate.source.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open candidate Discogs source
                    </a>
                    <button
                      className="button button-secondary button-compact"
                      type="button"
                      onClick={() => {
                        void reviewCandidate(candidate)
                      }}
                    >
                      Review {candidate.title}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {selectedDetail ? (
            <div className="discogs-review-panel">
              <div className="release-form-section-header">
                <div>
                  <h3>Review Discogs candidate</h3>
                  <p>
                    {selectedDetail.source.attribution}{' '}
                    <a
                      className="detail-link"
                      href={selectedDetail.source.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Discogs source
                    </a>
                  </p>
                </div>
              </div>

              <div className="discogs-review-grid">
                <ReviewColumn
                  title="Current local release"
                  rows={currentRows(current)}
                />
                <ReviewColumn
                  title="Discogs draft"
                  rows={discogsRows(selectedDetail)}
                />
              </div>

              <fieldset className="discogs-apply-groups">
                <legend>Apply groups</legend>
                <ApplyGroup
                  checked={applyGroups.core}
                  label="Apply Core"
                  onChange={(checked) => updateApplyGroup('core', checked)}
                />
                <ApplyGroup
                  checked={applyGroups.artists}
                  label="Apply Artists"
                  onChange={(checked) => updateApplyGroup('artists', checked)}
                />
                <ApplyGroup
                  checked={applyGroups.labels}
                  label="Apply Labels"
                  onChange={(checked) => updateApplyGroup('labels', checked)}
                />
                <ApplyGroup
                  checked={applyGroups.tracklist}
                  label="Apply Tracklist"
                  onChange={(checked) => updateApplyGroup('tracklist', checked)}
                />
                <ApplyGroup
                  checked={applyGroups.externalSource}
                  label="Apply External Source"
                  onChange={(checked) =>
                    updateApplyGroup('externalSource', checked)
                  }
                />
              </fieldset>

              <button
                className="button button-primary button-compact"
                type="button"
                disabled={!hasSelectedGroup}
                onClick={() => onApplyDraft(selectedDetail, applyGroups)}
              >
                Apply selected Discogs fields
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="release-section-note">
          Discogs lookup is optional and never saves data until the release form
          is submitted.
        </p>
      )}
    </section>
  )
}

function defaultGroups(mode: 'create' | 'update'): DiscogsApplyGroups {
  return mode === 'create'
    ? {
        core: true,
        artists: true,
        labels: true,
        tracklist: true,
        externalSource: true,
      }
    : emptyGroups
}

function externalMetadataErrorMessage(error: unknown) {
  if (error instanceof CatalogApiError) {
    const retry =
      error.retryAfter && error.status === 429
        ? ` Retry after ${error.retryAfter} seconds.`
        : ''

    return `${error.message}${retry}`
  }

  return 'External metadata provider is unavailable.'
}

function currentRows(current: DiscogsCurrentRelease) {
  return [
    ['Title', current.title || 'Not recorded'],
    ['Artist', current.artists || 'Not recorded'],
    ['Year', current.year || 'Not recorded'],
    ['Labels', current.labels || 'Not recorded'],
    ['Tracklist', `${current.trackCount} rows`],
    ['Sources', `${current.externalSourceCount} sources`],
  ]
}

function discogsRows(detail: ExternalMetadataReleaseDetailDto) {
  return [
    ['Title', detail.draft.title || 'Not recorded'],
    [
      'Artist',
      detail.draft.artistCredits.map((credit) => credit.name).join(', ') ||
        'Not recorded',
    ],
    ['Year', detail.draft.year?.toString() ?? 'Not recorded'],
    [
      'Labels',
      detail.draft.labels
        .map((label) =>
          [label.name, label.catalogNumber].filter(Boolean).join(' '),
        )
        .join(', ') || 'Not recorded',
    ],
    ['Tracklist', `${detail.draft.tracklist.length} rows`],
    ['Formats', detail.formats.join(', ') || 'Not recorded'],
    ['Barcodes', detail.barcodes.join(', ') || 'Not recorded'],
    [
      'Identifiers',
      detail.identifiers
        .map((identifier) => `${identifier.type}: ${identifier.value}`)
        .join(', ') || 'Not recorded',
    ],
    [
      'Credits',
      detail.credits
        .map((credit) => [credit.name, credit.role].filter(Boolean).join(' - '))
        .join(', ') || 'Not recorded',
    ],
    ['Sources', `${detail.draft.externalSources.length} sources`],
  ]
}

function ReviewColumn({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="discogs-review-column">
      <h4>{title}</h4>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ApplyGroup({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="compact-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}
