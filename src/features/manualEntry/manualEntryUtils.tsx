export function createManualRecordId(prefix: string, value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `manual-${prefix}-${slug || 'record'}-${Date.now()}`
}

export function splitCommaList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function textOrFallback(value: string, fallback: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : fallback
}
