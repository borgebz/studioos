import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Search, Users, X } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { PublicProfile } from '@/api/studioos-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPickDirect: (userId: number) => void | Promise<void>
  onCreateGroup: (name: string, userIds: number[]) => void | Promise<void>
  meId: number | null
}

type Mode = 'direct' | 'group'

/** Pick a user (DM) or build a group conversation.
 *  Uses /api/accounts/profiles/ for discovery — profile existence is the
 *  user's opt-in to messaging, no permission gate. */
export function NewConversationDialog({
  open,
  onOpenChange,
  onPickDirect,
  onCreateGroup,
  meId,
}: NewConversationDialogProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('direct')
  const [profiles, setProfiles] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  // DM submit state — single-select pending request.
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  // Group state — selection + name + submit lock.
  const [selected, setSelected] = useState<PublicProfile[]>([])
  const [groupName, setGroupName] = useState('')
  const [submittingGroup, setSubmittingGroup] = useState(false)
  const fetchSeq = useRef(0)
  // Skeleton flashes only on the first open; subsequent searches keep the
  // existing list visible while refreshing in place.
  const hasLoadedOnce = useRef(false)

  // Debounce the search query so each keystroke doesn't fire a request.
  useEffect(() => {
    if (!open) return
    if (query === debouncedQuery) return
    const id = window.setTimeout(() => setDebouncedQuery(query), 250)
    return () => window.clearTimeout(id)
  }, [open, query, debouncedQuery])

  useEffect(() => {
    if (!open) return
    const seq = ++fetchSeq.current
    setLoading(true)
    apiClient.api
      .accountsProfilesRetrieve(
        debouncedQuery.trim() ? { search: debouncedQuery.trim() } : undefined
      )
      .then((res) => {
        if (seq !== fetchSeq.current) return
        setProfiles(res.data.results)
        hasLoadedOnce.current = true
      })
      .catch(() => {
        if (seq !== fetchSeq.current) return
        if (!hasLoadedOnce.current) setProfiles([])
      })
      .finally(() => {
        if (seq === fetchSeq.current) setLoading(false)
      })
  }, [open, debouncedQuery])

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setMode('direct')
      setQuery('')
      setDebouncedQuery('')
      setSubmittingId(null)
      setSelected([])
      setGroupName('')
      setSubmittingGroup(false)
      hasLoadedOnce.current = false
    }
  }, [open])

  const visibleProfiles = useMemo(
    () => profiles.filter((p) => p.user_id !== meId),
    [profiles, meId]
  )

  const selectedIds = useMemo(
    () => new Set(selected.map((p) => p.user_id)),
    [selected]
  )

  async function handlePickDirect(userId: number) {
    setSubmittingId(userId)
    try {
      await onPickDirect(userId)
    } finally {
      setSubmittingId(null)
    }
  }

  function toggleSelected(p: PublicProfile) {
    setSelected((prev) =>
      prev.some((x) => x.user_id === p.user_id)
        ? prev.filter((x) => x.user_id !== p.user_id)
        : [...prev, p]
    )
  }

  // Min 3 members = creator + 2 others. UI counts only the picked "others".
  const GROUP_OTHERS_MIN = 2
  const canSubmitGroup =
    groupName.trim().length > 0 &&
    selected.length >= GROUP_OTHERS_MIN &&
    !submittingGroup

  async function handleCreateGroup() {
    if (!canSubmitGroup) return
    setSubmittingGroup(true)
    try {
      await onCreateGroup(
        groupName.trim(),
        selected.map((p) => p.user_id)
      )
    } finally {
      setSubmittingGroup(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {mode === 'group'
              ? t('messages.newConversation.titleGroup')
              : t('messages.newConversation.title')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'group'
              ? t('messages.newConversation.descriptionGroup')
              : t('messages.newConversation.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct">
                {t('messages.newConversation.tabs.direct')}
              </TabsTrigger>
              <TabsTrigger value="group">
                <Users className="size-3.5" aria-hidden="true" />
                {t('messages.newConversation.tabs.group')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {mode === 'group' && (
          <div className="mt-4 px-6">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('messages.newConversation.namePlaceholder')}
              autoComplete="off"
              spellCheck={false}
              maxLength={120}
              aria-label={t('messages.newConversation.namePlaceholder')}
            />
            {selected.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selected.map((p) => (
                  <button
                    key={p.user_id}
                    type="button"
                    onClick={() => toggleSelected(p)}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground transition-colors hover:bg-accent/80"
                  >
                    {p.display_name}
                    <X className="size-3" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-6 pt-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
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

        <div className="mt-3 max-h-72 overflow-y-auto px-2 pb-2">
          {loading && !hasLoadedOnce.current ? (
            <UserListSkeleton />
          ) : visibleProfiles.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('messages.newConversation.empty')}
            </div>
          ) : (
            <ul
              className={cn(
                'flex flex-col transition-opacity duration-150',
                loading && 'opacity-60'
              )}
              aria-busy={loading}
            >
              {visibleProfiles.map((p) => {
                const submitting =
                  mode === 'direct' && submittingId === p.user_id
                const isSelected = selectedIds.has(p.user_id)
                return (
                  <li key={p.user_id}>
                    <button
                      type="button"
                      onClick={() =>
                        mode === 'direct'
                          ? handlePickDirect(p.user_id)
                          : toggleSelected(p)
                      }
                      disabled={
                        (mode === 'direct' && submittingId !== null) ||
                        submitting ||
                        submittingGroup
                      }
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left transition-colors',
                        'hover:bg-accent disabled:opacity-60',
                        mode === 'group' && isSelected && 'bg-accent'
                      )}
                    >
                      <Avatar size="default">
                        {p.photo_url && (
                          <AvatarImage src={p.photo_url} alt={p.display_name} />
                        )}
                        <AvatarFallback>
                          {getInitials(p.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {p.display_name}
                        </div>
                      </div>
                      {mode === 'group' && isSelected && (
                        <Check
                          className="size-4 text-primary"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {mode === 'group' && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3">
            <span className="text-xs text-muted-foreground">
              {t('messages.newConversation.selectionHint', {
                count: selected.length,
                min: GROUP_OTHERS_MIN,
              })}
            </span>
            <Button
              type="button"
              disabled={!canSubmitGroup}
              onClick={() => void handleCreateGroup()}
            >
              {t('messages.newConversation.createGroup')}
            </Button>
          </div>
        )}
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
