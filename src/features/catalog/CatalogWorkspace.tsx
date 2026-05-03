import {
  Album,
  Archive,
  Boxes,
  Database,
  FileDown,
  FolderInput,
  GitBranch,
  ListMusic,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { catalogEntries, type CatalogEntry } from './catalogData'

const navigationItems = [
  { label: 'Catalog', href: '/catalog', icon: Archive },
  { label: 'Artists', href: '/artists', icon: Users },
  { label: 'Releases', href: '/releases', icon: Album },
  { label: 'Tracks', href: '/tracks', icon: ListMusic },
  { label: 'Owned Items', href: '/owned-items', icon: Boxes },
  { label: 'Relations', href: '/relations', icon: GitBranch },
  { label: 'Imports', href: '/imports', icon: FolderInput },
  { label: 'Exports', href: '/exports', icon: FileDown },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function CatalogWorkspace() {
  const [query, setQuery] = useState('')
  const [selectedEntryId, setSelectedEntryId] = useState(catalogEntries[0].id)

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (normalizedQuery.length === 0) {
      return catalogEntries
    }

    return catalogEntries.filter((entry) =>
      [
        entry.artist,
        entry.title,
        entry.type,
        entry.year,
        entry.label,
        entry.status,
        entry.relationHint,
        entry.storage,
        entry.condition,
        ...entry.media,
        ...entry.credits,
        ...entry.tags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [query])

  const selectedEntry =
    catalogEntries.find((entry) => entry.id === selectedEntryId) ??
    catalogEntries[0]

  return (
    <main className="app-shell">
      <SidebarNav />

      <section className="workspace" aria-labelledby="workspace-title">
        <PageHeader />

        <section className="catalog-layout" aria-label="Catalog workspace">
          <div className="catalog-main">
            <SearchField query={query} onQueryChange={setQuery} />
            <FilterBar visibleCount={visibleEntries.length} />
            <CatalogTable
              entries={visibleEntries}
              selectedEntryId={selectedEntry.id}
              onSelectEntry={setSelectedEntryId}
            />
          </div>

          <DetailPanel entry={selectedEntry} />
        </section>
      </section>
    </main>
  )
}

function SidebarNav() {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <a className="brand" href="/catalog" aria-label="Cratebase catalog">
        <span className="brand-mark" aria-hidden="true">
          <Database size={18} strokeWidth={2.2} />
        </span>
        <span>Cratebase</span>
      </a>

      <nav className="navigation" aria-label="Cratebase sections">
        {navigationItems.map((item) => {
          const Icon = item.icon

          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.label === 'Catalog' ? 'page' : undefined}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>
    </aside>
  )
}

function PageHeader() {
  return (
    <header className="workspace-header">
      <div>
        <p className="section-label">Default collection</p>
        <h1 id="workspace-title">Catalog</h1>
        <p>Search releases, tracks, media, ownership, credits and relations.</p>
      </div>

      <button className="button button-primary" type="button">
        <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
        Add entry
      </button>
    </header>
  )
}

type SearchFieldProps = {
  query: string
  onQueryChange: (query: string) => void
}

function SearchField({ query, onQueryChange }: SearchFieldProps) {
  return (
    <label className="search-field">
      <span className="search-icon" aria-hidden="true">
        <Search size={17} strokeWidth={2.2} />
      </span>
      <span className="visually-hidden">Search collection</span>
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Artist, release, track, label, role, medium, tag or status"
      />
    </label>
  )
}

type FilterBarProps = {
  visibleCount: number
}

function FilterBar({ visibleCount }: FilterBarProps) {
  return (
    <div className="filter-bar" aria-label="Catalog filters">
      <div className="saved-views" role="list" aria-label="Saved views">
        {['All', 'Owned', 'Needs digitization', 'Lossless', 'Credits'].map(
          (view) => (
            <button
              key={view}
              className="view-pill"
              type="button"
              aria-pressed={view === 'All'}
            >
              {view}
            </button>
          ),
        )}
      </div>

      <button className="button button-secondary" type="button">
        <SlidersHorizontal size={15} strokeWidth={2.2} aria-hidden="true" />
        Filters
      </button>
      <span className="result-count">{visibleCount} shown</span>
    </div>
  )
}

type CatalogTableProps = {
  entries: CatalogEntry[]
  selectedEntryId: string
  onSelectEntry: (entryId: string) => void
}

function CatalogTable({
  entries,
  selectedEntryId,
  onSelectEntry,
}: CatalogTableProps) {
  return (
    <section className="panel catalog-panel" aria-labelledby="results-title">
      <div className="panel-heading">
        <div>
          <h2 id="results-title">Catalog results</h2>
          <p>Collection-aware rows with media, status and relation hints.</p>
        </div>
      </div>

      <div className="table-scroll">
        <table className="catalog-table">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Type</th>
              <th scope="col">Year</th>
              <th scope="col">Label</th>
              <th scope="col">Media</th>
              <th scope="col">Status</th>
              <th scope="col">Relation hint</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                aria-selected={entry.id === selectedEntryId}
                className={
                  entry.id === selectedEntryId ? 'is-selected' : undefined
                }
              >
                <th scope="row">
                  <button
                    className="row-title"
                    type="button"
                    onClick={() => onSelectEntry(entry.id)}
                  >
                    <strong>{entry.title}</strong>
                    <span>{entry.artist}</span>
                  </button>
                </th>
                <td data-label="Type">{entry.type}</td>
                <td data-label="Year">{entry.year}</td>
                <td data-label="Label">{entry.label}</td>
                <td data-label="Media">
                  <BadgeList values={entry.media} variant="media" />
                </td>
                <td data-label="Status">
                  <StatusBadge tone={entry.statusTone}>
                    {entry.status}
                  </StatusBadge>
                </td>
                <td data-label="Relation">{entry.relationHint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

type DetailPanelProps = {
  entry: CatalogEntry
}

function DetailPanel({ entry }: DetailPanelProps) {
  return (
    <aside className="panel detail-panel" aria-labelledby="detail-title">
      <div className="detail-header">
        <span className="entity-type">{entry.type}</span>
        <h2 id="detail-title">{entry.title}</h2>
        <p>{entry.artist}</p>
      </div>

      <StatusBadge tone={entry.statusTone}>{entry.status}</StatusBadge>

      <p className="detail-summary">{entry.summary}</p>

      <section className="detail-section" aria-labelledby="owned-copies-title">
        <h3 id="owned-copies-title">Owned copies</h3>
        <dl className="detail-list">
          <div>
            <dt>Media</dt>
            <dd>
              <BadgeList values={entry.media} variant="media" />
            </dd>
          </div>
          <div>
            <dt>Storage</dt>
            <dd>{entry.storage}</dd>
          </div>
          <div>
            <dt>Condition</dt>
            <dd>{entry.condition}</dd>
          </div>
        </dl>
      </section>

      <section className="detail-section" aria-labelledby="credits-title">
        <h3 id="credits-title">Credits and relations</h3>
        <BadgeList values={entry.credits} variant="credit" />
        <p>{entry.relationHint}</p>
      </section>

      <section className="detail-section" aria-labelledby="tags-title">
        <h3 id="tags-title">Tags</h3>
        <BadgeList values={entry.tags} variant="tag" />
      </section>
    </aside>
  )
}

type BadgeListProps = {
  values: string[]
  variant: 'media' | 'credit' | 'tag'
}

function BadgeList({ values, variant }: BadgeListProps) {
  return (
    <span className="badge-list">
      {values.map((value) => (
        <span key={value} className={`badge badge-${variant}`}>
          {value}
        </span>
      ))}
    </span>
  )
}

type StatusBadgeProps = {
  children: string
  tone: CatalogEntry['statusTone']
}

function StatusBadge({ children, tone }: StatusBadgeProps) {
  return <span className={`badge status-badge status-${tone}`}>{children}</span>
}
