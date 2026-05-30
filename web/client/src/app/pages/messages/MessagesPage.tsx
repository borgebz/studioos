import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { format, isToday, isYesterday } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { pt } from 'date-fns/locale/pt'
import { MessageSquarePlus, Plus, Search, UserCircle2, X } from 'lucide-react'
import { NavLink, useSearchParams } from 'react-router-dom'

import { paths } from '@/app/paths'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import {
  ConversationKindEnum,
  MessageKindEnum,
  type Conversation,
  type Message,
} from '@/api/studioos-api'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { useIsMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'

import { ConversationDetailsContent } from './ConversationDetails'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { NewConversationDialog } from './NewConversationDialog'
import { participantName, type ConversationParticipant } from './types'
import { useConversationSocket } from './useConversationSocket'
import { triggerUnreadRefresh, useUnreadMessages } from './useUnreadMessages'
import { useUserChannelSocket } from './useUserChannelSocket'

function dateLocale(lang: string) {
  return lang.startsWith('pt') ? pt : enUS
}

function dayLabel(iso: string, lang: string, t: (k: string) => string) {
  const d = new Date(iso)
  if (isToday(d)) return t('messages.today')
  if (isYesterday(d)) return t('messages.yesterday')
  return format(d, 'PPP', { locale: dateLocale(lang) })
}

function lastTimeLabel(
  iso: string | null | undefined,
  lang: string,
  t: (k: string) => string
) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'HH:mm', { locale: dateLocale(lang) })
  if (isYesterday(d)) return t('messages.yesterday')
  return format(d, 'd MMM', { locale: dateLocale(lang) })
}

