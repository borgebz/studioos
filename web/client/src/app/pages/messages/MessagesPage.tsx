import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, isToday, isYesterday } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { pt } from 'date-fns/locale/pt'
import { MessageSquarePlus, Plus, Search, UserCircle2, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { paths } from '@/app/paths'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import {
  MessageKindEnum,
  type Conversation,
  type Message,
} from '@/api/studioos-api'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { cn } from '@/lib/utils'

import { ConversationDetailsContent } from './ConversationDetails'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { NewConversationDialog } from './NewConversationDialog'
import { participantName, type ConversationParticipant } from './types'
import { useConversationSocket } from './useConversationSocket'
import { triggerUnreadRefresh, useUnreadMessages } from './useUnreadMessages'

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
        if (convs.length && activeId === null) {
          setActiveId(convs[0].id)
        }
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
        const msg: Message = {
          id: e.id,
          kind: MessageKindEnum.User,
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
    <PageLayout fullHeight>
      <PageHeader title={t('messages.title')}>
        <Button onClick={() => setNewDialogOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {t('messages.newMessage')}
        </Button>
      </PageHeader>

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
        {/* Rail — conversation list */}
        <div className="flex min-w-0 min-h-0 flex-col rounded-lg border border-border bg-card">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('messages.searchPlaceholder')}
                className="pl-9"
                aria-label={t('messages.searchPlaceholder')}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
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

        {/* Center — thread */}
        <div className="flex min-w-0 min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
          {activeConversation && meId !== null ? (
            <MessageThread
              conversation={activeConversation}
              messages={messages}
              participants={participants}
              meId={meId}
              loading={loadingThread}
              detailsOpen={detailsOpen}
              onToggleDetails={() => setDetailsOpen((v) => !v)}
              onSend={handleSend}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReact={handleReact}
              onPin={handlePin}
              dayLabel={(iso) => dayLabel(iso, lang, t)}
              typingUserIds={typingUserIds}
              onTyping={emitTyping}
              onTypingStopped={emitTypingStopped}
            />
          ) : (
            <NoConversationSelected />
          )}
        </div>

        {/* Details — right panel, toggled by header click */}
        {detailsOpen && activeConversation && meId !== null && (
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
              onRefreshConversation={async () => {
                try {
                  const res = await apiClient.api.messagingConversationsList()
                  setConversations(res.data)
                } catch {
                  // non-fatal — WS will eventually catch us up
                }
              }}
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
          className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-3 py-2.5"
        >
          <Skeleton className="size-8 rounded-full" />
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
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <MessageSquarePlus
        className="size-8 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">
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
  const others = c.participant_ids.filter((id) => id !== meId)
  if (others.length === 0) return t('messages.selfConversation')
  if (others.length === 1) return participantName(dict[others[0]], t, others[0])
  const names = others
    .slice(0, 3)
    .map((id) => participantName(dict[id], t, id).split(' ')[0])
  const extra = others.length - names.length
  return extra > 0 ? `${names.join(', ')} +${extra}` : names.join(', ')
}
