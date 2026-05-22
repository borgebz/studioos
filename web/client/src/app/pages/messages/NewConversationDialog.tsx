import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { UserResponse } from '@/api/studioos-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (userId: number) => void | Promise<void>
  meId: number | null
}

/** Pick a user to start (or open) a direct conversation with.
 *  The picker queries the same `listUsers` endpoint the rest of the app uses,
 *  so role-based visibility (direction sees everyone, etc.) is inherited.
 *  No additional client-side filter is applied — when authorization for
 *  who-can-DM-whom lands, the backend gate will enforce it at create time. */
export function NewConversationDialog({
  open,
  onOpenChange,
  onPick,
  meId,
}: NewConversationDialogProps) {
  const { t } = useTranslation()
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const fetchSeq = useRef(0)
  // Skeleton only flashes on the initial open. Subsequent searches keep the
  // current list visible (slightly dimmed) while the new request is in
  // flight — feels much smoother than re-rendering an empty placeholder
  // between every keystroke.
  const hasLoadedOnce = useRef(false)

  // Debounce the search query so each keystroke doesn't fire a request.
  useEffect(() => {
    if (!open) return
    if (query === debouncedQuery) return
    const id = window.setTimeout(() => setDebouncedQuery(query), 250)
    return () => window.clearTimeout(id)
  }, [open, query, debouncedQuery])

  // Initial load + refresh on the debounced query.
  useEffect(() => {
    if (!open) return
    const seq = ++fetchSeq.current
    setLoading(true)
    apiClient.api
      .listUsers(
        {
          ...(debouncedQuery.trim() ? { search: debouncedQuery.trim() } : {}),
          page_size: 100,
        } as Parameters<typeof apiClient.api.listUsers>[0],
      )
      .then((res) => {
        if (seq !== fetchSeq.current) return
        setUsers(res.data.results)
        hasLoadedOnce.current = true
      })
      .catch(() => {
        if (seq !== fetchSeq.current) return
        // Keep previous results on error — don't blank the list out.
        if (!hasLoadedOnce.current) setUsers([])
      })
      .finally(() => {
        if (seq === fetchSeq.current) setLoading(false)
      })
  }, [open, debouncedQuery])

  // Reset state when closing so the next open is fresh.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebouncedQuery('')
      setSubmittingId(null)
      hasLoadedOnce.current = false
    }
  }, [open])

  const visibleUsers = useMemo(
    () => users.filter((u) => u.id !== meId),
    [users, meId],
  )

  async function handlePick(userId: number) {
    setSubmittingId(userId)
    try {
      await onPick(userId)
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{t('messages.newConversation.title')}</DialogTitle>
          <DialogDescription>
            {t('messages.newConversation.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoFocus
              type="search"
              // Suppress Safari/iOS autofill suggestions — this isn't an
              // email/username field. The non-standard names below are what
              // WebKit actually respects in practice.
              name="conversation-recipient-search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('messages.newConversation.searchPlaceholder')}
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-3 max-h-80 overflow-y-auto px-2 pb-4">
          {loading && !hasLoadedOnce.current ? (
            <UserListSkeleton />
          ) : visibleUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('messages.newConversation.empty')}
            </div>
          ) : (
            <ul
              className={cn(
                'flex flex-col transition-opacity duration-150',
                loading && 'opacity-60',
              )}
              aria-busy={loading}
            >
              {visibleUsers.map((u) => {
                const name = u.display_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email
                const submitting = submittingId === u.id
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(u.id)}
                      disabled={submitting || submittingId !== null}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left transition-colors',
                        'hover:bg-accent disabled:opacity-60',
                      )}
                    >
                      <Avatar size="default">
                        {u.photo_url && <AvatarImage src={u.photo_url} alt={name} />}
                        <AvatarFallback>{getInitials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {u.email}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UserListSkeleton() {
  return (
    <ul className="flex flex-col">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36 max-w-full" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
        </li>
      ))}
    </ul>
  )
}
