export interface ConversationParticipant {
  id: number
  hasProfile: boolean
  /** Null when the user hasn't created a profile yet — UI shows
   *  "Anonymous user" in that case. */
  displayName: string | null
  photoUrl: string | null
}

/** Resolve a participant's display name, falling back to the localized
 *  "Anonymous user" label when they haven't created a profile yet, and to a
 *  numeric ID stub when we don't even have a participant snapshot. Single
 *  source of truth so the messaging UI never accidentally leaks emails. */
export function participantName(
  p: ConversationParticipant | undefined,
  t: (k: string) => string,
  fallbackId?: number,
): string {
  if (!p) {
    return fallbackId !== undefined
      ? `#${fallbackId}`
      : t('messages.anonymousUser')
  }
  if (p.displayName) return p.displayName
  return t('messages.anonymousUser')
}