export function MessagesPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const lang = i18n.language
  const isMobile = useIsMobile()

  const [loadingList, setLoadingList] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [participants, setParticipants] = useState<
    Record<number, ConversationParticipant>
  >({})
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [search, setSearch] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const { byConversation: unreadByConversation } = useUnreadMessages()
  const [searchParams, setSearchParams] = useSearchParams()
  const pendingConversationId = searchParams.get('c')

  // ── load conversations ────────────────────────────────────────────────
  // Participant info (name, email, photo) is embedded on each Conversation
  // server-side, so the messaging page no longer depends on listUsers (which
  // is gated by accounts.can_list_users and would 403 for most non-admin
  // roles).
  useEffect(() => {
    let cancelled = false
    setLoadingList(true)
    apiClient.api
      .messagingConversationsList()
      .then((res) => {
        if (cancelled) return
        const convs = res.data
        setConversations(convs)
        // No auto-select. On both desktop and mobile we land on the empty
        // state ("Select a conversation") until the user explicitly picks
        // one — refreshing the page should not silently re-enter the
        // last-listed thread.
        setParticipants(buildParticipantDict(convs))
      })
      .catch(() => {
        if (!cancelled) toast.error(t('messages.errors.loadConversations'))
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
    // activeId intentionally omitted — we only auto-select on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  const refreshConversations = useCallback(async () => {
    try {
      const res = await apiClient.api.messagingConversationsList()
      setConversations(res.data)
    } catch {
      // non-fatal — WS will eventually catch us up
    }
  }, [])

  // Keep the participants dict in sync when conversations change (new chat,
  // ws-driven updates, etc.) — cheaper than refetching listUsers.
  useEffect(() => {
    setParticipants((prev) => {
      const next = buildParticipantDict(conversations)
      // Preserve prior entries that aren't in the current snapshot (e.g.
      // someone who left a conversation but we still want to label their
      // historical messages correctly).
      return { ...prev, ...next }
    })
  }, [conversations])

  useEffect(() => {
    if (!pendingConversationId || loadingList) return
    const id = Number(pendingConversationId)
    if (!Number.isFinite(id)) return
    setActiveId(id)
    setSearchParams({}, { replace: true })
  }, [pendingConversationId, loadingList, setSearchParams])

  // ── load thread for active conversation ────────────────────────────────
  useEffect(() => {
    if (activeId === null) {
      setMessages([])
      return
    }
    let cancelled = false
    setLoadingThread(true)
    apiClient.api
      .messagingConversationsMessagesList(activeId)
      .then((res) => {
        if (!cancelled) setMessages(res.data)
      })
      .catch(() => {
        if (!cancelled) toast.error(t('messages.errors.loadThread'))
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeId, t])

  // ── auto mark-as-read while the conversation is open ───────────────────
  // Fires on initial open, on focus, and whenever the messages array grows
  // (WS-delivered new messages). The endpoint is idempotent server-side so
  // it's safe to call extra times.
  const markActiveRead = useCallback(() => {
    if (activeId === null) return
    apiClient.api
      .messagingConversationsMarkReadCreate(activeId)
      .then(() => {
        // Fan out to *every* mounted unread hook (this page's per-conv
        // badges + the sidebar's total). Each hook owns its own state, so
        // calling refresh() on one wouldn't reach the other.
        triggerUnreadRefresh()
      })
      .catch(() => {
        // silent — not user-visible
      })
  }, [activeId])

  useEffect(() => {
    if (activeId === null || loadingThread) return
    markActiveRead()
  }, [activeId, loadingThread, messages.length, markActiveRead])

  useEffect(() => {
    function onFocus() {
      markActiveRead()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [markActiveRead])

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  )

  const meId = user?.id ?? null

  // ── live updates over WebSocket ────────────────────────────────────────
  // Set of user IDs currently typing in the active conversation. Each entry
  // gets a 6-second auto-expire timer so we don't leave a stale "is typing"
  // bubble if the sender disconnects mid-stream.
  const [typingUserIds, setTypingUserIds] = useState<number[]>([])
  const typingTimers = useRef<Map<number, number>>(new Map())
  const TYPING_TTL_MS = 6_000

  function markUserTyping(userId: number) {
    setTypingUserIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId]
    )
    const existing = typingTimers.current.get(userId)
    if (existing) window.clearTimeout(existing)
    const handle = window.setTimeout(() => {
      setTypingUserIds((prev) => prev.filter((id) => id !== userId))
      typingTimers.current.delete(userId)
    }, TYPING_TTL_MS)
    typingTimers.current.set(userId, handle)
  }

  function clearUserTyping(userId: number) {
    const existing = typingTimers.current.get(userId)
    if (existing) window.clearTimeout(existing)
    typingTimers.current.delete(userId)
    setTypingUserIds((prev) => prev.filter((id) => id !== userId))
  }

  // Note: we don't clear typing state on activeId change here, because the
  // effect would re-run under React's StrictMode dev double-invocation and
  // wipe a freshly-arrived event. Each user's typing bubble auto-expires
  // after TYPING_TTL_MS via its own timer, which is the actual safety net.

  const conversationSocket = useConversationSocket(activeId, {
    onMessage: (e) => {
      // Skip if we already added it locally (echo of our own send).
      setMessages((prev) => {
        if (prev.some((m) => m.id === e.id)) return prev
        // The backend tags system messages (member changes, renames) with
        // kind=system so we render them as the localized hint bubble instead
        // of a regular user bubble showing the raw JSON event payload.
        const kind =
          e.kind === 'system' ? MessageKindEnum.System : MessageKindEnum.User
        const msg: Message = {
          id: e.id,
          kind,
          sender_id: e.sender_id,
          body: e.body,
          file_url: e.file_url,
          original_filename: e.original_filename,
          mime_type: '',
          edited_at: null,
          deleted_at: null as unknown as string,
          reactions: [],
          pinned_at: null as unknown as string,
          pinned_by_id: null,
          created_at: e.created_at,
        }
        return [...prev, msg]
      })
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, updated_at: e.created_at } : c
        )
      )
    },
    onMessageEdited: (e) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === e.id ? { ...m, body: e.body, edited_at: e.edited_at } : m
        )
      )
    },
    onMessageDeleted: (e) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === e.id
            ? {
                ...m,
                body: '',
                file_url: null,
                original_filename: '',
                mime_type: '',
                deleted_at: new Date().toISOString(),
                reactions: [],
                pinned_at: null as unknown as string,
              }
            : m
        )
      )
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                pinned_message_ids: c.pinned_message_ids.filter(
                  (id) => id !== e.id
                ),
              }
            : c
        )
      )
    },
    onReactionAdded: (e) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== e.message_id) return m
          const groups = [...m.reactions]
          const i = groups.findIndex((g) => g.emoji === e.emoji)
          if (i >= 0) {
            if (groups[i].user_ids.includes(e.user_id)) return m
            groups[i] = {
              ...groups[i],
              user_ids: [...groups[i].user_ids, e.user_id],
              count: groups[i].count + 1,
            }
          } else {
            groups.push({ emoji: e.emoji, user_ids: [e.user_id], count: 1 })
          }
          return { ...m, reactions: groups }
        })
      )
    },
    onReactionRemoved: (e) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== e.message_id) return m
          const groups = m.reactions
            .map((g) =>
              g.emoji === e.emoji
                ? {
                    ...g,
                    user_ids: g.user_ids.filter((u) => u !== e.user_id),
                    count: g.count - 1,
                  }
                : g
            )
            .filter((g) => g.count > 0)
          return { ...m, reactions: groups }
        })
      )
    },
    onMessagePinned: (e) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === e.id
            ? { ...m, pinned_at: e.pinned_at, pinned_by_id: e.pinned_by_id }
            : m
        )
      )
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                pinned_message_ids: [
                  e.id,
                  ...c.pinned_message_ids.filter((id) => id !== e.id),
                ],
              }
            : c
        )
      )
    },
    onMessageUnpinned: (e) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === e.id
            ? { ...m, pinned_at: null as unknown as string, pinned_by_id: null }
            : m
        )
      )
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                pinned_message_ids: c.pinned_message_ids.filter(
                  (id) => id !== e.id
                ),
              }
            : c
        )
      )
    },
    onParticipantAdded: () => {
      // Refetch the active conversation so the participants list updates.
      apiClient.api
        .messagingConversationsList()
        .then((res) => setConversations(res.data))
        .catch(() => {})
    },
    onParticipantRemoved: (e) => {
      if (e.user_id === meId) {
        // We were removed — drop the conversation from local state.
        setConversations((prev) =>
          prev.filter((c) => c.id !== e.conversation_id)
        )
        if (activeId === e.conversation_id) setActiveId(null)
        return
      }
      apiClient.api
        .messagingConversationsList()
        .then((res) => setConversations(res.data))
        .catch(() => {})
    },
    onConversationRenamed: (e) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === e.id ? { ...c, name: e.name } : c))
      )
    },
    onTyping: (e) => {
      if (e.user_id === meId) return
      markUserTyping(e.user_id)
    },
    onTypingStopped: (e) => {
      clearUserTyping(e.user_id)
    },
  })

  // Page-level user-channel subscription. The sidebar already listens for
  // unread-badge refreshes, but this page also needs to refetch its
  // conversation list when membership changes — e.g. someone adds the
  // current user to a new group, or a not-yet-loaded conversation receives
  // a message — so the inbox stays in sync without a manual refresh.
  const refetchConversationsRef = useRef<() => void>(() => {})
  refetchConversationsRef.current = () => {
    apiClient.api
      .messagingConversationsList()
      .then((res) => setConversations(res.data))
      .catch(() => {})
  }
  useUserChannelSocket(Boolean(user), {
    onConversationAdded: () => {
      refetchConversationsRef.current()
    },
    onIncomingMessage: (e) => {
      // If a brand-new conversation is being talked into (one that wasn't in
      // our local list at mount), refetch so it shows up. For known
      // conversations the per-conversation socket already drives the thread.
      setConversations((prev) => {
        if (prev.some((c) => c.id === e.conversation_id)) return prev
        refetchConversationsRef.current()
        return prev
      })
    },
  })

  // Throttled "I'm typing" emit — fires at most once every 3 seconds while
  // the user is composing. The send helper no-ops if the socket isn't open.
  const lastTypingEmittedAt = useRef<number>(0)
  const TYPING_EMIT_INTERVAL_MS = 3_000

  function emitTyping() {
    const now = Date.now()
    if (now - lastTypingEmittedAt.current < TYPING_EMIT_INTERVAL_MS) return
    lastTypingEmittedAt.current = now
    conversationSocket.send({ type: 'typing' })
  }

  function emitTypingStopped() {
    lastTypingEmittedAt.current = 0
    conversationSocket.send({ type: 'typing_stopped' })
  }

  // ── send message ───────────────────────────────────────────────────────
  const sendingRef = useRef(false)
  async function handleSend(body: string, file: File | null) {
    if (!activeId || sendingRef.current) return
    if (!body.trim() && !file) return
    sendingRef.current = true
    try {
      const form = new FormData()
      form.append('data', JSON.stringify({ body: body.trim() }))
      if (file) form.append('file', file)
      const res = await apiClient.api.messagingConversationsMessagesCreate(
        activeId,
        // The generated SendMessageMultipart type expects `data: string` —
        // we override at the network layer because the client's auto-built
        // FormData isn't flexible enough to forward arbitrary File parts.
        form as unknown as Parameters<
          typeof apiClient.api.messagingConversationsMessagesCreate
        >[1]
      )
      // Dedup by id: the WS broadcast (fired on transaction commit) often
      // beats the REST response back to the client, so the message may
      // already be in state.
      setMessages((prev) =>
        prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]
      )
      setConversations((prev) => bumpConversation(prev, activeId, res.data))
    } catch {
      toast.error(t('messages.errors.sendFailed'))
    } finally {
      sendingRef.current = false
    }
  }

  async function handleEdit(messageId: number, body: string) {
    try {
      const res = await apiClient.api.messagingMessagesPartialUpdate(
        messageId,
        { body }
      )
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? res.data : m))
      )
    } catch {
      toast.error(t('messages.errors.editFailed'))
    }
  }

  async function handleDelete(messageId: number) {
    try {
      await apiClient.api.messagingMessagesDestroy(messageId)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                body: '',
                file_url: null,
                original_filename: '',
                mime_type: '',
                deleted_at: new Date().toISOString(),
                reactions: [],
                pinned_at: null as unknown as string,
              }
            : m
        )
      )
      // Auto-unpin happens server-side; reflect it locally too.
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                pinned_message_ids: c.pinned_message_ids.filter(
                  (id) => id !== messageId
                ),
              }
            : c
        )
      )
    } catch {
      toast.error(t('messages.errors.deleteFailed'))
    }
  }

  async function handleReact(messageId: number, emoji: string) {
    if (meId === null) return
    const msg = messages.find((m) => m.id === messageId)
    if (!msg) return
    const userHasReacted = msg.reactions.some(
      (g) => g.emoji === emoji && g.user_ids.includes(meId)
    )
    try {
      const res = userHasReacted
        ? await apiClient.api.messagingMessagesReactionsDestroy(messageId, {
            body: JSON.stringify({ emoji }),
            headers: { 'Content-Type': 'application/json' },
          } as unknown as Parameters<
            typeof apiClient.api.messagingMessagesReactionsDestroy
          >[1])
        : await apiClient.api.messagingMessagesReactionsCreate(messageId, {
            emoji,
          })
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? res.data : m))
      )
    } catch {
      toast.error(t('messages.errors.reactFailed'))
    }
  }

  async function handlePin(messageId: number, pin: boolean) {
    try {
      const res = pin
        ? await apiClient.api.messagingMessagesPinCreate(messageId)
        : await apiClient.api.messagingMessagesUnpinCreate(messageId)
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? res.data : m))
      )
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                pinned_message_ids: pin
                  ? [
                      messageId,
                      ...c.pinned_message_ids.filter((id) => id !== messageId),
                    ]
                  : c.pinned_message_ids.filter((id) => id !== messageId),
              }
            : c
        )
      )
    } catch {
      toast.error(t('messages.errors.pinFailed'))
    }
  }

  // ── start (or open) a DM with a chosen user ────────────────────────────
  async function handleStartConversation(otherUserId: number) {
    try {
      const res = await apiClient.api.messagingConversationsCreate({
        user_id: otherUserId,
      })
      const conv = res.data
      setConversations((prev) => {
        if (prev.some((c) => c.id === conv.id)) return prev
        return [conv, ...prev]
      })
      setActiveId(conv.id)
      setNewDialogOpen(false)
    } catch {
      toast.error(t('messages.errors.startConversationFailed'))
    }
  }

  // ── create a new group conversation ────────────────────────────────────
  async function handleCreateGroup(name: string, userIds: number[]) {
    try {
      const res = await apiClient.api.messagingConversationsGroupsCreate({
        name,
        participant_ids: userIds,
      })
      const conv = res.data
      setConversations((prev) =>
        prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
      )
      setActiveId(conv.id)
      setNewDialogOpen(false)
    } catch {
      toast.error(t('messages.errors.createGroupFailed'))
    }
  }

  // ── filtered list (search) ─────────────────────────────────────────────
  // Note: there is no concept of "pinned conversations" yet — message-pinning
  // and conversation-pinning are intentionally separate. Threads are listed
  // flat, ordered by recency (updated_at).
  const visibleConversations = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.trim().toLowerCase()
    return conversations.filter((c) =>
      conversationLabel(c, participants, meId, t).toLowerCase().includes(q)
    )
  }, [conversations, participants, meId, search, t])

  const hasProfile = Boolean(user?.has_profile)

  // On mobile we use a "navigator" pattern — inbox view vs thread view —
  // instead of showing both side-by-side. The user picks a conversation
  // from the list and the thread takes over the screen; a back button
  // returns to the inbox.
  const mobileShowThread = isMobile && activeId !== null

  // Profile is the opt-in to messaging — anyone without one gets a hard
  // gate at the page level. Their participation in coaching groups (etc.)
  // is still recorded server-side; other members will see them as
  // "Anonymous user" until they create a profile.
  if (user && !hasProfile) {
    return (
      <PageLayout fullHeight>
        <PageHeader title={t('messages.title')} />
        <NoProfileGate />
      </PageLayout>
    )
  }

  return (
    <PageLayout fullHeight className={cn(mobileShowThread && 'p-0')}>
      {/* On mobile we suppress the page-level header when a conversation is
       *  active — the thread header takes over the top bar.
       *  On desktop the header always renders. */}
      {!mobileShowThread && (
        <PageHeader title={t('messages.title')}>
          <Button
            onClick={() => setNewDialogOpen(true)}
            size={isMobile ? 'icon' : 'default'}
            aria-label={isMobile ? t('messages.newMessage') : undefined}
          >
            <Plus className="size-4" aria-hidden="true" />
            {!isMobile && t('messages.newMessage')}
          </Button>
        </PageHeader>
      )}

      <NewConversationDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onPickDirect={handleStartConversation}
        onCreateGroup={handleCreateGroup}
        meId={meId}
      />

      <div
        className={cn(
          'flex-1 min-h-0 overflow-hidden grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]',
          detailsOpen && 'md:grid-cols-[280px_1fr_320px]'
        )}
      >
        {/* Rail — conversation list. Liquid-glass deck on its own: a search
         *  card floating above a list card, with the page grain reading
         *  through the gap between them. Mirrors the thread's card pattern
         *  so both halves of the page share the same visual language. On
         *  mobile, hidden while the thread is showing (navigator pattern). */}
        <div
          className={cn(
            'flex min-w-0 min-h-0 flex-col gap-1.5 p-1.5 md:gap-2 md:p-2.5',
            mobileShowThread && 'hidden md:flex'
          )}
        >
          {/* Search input sits directly on the grain — no card chrome
           *  around it. The Input itself is the only object on this row. */}
          <div className="relative shrink-0">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              inputMode="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('messages.searchPlaceholder')}
              className="h-10 pl-9 pr-9 md:h-9"
              aria-label={t('messages.searchPlaceholder')}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={t('messages.clearSearch')}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* List card */}
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="h-full overflow-y-auto">
            {loadingList ? (
              <ConversationListSkeleton />
            ) : visibleConversations.length === 0 ? (
              <EmptyConversations />
            ) : (
              <ConversationList
                conversations={visibleConversations}
                activeId={activeId}
                participants={participants}
                meId={meId}
                onSelect={setActiveId}
                lastTimeLabel={(iso) => lastTimeLabel(iso, lang, t)}
                unreadByConversation={unreadByConversation}
              />
            )}
            </div>
          </div>
        </div>

        {/* Center — thread. Liquid-glass deck: the wrapper has no card chrome
         *  of its own. The thread renders separate floating cards (header,
         *  optional pinned, composer) with the messages canvas between them,
         *  all sitting on the page grain. */}
        <div
          className={cn(
            'flex min-w-0 min-h-0 flex-col overflow-hidden',
            !mobileShowThread && 'hidden md:flex'
          )}
        >
          {activeConversation && meId !== null ? (
            <MessageThread
              conversation={activeConversation}
              messages={messages}
              participants={participants}
              meId={meId}
              loading={loadingThread}
              detailsOpen={detailsOpen}
              onToggleDetails={() => setDetailsOpen((v) => !v)}
              onBack={isMobile ? () => setActiveId(null) : undefined}
              onSend={handleSend}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReact={handleReact}
              onPin={handlePin}
              dayLabel={(iso) => dayLabel(iso, lang, t)}
              typingUserIds={typingUserIds}
              onTyping={emitTyping}
              onTypingStopped={emitTypingStopped}
              onOfferUpdated={refreshConversations}
            />
          ) : (
            <NoConversationSelected />
          )}
        </div>

        {/* Details — desktop right panel (toggled by header click). On
         *  mobile we open as a bottom sheet with the same chrome as
         *  NewConversationDialog: drag handle, conversation name as
         *  the title, descriptive subtitle, body below. */}
        {detailsOpen && activeConversation && meId !== null && isMobile && (
          <Sheet
            open={detailsOpen}
            onOpenChange={(o) => setDetailsOpen(o)}
          >
            <SheetContent
              side="bottom"
              className="flex h-[92dvh] flex-col gap-0 rounded-t-2xl border-t bg-background p-0"
            >
              {/* Drag handle — same affordance as NewConversationDialog. */}
              <div className="flex shrink-0 justify-center pt-2.5 pb-1">
                <span
                  aria-hidden="true"
                  className="h-1 w-9 rounded-full bg-muted-foreground/30"
                />
              </div>
              <SheetHeader className="shrink-0 gap-1 px-5 pt-2 pb-3 text-left">
                <SheetTitle className="text-base font-semibold tracking-tight">
                  {detailsTitle(activeConversation, participants, meId, t)}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {detailsSubtitle(activeConversation, t)}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                <ConversationDetailsContent
                  conversation={activeConversation}
                  messages={messages}
                  participants={participants}
                  meId={meId}
                  onRefreshConversation={refreshConversations}
                  onAfterLeave={() => {
                    setConversations((prev) =>
                      prev.filter((c) => c.id !== activeConversation.id)
                    )
                    setActiveId(null)
                    setDetailsOpen(false)
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
        {detailsOpen && activeConversation && meId !== null && !isMobile && (
          <div className="flex min-w-0 min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold tracking-tight">
                {t('messages.details.title')}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setDetailsOpen(false)}
                aria-label={t('messages.closeDetails')}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <ConversationDetailsContent
              conversation={activeConversation}
              messages={messages}
              participants={participants}
              meId={meId}
              onRefreshConversation={refreshConversations}
              onAfterLeave={() => {
                setConversations((prev) =>
                  prev.filter((c) => c.id !== activeConversation.id)
                )
                setActiveId(null)
                setDetailsOpen(false)
              }}
            />
          </div>
        )}
      </div>
    </PageLayout>
  )
}

function NoProfileGate() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <UserCircle2
          aria-hidden="true"
          className="size-10 text-muted-foreground"
        />
        <h2 className="text-lg font-semibold tracking-tight">
          {t('messages.noProfile.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('messages.noProfile.description')}
        </p>
        <Button asChild className="mt-2">
          <NavLink to={paths.accountSettings}>
            {t('messages.noProfile.cta')}
          </NavLink>
        </Button>
      </div>
    </div>
  )
}

function ConversationListSkeleton() {
  return (
    <ul className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
        >
          <Skeleton className="size-11 rounded-full" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32 max-w-full" />
            <Skeleton className="h-3 w-44 max-w-full" />
          </div>
          <Skeleton className="h-3 w-8" />
        </li>
      ))}
    </ul>
  )
}

