import { useEffect, useRef } from 'react'

type IncomingEvent =
  | { type: 'message'; id: number; sender_id: number; body: string; file_url: string | null; original_filename: string; kind?: string; created_at: string }
  | { type: 'message.edited'; id: number; body: string; edited_at: string }
  | { type: 'message.deleted'; id: number }
  | { type: 'reaction.added'; message_id: number; user_id: number; emoji: string }
  | { type: 'reaction.removed'; message_id: number; user_id: number; emoji: string }
  | { type: 'message.pinned'; id: number; pinned_by_id: number; pinned_at: string }
  | { type: 'message.unpinned'; id: number }
  | { type: 'participant.added'; conversation_id: number; user_id: number; added_by_id: number }
  | { type: 'participant.removed'; conversation_id: number; user_id: number; removed_by_id: number }
  | { type: 'conversation.renamed'; id: number; name: string }
  | { type: 'typing'; user_id: number }
  | { type: 'typing_stopped'; user_id: number }

export interface ConversationSocketHandlers {
  onMessage?: (e: Extract<IncomingEvent, { type: 'message' }>) => void
  onMessageEdited?: (e: Extract<IncomingEvent, { type: 'message.edited' }>) => void
  onMessageDeleted?: (e: Extract<IncomingEvent, { type: 'message.deleted' }>) => void
  onReactionAdded?: (e: Extract<IncomingEvent, { type: 'reaction.added' }>) => void
  onReactionRemoved?: (e: Extract<IncomingEvent, { type: 'reaction.removed' }>) => void
  onMessagePinned?: (e: Extract<IncomingEvent, { type: 'message.pinned' }>) => void
  onMessageUnpinned?: (e: Extract<IncomingEvent, { type: 'message.unpinned' }>) => void
  onParticipantAdded?: (e: Extract<IncomingEvent, { type: 'participant.added' }>) => void
  onParticipantRemoved?: (e: Extract<IncomingEvent, { type: 'participant.removed' }>) => void
  onConversationRenamed?: (e: Extract<IncomingEvent, { type: 'conversation.renamed' }>) => void
  onTyping?: (e: Extract<IncomingEvent, { type: 'typing' }>) => void
  onTypingStopped?: (e: Extract<IncomingEvent, { type: 'typing_stopped' }>) => void
}

/** Outgoing message types the client can send over the conversation
 *  socket. Currently only typing pings — message persistence still flows
 *  through the REST API for now. */
type OutgoingEvent =
  | { type: 'typing' }
  | { type: 'typing_stopped' }

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
): { send: (event: OutgoingEvent) => void } {
  // Hold the latest handlers in a ref so we don't tear down the socket every
  // time the parent re-renders (handlers are usually inline closures).
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  // The active socket — exposed via a ref so the `send` callback can reach
  // it without re-creating itself on every render.
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (conversationId === null) return

    // Use same-origin so the Vite dev proxy (and any prod reverse proxy)
    // can forward the WS upgrade — that's also how the REST layer reaches
    // the API server, and it lets the httpOnly access cookie travel along.
    const base = window.location.origin
    const wsUrl = base.replace(/^http/, 'ws') + `/ws/conversations/${conversationId}/`

    let ws: WebSocket | null = null
    let closedByUs = false
    let retry = 0
    let reconnectTimer: number | null = null

    function dispatch(event: MessageEvent) {
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
        case 'participant.added':
          h.onParticipantAdded?.(data)
          break
        case 'participant.removed':
          h.onParticipantRemoved?.(data)
          break
        case 'conversation.renamed':
          h.onConversationRenamed?.(data)
          break
        case 'typing':
          h.onTyping?.(data)
          break
        case 'typing_stopped':
          h.onTypingStopped?.(data)
          break
      }
    }

    function open() {
      try {
        ws = new WebSocket(wsUrl)
      } catch {
        scheduleReconnect()
        return
      }
      wsRef.current = ws
      ws.onopen = () => {
        retry = 0
      }
      ws.onmessage = dispatch
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
      // If the socket has been silently dropped (sleep, server restart),
      // force a fresh open. The 401 case (expired access token) will retry
      // until the user hits a REST endpoint that refreshes the cookie.
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
      if (wsRef.current === ws) wsRef.current = null
    }
  }, [conversationId])

  // Stable send helper — gracefully drops outgoing events when the socket
  // isn't ready yet (initial connect, mid-reconnect, etc.). Typing pings
  // are best-effort by design.
  const send = (event: OutgoingEvent) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    try {
      ws.send(JSON.stringify(event))
    } catch {
      // ignored — best effort
    }
  }

  return { send }
}
