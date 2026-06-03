import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { Classe } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface ManageClassesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** IDs already selected when the sheet opens. */
  initialSelected: number[]
  /** Called with the final selection when the user clicks Done. */
  onApply: (classeIds: number[]) => void
}

/**
 * Sheet-based class picker for event audience targeting.
 *
 * Loads the classes list lazily on first open, persists a draft selection
 * while the user toggles checkboxes, and only commits the change via
 * `onApply` when the user clicks Done. Cancel / Escape / clicking outside
 * dismisses without applying — `initialSelected` is always the source of
 * truth when re-opening.
 */
export function ManageClassesSheet({
  open,
  onOpenChange,
  initialSelected,
  onApply,
}: ManageClassesSheetProps) {
  const { t } = useTranslation()
  const [classes, setClasses] = useState<Classe[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Set<number>>(new Set())

  // Reset draft to initialSelected each time the sheet opens — Cancel reverts
  // to the canonical selection.
  useEffect(() => {
    if (open) {
      setDraft(new Set(initialSelected))
      setQuery('')
    }
  }, [open, initialSelected])

  // Lazy-load classes on first open. Cached afterward.
  useEffect(() => {
    if (!open || classes !== null || loading) return
    setLoading(true)
    void apiClient.api
      .classesList()
      .then((r) => {
        const data = r.data as unknown
        if (Array.isArray(data)) setClasses(data as Classe[])
        else if (
          data &&
          typeof data === 'object' &&
          'results' in (data as Record<string, unknown>) &&
          Array.isArray((data as { results?: unknown }).results)
        ) {
          setClasses((data as { results: Classe[] }).results)
        } else {
          setClasses([])
        }
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false))
  }, [open, classes, loading])

  const filtered = useMemo(() => {
    if (!classes) return []
    const q = query.trim().toLowerCase()
    if (!q) return classes
    return classes.filter((c) => c.name.toLowerCase().includes(q))
  }, [classes, query])

  const toggle = (id: number) => {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const apply = () => {
    onApply(Array.from(draft))
    onOpenChange(false)
  }

  const selectedCount = draft.size

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>{t('events.audience.sheetTitle')}</SheetTitle>
          <SheetDescription>
            {t('events.audience.sheetDescription')}
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-border px-4 pb-3 pt-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('events.audience.searchPlaceholder')}
              className="pl-9"
            />
          </div>
          {selectedCount > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t('events.audience.selectedHeader', { count: selectedCount })}
              </span>
              <button
                type="button"
                onClick={() => setDraft(new Set())}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
                {t('events.audience.clearAll')}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="space-y-2 px-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !classes || classes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm italic text-muted-foreground">
              {t('events.audience.emptyClasses')}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm italic text-muted-foreground">
              {t('events.audience.noResults', { query: query.trim() })}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((c) => {
                const checked = draft.has(c.id)
                return (
                  <li key={c.id}>
                    <label
                      htmlFor={`classe-${c.id}`}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                        checked
                          ? 'bg-primary/5 text-foreground'
                          : 'hover:bg-accent/50'
                      )}
                    >
                      <Checkbox
                        id={`classe-${c.id}`}
                        checked={checked}
                        onCheckedChange={() => toggle(c.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{c.name}</div>
                        {c.description && (
                          <div className="truncate text-xs text-muted-foreground">
                            {c.description}
                          </div>
                        )}
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <SheetFooter className="border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={apply}>
            {t('events.audience.done')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
