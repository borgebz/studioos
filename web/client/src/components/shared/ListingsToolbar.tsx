import { useTranslation } from 'react-i18next'
import { LayoutGrid, List, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SortKey = 'recent' | 'priceAsc' | 'priceDesc'
export type ViewMode = 'grid' | 'list'

export interface ToolbarChip {
  key: string
  label: string
  onClear: () => void
}

/**
 * Single icon button that flips the view between grid and list. Shows the
 * icon of the OTHER mode (i.e. when you're in grid, you see the List icon —
 * clicking switches you to list, and vice versa).
 *
 * Intended for the page-header action area, next to the primary "Create…"
 * button. Pairs with `ListingsToolbar` (which now only renders active-filter
 * chips).
 */
export function ViewToggleButton({
  view,
  onChange,
  className,
}: {
  view: ViewMode
  onChange: (v: ViewMode) => void
  className?: string
}) {
  const { t } = useTranslation()
  const next: ViewMode = view === 'grid' ? 'list' : 'grid'
  const Icon = next === 'list' ? List : LayoutGrid
  const label =
    next === 'list' ? t('marketplace.viewList') : t('marketplace.viewGrid')
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={() => onChange(next)}
      className={cn('text-muted-foreground hover:text-foreground', className)}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}

interface ListingsToolbarProps {
  chips: ToolbarChip[]
}

/**
 * Renders the active-filter chip strip beneath the filter row. Returns null
 * when there are no chips. Sort and view-toggle controls live in the filter
 * row and the page header respectively — they used to live here.
 */
export function ListingsToolbar({ chips }: ListingsToolbarProps) {
  if (chips.length === 0) return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 px-1">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:border-muted-foreground/40"
        >
          {chip.label}
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      ))}
    </div>
  )
}
