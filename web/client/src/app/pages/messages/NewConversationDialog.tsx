import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Search, X } from 'lucide-react'

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPickDirect: (userId: number) => void | Promise<void>
  onCreateGroup: (name: string, userIds: number[]) => void | Promise<void>
  meId: number | null
}

/** Unified picker: select one person for a DM, or two+ for a group (a name
 *  field appears once the second person is added). Replaces the previous
 *  Direct/Group tabs — the mode emerges from the selection instead of
 *  being a separate UI segment to navigate. */
export function NewConversationDialog({
  open,
  onOpenChange,
  onPickDirect,
  onCreateGroup,
  meId,
}: NewConversationDialogProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const [profiles, setProfiles] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selected, setSelected] = useState<PublicProfile[]>([])
  const [groupName, setGroupName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fetchSeq = useRef(0)
  const hasLoadedOnce = useRef(false)

  const isGroup = selected.length >= 2

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
      setQuery('')
      setDebouncedQuery('')
      setSelected([])
      setGroupName('')
      setSubmitting(false)
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

  function toggleSelected(p: PublicProfile) {
    setSelected((prev) =>
      prev.some((x) => x.user_id === p.user_id)
        ? prev.filter((x) => x.user_id !== p.user_id)
        : [...prev, p]
    )
  }

  const canSubmit =
    !submitting &&
    selected.length >= 1 &&
    (selected.length === 1 || groupName.trim().length > 0)

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      if (isGroup) {
        await onCreateGroup(
          groupName.trim(),
          selected.map((p) => p.user_id)
        )
      } else {
        await onPickDirect(selected[0].user_id)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const description = isGroup
    ? t('messages.newConversation.descriptionGroup')
    : t('messages.newConversation.description')

  // ── shared body ──────────────────────────────────────────────────────────
  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Selected chips + search field live in a single composing block at
       *  the top — no tab strip, no mode switcher. The chips are the
       *  "to:" line; the input completes it. */}
      <div className="border-b border-border px-4 pt-3 pb-3 sm:px-5">
        <label className="text-[11px] font-medium text-muted-foreground">
          {t('messages.newConversation.toLabel')}
        </label>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {selected.map((p) => (
            <span
              key={p.user_id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-1 pr-2 text-xs font-medium text-foreground"
            >
              <Avatar size="sm" className="size-5">
                {p.photo_url && (
                  <AvatarImage src={p.photo_url} alt={p.display_name} />
                )}
                <AvatarFallback className="text-[9px]">
                  {getInitials(p.display_name)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate">{p.display_name}</span>
              <button
                type="button"
                onClick={() => toggleSelected(p)}
                aria-label={t('messages.newConversation.removeChip', {
                  name: p.display_name,
                })}
                className="-mr-0.5 inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <div className="relative min-w-[140px] flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
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
              placeholder={
                selected.length === 0
                  ? t('messages.newConversation.searchPlaceholder')
                  : t('messages.newConversation.addAnother')
              }
              className="h-8 border-0 bg-transparent px-7 shadow-none focus-visible:ring-0"
              aria-label={t('messages.newConversation.searchPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Group name field appears only when the picker becomes a group. */}
      {isGroup && (
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <label className="text-[11px] font-medium text-muted-foreground">
            {t('messages.newConversation.groupNameLabel')}
          </label>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t('messages.newConversation.namePlaceholder')}
            autoComplete="off"
            spellCheck={false}
            maxLength={120}
            className="mt-1.5"
            aria-label={t('messages.newConversation.namePlaceholder')}
          />
        </div>
      )}

      {/* Results list. Each row is a multi-select toggle — the user
       *  doesn't have to declare "DM" vs "Group" up front; the selection
       *  decides. */}
      <div className="flex-1 min-h-0 overflow-y-auto sm:max-h-72">
        {loading && !hasLoadedOnce.current ? (
          <UserListSkeleton />
        ) : visibleProfiles.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t('messages.newConversation.empty')}
          </div>
        ) : (
          <ul
            className={cn(
              'flex flex-col py-1 transition-opacity duration-150',
              loading && 'opacity-60'
            )}
            aria-busy={loading}
          >
            {visibleProfiles.map((p) => {
              const isSelected = selectedIds.has(p.user_id)
              return (
                <li key={p.user_id}>
                  <button
                    type="button"
                    onClick={() => toggleSelected(p)}
                    disabled={submitting}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors sm:px-5',
                      'hover:bg-muted/50 disabled:opacity-60',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    <Avatar size="default" className="size-9">
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
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-transparent'
                      )}
                    >
                      {isSelected && <Check className="size-3" />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Sticky action footer — primary button is contextual: "Start chat"
       *  for one person, "Create group" once a second person is added. */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <span className="text-xs text-muted-foreground">
          {selected.length === 0
            ? t('messages.newConversation.selectionHintEmpty')
            : t('messages.newConversation.selectionHint', {
                count: selected.length,
              })}
        </span>
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {isGroup
            ? t('messages.newConversation.createGroup')
            : t('messages.newConversation.startChat')}
        </Button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex h-[92dvh] flex-col gap-0 rounded-t-2xl border-t bg-background p-0"
        >
          {/* Drag handle — visual cue that this is a bottom sheet. */}
          <div className="flex shrink-0 justify-center pt-2.5 pb-1">
            <span
              aria-hidden="true"
              className="h-1 w-9 rounded-full bg-muted-foreground/30"
            />
          </div>
          <SheetHeader className="shrink-0 gap-1 px-5 pt-2 pb-3 text-left">
            <SheetTitle className="text-base font-semibold tracking-tight">
              {isGroup
                ? t('messages.newConversation.titleGroup')
                : t('messages.newConversation.title')}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {description}
            </SheetDescription>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 gap-1 px-5 pt-5 pb-3 text-left">
          <DialogTitle>
            {isGroup
              ? t('messages.newConversation.titleGroup')
              : t('messages.newConversation.title')}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}

function UserListSkeleton() {
  return (
    <ul className="flex flex-col py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36 max-w-full" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
        </li>
      ))}
    </ul>
  )
}
