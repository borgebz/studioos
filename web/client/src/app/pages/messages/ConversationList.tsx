import type { Conversation } from '@/api/studioos-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'

import type { ConversationParticipant } from './types'
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
              <Avatar size="default">
                {primary?.photoUrl && (
                  <AvatarImage src={primary.photoUrl} alt={label} />
                )}
                <AvatarFallback>{getInitials(label)}</AvatarFallback>
              </Avatar>
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
  const others = c.participant_ids.filter((id) => id !== meId)
  if (others.length === 0) return t('messages.selfConversation')
  if (others.length === 1) {
    const p = dict[others[0]]
    return p?.displayName ?? `User #${others[0]}`
  }
  const names = others
    .slice(0, 3)
    .map((id) => dict[id]?.displayName?.split(' ')[0] ?? `#${id}`)
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
  const senderName =
    m.sender_id === meId
      ? t('messages.youPrefix')
      : dict[m.sender_id]?.displayName?.split(' ')[0] ?? ''
  const body = m.body || (m.original_filename ? `📎 ${m.original_filename}` : '')
  return senderName ? `${senderName}: ${body}` : body
}
