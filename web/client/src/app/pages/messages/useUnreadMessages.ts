import { useCallback, useEffect, useState } from 'react'

import { apiClient } from '@/api/api-client'

const POLL_INTERVAL_MS = 30_000

/** Custom event name. Any component can dispatch this and every mounted
 *  useUnreadMessages hook will refetch — used so e.g. mark-as-read on the
 *  page also reaches the sidebar's badge instance. */
const UNREAD_REFRESH_EVENT = 'studioos:unread-refresh'

/** Dispatch this from anywhere to force all unread hooks to refetch. */
export function triggerUnreadRefresh() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(UNREAD_REFRESH_EVENT))
}

export interface UnreadState {
  total: number
  byConversation: Record<string, number>
  /** Manually trigger a refresh in *this* hook instance only. Prefer
   *  triggerUnreadRefresh() above to fan out to every mounted hook. */
  refresh: () => void
}

/**
 * Polls /api/messaging/conversations/unread-count/ on a fixed interval,
 * refreshes when the tab regains focus, and listens for app-wide refresh
 * events (mark-as-read calls fire one). Returns both the total and the
 * per-conversation map so callers can render either flavour of badge.
 */
export function useUnreadMessages(): UnreadState {
  const [total, setTotal] = useState(0)
  const [byConversation, setByConversation] = useState<Record<string, number>>({})

  const refresh = useCallback(async () => {
    try {
      const res = await apiClient.api.messagingConversationsUnreadCountRetrieve()
      setTotal(res.data.total ?? 0)
      setByConversation(res.data.by_conversation ?? {})
    } catch {
      // non-fatal — keep the previous values
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, POLL_INTERVAL_MS)
    const onFocus = () => refresh()
    const onAppRefresh = () => refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener(UNREAD_REFRESH_EVENT, onAppRefresh)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(UNREAD_REFRESH_EVENT, onAppRefresh)
    }
  }, [refresh])

  return { total, byConversation, refresh }
}
