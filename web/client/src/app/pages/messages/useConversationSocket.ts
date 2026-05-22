import { useEffect, useRef } from 'react'

type IncomingEvent =
  | { type: 'message'; id: number; sender_id: number; body: string; file_url: string | null; original_filename: string; created_at: string }
  | { type: 'message.edited'; id: number; body: string; edited_at: string }
  | { type: 'message.deleted'; id: number }
  | { type: 'reaction.added'; message_id: number; user_id: number; emoji: string }
  | { type: 'reaction.removed'; message_id: number; user_id: number; emoji: string }
  | { type: 'message.pinned'; id: number; pinned_by_id: number; pinned_at: string }
  | { type: 'message.unpinned'; id: number }

export interface ConversationSocketHandlers {
  onMessage?: (e: Extract<IncomingEvent, { type: 'message' }>) => void
  onMessageEdited?: (e: Extract<IncomingEvent, { type: 'message.edited' }>) => void
  onMessageDeleted?: (e: Extract<IncomingEvent, { type: 'message.deleted' }>) => void
  onReactionAdded?: (e: Extract<IncomingEvent, { type: 'reaction.added' }>) => void
  onReactionRemoved?: (e: Extract<IncomingEvent, { type: 'reaction.removed' }>) => void
  onMessagePinned?: (e: Extract<IncomingEvent, { type: 'message.pinned' }>) => void
  onMessageUnpinned?: (e: Extract<IncomingEvent, { type: 'message.unpinned' }>) => void
}

/**
 * Opens a WebSocket against the messaging consumer for the given conversation
 * and dispatches incoming events to the provided handlers.
 *
 * Auth is via the same httpOnly access cookie that the REST layer uses —
 * the WebSocket middleware was extended to read it from the upgrade
 * request, so no token has to be exposed to JS.
 */
export function useConversationSocket(
  conversationId: number | null,
  handlers: ConversationSocketHandlers,
) {
  // Hold the latest handlers in a ref so we don't tear down the socket every
  // time the parent re-renders (handlers are usually inline closures).
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (conversationId === null) return
    // Use same-origin so the Vite dev proxy (and any prod reverse proxy)
    // can forward the WS upgrade — that's also how the REST layer reaches
    // the API server, and it lets the httpOnly access cookie travel along.
    const base = window.location.origin
    const wsUrl = base.replace(/^http/, 'ws') + `/ws/conversations/${conversationId}/`

    let ws: WebSocket | null = null
    let closed = false

    try {
      ws = new WebSocket(wsUrl)
    } catch {
      return
    }

    ws.onmessage = (event) => {
      let data: IncomingEvent
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }
      const h = handlersRef.current
      switch (data.type) {
        case 'message':
          h.onMessage?.(data)
          break
        case 'message.edited':
          h.onMessageEdited?.(data)
          break
        case 'message.deleted':
          h.onMessageDeleted?.(data)
          break
        case 'reaction.added':
          h.onReactionAdded?.(data)
          break
        case 'reaction.removed':
          h.onReactionRemoved?.(data)
          break
        case 'message.pinned':
          h.onMessagePinned?.(data)
          break
        case 'message.unpinned':
          h.onMessageUnpinned?.(data)
          break
      }
    }

    return () => {
      closed = true
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close()
      void closed
    }
  }, [conversationId])
}
