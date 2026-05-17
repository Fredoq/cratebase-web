import { Database, Download, FileArchive, FileJson } from 'lucide-react'
import type { ArtistRecord } from '../artists/artistsData'
import type {
  CatalogDictionaries,
  RatingCriterion,
} from '../catalog/catalogApi'
import type { OwnedItemRecord } from '../ownedItems/ownedItemsData'
import type { PlaylistRecord } from '../playlists/playlistsData'
import type { ReleaseRecord } from '../releases/releasesData'
import type { RelationRecord } from '../relations/relationsData'
import type { TrackRecord } from '../tracks/tracksData'

type ExportsWorkspaceProps = {
  artists: ArtistRecord[]
  dictionaries: CatalogDictionaries
  ownedItems: OwnedItemRecord[]
  playlists: PlaylistRecord[]
  ratingCriteria: RatingCriterion[]
  relations: RelationRecord[]
  releases: ReleaseRecord[]
  tracks: TrackRecord[]
}

export function ExportsWorkspace({
  artists,
  dictionaries,
  ownedItems,
  playlists,
  ratingCriteria,
  relations,
  releases,
  tracks,
}: ExportsWorkspaceProps) {
  const dictionaryCount = Object.values(dictionaries).reduce(
    (total, entries) => total + entries.length,
    0,
  )
  const metrics = [
    `${artists.length} artists`,
    `${releases.length} releases`,
    `${tracks.length} tracks`,
    `${ownedItems.length} owned items`,
    `${relations.length} relations`,
    `${playlists.length} playlists`,
  ]

  return (
    <section className="exports-layout" aria-label="Exports workspace">
      <section className="panel exports-panel" aria-labelledby="exports-title">
        <div className="panel-heading">
          <div>
            <h2 id="exports-title">Collection snapshot</h2>
            <p>Portable catalog data for the active collection.</p>
          </div>
          <Database size={18} aria-hidden="true" />
        </div>

        <div className="exports-panel-body">
          <div className="metric-strip" aria-label="Exported record counts">
            {metrics.map((metric) => (
              <span key={metric} className="badge badge-tag">
                {metric}
              </span>
            ))}
          </div>

          <div className="exports-downloads" aria-label="Download formats">
            <ExportDownload
              description="Single structured snapshot for backup and programmatic use."
              href="/api/exports/json"
              icon="json"
              label="Download JSON"
            />
            <ExportDownload
              description="Zip archive with separate CSV tables for spreadsheets."
              href="/api/exports/csv"
              icon="csv"
              label="Download CSV"
            />
          </div>
        </div>
      </section>

      <aside
        className="panel exports-side-panel"
        aria-labelledby="exports-scope-title"
      >
        <div>
          <p className="section-label">Snapshot scope</p>
          <h2 id="exports-scope-title">Catalog, graph and settings</h2>
        </div>
        <dl className="exports-summary-list">
          <div>
            <dt>Dictionary entries</dt>
            <dd>{dictionaryCount}</dd>
          </div>
          <div>
            <dt>Rating criteria</dt>
            <dd>{ratingCriteria.length}</dd>
          </div>
          <div>
            <dt>Formats</dt>
            <dd>JSON, CSV</dd>
          </div>
        </dl>
      </aside>
    </section>
  )
}

type ExportDownloadProps = {
  description: string
  href: string
  icon: 'csv' | 'json'
  label: string
}

function ExportDownload({
  description,
  href,
  icon,
  label,
}: ExportDownloadProps) {
  const Icon = icon === 'json' ? FileJson : FileArchive

  return (
    <div className="exports-download-row">
      <span className="exports-download-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2.1} />
      </span>
      <span>
        <strong>{label.replace('Download ', '')}</strong>
        <small>{description}</small>
      </span>
      <a className="button button-primary" href={href} download>
        <Download size={15} aria-hidden="true" />
        {label}
      </a>
    </div>
  )
}
