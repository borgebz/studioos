/**
 * Shared API error parsing utilities.
 *
 * The API returns errors in this structure (via the generated client):
 *
 *   thrown object → { error: { errors: { messages?: string[], [field]: string[] } } }
 *
 * All custom API error codes are PascalCase i18n keys (e.g., "ParticipantAlreadyEnrolled").
 * DRF may also produce raw English strings for field validation
 * (e.g., "This password is entirely numeric.").
 *
 * Strategy:
 *  1. PascalCase codes → translate via t(`apiErrors.${code}`)
 *  2. Raw DRF strings → show as-is (specific and actionable, even if in English)
 *  3. No parseable structure → generic fallback
 */

type ApiErrorShape = {
  error?: { errors?: Record<string, string[]> }
}

/**
 * Check if a string looks like a PascalCase error code (our custom API codes).
 * PascalCase codes contain no spaces, start with uppercase, and have at least
 * one lowercase letter (to distinguish from acronyms).
 */
function isPascalCaseCode(msg: string): boolean {
  return /^[A-Z][a-zA-Z0-9]+$/.test(msg)
}

/**
 * Translate a single error message.
 * PascalCase codes → t('apiErrors.CODE'), raw DRF strings → returned as-is.
 */
function translateMessage(msg: string, t: (key: string) => string): string {
  return isPascalCaseCode(msg) ? t(`apiErrors.${msg}`) : msg
}

/**
 * Extract the raw errors map from an API error.
 * Returns null if the error doesn't match the expected structure.
 */
export function extractApiErrors(
  err: unknown,
): Record<string, string[]> | null {
  const httpErr = err as ApiErrorShape
  return httpErr?.error?.errors ?? null
}

/**
 * Get the first error message from an API response, translated.
 *
 * - PascalCase codes → `t('apiErrors.CODE')` (fully translated)
 * - Raw DRF strings → returned as-is (specific and actionable)
 * - No parseable structure → returns `null` (caller should use fallback)
 *
 * @param err - The caught error from an API call
 * @param t - The i18n translation function
 * @param fallbackKey - Optional i18n key used when the error has structure but
 *                      no extractable message (shouldn't happen in practice)
 */
export function parseApiError(
  err: unknown,
  t: (key: string) => string,
  fallbackKey = 'common.unexpectedError',
): string | null {
  const errors = extractApiErrors(err)
  if (!errors) return null

  // Check messages (non-field errors) first
  const messages = errors.messages ?? []
  if (messages.length > 0) {
    return translateMessage(messages[0], t)
  }

  // Check field-level errors — return the first one found
  for (const [field, fieldMessages] of Object.entries(errors)) {
    if (field === 'messages') continue
    if (fieldMessages.length > 0) {
      return translateMessage(fieldMessages[0], t)
    }
  }

  // Has errors object but it's empty — shouldn't happen, but fallback
  return t(fallbackKey)
}

/**
 * Extract field-level errors for use with `form.setError()`.
 *
 * - PascalCase codes → `t('apiErrors.CODE')` (fully translated)
 * - Raw DRF strings → returned as-is (e.g., "This password is entirely numeric.")
 *
 * Returns a `{ fieldName: message }` map. Returns `null` when there are no
 * field-level errors.
 */
export function parseApiFieldErrors(
  err: unknown,
  t: (key: string) => string,
): Record<string, string> | null {
  const errors = extractApiErrors(err)
  if (!errors) return null

  const result: Record<string, string> = {}
  for (const [field, fieldMessages] of Object.entries(errors)) {
    if (field === 'messages') continue // skip non-field errors
    if (fieldMessages.length === 0) continue
    result[field] = translateMessage(fieldMessages[0], t)
  }
  return Object.keys(result).length > 0 ? result : null
}

/**
 * Check if the API error contains a specific known error code.
 * Searches across all fields including messages.
 */
export function apiErrorContains(err: unknown, code: string): boolean {
  const errors = extractApiErrors(err)
  if (!errors) return false
  return Object.values(errors)
    .flat()
    .some((msg) => msg === code)
}

/**
 * Get the HTTP status code from an API error, if available.
 */
export function getApiErrorStatus(err: unknown): number | null {
  const response = err as { status?: number }
  return response?.status ?? null
}
