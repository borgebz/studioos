import { useTranslation } from 'react-i18next'
import { ArrowUpDown, LayoutGrid, List, X } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type SortKey = 'recent' | 'priceAsc' | 'priceDesc'
export type ViewMode = 'grid' | 'list'

export interface ToolbarChip {
  key: string
  label: string
  onClear: () => void
}

export function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode
  onChange: (v: ViewMode) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="inline-flex h-8 shrink-0 overflow-hidden rounded-md border border-border bg-card">
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-label={t('marketplace.viewGrid')}
        className={cn(
          'flex h-full w-8 items-center justify-center transition-colors',
          view === 'grid'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-label={t('marketplace.viewList')}
        className={cn(
          'flex h-full w-8 items-center justify-center border-l border-border transition-colors',
          view === 'list'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface ListingsToolbarProps {
  chips: ToolbarChip[]
  sortBy?: SortKey
  onSortChange?: (s: SortKey) => void
  /** Hide the sort control (useful for inventory pages with no price). */
  hideSort?: boolean
  /** Required view + onChange when a view toggle is desired (most pages). */
  view?: ViewMode
  onViewChange?: (v: ViewMode) => void
}

export function ListingsToolbar({
  chips,
  sortBy,
  onSortChange,
  hideSort,
  view,
  onViewChange,
}: ListingsToolbarProps) {
  const { t } = useTranslation()
  const hasSort = !hideSort && onSortChange
  const hasView = view && onViewChange
  if (chips.length === 0 && !hasSort && !hasView) return null
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
      <div className="flex flex-wrap items-center gap-2">
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
      <div className="flex items-center gap-2">
        {hasSort && (
          <Select
            value={sortBy}
            onValueChange={(v) => onSortChange(v as SortKey)}
          >
            <SelectTrigger
              className="h-8 gap-1.5 border-border bg-card px-2.5 text-xs font-medium text-foreground"
              aria-label={t('marketplace.sortBy')}
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="recent">
                {t('marketplace.sortRecent')}
              </SelectItem>
              <SelectItem value="priceAsc">
                {t('marketplace.sortPriceAsc')}
              </SelectItem>
              <SelectItem value="priceDesc">
                {t('marketplace.sortPriceDesc')}
              </SelectItem>
            </SelectContent>
          </Select>
        )}
        {hasView && <ViewToggle view={view!} onChange={onViewChange!} />}
      </div>
    </div>
  )
}
