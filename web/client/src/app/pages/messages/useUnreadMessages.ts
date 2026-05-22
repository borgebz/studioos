import { useCallback, useEffect, useState } from 'react'

import { apiClient } from '@/api/api-client'

const POLL_INTERVAL_MS = 30_000

export interface UnreadState {
  total: number
  byConversation: Record<string, number>
  /** Manually trigger a refresh (e.g. after marking a thread read). */
  refresh: () => void
}

/**
 * Polls /api/messaging/conversations/unread-count/ on a fixed interval and
 * refreshes when the tab regains focus. Returns both the total and the
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
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  return { total, byConversation, refresh }
}