function EmptyConversations() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <MessageSquarePlus className="size-5" />
      </span>
      <p className="text-sm font-medium text-foreground">
        {t('messages.empty.noConversations')}
      </p>
    </div>
  )
}

function NoConversationSelected() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <MessageSquarePlus
        className="size-10 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="text-base font-medium">
        {t('messages.empty.selectConversationTitle')}
      </p>
      <p className="max-w-xs text-sm text-muted-foreground">
        {t('messages.empty.selectConversationHint')}
      </p>
    </div>
  )
}

function bumpConversation(
  list: Conversation[],
  id: number,
  lastMessage: Message
): Conversation[] {
  const next = list.map((c) =>
    c.id === id
      ? { ...c, last_message: lastMessage, updated_at: lastMessage.created_at }
      : c
  )
  next.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
  return next
}

function buildParticipantDict(
  convs: Conversation[]
): Record<number, ConversationParticipant> {
  const dict: Record<number, ConversationParticipant> = {}
  for (const c of convs) {
    for (const p of c.participants) {
      // Conversation surfaces the same person across multiple threads; the
      // latest snapshot wins. Participants without a profile come back with
      // display_name=null — the UI renders them as "Anonymous user".
      dict[p.id] = {
        id: p.id,
        hasProfile: p.has_profile,
        displayName: p.display_name ?? null,
        photoUrl: p.photo_url ?? null,
      }
    }
  }
  return dict
}

