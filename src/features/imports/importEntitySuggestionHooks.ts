import { useEffect, useState } from 'react'
import { searchCatalog } from '../catalog/catalogApi'
import type { EntitySuggestion, SearchEntityType } from '../catalog/catalogApi'

const suggestionDelayMs = 180
const minimumQueryLength = 2

export function useImportEntitySuggestions(
  query: string,
  entityType: Extract<SearchEntityType, 'artist' | 'label'>,
) {
  const [suggestions, setSuggestions] = useState<EntitySuggestion[]>([])
  const normalizedQuery = query.trim()

  useEffect(() => {
    if (normalizedQuery.length < minimumQueryLength) {
      return
    }

    let isCurrent = true
    const timeout = window.setTimeout(() => {
      void searchCatalog({
        entityType,
        limit: 5,
        query: normalizedQuery,
      })
        .then((response) => {
          if (!isCurrent) {
            return
          }

          setSuggestions(
            response.items.map((item) => ({
              id: item.id,
              name: item.title,
              match: item.matchedFields[0] ?? 'search',
            })),
          )
        })
        .catch(() => {
          if (isCurrent) {
            setSuggestions([])
          }
        })
    }, suggestionDelayMs)

    return () => {
      isCurrent = false
      window.clearTimeout(timeout)
    }
  }, [entityType, normalizedQuery])

  return normalizedQuery.length < minimumQueryLength ? [] : suggestions
}
