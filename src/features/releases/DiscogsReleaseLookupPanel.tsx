import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  CatalogApiError,
  getDiscogsRelease,
  searchDiscogsReleases,
  type CatalogDictionaries,
  type ExternalMetadataReleaseCandidateDto,
  type ExternalMetadataReleaseDetailDto,
  type ExternalMetadataReleaseDraftArtistCreditDto,
  type ExternalMetadataReleaseDraftTrackDto,
} from '../catalog/catalogApi'
import { discogsDraftTrackRows } from './discogsReleaseTrackRows'

export type DiscogsApplyGroups = {
  core: boolean
  artists: boolean
  classification: boolean
  labels: boolean
  tracklist: boolean
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
  genres: string
  labels: string
  releaseDate: string
  title: string
  trackCount: number
  year: string
}

type DiscogsReleaseLookupPanelProps = {
  current: DiscogsCurrentRelease
  dictionaries: CatalogDictionaries
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
  classification: false,
  labels: false,
  tracklist: false,
}

export function DiscogsReleaseLookupPanel({
  current,
  dictionaries,
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
  const [catalogNumber, setCatalogNumber] = useState(searchSeed.catalogNumber)
  const [status, setStatus] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('')
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
    setAppliedStatus('')
    setSelectedDetail(null)

    try {
      const result = await searchDiscogsReleases({
        query,
        artist,
        title,
        year,
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
    setAppliedStatus('')

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

  function handleApplyDraft(
    detail: ExternalMetadataReleaseDetailDto,
    groups: DiscogsApplyGroups,
  ) {
    onApplyDraft(detail, groups)
    setAppliedStatus(
      `Applied Discogs ${appliedGroupLabel(groups)} to the form. Save record to persist changes.`,
    )
    setCandidates([])
    setSelectedDetail(null)
    onOpenChange(false)
  }

  const hasSelectedGroup = Object.values(applyGroups).some(Boolean)
  const selectedExternalId = selectedDetail?.source.externalId ?? ''

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
              <span>Search Discogs releases</span>
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
                  className={
                    candidate.source.externalId === selectedExternalId
                      ? 'discogs-candidate is-selected'
                      : 'discogs-candidate'
                  }
                  key={candidate.source.externalId}
                >
                  <div className="discogs-candidate-summary">
                    <div>
                      <strong>{candidate.title}</strong>
                      <p>
                        {candidate.artists.join(', ') || 'Unknown artist'} ·{' '}
                        {candidate.year ?? 'Unknown year'}
                      </p>
                      <p>
                        {[...candidate.formats, candidate.catalogNumber]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
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
                        <span>Review {candidate.title}</span>
                      </button>
                    </div>
                  </div>
                  {selectedDetail?.source.externalId ===
                  candidate.source.externalId ? (
                    <DiscogsCandidateReview
                      applyGroups={applyGroups}
                      current={current}
                      detail={selectedDetail}
                      dictionaries={dictionaries}
                      hasSelectedGroup={hasSelectedGroup}
                      onApplyDraft={handleApplyDraft}
                      onUpdateApplyGroup={updateApplyGroup}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p
          className={
            appliedStatus ? 'discogs-apply-status' : 'release-section-note'
          }
          role={appliedStatus ? 'status' : undefined}
        >
          {appliedStatus ||
            'Discogs lookup is optional and never saves data until the release form is submitted.'}
        </p>
      )}
    </section>
  )
}

function appliedGroupLabel(groups: DiscogsApplyGroups) {
  const labels = [
    groups.core ? 'core' : '',
    groups.artists ? 'artists' : '',
    groups.labels ? 'labels' : '',
    groups.classification ? 'classification' : '',
    groups.tracklist ? 'tracklist' : '',
  ].filter(Boolean)

  if (labels.length === 0) {
    return 'fields'
  }

  return labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`
}

function DiscogsCandidateReview({
  applyGroups,
  current,
  detail,
  dictionaries,
  hasSelectedGroup,
  onApplyDraft,
  onUpdateApplyGroup,
}: {
  applyGroups: DiscogsApplyGroups
  current: DiscogsCurrentRelease
  detail: ExternalMetadataReleaseDetailDto
  dictionaries: CatalogDictionaries
  hasSelectedGroup: boolean
  onApplyDraft: (
    detail: ExternalMetadataReleaseDetailDto,
    groups: DiscogsApplyGroups,
  ) => void
  onUpdateApplyGroup: (
    group: keyof DiscogsApplyGroups,
    checked: boolean,
  ) => void
}) {
  const compilationDetected = hasCompilationTrackArtists(detail)
  const reviewTracks = discogsDraftTrackRows(detail.draft.tracklist)
  const draftGenres = detail.draft.genres ?? []

  return (
    <div className="discogs-review-panel">
      <div className="release-form-section-header">
        <div>
          <h3>Review Discogs candidate</h3>
          <p>
            {detail.source.attribution}{' '}
            <a
              className="detail-link"
              href={detail.source.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Discogs source
            </a>
          </p>
        </div>
      </div>

      <div className="discogs-impact-list">
        <ImpactRow
          checked={applyGroups.core}
          currentValue={[
            current.title || 'Not recorded',
            current.releaseDate || current.year,
          ]
            .filter(Boolean)
            .join(' · ')}
          group="Core"
          nextValue={[
            detail.draft.title,
            detail.draft.releaseDate || detail.draft.year?.toString(),
          ]
            .filter(Boolean)
            .join(' · ')}
          onChange={(checked) => onUpdateApplyGroup('core', checked)}
        />
        <ImpactRow
          checked={applyGroups.artists}
          currentValue={current.artists || 'Not recorded'}
          group="Artists"
          nextValue={`${detail.draft.artistCredits.length} Discogs credits`}
          onChange={(checked) => onUpdateApplyGroup('artists', checked)}
        >
          <ArtistImpactList
            credits={detail.draft.artistCredits}
            dictionaries={dictionaries}
          />
        </ImpactRow>
        <ImpactRow
          checked={applyGroups.labels}
          currentValue={current.labels || 'Not recorded'}
          group="Labels"
          nextValue={releaseLabelSummary(detail) || 'Not recorded'}
          onChange={(checked) => onUpdateApplyGroup('labels', checked)}
        />
        <ImpactRow
          checked={applyGroups.classification}
          currentValue={current.genres || 'Not recorded'}
          group="Classification"
          nextValue={
            draftGenres.length > 0 ? draftGenres.join(', ') : 'Not recorded'
          }
          onChange={(checked) => onUpdateApplyGroup('classification', checked)}
        />
        <ImpactRow
          checked={applyGroups.tracklist}
          currentValue={`${current.trackCount} rows`}
          group="Tracklist"
          nextValue={`${reviewTracks.length} Discogs rows`}
          onChange={(checked) => onUpdateApplyGroup('tracklist', checked)}
        >
          {compilationDetected ? (
            <p className="discogs-impact-warning">
              Compilation detected: track-specific artists differ from release
              artists. Applying Tracklist will mark the release as Various
              Artists and write track-level artist credits.
            </p>
          ) : null}
          <TrackImpactList dictionaries={dictionaries} tracks={reviewTracks} />
        </ImpactRow>
      </div>

      <button
        className="button button-primary button-compact"
        type="button"
        disabled={!hasSelectedGroup}
        onClick={() => onApplyDraft(detail, applyGroups)}
      >
        Apply selected Discogs fields
      </button>
    </div>
  )
}

function defaultGroups(mode: 'create' | 'update'): DiscogsApplyGroups {
  return mode === 'create'
    ? {
        core: true,
        artists: true,
        classification: true,
        labels: true,
        tracklist: true,
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

function ImpactRow({
  checked,
  children,
  currentValue,
  group,
  nextValue,
  onChange,
}: {
  checked: boolean
  children?: ReactNode
  currentValue: string
  group: string
  nextValue: string
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="discogs-impact-row">
      <ApplyGroup
        checked={checked}
        label={`Apply ${group}`}
        onChange={onChange}
      />
      <div className="discogs-impact-group">{group}</div>
      <div className="discogs-impact-value">
        <span>Current</span>
        <strong>{currentValue}</strong>
      </div>
      <div className="discogs-impact-value">
        <span>Discogs</span>
        <strong>{nextValue}</strong>
        {children ? (
          <div className="discogs-impact-detail">{children}</div>
        ) : null}
      </div>
    </div>
  )
}

function ArtistImpactList({
  credits,
  dictionaries,
}: {
  credits: ExternalMetadataReleaseDraftArtistCreditDto[]
  dictionaries: CatalogDictionaries
}) {
  if (credits.length === 0) {
    return <p className="discogs-impact-empty">No Discogs artist credits.</p>
  }

  return (
    <div className="discogs-credit-impact-list">
      {groupDiscogsReviewCredits(credits).map((credit) => (
        <CreditImpactRow
          credit={credit}
          dictionaries={dictionaries}
          key={credit.name}
        />
      ))}
    </div>
  )
}

function TrackImpactList({
  dictionaries,
  tracks,
}: {
  dictionaries: CatalogDictionaries
  tracks: ExternalMetadataReleaseDraftTrackDto[]
}) {
  const [showAllTracks, setShowAllTracks] = useState(false)
  const previewTracks = showAllTracks ? tracks : tracks.slice(0, 4)
  const hiddenCount = tracks.length - previewTracks.length

  if (tracks.length === 0) {
    return <p className="discogs-impact-empty">No Discogs track rows.</p>
  }

  return (
    <div className="discogs-track-impact-list">
      {previewTracks.map((track) => (
        <div className="discogs-track-impact-row" key={track.position}>
          <span className="discogs-track-impact-position">
            {track.position}
          </span>
          <div>
            <strong>{track.title}</strong>
            <p>
              {track.durationSeconds
                ? formatDurationSeconds(track.durationSeconds)
                : 'No duration'}{' '}
              · create track
            </p>
            {track.artistCredits.length > 0 ? (
              <div className="discogs-credit-impact-list">
                {groupDiscogsReviewCredits(track.artistCredits).map(
                  (credit) => (
                    <CreditImpactRow
                      credit={credit}
                      dictionaries={dictionaries}
                      key={`${track.position}-${credit.name}`}
                    />
                  ),
                )}
              </div>
            ) : (
              <p className="discogs-impact-empty">Inherits release artists.</p>
            )}
          </div>
        </div>
      ))}
      {hiddenCount > 0 ? (
        <button
          className="button button-secondary button-compact discogs-track-toggle"
          type="button"
          aria-expanded={showAllTracks}
          onClick={() => setShowAllTracks(true)}
        >
          Show {hiddenCount} more Discogs track row
          {hiddenCount === 1 ? '' : 's'}
        </button>
      ) : showAllTracks && tracks.length > 4 ? (
        <button
          className="button button-secondary button-compact discogs-track-toggle"
          type="button"
          aria-expanded={showAllTracks}
          onClick={() => setShowAllTracks(false)}
        >
          Show fewer Discogs track rows
        </button>
      ) : null}
    </div>
  )
}

function CreditImpactRow({
  credit,
  dictionaries,
}: {
  credit: GroupedDiscogsReviewCredit
  dictionaries: CatalogDictionaries
}) {
  return (
    <div className="discogs-credit-impact-row">
      <strong>{credit.name}</strong>
      <span className="discogs-credit-role-list">
        {credit.roles.map((role) => (
          <span className="badge badge-credit" key={role}>
            {roleLabelFromCode(role, dictionaries)}
          </span>
        ))}
      </span>
    </div>
  )
}

type GroupedDiscogsReviewCredit = {
  name: string
  roles: string[]
}

function groupDiscogsReviewCredits(
  credits: ExternalMetadataReleaseDraftArtistCreditDto[],
) {
  const grouped = new Map<string, GroupedDiscogsReviewCredit>()

  credits.forEach((credit) => {
    const name = credit.name.trim()
    if (!name) {
      return
    }

    const key = name.toLowerCase()
    const existing = grouped.get(key)
    const roles = splitRoleLabels(credit.role)

    if (existing) {
      existing.roles = [...new Set([...existing.roles, ...roles])]
    } else {
      grouped.set(key, { name, roles })
    }
  })

  return [...grouped.values()]
}

function splitRoleLabels(role: string) {
  const roles: string[] = []
  let depth = 0
  let current = ''

  for (const character of role) {
    if (character === '[' || character === '(') {
      depth += 1
    } else if ((character === ']' || character === ')') && depth > 0) {
      depth -= 1
    }

    if (character === ',' && depth === 0) {
      const trimmed = current.trim()
      if (trimmed) {
        roles.push(trimmed)
      }
      current = ''
    } else {
      current += character
    }
  }

  const trimmed = current.trim()
  if (trimmed) {
    roles.push(trimmed)
  }

  return roles
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

function releaseLabelSummary(detail: ExternalMetadataReleaseDetailDto) {
  return detail.draft.labels
    .map((label) => [label.name, label.catalogNumber].filter(Boolean).join(' '))
    .join(', ')
}

function roleLabelFromCode(role: string, dictionaries: CatalogDictionaries) {
  const trimmedRole = role.trim()

  return (
    dictionaries.creditRole.find(
      (entry) => entry.code === trimmedRole || entry.name === trimmedRole,
    )?.name ?? trimmedRole
  )
}

function hasCompilationTrackArtists(detail: ExternalMetadataReleaseDetailDto) {
  const releaseMainArtists = normalizedSet(
    detail.draft.artistCredits
      .filter((credit) => normalizeText(credit.role) === 'mainartist')
      .map((credit) => credit.name),
  )
  const releaseArtists =
    releaseMainArtists.size > 0
      ? releaseMainArtists
      : normalizedSet(detail.draft.artistCredits.map((credit) => credit.name))

  return detail.draft.tracklist.some((track) => {
    const trackMainArtists = normalizedSet(
      track.artistCredits
        .filter((credit) => normalizeText(credit.role) === 'mainartist')
        .map((credit) => credit.name),
    )

    if (trackMainArtists.size === 0) {
      return false
    }

    return !setsEqual(releaseArtists, trackMainArtists)
  })
}

function normalizedSet(values: string[]) {
  return new Set(values.map(normalizeText).filter(Boolean))
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function setsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) {
    return false
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false
    }
  }

  return true
}

function formatDurationSeconds(durationSeconds: number) {
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
