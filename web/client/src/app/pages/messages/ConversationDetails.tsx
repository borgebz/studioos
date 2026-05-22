import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileText, Image as ImageIcon, Pin } from 'lucide-react'

import type { Conversation, Message } from '@/api/studioos-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'

import type { ConversationParticipant } from './types'

interface ConversationDetailsProps {
  conversation: Conversation
  messages: Message[]
  participants: Record<number, ConversationParticipant>
  meId: number
}

/** Sheet-only content. The wrapper (Sheet/SheetContent) is rendered by the
 *  caller — MessageThread opens it on header click. */
export function ConversationDetailsContent({
  conversation,
  messages,
  participants,
  meId,
}: ConversationDetailsProps) {
  const { t } = useTranslation()

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
        (m) => Boolean(m.file_url) && !m.deleted_at,
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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <SectionLabel>{t('messages.details.about')}</SectionLabel>
        <div className="mt-3 space-y-3">
          {otherParticipants.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <Avatar size="lg">
                {p.photoUrl && <AvatarImage src={p.photoUrl} alt={p.displayName} />}
                <AvatarFallback>{getInitials(p.displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  {p.displayName}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {p.email}
                </div>
              </div>
            </div>
          ))}
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
