import type { Conversation } from '@/api/studioos-api'
import { ConversationKindEnum } from '@/api/studioos-api'
import { Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'

import { participantName, type ConversationParticipant } from './types'
import { useTranslation } from 'react-i18next'

interface ConversationListProps {
  conversations: Conversation[]
  activeId: number | null
  participants: Record<number, ConversationParticipant>
  meId: number | null
  onSelect: (id: number) => void
  lastTimeLabel: (iso: string) => string
  /** Per-conversation unread count keyed by stringified conversation id. */
  unreadByConversation?: Record<string, number>
}

export function ConversationList({
  conversations,
  activeId,
  participants,
  meId,
  onSelect,
  lastTimeLabel,
  unreadByConversation,
}: ConversationListProps) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col">
      {conversations.map((c) => {
        const isActive = c.id === activeId
        const others = c.participant_ids.filter((id) => id !== meId)
        const primary = others[0] !== undefined ? participants[others[0]] : null
        const label = formatLabel(c, participants, meId, t)
        const preview = formatPreview(c, participants, meId, t)
        const unread = unreadByConversation?.[String(c.id)] ?? 0
        const hasUnread = unread > 0 && !isActive
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                'group relative grid w-full grid-cols-[auto_1fr_auto] items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/40',
              )}
              aria-current={isActive ? 'true' : undefined}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-primary"
                />
              )}
              {c.kind === ConversationKindEnum.Group ? (
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                >
                  <Users className="size-4" />
                </span>
              ) : (
                <Avatar size="default">
                  {primary?.photoUrl && (
                    <AvatarImage src={primary.photoUrl} alt={label} />
                  )}
                  <AvatarFallback>{getInitials(label)}</AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex flex-col gap-0.5">
                <span
                  className={cn(
                    'truncate text-sm text-foreground',
                    hasUnread ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    'truncate text-xs',
                    hasUnread
                      ? 'font-medium text-foreground/80'
                      : 'text-muted-foreground',
                  )}
                >
                  {preview}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={cn(
                    'text-[11px]',
                    hasUnread ? 'font-medium text-primary' : 'text-muted-foreground',
                  )}
                >
                  {lastTimeLabel(c.updated_at)}
                </span>
                {hasUnread && (
                  <span
                    className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground"
                    aria-label={`${unread} unread`}
                  >
                    {unread > 99 ? '+99' : unread}
                  </span>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function formatLabel(
  c: Conversation,
  dict: Record<number, ConversationParticipant>,
  meId: number | null,
  t: (k: string) => string,
): string {
  // Groups are titled by the user-set name; fall back to a placeholder only
  // when somehow blank.
  if (c.kind === ConversationKindEnum.Group) {
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

function formatPreview(
  c: Conversation,
  dict: Record<number, ConversationParticipant>,
  meId: number | null,
  t: (k: string) => string,
): string {
  const m = c.last_message
  if (!m) return t('messages.noMessagesYet')
  if (m.deleted_at) return t('messages.deletedPreview')

  // System messages carry a JSON event payload — never dump that raw into
  // the inbox preview. Render a short localized hint, prefixed with the
  // actor's first name so it still reads like activity.
  if (m.kind === 'system') {
    return formatSystemPreview(m.body, m.sender_id, dict, meId, t)
  }

  const senderName =
    m.sender_id === meId
      ? t('messages.youPrefix')
      : participantName(dict[m.sender_id], t, m.sender_id).split(' ')[0]
  const body = m.body || (m.original_filename ? `📎 ${m.original_filename}` : '')
  return senderName ? `${senderName}: ${body}` : body
}

function formatSystemPreview(
  body: string,
  senderId: number,
  dict: Record<number, ConversationParticipant>,
  meId: number | null,
  t: (k: string) => string,
): string {
  let parsed: { event?: string } = {}
  try {
    parsed = JSON.parse(body || '{}')
  } catch {
    return t('messages.systemPreview.update')
  }
  const actor =
    senderId === meId
      ? t('messages.youPrefix')
      : participantName(dict[senderId], t, senderId).split(' ')[0]
  // Short, name-light hints — the in-thread system bubble has the full
  // localized version. The conversation list just needs enough context.
  const key = `messages.systemPreview.${parsed.event ?? 'update'}`
  const hint = t(key)
  // If translation is missing, i18next returns the key back — fall back to
  // a generic verb.
  const fallback = hint === key ? t('messages.systemPreview.update') : hint
  return `${actor} · ${fallback}`
}
