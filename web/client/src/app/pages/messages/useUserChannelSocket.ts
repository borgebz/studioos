import { useEffect, useRef } from 'react'

type IncomingMessageEvent = {
  type: 'incoming_message'
  conversation_id: number
  message_id: number
  sender_id: number
}

type ConversationAddedEvent = {
  type: 'conversation.added'
  conversation_id: number
}

type UserChannelEvent = IncomingMessageEvent | ConversationAddedEvent

export interface UserChannelHandlers {
  onIncomingMessage?: (e: IncomingMessageEvent) => void
  /** Fires when the user is added (or removed) from a conversation — both
   *  cases the inbox should refetch so the conversation list reflects the
   *  membership change. */
  onConversationAdded?: (e: ConversationAddedEvent) => void
}

/**
 * Opens a single app-wide WebSocket against /ws/user/ for the authenticated
 * user. Dispatches incoming_message events so the sidebar (or any other
 * always-mounted component) can react in real time.
 *
 * Auth: cookie-based (same as REST). Same-origin so the Vite dev proxy or a
 * prod reverse proxy can forward the WS upgrade.
 *
 * Reconnect: simple exponential-ish backoff capped at 30s. The hook also
 * reopens the socket when the tab regains focus (cheap way to recover from
 * sleep/idle disconnects).
 */
export function useUserChannelSocket(
  enabled: boolean,
  handlers: UserChannelHandlers,
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!enabled) return
    let ws: WebSocket | null = null
    let closedByUs = false
    let retry = 0
    let reconnectTimer: number | null = null

    function open() {
      const base = window.location.origin
      const url = base.replace(/^http/, 'ws') + '/ws/user/'
      try {
        ws = new WebSocket(url)
      } catch {
        scheduleReconnect()
        return
      }

      ws.onopen = () => {
        retry = 0
      }

      ws.onmessage = (event) => {
        let data: UserChannelEvent
        try {
          data = JSON.parse(event.data)
        } catch {
          return
        }
        if (data.type === 'incoming_message') {
          handlersRef.current.onIncomingMessage?.(data)
        } else if (data.type === 'conversation.added') {
          handlersRef.current.onConversationAdded?.(data)
        }
      }

      ws.onclose = () => {
        if (closedByUs) return
        scheduleReconnect()
      }
      ws.onerror = () => {
        ws?.close()
      }
    }

    function scheduleReconnect() {
      if (closedByUs) return
      retry += 1
      const delay = Math.min(30_000, 1_000 * Math.pow(1.6, retry))
      reconnectTimer = window.setTimeout(open, delay)
    }

    function onFocus() {
      // Force a reconnect if the socket has been silently dropped.
      if (!ws || ws.readyState >= WebSocket.CLOSING) {
        if (reconnectTimer) {
          window.clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        open()
      }
    }

    open()
    window.addEventListener('focus', onFocus)

    return () => {
      closedByUs = true
      window.removeEventListener('focus', onFocus)
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close()
    }
  }, [enabled])
}
