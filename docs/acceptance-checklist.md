# Cratebase Acceptance Checklist

This checklist describes the shared product acceptance path for `cratebase-api`
and `cratebase-web`.

## Local Setup

- Run PostgreSQL and start the API with `ConnectionStrings__Cratebase`.
- Start the web app with the Vite proxy pointed at the API.
- Start the desktop app with `CRATEBASE_API_BASE_URL` pointed at the API.
- Bootstrap the first admin user when the database is empty.
- Sign in and confirm catalog routes use the authenticated cookie.

## Hosted Setup

- Serve browser web and API traffic from one HTTPS origin.
- Route `/api/*` and `/health` to the API container.
- Route `/web-health` and every other path to the web static container.
- Keep browser API calls relative to `/api`.
- Confirm private beta desktop packages target `https://cratebase.example.com` by default, with `CRATEBASE_API_BASE_URL` available as a runtime override.
- Build the API and web Docker images, then run the example compose stack and verify `/health`, `/web-health`, web routing and authenticated `/api` calls through the reverse proxy.
- Verify staging and production do not share PostgreSQL databases, service storage, secrets, invite data or user accounts.

## Acceptance Path

1. Bootstrap a clean database and create the first admin user.
2. Create a release manually with artist credits, label metadata, tracklist rows, genres, tags and one owned item.
3. Search for the created data by artist, release title, track title, label, media, ownership status, tag and credit role.
4. Open catalog result details and verify server graph sections for credits, relations, media coverage, collector signals and workspace links.
5. Create a manual playlist with ordered release or track references and verify the order remains stable after reload.
6. Create a smart playlist with tag, genre, media, ownership status or year rules and verify results are computed from current catalog data.
7. Confirm playlists appear in search, export data, catalog links and graph backlinks.
8. Use the browser app to review existing import sessions and confirm it does not expose local folder selection.
9. Use the desktop app to scan a local audio folder through `window.cratebaseDesktop.imports.pickAndScan()` and create an import review session.
10. Confirm every supported audio file includes a SHA-256 `contentHash` in the desktop scan request, and confirm audio bytes are not uploaded.
11. Confirm the native import confirmation prompt appears before catalog records are created.
12. Re-import the same folder and verify fully duplicate drafts are no-ops against existing catalog data.
13. Rename or move duplicate files and verify same-collection content hash matching still preselects existing tracks.
14. Add a partial duplicate folder and verify existing tracks are preselected while missing catalog data can still be created.
15. Use saved search views for `remixes`, `productions`, `labels`, `physicalWithoutDigital`, `lossyWithoutLossless`, `wantedNotOwned` and `needsDigitization`.
16. Export JSON and CSV and verify core catalog data, import-created data, playlists and playlist entries are present.
17. Restore a JSON export into an empty collection and verify restored search, graph context, playlists and exports.

## Verification Commands

Backend:

```bash
dotnet test Cratebase.slnx
dotnet format Cratebase.slnx --verify-no-changes --verbosity diagnostic
```

Frontend:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run file-size:check
npm test
npm run build
```

## Product Boundaries

- Smart playlists are dynamic rules, not materialized snapshots.
- Browser import review is supported, but local folder scanning is desktop-only through the Electron preload bridge. The API boundary is documented in `cratebase-api/docs/imports/desktop-import-api-boundary.md`.
- Audio files are not uploaded to the API.
- External catalog integrations, streaming, marketplace, social, and recommendation features are outside the product boundary.
