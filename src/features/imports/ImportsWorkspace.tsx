import { Download, FolderOpen } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import './imports.css'
import {
  CatalogApiError,
  confirmImportDraft,
  createDesktopFolderScan,
  getImportSession,
  loadImportSessions,
  skipImportDraft,
  updateImportDraft,
  type CatalogDictionaries,
  type ReleaseImportDraft,
  type ReleaseImportSession,
} from '../catalog/catalogApi'
import type { ArtistRecord } from '../artists/artistsData'
import { DraftEditor } from './ImportDraftEditor'
import {
  DraftsTable,
  ImportSourcePanel,
  SessionsTable,
} from './ImportReviewPanels'
import {
  activeDictionaryOptions,
  activeReleaseTypeOptions,
  cloneDraft,
  draftIsValid,
  draftValidationMessage,
  errorMessage,
  isCratebaseDesktop,
  skipServerImportRequests,
} from './importHelpers'

type ImportsWorkspaceProps = {
  artists: ArtistRecord[]
  dictionaries: CatalogDictionaries
  onCatalogChanged: () => void
  onSessionExpired: () => void
}

const macOsDownloadUrl = '/api/imports/desktop-downloads/macos'

export function ImportsWorkspace({
  artists,
  dictionaries,
  onCatalogChanged,
  onSessionExpired,
}: ImportsWorkspaceProps) {
  const isDesktop = isCratebaseDesktop()
  const releaseTypeOptions = activeReleaseTypeOptions(dictionaries)
  const creditRoleOptions = activeDictionaryOptions(dictionaries, 'creditRole')
  const [sessions, setSessions] = useState<ReleaseImportSession[]>([])
  const [selectedSession, setSelectedSession] =
    useState<ReleaseImportSession | null>(null)
  const [selectedDraftId, setSelectedDraftId] = useState('')
  const [draft, setDraft] = useState<ReleaseImportDraft | null>(null)
  const [status, setStatus] = useState('Ready')
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const handleRequestError = useCallback(
    (requestError: unknown, nextStatus: string) => {
      if (
        requestError instanceof CatalogApiError &&
        requestError.status === 401
      ) {
        onSessionExpired()
        return false
      }

      setError(errorMessage(requestError))
      setStatus(nextStatus)
      return false
    },
    [onSessionExpired],
  )

  const refreshSessions = useCallback(async () => {
    try {
      const response = await loadImportSessions()
      setSessions(response.items)
      setError(null)
      return true
    } catch (requestError) {
      return handleRequestError(requestError, 'Load failed')
    }
  }, [handleRequestError])

  useEffect(() => {
    if (skipServerImportRequests()) {
      return
    }

    queueMicrotask(() => {
      void refreshSessions()
    })
  }, [refreshSessions])

  async function chooseLocalFolder() {
    if (!window.cratebaseDesktop) {
      setError('Local folder import is available in the macOS desktop app.')
      return
    }

    setStatus('Waiting for folder selection')
    setPendingAction('scan')
    try {
      const result = await window.cratebaseDesktop.imports.pickAndScan()
      if (result.cancelled) {
        setStatus('Folder selection cancelled')
        setError(null)
        return
      }

      setStatus('Scanning folder')
      const session = await createDesktopFolderScan(result.scan)
      const firstDraft = session.drafts?.[0] ?? null
      setSelectedSession(session)
      setSelectedDraftId(firstDraft?.id ?? '')
      setDraft(firstDraft ? cloneDraft(firstDraft) : null)
      const sessionsLoaded = await refreshSessions()
      if (!sessionsLoaded) {
        return
      }
      setStatus('Scan saved')
      setError(null)
    } catch (requestError) {
      handleRequestError(requestError, 'Scan failed')
    } finally {
      setPendingAction(null)
    }
  }

  async function openSession(sessionId: string) {
    setStatus('Loading session')
    setPendingAction('load')
    try {
      const session = await getImportSession(sessionId)
      if (!session) {
        setSelectedSession(null)
        setSelectedDraftId('')
        setDraft(null)
        setError('Import session was not found.')
        setStatus('Load failed')
        return
      }

      const firstDraft = session.drafts?.[0] ?? null
      setSelectedSession(session)
      setSelectedDraftId(firstDraft?.id ?? '')
      setDraft(firstDraft ? cloneDraft(firstDraft) : null)
      setStatus('Session loaded')
      setError(null)
    } catch (requestError) {
      handleRequestError(requestError, 'Load failed')
    } finally {
      setPendingAction(null)
    }
  }

  async function saveDraft() {
    if (!selectedSession || !draft) {
      return null
    }

    const session = await updateImportDraft(selectedSession.id, draft)
    const savedDraft =
      session.drafts?.find((item) => item.id === draft.id) ?? draft
    setSelectedSession(session)
    setSelectedDraftId(savedDraft.id)
    setDraft(cloneDraft(savedDraft))
    return session
  }

  async function confirmDraft() {
    if (!selectedSession || !draft || !draftIsValid(draft)) {
      return
    }

    setStatus('Confirming')
    setPendingAction('confirm')
    try {
      await saveDraft()
      const session = await confirmImportDraft(selectedSession.id, draft.id)
      const confirmedDraft =
        session.drafts?.find((item) => item.id === draft.id) ?? draft
      setSelectedSession(session)
      setSelectedDraftId(confirmedDraft.id)
      setDraft(cloneDraft(confirmedDraft))
      const sessionsLoaded = await refreshSessions()
      if (!sessionsLoaded) {
        return
      }
      onCatalogChanged()
      setStatus('Release confirmed')
      setError(null)
    } catch (requestError) {
      handleRequestError(requestError, 'Confirm failed')
    } finally {
      setPendingAction(null)
    }
  }

  async function skipDraft() {
    if (!selectedSession || !draft) {
      return
    }

    setStatus('Skipping')
    setPendingAction('skip')
    try {
      const session = await skipImportDraft(selectedSession.id, draft.id)
      const skippedDraft =
        session.drafts?.find((item) => item.id === draft.id) ?? draft
      setSelectedSession(session)
      setSelectedDraftId(skippedDraft.id)
      setDraft(cloneDraft(skippedDraft))
      const sessionsLoaded = await refreshSessions()
      if (!sessionsLoaded) {
        return
      }
      setStatus('Draft skipped')
      setError(null)
    } catch (requestError) {
      handleRequestError(requestError, 'Skip failed')
    } finally {
      setPendingAction(null)
    }
  }

  const validationMessage = draft ? draftValidationMessage(draft) : ''

  return (
    <section className="catalog-layout imports-layout" aria-label="Imports">
      <div className="catalog-main">
        <section className="panel imports-scan-panel">
          <div className="panel-heading">
            <div>
              <h2>Local folder import</h2>
              <p>Audio: FLAC, MP3, WAV, OGG, M4A. Covers: JPG, PNG, WEBP.</p>
            </div>
            {isDesktop ? (
              <button
                className="button button-primary"
                disabled={pendingAction === 'scan'}
                type="button"
                onClick={() => {
                  void chooseLocalFolder()
                }}
              >
                <FolderOpen size={16} /> Choose local folder
              </button>
            ) : (
              <a className="button button-secondary" href={macOsDownloadUrl}>
                <Download size={16} /> Download macOS app
              </a>
            )}
          </div>
          <div className="imports-scan-body">
            <ImportSourcePanel isDesktop={isDesktop} />
            <p
              className={error ? 'imports-error' : 'imports-status'}
              role={error ? 'alert' : 'status'}
            >
              {error ?? status}
            </p>
          </div>
        </section>

        <SessionsTable
          selectedSessionId={selectedSession?.id ?? ''}
          sessions={sessions}
          onSelect={(sessionId) => {
            void openSession(sessionId)
          }}
        />

        {selectedSession ? (
          <DraftsTable
            drafts={selectedSession.drafts ?? []}
            selectedDraftId={selectedDraftId}
            onSelect={(draftId) => {
              const selected =
                selectedSession.drafts?.find((item) => item.id === draftId) ??
                null
              setSelectedDraftId(selected?.id ?? '')
              setDraft(selected ? cloneDraft(selected) : null)
            }}
          />
        ) : null}
      </div>

      {draft ? (
        <DraftEditor
          artists={artists}
          creditRoleOptions={creditRoleOptions}
          draft={draft}
          releaseTypeOptions={releaseTypeOptions}
          validationMessage={validationMessage}
          onChange={setDraft}
          onConfirm={() => {
            void confirmDraft()
          }}
          onSave={() => {
            setStatus('Saving draft')
            setPendingAction('save')
            void saveDraft()
              .then(() => {
                setStatus('Draft saved')
                setError(null)
              })
              .catch((requestError: unknown) => {
                handleRequestError(requestError, 'Save failed')
              })
              .finally(() => {
                setPendingAction(null)
              })
          }}
          onSkip={() => {
            void skipDraft()
          }}
        />
      ) : (
        <section className="panel detail-panel imports-detail-empty">
          <div className="detail-header">
            <h2>Import review</h2>
            <p>Select a scan session.</p>
          </div>
        </section>
      )}
    </section>
  )
}