function conversationLabel(
  c: Conversation,
  dict: Record<number, ConversationParticipant>,
  meId: number | null,
  t: (k: string) => string
): string {
  if (c.kind === ConversationKindEnum.Listing) {
    return c.listing_title || c.name || t('messages.listingConversation')
  }
  const others = c.participant_ids.filter((id) => id !== meId)
  if (others.length === 0) return t('messages.selfConversation')
  if (others.length === 1) return participantName(dict[others[0]], t, others[0])
  const names = others
    .slice(0, 3)
    .map((id) => participantName(dict[id], t, id).split(' ')[0])
  const extra = others.length - names.length
  return extra > 0 ? `${names.join(', ')} +${extra}` : names.join(', ')
}

/** Title for the mobile details sheet — the conversation name itself
 *  (the group name, or the other participant's name for a DM). More
 *  useful than a generic "Conversation details" header. */
function detailsTitle(
  c: Conversation,
  dict: Record<number, ConversationParticipant>,
  meId: number | null,
  t: (k: string) => string
): string {
  if (c.kind === 'group') return c.name || t('messages.untitledGroup')
  return conversationLabel(c, dict, meId, t)
}

/** Subtitle: member count for groups, "Direct conversation" for DMs.
 *  Mirrors NewConversationDialog's pattern of title + descriptive
 *  subtitle inside the sheet header. */
function detailsSubtitle(c: Conversation, t: TFunction): string {
  if (c.kind === 'group') {
    return t('messages.details.membersCount', {
      count: c.participant_ids.length,
    })
  }
  return t('messages.details.directSubtitle')
}
