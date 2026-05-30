import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { pt } from 'date-fns/locale/pt'
import {
  ArrowDown,
  Camera,
  ChevronLeft,
  Download,
  Eye,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Plus,
  SmilePlus,
  Trash2,
  Users,
  X,
} from 'lucide-react'

import type { Conversation, Message } from '@/api/studioos-api'
import { ConversationKindEnum } from '@/api/studioos-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import { useIsMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'

import { participantName, type ConversationParticipant } from './types'
import { ListingOfferCard } from './ListingOfferCard'

const QUICK_REACTIONS: { emoji: string; key: string }[] = [
  { emoji: '👍', key: 'thumbsUp' },
  { emoji: '❤️', key: 'heart' },
  { emoji: '😂', key: 'laugh' },
  { emoji: '😮', key: 'wow' },
  { emoji: '😢', key: 'sad' },
  { emoji: '🙏', key: 'thanks' },
]

interface MessageThreadProps {
  conversation: Conversation
  messages: Message[]
  participants: Record<number, ConversationParticipant>
  meId: number
  loading: boolean
  detailsOpen: boolean
  onToggleDetails: () => void
  onSend: (body: string, file: File | null) => Promise<void>
  onEdit: (messageId: number, body: string) => Promise<void>
  onDelete: (messageId: number) => Promise<void>
  onReact: (messageId: number, emoji: string) => Promise<void>
  onPin: (messageId: number, pin: boolean) => Promise<void>
  dayLabel: (iso: string) => string
  /** Other-participant IDs currently typing in this conversation. */
  typingUserIds: number[]
  /** Throttled "I am typing" emitter — composer calls this on input. */
  onTyping: () => void
  /** Fired on send / blur / unmount so peers stop showing my bubble. */
  onTypingStopped: () => void
  /** Mobile-only: when defined, header renders a back arrow returning to inbox. */
  onBack?: () => void
  /** Refreshes conversation metadata after offer actions (status badge, etc.). */
  onOfferUpdated?: () => void | Promise<void>
}

