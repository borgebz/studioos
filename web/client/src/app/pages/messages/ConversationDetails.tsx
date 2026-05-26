import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  FileText,
  Image as ImageIcon,
  LogOut,
  Pencil,
  Pin,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import type {
  Conversation,
  Message,
  PublicProfile,
} from '@/api/studioos-api'
import { ConversationKindEnum } from '@/api/studioos-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'

import { participantName, type ConversationParticipant } from './types'

interface ConversationDetailsProps {
  conversation: Conversation
  messages: Message[]
  participants: Record<number, ConversationParticipant>
  meId: number
  /** Pulls conversations from the parent after a mutation. Lets us reflect
   *  rename / add / remove without waiting for the WS to round-trip. */
  onRefreshConversation?: () => void | Promise<void>
  /** Called after the user leaves a conversation so the parent can drop it
   *  from the active state. */
  onAfterLeave?: () => void
}

/** Sheet-only content. The wrapper (Sheet/SheetContent) is rendered by the
 *  caller — MessageThread opens it on header click. */
export function ConversationDetailsContent({
  conversation,
  messages,
  participants,
  meId,
  onRefreshConversation,
  onAfterLeave,
}: ConversationDetailsProps) {
  const { t } = useTranslation()

  const isGroup = conversation.kind === ConversationKindEnum.Group
  const isAdmin = Boolean(conversation.is_admin)

  const otherParticipants = useMemo(
    () =>
      conversation.participant_ids
        .filter((id) => id !== meId)
        .map((id) => participants[id])
        .filter((p): p is ConversationParticipant => Boolean(p)),
    [conversation.participant_ids, meId, participants],
  )

  const files = useMemo(
    () =>
      messages.filter(
        (m) => Boolean(m.file_url) && !m.deleted_at && m.kind !== 'system',
      ),
    [messages],
  )

  const pinned = useMemo(
    () =>
      conversation.pinned_message_ids
        .map((id) => messages.find((m) => m.id === id))
        .filter((m): m is Message => Boolean(m) && !m!.deleted_at),
    [conversation.pinned_message_ids, messages],
  )

  const [renaming, setRenaming] = useState(false)
  const [pendingName, setPendingName] = useState(conversation.name || '')
  const [adding, setAdding] = useState(false)

  async function handleRename() {
    const next = pendingName.trim()
    if (!next || next === conversation.name) {
      setRenaming(false)
      return
    }
    try {
      await apiClient.api.messagingConversationsPartialUpdate(conversation.id, {
        name: next,
      })
      setRenaming(false)
      await onRefreshConversation?.()
    } catch {
      toast.error(t('messages.errors.renameFailed'))
    }
  }

  async function handleRemove(userId: number) {
    try {
      await apiClient.api.messagingConversationsParticipantsDestroy(
        conversation.id,
        userId,
      )
      await onRefreshConversation?.()
    } catch {
      toast.error(t('messages.errors.removeMemberFailed'))
    }
  }

  async function handleLeave() {
    try {
      await apiClient.api.messagingConversationsLeaveCreate(conversation.id)
      onAfterLeave?.()
    } catch {
      toast.error(t('messages.errors.leaveFailed'))
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
      {isGroup && (
        <>
          <SectionLabel>{t('messages.details.groupName')}</SectionLabel>
          <div className="mt-2">
            {renaming ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={pendingName}
                  maxLength={120}
                  onChange={(e) => setPendingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleRename()
                    if (e.key === 'Escape') {
                      setPendingName(conversation.name || '')
                      setRenaming(false)
                    }
                  }}
                />
                <Button size="sm" onClick={() => void handleRename()}>
                  {t('messages.saveEdit')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {conversation.name || t('messages.untitledGroup')}
                </span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    onClick={() => {
                      setPendingName(conversation.name || '')
                      setRenaming(true)
                    }}
                    aria-label={t('messages.details.rename')}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator className="my-5" />
        </>
      )}

      <div className="flex items-center justify-between">
        <SectionLabel>
          {isGroup
            ? t('messages.details.membersCount', {
                count: conversation.participant_ids.length,
              })
            : t('messages.details.about')}
        </SectionLabel>
        {isGroup && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={() => setAdding(true)}
            aria-label={t('messages.details.addMember')}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>

      {adding && isGroup && (
        <AddMemberPicker
          conversation={conversation}
          onDone={async () => {
            setAdding(false)
            await onRefreshConversation?.()
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="mt-3 space-y-3">
        {otherParticipants.map((p) => {
          const name = participantName(p, t, p.id)
          return (
            <div key={p.id} className="flex items-center gap-3">
              <Avatar size="default">
                {p.photoUrl && <AvatarImage src={p.photoUrl} alt={name} />}
                <AvatarFallback>{getInitials(name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {name}
                </div>
                {!p.hasProfile && (
                  <div className="truncate text-xs text-muted-foreground">
                    {t('messages.noProfileYet')}
                  </div>
                )}
              </div>
              {isGroup && isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  onClick={() => void handleRemove(p.id)}
                  aria-label={t('messages.details.removeMember')}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {pinned.length > 0 && (
        <>
          <Separator className="my-5" />
          <SectionLabel>
            {t('messages.details.pinnedCount', { count: pinned.length })}
          </SectionLabel>
          <div className="mt-3 space-y-2">
            {pinned.map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-2 rounded-md border border-border bg-background p-2.5 text-xs"
              >
                <Pin
                  aria-hidden="true"
                  className="size-3 shrink-0 text-muted-foreground mt-0.5"
                />
                <p className="line-clamp-3 text-foreground/80">
                  {m.body || m.original_filename || t('messages.attachment')}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {files.length > 0 && (
        <>
          <Separator className="my-5" />
          <SectionLabel>
            {t('messages.details.filesCount', { count: files.length })}
          </SectionLabel>
          <div className="mt-3 space-y-2">
            {files.map((m) => (
              <FileChip key={m.id} message={m} />
            ))}
          </div>
        </>
      )}

      {isGroup && (
        <>
          <Separator className="my-5" />
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => void handleLeave()}
          >
            <LogOut className="size-4" />
            {t('messages.details.leave')}
          </Button>
        </>
      )}
    </div>
  )
}

function AddMemberPicker({
  conversation,
  onDone,
  onCancel,
}: {
  conversation: Conversation
  onDone: () => void | Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(false)

  // Debounce + load.
  useMemo(() => {
    const id = window.setTimeout(() => {
      setLoading(true)
      apiClient.api
        .accountsProfilesRetrieve(
          query.trim() ? { search: query.trim() } : undefined,
        )
        .then((res) => setResults(res.data.results))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => window.clearTimeout(id)
  }, [query])

  const existing = useMemo(
    () => new Set(conversation.participant_ids),
    [conversation.participant_ids],
  )
  const candidates = results.filter((p) => !existing.has(p.user_id))

  async function add(userId: number) {
    try {
      await apiClient.api.messagingConversationsParticipantsCreate(
        conversation.id,
        { user_ids: [userId] },
      )
      await onDone()
    } catch {
      toast.error(t('messages.errors.addMemberFailed'))
    }
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-background p-2.5">
      <div className="flex items-center gap-2">
        <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('messages.newConversation.searchPlaceholder')}
          autoComplete="off"
          spellCheck={false}
          className="h-8 flex-1"
        />
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
      <div className="mt-2 max-h-44 overflow-y-auto">
        {loading ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">…</p>
        ) : candidates.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            {t('messages.newConversation.empty')}
          </p>
        ) : (
          <ul className="flex flex-col">
            {candidates.map((p) => (
              <li key={p.user_id}>
                <button
                  type="button"
                  onClick={() => void add(p.user_id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                >
                  <Avatar size="sm">
                    {p.photo_url && (
                      <AvatarImage src={p.photo_url} alt={p.display_name} />
                    )}
                    <AvatarFallback>
                      {getInitials(p.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs font-medium text-foreground">
                    {p.display_name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium text-muted-foreground">
      {children}
    </div>
  )
}

function FileChip({ message }: { message: Message }) {
  const isImage = (message.mime_type || '').startsWith('image/')
  const Icon = isImage ? ImageIcon : FileText
  return (
    <a
      href={message.file_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-xs',
        'transition-colors hover:bg-accent',
      )}
    >
      <Icon
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <span className="truncate text-foreground">
        {message.original_filename || message.file_url}
      </span>
      <Download
        aria-hidden="true"
        className="ml-auto size-3.5 shrink-0 text-muted-foreground"
      />
    </a>
  )
}
