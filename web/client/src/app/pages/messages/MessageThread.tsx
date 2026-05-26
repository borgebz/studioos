import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { pt } from 'date-fns/locale/pt'
import {
  Download,
  Eye,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Send,
  SmilePlus,
  Trash2,
  Users,
  X,
} from 'lucide-react'

import type { Conversation, Message } from '@/api/studioos-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'

import { participantName, type ConversationParticipant } from './types'

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
}: MessageThreadProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [draft, setDraft] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingBody, setEditingBody] = useState('')

  // auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, conversation.id])

  // ── header label ────────────────────────────────────────────────────────
  const others = conversation.participant_ids.filter((id) => id !== meId)
  const primary = others[0] !== undefined ? participants[others[0]] : null
  const headerLabel = conversationHeaderLabel(
    conversation,
    participants,
    meId,
    t,
  )
  // Subtitle: group member count for groups; nothing for DMs since the
  // name in the header already says everything (the email used to live
  // here, but it's not exposed to non-admin users anymore).
  const headerSub = others.length > 1
    ? t('messages.groupParticipantCount', { count: conversation.participant_ids.length })
    : ''

  // ── pinned messages (resolved) ──────────────────────────────────────────
  const pinnedMessages = useMemo(
    () =>
      conversation.pinned_message_ids
        .map((id) => messages.find((m) => m.id === id))
        .filter((m): m is Message => Boolean(m) && !m!.deleted_at),
    [conversation.pinned_message_ids, messages],
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
    <>
      {/* Header — click toggles in-grid details panel */}
      <button
        type="button"
        onClick={onToggleDetails}
        className={cn(
          'flex shrink-0 items-center gap-3 border-b border-border px-6 py-4 text-left transition-colors hover:bg-accent/40',
          detailsOpen && 'bg-accent/30',
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

      {/* Pinned bar */}
      {pinnedMessages.length > 0 && (
        <div className="shrink-0 border-b border-border bg-accent/40 px-7 py-2.5">
          <div className="mx-auto flex max-w-[680px] items-center gap-2 text-xs">
            <Pin className="size-3 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium text-muted-foreground">
              {t('messages.pinnedCount', { count: pinnedMessages.length })}
            </span>
            <span className="truncate text-foreground/80">
              · {pinnedMessages[0].body ||
                pinnedMessages[0].original_filename ||
                t('messages.attachment')}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="relative flex-1 min-h-0 overflow-y-auto bg-muted/40 px-6 py-5">
        {loading ? (
          <ThreadSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              {t('messages.empty.noMessages')}
            </p>
          </div>
        ) : (
          <div>
            {groupedMessages.map((group) => (
            <div key={group.key}>
              <div className="my-6 text-center text-xs font-medium text-muted-foreground">
                {group.day}
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
                const next = i < group.items.length - 1 ? group.items[i + 1] : null
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
                    isLastOfRun={isLastOfRun}
                    isLastOverall={isLastOverall}
                    timeLabel={(iso) =>
                      format(new Date(iso), timeFormat, { locale: timeLocale })
                    }
                  />
                )
              })}
            </div>
            ))}
          </div>
        )}
      </div>

      {/* Typing indicator (only when *others* are typing) */}
      {typingUserIds.length > 0 && (
        <div className="shrink-0 border-t border-border bg-card px-7 pt-2">
          <TypingIndicator
            userIds={typingUserIds}
            participants={participants}
          />
        </div>
      )}

      {/* Composer */}
      <div
        className={cn(
          'shrink-0 border-border bg-card px-7 py-4',
          typingUserIds.length === 0 && 'border-t',
        )}
      >
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
    </>
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
  timeLabel,
}: BubbleProps) {
  const { t } = useTranslation()
  const deleted = Boolean(message.deleted_at)
  const senderName = participantName(sender, t, message.sender_id)

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
          mine ? 'justify-end' : 'justify-start',
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
            mine ? 'flex-row-reverse' : 'flex-row',
          )}
        >
          <div
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm leading-relaxed shadow-sm',
              mine
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-card-foreground',
              deleted && 'italic text-muted-foreground border border-dashed bg-muted text-muted-foreground',
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
                  <div className="whitespace-pre-wrap break-words">{message.body}</div>
                )}
                {message.file_url && (
                  isImageAttachment(message) ? (
                    <a
                      href={message.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'block overflow-hidden rounded-md',
                        message.body ? 'mt-2' : '',
                        '-mx-1 -mb-0.5 max-w-xs',
                      )}
                      aria-label={message.original_filename || t('messages.attachment')}
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
                          : 'border-border bg-muted text-foreground',
                      )}
                    >
                      <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{message.original_filename || t('messages.attachment')}</span>
                      <Download className="ml-auto size-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  )
                )}
              </>
            )}
          </div>

          {!deleted && !isEditing && (
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
            mine ? 'justify-end' : 'ml-10 justify-start',
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
                  : 'border-border bg-card text-muted-foreground hover:bg-accent',
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
            mine ? 'flex-row-reverse' : 'ml-10 flex-row',
          )}
        >
          <span>{timeLabel(message.created_at)}</span>
          {message.edited_at && !deleted && <span>· {t('messages.edited')}</span>}
          {isPinned && !deleted && (
            <span className="flex items-center gap-0.5">
              · <Pin className="size-2.5" aria-hidden="true" /> {t('messages.pinned')}
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
        // absolutely positioned so the actions don't reserve layout space
        // when not hovered — keeps mine bubbles hugging the right edge.
        'absolute top-1/2 z-10 -translate-y-1/2 flex shrink-0 items-center gap-0.5 rounded-md bg-card/95 px-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100',
        mine ? 'right-full mr-1' : 'left-full ml-1',
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
        <DropdownMenuContent align={mine ? 'end' : 'start'} className="flex gap-0.5 p-1">
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
              <TooltipContent side="top">{t(`messages.reactions.${key}`)}</TooltipContent>
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

function TypingIndicator({
  userIds,
  participants,
}: {
  userIds: number[]
  participants: Record<number, ConversationParticipant>
}) {
  const { t } = useTranslation()
  // Resolve names: prefer first name. Show up to 3, summarize the rest.
  const names = userIds.map((id) => {
    const name = participantName(participants[id], t, id)
    return name.split(' ')[0]
  })
  let label: string
  if (names.length === 1) {
    label = t('messages.typing.one', { name: names[0] })
  } else if (names.length === 2) {
    label = t('messages.typing.two', { a: names[0], b: names[1] })
  } else {
    label = t('messages.typing.many', { count: names.length })
  }
  return (
    <div
      className="mx-auto flex max-w-[680px] items-center gap-2 text-[11.5px] text-muted-foreground"
      aria-live="polite"
    >
      <span className="inline-flex items-end gap-0.5 leading-none">
        <span className="size-1 rounded-full bg-muted-foreground/70 animate-typing-dot [animation-delay:0ms]" />
        <span className="size-1 rounded-full bg-muted-foreground/70 animate-typing-dot [animation-delay:120ms]" />
        <span className="size-1 rounded-full bg-muted-foreground/70 animate-typing-dot [animation-delay:240ms]" />
      </span>
      <span>{label}</span>
    </div>
  )
}

function Composer({
  value,
  hasFile,
  onChange,
  onBlur,
  onFilePick,
  onSubmit,
}: {
  value: string
  hasFile: boolean
  onChange: (v: string) => void
  onBlur?: () => void
  onFilePick: (f: File | null) => void
  onSubmit: () => Promise<void> | void
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void onSubmit()
    }
  }

  return (
    <div className="flex items-end gap-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => onFilePick(e.target.files?.[0] ?? null)}
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 text-muted-foreground"
        onClick={() => fileInputRef.current?.click()}
        aria-label={t('messages.attachFile')}
      >
        <Paperclip className="size-4" />
      </Button>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={handleKey}
        placeholder={t('messages.composerPlaceholder')}
        rows={1}
        className="min-h-[40px] max-h-32 flex-1 resize-none"
      />
      <Button
        type="button"
        onClick={() => void onSubmit()}
        disabled={!value.trim() && !hasFile}
        size="icon"
        className="size-9 shrink-0"
        aria-label={t('messages.send')}
      >
        <Send className="size-4" />
      </Button>
    </div>
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
  let parsed: { event?: string; target_id?: number; name?: string; old_name?: string; new_name?: string } = {}
  try {
    parsed = JSON.parse(message.body || '{}')
  } catch {
    // ignore
  }

  const actorName = participantName(participants[message.sender_id], t, message.sender_id)
  const targetName =
    parsed.target_id !== undefined
      ? participantName(participants[parsed.target_id], t, parsed.target_id)
      : ''

  let text = ''
  switch (parsed.event) {
    case 'group_created':
      text = t('messages.system.groupCreated', { actor: actorName, name: parsed.name || '' })
      break
    case 'renamed':
      text = t('messages.system.renamed', { actor: actorName, name: parsed.new_name || '' })
      break
    case 'participant_added':
      text = t('messages.system.participantAdded', { actor: actorName, target: targetName })
      break
    case 'participant_removed':
      text = t('messages.system.participantRemoved', { actor: actorName, target: targetName })
      break
    case 'participant_left':
      text = t('messages.system.participantLeft', { actor: actorName })
      break
    case 'admin_auto_promoted':
      text = t('messages.system.adminAutoPromoted', { target: targetName })
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
            r.mine ? 'justify-end' : 'justify-start',
          )}
        >
          {!r.mine && <Skeleton className="size-8 shrink-0 rounded-full" />}
          <Skeleton
            className={cn('h-10 max-w-full rounded-lg', r.w)}
          />
        </div>
      ))}
    </div>
  )
}

function conversationHeaderLabel(
  c: Conversation,
  dict: Record<number, ConversationParticipant>,
  meId: number,
  t: (k: string) => string,
): string {
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