export function MessageThread({
  conversation,
  messages,
  participants,
  meId,
  loading,
  detailsOpen,
  onToggleDetails,
  onSend,
  onEdit,
  onDelete,
  onReact,
  onPin,
  dayLabel,
  typingUserIds,
  onTyping,
  onTypingStopped,
  onBack,
  onOfferUpdated,
}: MessageThreadProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const isMobile = useIsMobile()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [draft, setDraft] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingBody, setEditingBody] = useState('')
  // Mobile: long-press on a bubble opens a bottom action sheet with the
  // reactions row + Pin/Edit/Delete. The always-on action strip is hidden
  // under md to keep the thread visually calm.
  const [actionSheetId, setActionSheetId] = useState<number | null>(null)

  // Track whether the scroll viewport is pinned to the bottom. Used to (a)
  // suppress auto-scroll when the user is reading history, and (b) drive the
  // jump-to-bottom pill + unread-since-scroll counter.
  const [atBottom, setAtBottom] = useState(true)
  const [unreadBelow, setUnreadBelow] = useState(0)
  const lastSeenIdRef = useRef<number | null>(null)
  const prevConvIdRef = useRef<number | null>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  // Reset the "new messages" pill whenever we switch conversations.
  useEffect(() => {
    if (prevConvIdRef.current !== conversation.id) {
      prevConvIdRef.current = conversation.id
      setUnreadBelow(0)
      setAtBottom(true)
      // Use 'auto' so switching conversations doesn't animate.
      requestAnimationFrame(() => scrollToBottom('auto'))
    }
  }, [conversation.id, scrollToBottom])

  // Auto-scroll only when the user is already at (or near) the bottom; if
  // they've scrolled up to read history, surface a "jump to bottom" pill
  // with the count of new messages instead of yanking them around.
  useEffect(() => {
    const lastId = messages.length ? messages[messages.length - 1].id : null
    const prevLastId = lastSeenIdRef.current
    lastSeenIdRef.current = lastId

    if (atBottom) {
      requestAnimationFrame(() => scrollToBottom('auto'))
      setUnreadBelow(0)
      return
    }
    // A new message arrived while the user is scrolled up.
    if (lastId !== null && prevLastId !== null && lastId !== prevLastId) {
      setUnreadBelow((n) => n + 1)
    }
  }, [messages, atBottom, scrollToBottom])

  // Typing bubbles grow the scroll height below the last message. If the
  // user is pinned to the bottom, keep them pinned so the bubble stays
  // visible; otherwise leave their scroll position alone.
  useEffect(() => {
    if (typingUserIds.length > 0 && atBottom) {
      requestAnimationFrame(() => scrollToBottom('smooth'))
    }
    // atBottom intentionally omitted — we only react to typing changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingUserIds.length, scrollToBottom])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const near = distance < 80
    setAtBottom(near)
    if (near) setUnreadBelow(0)
  }

  // ── header label ────────────────────────────────────────────────────────
  const others = conversation.participant_ids.filter((id) => id !== meId)
  const primary = others[0] !== undefined ? participants[others[0]] : null
  const headerLabel = conversationHeaderLabel(
    conversation,
    participants,
    meId,
    t
  )
  // Subtitle: group member count for groups; nothing for DMs since the
  // name in the header already says everything (the email used to live
  // here, but it's not exposed to non-admin users anymore).
  const headerSub =
    conversation.kind === ConversationKindEnum.Listing
      ? others.length === 1
        ? participantName(participants[others[0]], t, others[0])
        : ''
      : others.length > 1
        ? t('messages.groupParticipantCount', {
            count: conversation.participant_ids.length,
          })
        : ''

  // ── pinned messages (resolved) ──────────────────────────────────────────
  const pinnedMessages = useMemo(
    () =>
      conversation.pinned_message_ids
        .map((id) => messages.find((m) => m.id === id))
        .filter((m): m is Message => Boolean(m) && !m!.deleted_at),
    [conversation.pinned_message_ids, messages]
  )

  // ── day grouping ────────────────────────────────────────────────────────
  const groupedMessages = useMemo(() => {
    const groups: { day: string; key: string; items: Message[] }[] = []
    for (const m of messages) {
      const key = m.created_at.slice(0, 10)
      const day = dayLabel(m.created_at)
      const last = groups[groups.length - 1]
      if (last && last.key === key) {
        last.items.push(m)
      } else {
        groups.push({ key, day, items: [m] })
      }
    }
    return groups
  }, [messages, dayLabel])

  const timeFormat = lang.startsWith('pt') ? 'HH:mm' : 'p'
  const timeLocale = lang.startsWith('pt') ? pt : enUS

  return (
    // Liquid-glass deck. Each strip (header, pinned, composer) is its own
    // floating card; the messages canvas in between is transparent so the
    // page grain (SidebarInset) reads as the paper underneath them all.
    // Tight gap on purpose — keeps the cards visually separated without
    // leaving a wide strip of grain that lets messages "peek" while
    // scrolling under the cards.
    <div className="flex h-full min-h-0 flex-col gap-1.5 p-1.5 md:gap-2 md:p-2.5">
      {/* Header card — back arrow (mobile only) + clickable strip that
       *  toggles details. */}
      <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleDetails}
          className={cn(
            'flex flex-1 items-center gap-3 text-left transition-colors hover:bg-accent/40',
            onBack ? 'px-3 py-3' : 'px-6 py-4',
            detailsOpen && 'bg-accent/30'
          )}
          aria-label={t('messages.openDetails')}
          aria-expanded={detailsOpen}
        >
          {conversation.kind === 'group' ? (
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
            >
              <Users className="size-5" />
            </span>
          ) : conversation.kind === ConversationKindEnum.Listing &&
            conversation.variant_photo_url ? (
            <img
              src={conversation.variant_photo_url}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover bg-muted"
            />
          ) : (
            <Avatar size="lg">
              {primary?.photoUrl && (
                <AvatarImage src={primary.photoUrl} alt={headerLabel} />
              )}
              <AvatarFallback>{getInitials(headerLabel)}</AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold tracking-tight text-foreground">
              {headerLabel}
            </div>
            {headerSub && (
              <div className="truncate text-xs text-muted-foreground">
                {headerSub}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Pinned bar — single read-only row. Pin icon + the most recent
       *  pinned message body, left-aligned, truncated. The full list of
       *  pinned items lives in the conversation details panel; this strip
       *  is just a passive marker that something is pinned. */}
      {pinnedMessages.length > 0 && (
        <div className="shrink-0 overflow-hidden rounded-xl border border-border bg-accent/60 px-4 py-2 shadow-sm backdrop-blur-sm md:px-5">
          <div className="flex items-center gap-2 text-xs">
            <Pin
              aria-hidden="true"
              className="size-3 shrink-0 text-muted-foreground"
            />
            <span className="truncate text-foreground/80">
              {pinnedMessages[0].body ||
                pinnedMessages[0].original_filename ||
                t('messages.attachment')}
            </span>
          </div>
        </div>
      )}

      {conversation.kind === ConversationKindEnum.Listing &&
        conversation.listing_offer?.id != null && (
          <div className="mb-2 shrink-0">
            <ListingOfferCard
              offerId={conversation.listing_offer.id}
              meId={meId}
              onUpdated={() => void onOfferUpdated?.()}
            />
          </div>
        )}

      {/* Messages — transparent canvas between the floating cards. The page
       *  grain (SidebarInset) reads through as the paper underneath. No
       *  vertical padding so messages clip cleanly at the canvas edge
       *  (right under the floating card edges) instead of revealing a
       *  strip of grain when they scroll past. */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 min-h-0 overflow-y-auto bg-transparent px-3 py-0 md:px-5"
      >
        {loading ? (
          <ThreadSkeleton />
        ) : messages.length === 0 && typingUserIds.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              {t('messages.empty.noMessages')}
            </p>
          </div>
        ) : (
          <div>
            {groupedMessages.map((group) => (
              <div key={group.key}>
                {/* Day label — sits inline between groups. Not sticky so it
                 *  never collides with the floating header card above. */}
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-card/90 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border/60">
                    {group.day}
                  </span>
                </div>
                {group.items.map((m, i) => {
                  if (m.kind === 'system') {
                    return (
                      <SystemMessage
                        key={m.id}
                        message={m}
                        participants={participants}
                      />
                    )
                  }
                  const prev = i > 0 ? group.items[i - 1] : null
                  const next =
                    i < group.items.length - 1 ? group.items[i + 1] : null
                  const showAvatar = !prev || prev.sender_id !== m.sender_id
                  const isLastOfRun = !next || next.sender_id !== m.sender_id
                  // True only for the very last message in the entire thread.
                  const isLastOverall =
                    m.id === messages[messages.length - 1]?.id
                  return (
                    <Bubble
                      key={m.id}
                      message={m}
                      mine={m.sender_id === meId}
                      showAvatar={showAvatar}
                      sender={participants[m.sender_id]}
                      meId={meId}
                      isMobile={isMobile}
                      isPinned={conversation.pinned_message_ids.includes(m.id)}
                      isEditing={editingId === m.id}
                      editingBody={editingBody}
                      setEditingBody={setEditingBody}
                      onStartEdit={() => {
                        setEditingId(m.id)
                        setEditingBody(m.body)
                      }}
                      onCancelEdit={() => {
                        setEditingId(null)
                        setEditingBody('')
                      }}
                      onConfirmEdit={async () => {
                        const body = editingBody.trim()
                        if (!body || body === m.body) {
                          setEditingId(null)
                          return
                        }
                        await onEdit(m.id, body)
                        setEditingId(null)
                      }}
                      onDelete={() => onDelete(m.id)}
                      onReact={(emoji) => onReact(m.id, emoji)}
                      onPin={(pin) => onPin(m.id, pin)}
                      onOpenActions={() => setActionSheetId(m.id)}
                      isLastOfRun={isLastOfRun}
                      isLastOverall={isLastOverall}
                      timeLabel={(iso) =>
                        format(new Date(iso), timeFormat, {
                          locale: timeLocale,
                        })
                      }
                    />
                  )
                })}
              </div>
            ))}
            {typingUserIds.length > 0 && (
              <TypingBubbles
                userIds={typingUserIds}
                participants={participants}
              />
            )}
          </div>
        )}

        {/* Jump-to-bottom pill — only visible when the user has scrolled up
         *  far enough that they could miss incoming messages. */}
        {!atBottom && (
          <button
            type="button"
            onClick={() => {
              scrollToBottom('smooth')
              setUnreadBelow(0)
            }}
            className="sticky bottom-3 z-20 mx-auto flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-md transition-colors hover:bg-accent"
            aria-label={t('messages.jumpToBottom')}
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
            {unreadBelow > 0
              ? t('messages.newMessagesCount', { count: unreadBelow })
              : t('messages.jumpToBottom')}
          </button>
        )}
      </div>

      {/* Composer card — floats above the safe-area. The typing indicator
       *  lives inside the messages canvas (rendered as a bubble) rather than
       *  here, so the composer reads as a single calm input row. */}
      <div className="shrink-0 overflow-hidden rounded-xl border border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-sm md:px-7 md:py-4">
        <div className="mx-auto max-w-[680px]">
          {file && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-xs">
              <Paperclip className="size-3" aria-hidden="true" />
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label={t('messages.removeFile')}
                className="ml-auto rounded p-0.5 hover:bg-accent"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          <Composer
            value={draft}
            hasFile={Boolean(file)}
            isMobile={isMobile}
            onChange={(v) => {
              setDraft(v)
              if (v.trim().length > 0) onTyping()
            }}
            onBlur={onTypingStopped}
            onFilePick={setFile}
            onSubmit={async () => {
              if (!draft.trim() && !file) return
              await onSend(draft, file)
              setDraft('')
              setFile(null)
              onTypingStopped()
            }}
          />
        </div>
      </div>

      {/* Mobile action sheet — opens on long-press of a bubble. Replaces the
       *  always-visible bubble action strip that crowded the mobile layout. */}
      {isMobile && actionSheetId !== null && (
        <MobileActionSheet
          message={messages.find((m) => m.id === actionSheetId) ?? null}
          isPinned={
            actionSheetId !== null &&
            conversation.pinned_message_ids.includes(actionSheetId)
          }
          mine={
            messages.find((m) => m.id === actionSheetId)?.sender_id === meId
          }
          onClose={() => setActionSheetId(null)}
          onReact={async (emoji) => {
            await onReact(actionSheetId, emoji)
            setActionSheetId(null)
          }}
          onPin={async (pin) => {
            await onPin(actionSheetId, pin)
            setActionSheetId(null)
          }}
          onStartEdit={() => {
            const m = messages.find((x) => x.id === actionSheetId)
            if (!m) return
            setEditingId(m.id)
            setEditingBody(m.body)
            setActionSheetId(null)
          }}
          onDelete={async () => {
            await onDelete(actionSheetId)
            setActionSheetId(null)
          }}
        />
      )}
    </div>
  )
}

interface BubbleProps {
  message: Message
  mine: boolean
  showAvatar: boolean
  isLastOfRun: boolean
  isLastOverall: boolean
  sender?: ConversationParticipant
  meId: number
  isMobile: boolean
  isPinned: boolean
  isEditing: boolean
  editingBody: string
  setEditingBody: (s: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onConfirmEdit: () => Promise<void> | void
  onDelete: () => void
  onReact: (emoji: string) => void
  onPin: (pin: boolean) => void
  /** Mobile-only: long-press handler raises a bottom action sheet. */
  onOpenActions: () => void
  timeLabel: (iso: string) => string
}

function Bubble({
  message,
  mine,
  showAvatar,
  isLastOfRun,
  isLastOverall,
  sender,
  meId,
  isMobile,
  isPinned,
  isEditing,
  editingBody,
  setEditingBody,
  onStartEdit,
  onCancelEdit,
  onConfirmEdit,
  onDelete,
  onReact,
  onPin,
  onOpenActions,
  timeLabel,
}: BubbleProps) {
  const { t } = useTranslation()
  const deleted = Boolean(message.deleted_at)
  const senderName = participantName(sender, t, message.sender_id)

  // Long-press wiring. On mobile, pressing and holding the bubble for ~450ms
  // opens the action sheet (reactions row + pin/edit/delete). Short taps fall
  // through so links inside the bubble (image, file) still work. We also
  // cancel on pointer movement so a scroll gesture never trips an action.
  const longPressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)

  function clearLongPress() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!isMobile || deleted || isEditing) return
    longPressFired.current = false
    pressOrigin.current = { x: e.clientX, y: e.clientY }
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      // Soft haptic confirmation on supported devices.
      if ('vibrate' in navigator) navigator.vibrate(10)
      onOpenActions()
    }, 450)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pressOrigin.current) return
    const dx = e.clientX - pressOrigin.current.x
    const dy = e.clientY - pressOrigin.current.y
    if (Math.hypot(dx, dy) > 8) clearLongPress()
  }

  function onPointerUp() {
    clearLongPress()
  }

  return (
    <div className="group w-full py-0.5">
      {/* Sender name floats above the bubble, indented past the avatar gutter */}
      {!mine && showAvatar && (
        <div className="ml-10 mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">
          {senderName}
        </div>
      )}

      {/* Avatar + bubble row — items-center vertically aligns the avatar
          with the bubble's text. justify-end keeps mine on the right edge
          and theirs on the left edge with no wasted gap. */}
      <div
        className={cn(
          'flex w-full items-center gap-2',
          mine ? 'justify-end' : 'justify-start'
        )}
      >
        {!mine && (
          <div className="w-8 shrink-0">
            {showAvatar && (
              <Avatar size="default">
                {sender?.photoUrl && (
                  <AvatarImage src={sender.photoUrl} alt={senderName} />
                )}
                <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
              </Avatar>
            )}
          </div>
        )}

        <div
          className={cn(
            'relative flex max-w-[78%] items-center gap-1',
            mine ? 'flex-row-reverse' : 'flex-row'
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={clearLongPress}
          onContextMenu={(e) => {
            // Suppress the native long-press context menu on mobile so our
            // action sheet is the only thing that surfaces.
            if (isMobile) e.preventDefault()
          }}
        >
          <div
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm leading-relaxed shadow-sm select-none md:select-auto',
              mine
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-card-foreground',
              deleted &&
                'italic text-muted-foreground border border-dashed bg-muted text-muted-foreground'
            )}
          >
            {deleted ? (
              <span>{t('messages.deletedTombstone')}</span>
            ) : isEditing ? (
              <div className="flex w-64 flex-col gap-2">
                <Textarea
                  autoFocus
                  value={editingBody}
                  onChange={(e) => setEditingBody(e.target.value)}
                  rows={2}
                  className="min-h-[60px] resize-none bg-background text-foreground"
                />
                <div className="flex justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancelEdit}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onConfirmEdit()}
                  >
                    {t('messages.saveEdit')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {message.body && (
                  <div className="whitespace-pre-wrap break-words">
                    {message.body}
                  </div>
                )}
                {message.file_url &&
                  (isImageAttachment(message) ? (
                    <a
                      href={message.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'block overflow-hidden rounded-md',
                        message.body ? 'mt-2' : '',
                        '-mx-1 -mb-0.5 max-w-xs'
                      )}
                      aria-label={
                        message.original_filename || t('messages.attachment')
                      }
                    >
                      <img
                        src={message.file_url}
                        alt={message.original_filename || ''}
                        loading="lazy"
                        className="block h-auto w-full max-h-72 object-cover"
                      />
                    </a>
                  ) : (
                    <a
                      href={message.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'mt-2 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs no-underline',
                        mine
                          ? 'border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground'
                          : 'border-border bg-muted text-foreground'
                      )}
                    >
                      <Paperclip
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {message.original_filename || t('messages.attachment')}
                      </span>
                      <Download
                        className="ml-auto size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                  ))}
              </>
            )}
          </div>

          {!deleted && !isEditing && !isMobile && (
            <BubbleActions
              mine={mine}
              isPinned={isPinned}
              canEdit={mine && canEditWindow(message)}
              onReact={onReact}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
              onPin={onPin}
            />
          )}
        </div>
      </div>

      {/* Reactions appear below the bubble, aligned to the bubble's edge. */}
      {!deleted && message.reactions.length > 0 && (
        <div
          className={cn(
            'mt-1 flex flex-wrap gap-1',
            mine ? 'justify-end' : 'ml-10 justify-start'
          )}
        >
          {message.reactions.map((g) => (
            <button
              key={g.emoji}
              type="button"
              onClick={() => onReact(g.emoji)}
              className={cn(
                'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                g.user_ids.includes(meId)
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              )}
            >
              <span>{g.emoji}</span>
              <span className="font-medium">{g.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Time / edited / pinned / eye — same indent as reactions */}
      {(isLastOfRun || message.edited_at || isPinned) && (
        <div
          className={cn(
            'mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground',
            mine ? 'flex-row-reverse' : 'ml-10 flex-row'
          )}
        >
          <span>{timeLabel(message.created_at)}</span>
          {message.edited_at && !deleted && (
            <span>· {t('messages.edited')}</span>
          )}
          {isPinned && !deleted && (
            <span className="flex items-center gap-0.5">
              · <Pin className="size-2.5" aria-hidden="true" />{' '}
              {t('messages.pinned')}
            </span>
          )}
          {mine && !deleted && isLastOverall && (
            <Eye className="size-3" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  )
}

function BubbleActions({
  mine,
  isPinned,
  canEdit,
  onReact,
  onStartEdit,
  onDelete,
  onPin,
}: {
  mine: boolean
  isPinned: boolean
  canEdit: boolean
  onReact: (emoji: string) => void
  onStartEdit: () => void
  onDelete: () => void
  onPin: (pin: boolean) => void
}) {
  const { t } = useTranslation()
  const [openReact, setOpenReact] = useState(false)
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          // Desktop-only hover-reveal strip. On mobile the long-press action
          // sheet replaces this entirely, so we never render this branch.
          'absolute top-1/2 z-10 -translate-y-1/2 hidden md:flex shrink-0 items-center gap-0.5 rounded-md border border-transparent bg-card/95 px-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-within:opacity-100',
          mine ? 'right-full mr-1' : 'left-full ml-1'
        )}
      >
        <DropdownMenu open={openReact} onOpenChange={setOpenReact}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
              aria-label={t('messages.reactLabel')}
            >
              <SmilePlus className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={mine ? 'end' : 'start'}
            className="flex gap-0.5 p-1"
          >
            {QUICK_REACTIONS.map(({ emoji, key }) => (
              <Tooltip key={emoji}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      onReact(emoji)
                      setOpenReact(false)
                    }}
                    className="rounded-md p-1.5 text-base transition-colors hover:bg-accent"
                    aria-label={t(`messages.reactions.${key}`)}
                  >
                    {emoji}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t(`messages.reactions.${key}`)}
                </TooltipContent>
              </Tooltip>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
              aria-label={t('messages.moreLabel')}
            >
              <MoreHorizontal className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={mine ? 'end' : 'start'}>
            <DropdownMenuItem onClick={() => onPin(!isPinned)}>
              {isPinned ? (
                <>
                  <PinOff className="size-4" />
                  {t('messages.unpin')}
                </>
              ) : (
                <>
                  <Pin className="size-4" />
                  {t('messages.pin')}
                </>
              )}
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={onStartEdit}>
                <Pencil className="size-4" />
                {t('messages.edit')}
              </DropdownMenuItem>
            )}
            {mine && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" />
                  {t('messages.delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}

function TypingBubbles({
  userIds,
  participants,
}: {
  userIds: number[]
  participants: Record<number, ConversationParticipant>
}) {
  const { t } = useTranslation()
  return (
    <div className="pt-1" aria-live="polite">
      {userIds.map((id) => (
        <TypingBubble
          key={id}
          userId={id}
          participants={participants}
          t={t}
        />
      ))}
    </div>
  )
}

function TypingBubble({
  userId,
  participants,
  t,
}: {
  userId: number
  participants: Record<number, ConversationParticipant>
  t: (k: string, opts?: Record<string, unknown>) => string
}) {
  const sender = participants[userId]
  const senderName = participantName(sender, t, userId)
  return (
    <div className="w-full py-0.5">
      <div className="ml-10 mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">
        {senderName}
      </div>
      <div className="flex w-full items-center justify-start gap-2">
        <div className="w-8 shrink-0">
          <Avatar size="default">
            {sender?.photoUrl && (
              <AvatarImage src={sender.photoUrl} alt={senderName} />
            )}
            <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
          </Avatar>
        </div>
        <div
          role="status"
          aria-label={t('messages.typing.aria', { name: senderName })}
          className="flex items-center rounded-lg border border-border bg-card px-3.5 py-2.5 shadow-sm"
        >
          <span className="inline-flex items-end gap-1 leading-none">
            <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-typing-dot [animation-delay:0ms]" />
            <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-typing-dot [animation-delay:120ms]" />
            <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-typing-dot [animation-delay:240ms]" />
          </span>
        </div>
      </div>
    </div>
  )
}

function Composer({
  value,
  hasFile,
  isMobile,
  onChange,
  onBlur,
  onFilePick,
  onSubmit,
}: {
  value: string
  hasFile: boolean
  isMobile: boolean
  onChange: (v: string) => void
  onBlur?: () => void
  onFilePick: (f: File | null) => void
  onSubmit: () => Promise<void> | void
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // On mobile the on-screen keyboard's Enter key is "newline" by user
    // mental model — there's no Shift to fall back on. Sending is the
    // send-button's job. On desktop we keep the convenience: Enter sends,
    // Shift+Enter inserts a newline.
    if (isMobile) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void onSubmit()
    }
  }

  const canSend = Boolean(value.trim() || hasFile)

  return (
    <div className="flex items-end gap-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          onFilePick(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov"
      />
      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          onFilePick(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />

      {/* Attach affordance. Mobile has two destinations (camera + file
       *  picker), so the + opens a DropdownMenu. Desktop only has the file
       *  picker — wrapping that single choice in a menu would be a needless
       *  extra click, so the button triggers the picker directly. */}
      {isMobile ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 text-muted-foreground"
              aria-label={t('messages.attachLabel')}
            >
              <Plus className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" sideOffset={6}>
            <DropdownMenuItem
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="size-4" />
              {t('imageUpload.takePhoto')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="size-4" />
              {t('messages.attachFile')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
          aria-label={t('messages.attachFile')}
        >
          <Plus className="size-4" />
        </Button>
      )}

      {/* Textarea + inline send button. The send label lives inside the
       *  textarea's right edge so the input row reads as one object, not
       *  two. The textarea reserves right padding so text doesn't underrun
       *  the button. The button itself is plain-text "Send" (no icon),
       *  vertically centered against the textarea's first line. */}
      <div className="relative flex-1">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={handleKey}
          placeholder={t('messages.composerPlaceholder')}
          rows={1}
          enterKeyHint="enter"
          className="min-h-11 max-h-32 w-full resize-none pr-[88px] md:min-h-[40px] md:pr-20"
        />
        <Button
          type="button"
          onClick={() => {
            if ('vibrate' in navigator) navigator.vibrate(5)
            void onSubmit()
          }}
          disabled={!canSend}
          variant="ghost"
          size="sm"
          className="absolute right-1.5 top-1.5 h-8 px-3 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary md:h-7"
          aria-label={t('messages.send')}
        >
          {t('messages.send')}
        </Button>
      </div>
    </div>
  )
}

function MobileActionSheet({
  message,
  isPinned,
  mine,
  onClose,
  onReact,
  onPin,
  onStartEdit,
  onDelete,
}: {
  message: Message | null
  isPinned: boolean
  mine: boolean
  onClose: () => void
  onReact: (emoji: string) => Promise<void> | void
  onPin: (pin: boolean) => Promise<void> | void
  onStartEdit: () => void
  onDelete: () => Promise<void> | void
}) {
  const { t } = useTranslation()
  if (!message) return null
  const canEdit = mine && canEditWindow(message)
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="gap-0 rounded-t-xl pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-sm font-semibold tracking-tight">
            {t('messages.messageActions')}
          </SheetTitle>
        </SheetHeader>

        {/* Reactions row — generous 44px+ tap targets across the row. */}
        <div className="flex items-center justify-between gap-1 px-3 py-3">
          {QUICK_REACTIONS.map(({ emoji, key }) => (
            <button
              key={emoji}
              type="button"
              onClick={() => void onReact(emoji)}
              className="flex size-12 items-center justify-center rounded-full text-2xl transition-colors hover:bg-accent active:scale-95"
              aria-label={t(`messages.reactions.${key}`)}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="border-t border-border">
          <ActionRow
            icon={isPinned ? PinOff : Pin}
            label={isPinned ? t('messages.unpin') : t('messages.pin')}
            onClick={() => void onPin(!isPinned)}
          />
          {canEdit && (
            <ActionRow
              icon={Pencil}
              label={t('messages.edit')}
              onClick={onStartEdit}
            />
          )}
          {mine && (
            <ActionRow
              icon={Trash2}
              label={t('messages.delete')}
              destructive
              onClick={() => void onDelete()}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ActionRow({
  icon: Icon,
  label,
  destructive,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  destructive?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm transition-colors hover:bg-accent active:bg-accent/80',
        destructive ? 'text-destructive' : 'text-foreground'
      )}
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </button>
  )
}

function canEditWindow(m: Message): boolean {
  const created = new Date(m.created_at).getTime()
  return Date.now() - created < 15 * 60 * 1000
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

function isImageAttachment(m: Message): boolean {
  if (m.mime_type && m.mime_type.startsWith('image/')) return true
  const name = (m.original_filename || m.file_url || '').toLowerCase()
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))
}

function SystemMessage({
  message,
  participants,
}: {
  message: Message
  participants: Record<number, ConversationParticipant>
}) {
  const { t } = useTranslation()
  // Body is JSON {"event": "...", ...fields}. Decode and localize.
  let parsed: {
    event?: string
    target_id?: number
    name?: string
    old_name?: string
    new_name?: string
  } = {}
  try {
    parsed = JSON.parse(message.body || '{}')
  } catch {
    // ignore
  }

  const actorName = participantName(
    participants[message.sender_id],
    t,
    message.sender_id
  )
  const targetName =
    parsed.target_id !== undefined
      ? participantName(participants[parsed.target_id], t, parsed.target_id)
      : ''

  let text = ''
  switch (parsed.event) {
    case 'group_created':
      text = t('messages.system.groupCreated', {
        actor: actorName,
        name: parsed.name || '',
      })
      break
    case 'renamed':
      text = t('messages.system.renamed', {
        actor: actorName,
        name: parsed.new_name || '',
      })
      break
    case 'participant_added':
      text = t('messages.system.participantAdded', {
        actor: actorName,
        target: targetName,
      })
      break
    case 'participant_removed':
      text = t('messages.system.participantRemoved', {
        actor: actorName,
        target: targetName,
      })
      break
    case 'participant_left':
      text = t('messages.system.participantLeft', { actor: actorName })
      break
    case 'admin_auto_promoted':
      text = t('messages.system.adminAutoPromoted', { target: targetName })
      break
    case 'listing_offer_created':
      text = t('messages.system.listingOfferCreated', { actor: actorName })
      break
    case 'listing_offer_updated':
      text = t('messages.system.listingOfferUpdated', { actor: actorName })
      break
    case 'listing_offer_completed':
      text = t('messages.system.listingOfferCompleted', { actor: actorName })
      break
    case 'listing_offer_rejected':
      text = t('messages.system.listingOfferRejected', { actor: actorName })
      break
    case 'listing_offer_cancelled':
      text = t('messages.system.listingOfferCancelled', { actor: actorName })
      break
    default:
      text = parsed.event || ''
  }

  return (
    <div className="my-3 flex justify-center">
      <span className="rounded-full bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
        {text}
      </span>
    </div>
  )
}

function ThreadSkeleton() {
  // Alternating sides + varied widths to feel like a real conversation.
  const rows: { mine: boolean; w: string }[] = [
    { mine: false, w: 'w-64' },
    { mine: true, w: 'w-48' },
    { mine: false, w: 'w-72' },
    { mine: true, w: 'w-56' },
    { mine: false, w: 'w-40' },
  ]
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-2',
            r.mine ? 'justify-end' : 'justify-start'
          )}
        >
          {!r.mine && <Skeleton className="size-8 shrink-0 rounded-full" />}
          <Skeleton className={cn('h-10 max-w-full rounded-lg', r.w)} />
        </div>
      ))}
    </div>
  )
}

function conversationHeaderLabel(
  c: Conversation,
  dict: Record<number, ConversationParticipant>,
  meId: number,
  t: (k: string) => string
): string {
  if (c.kind === ConversationKindEnum.Listing) {
    return c.listing_title || c.name || t('messages.listingConversation')
  }
  // Groups are titled by their user-set name. DMs derive from participants.
  if (c.kind === 'group') {
    return c.name || t('messages.untitledGroup')
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
