import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Filter, X } from 'lucide-react'
import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  RowData,
} from '@tanstack/react-table'

import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

// ---------------------------------------------------------------------------
// Filter definitions — declared on `columnDef.meta.filter`
// ---------------------------------------------------------------------------

interface BaseFilterDef {
  /** Used as the popover heading. */
  label: string
  /** URL param key when `syncToUrl` is on. Defaults to the column id. */
  urlKey?: string
}

export interface TextFilterDef extends BaseFilterDef {
  type: 'text'
  placeholder?: string
}

export interface SelectFilterOption {
  value: string
  label: string
}

export interface SelectFilterDef extends BaseFilterDef {
  type: 'select'
  options: SelectFilterOption[]
  /** Label for the "no filter" choice (default: "Any"). */
  anyLabel?: string
}

export interface MultiSelectFilterDef extends BaseFilterDef {
  type: 'multi-select'
  options: SelectFilterOption[]
}

export interface BooleanFilterDef extends BaseFilterDef {
  type: 'boolean'
  trueLabel?: string
  falseLabel?: string
}

export type ColumnFilterDef =
  | TextFilterDef
  | SelectFilterDef
  | MultiSelectFilterDef
  | BooleanFilterDef

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filter?: ColumnFilterDef
    /** Header & cell alignment hint. Filter icon flips side when 'right'. */
    align?: 'left' | 'right' | 'center'
  }
}

// ---------------------------------------------------------------------------
// Active-state helpers
// ---------------------------------------------------------------------------

export function isFilterValueActive(
  def: ColumnFilterDef,
  value: unknown
): boolean {
  if (value === undefined || value === null) return false
  switch (def.type) {
    case 'text':
      return typeof value === 'string' && value.trim().length > 0
    case 'select':
      return typeof value === 'string' && value.length > 0
    case 'multi-select':
      return Array.isArray(value) && value.length > 0
    case 'boolean':
      return value === true || value === false
  }
}

/**
 * Flatten TanStack `columnFilters` into a plain object keyed by column id —
 * convenient for passing into API client calls. Skips entries whose value
 * is empty/inactive.
 */
export function columnFiltersToApiParams<T extends Record<string, unknown>>(
  filters: ColumnFiltersState,
  columns: ColumnDef<unknown>[]
): T {
  const byId = new Map<string, ColumnFilterDef>()
  for (const col of columns) {
    const id =
      (col as { id?: string; accessorKey?: string }).id ??
      (col as { accessorKey?: string }).accessorKey
    const f = col.meta?.filter
    if (id && f) byId.set(id, f)
  }

  const out: Record<string, unknown> = {}
  for (const f of filters) {
    const def = byId.get(f.id)
    if (!def || !isFilterValueActive(def, f.value)) continue
    out[f.id] = f.value
  }
  return out as T
}

// ---------------------------------------------------------------------------
// URL sync hook
// ---------------------------------------------------------------------------

interface UseColumnFiltersOptions<TData> {
  /** Column definitions — needed to validate URL values against meta.filter. */
  columns: ColumnDef<TData, unknown>[]
  /** Sync state ↔ URL search params with replace history. */
  syncToUrl?: boolean
  /** Initial filters used when nothing is in the URL. */
  defaultFilters?: ColumnFiltersState
}

interface UseColumnFiltersReturn {
  columnFilters: ColumnFiltersState
  setColumnFilters: OnChangeFn<ColumnFiltersState>
}

/**
 * Manages `columnFilters` state for a DataTable. With `syncToUrl`, the state
 * round-trips through `useSearchParams`:
 *
 * - Initial state is parsed from the URL on first render (validated against
 *   the column's filter def — invalid values are dropped).
 * - Writes go through `setSearchParams(..., { replace: true })` so typing
 *   doesn't pollute browser history.
 * - The URL is the single source of truth — re-renders read from URL.
 */
export function useColumnFilters<TData>({
  columns,
  syncToUrl = false,
  defaultFilters = [],
}: UseColumnFiltersOptions<TData>): UseColumnFiltersReturn {
  // Build a lookup of url-key → { columnId, def } for parsing/serializing.
  const urlIndex = useMemo(() => {
    const byUrlKey = new Map<
      string,
      { columnId: string; def: ColumnFilterDef }
    >()
    const byColumnId = new Map<
      string,
      { urlKey: string; def: ColumnFilterDef }
    >()
    for (const col of columns) {
      const id =
        (col as { id?: string; accessorKey?: string }).id ??
        (col as { accessorKey?: string }).accessorKey
      const def = col.meta?.filter
      if (!id || !def) continue
      const key = def.urlKey ?? id
      byUrlKey.set(key, { columnId: id, def })
      byColumnId.set(id, { urlKey: key, def })
    }
    return { byUrlKey, byColumnId }
  }, [columns])

  if (syncToUrl) {
    // Conditional hook is fine here because `syncToUrl` is set per-mount and
    // not expected to change at runtime.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useUrlSyncedColumnFilters(urlIndex, defaultFilters)
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useLocalColumnFilters(defaultFilters)
}

function useLocalColumnFilters(
  defaultFilters: ColumnFiltersState
): UseColumnFiltersReturn {
  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>(defaultFilters)
  return { columnFilters, setColumnFilters }
}

function useUrlSyncedColumnFilters(
  urlIndex: {
    byUrlKey: Map<string, { columnId: string; def: ColumnFilterDef }>
    byColumnId: Map<string, { urlKey: string; def: ColumnFilterDef }>
  },
  defaultFilters: ColumnFiltersState
): UseColumnFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  // Track whether the user has explicitly changed filters. Lets us tell
  // "empty URL because of fresh load" (→ use defaults) apart from
  // "empty URL because user cleared everything" (→ truly empty).
  const userInteractedRef = useRef(false)

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const fromUrl: ColumnFiltersState = []
    for (const [urlKey, { columnId, def }] of urlIndex.byUrlKey) {
      const raw = searchParams.get(urlKey)
      if (raw === null) continue
      const value = parseFilterValue(def, raw)
      if (value !== undefined && isFilterValueActive(def, value)) {
        fromUrl.push({ id: columnId, value })
      }
    }
    if (fromUrl.length > 0) return fromUrl
    if (userInteractedRef.current) return []
    return defaultFilters
    // defaultFilters intentionally excluded — we only honour it on first read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, urlIndex])

  // Seed URL from defaults on first mount when nothing is present.
  const didSeedRef = useRef(false)
  useEffect(() => {
    if (didSeedRef.current) return
    didSeedRef.current = true
    if (defaultFilters.length === 0) return
    const hasAnyKey = Array.from(urlIndex.byUrlKey.keys()).some((k) =>
      searchParams.has(k)
    )
    if (hasAnyKey) return
    const next = new URLSearchParams(searchParams)
    for (const f of defaultFilters) {
      const entry = urlIndex.byColumnId.get(f.id)
      if (!entry) continue
      const serialized = serializeFilterValue(entry.def, f.value)
      if (serialized !== undefined) next.set(entry.urlKey, serialized)
    }
    setSearchParams(next, { replace: true })
  }, [defaultFilters, urlIndex, searchParams, setSearchParams])

  const setColumnFilters = useCallback<OnChangeFn<ColumnFiltersState>>(
    (updater) => {
      userInteractedRef.current = true
      const current = columnFilters
      const nextFilters =
        typeof updater === 'function' ? updater(current) : updater

      const next = new URLSearchParams(searchParams)
      for (const urlKey of urlIndex.byUrlKey.keys()) {
        next.delete(urlKey)
      }
      for (const f of nextFilters) {
        const entry = urlIndex.byColumnId.get(f.id)
        if (!entry) continue
        if (!isFilterValueActive(entry.def, f.value)) continue
        const serialized = serializeFilterValue(entry.def, f.value)
        if (serialized !== undefined) next.set(entry.urlKey, serialized)
      }
      setSearchParams(next, { replace: true })
    },
    [columnFilters, searchParams, setSearchParams, urlIndex]
  )

  return { columnFilters, setColumnFilters }
}

function parseFilterValue(def: ColumnFilterDef, raw: string): unknown {
  switch (def.type) {
    case 'text':
      return raw
    case 'select': {
      const ok = def.options.some((o) => o.value === raw)
      return ok ? raw : undefined
    }
    case 'multi-select': {
      const values = raw.split(',').filter(Boolean)
      const valid = values.filter((v) => def.options.some((o) => o.value === v))
      return valid.length > 0 ? valid : undefined
    }
    case 'boolean':
      if (raw === 'true') return true
      if (raw === 'false') return false
      return undefined
  }
}

function serializeFilterValue(
  def: ColumnFilterDef,
  value: unknown
): string | undefined {
  switch (def.type) {
    case 'text':
      return typeof value === 'string' && value.trim().length > 0
        ? value
        : undefined
    case 'select':
      return typeof value === 'string' && value.length > 0 ? value : undefined
    case 'multi-select':
      return Array.isArray(value) && value.length > 0
        ? value.join(',')
        : undefined
    case 'boolean':
      return value === true ? 'true' : value === false ? 'false' : undefined
  }
}

// ---------------------------------------------------------------------------
// Header icon + popover
// ---------------------------------------------------------------------------

interface ColumnHeaderFilterProps<TData, TValue> {
  column: Column<TData, TValue>
  align?: 'left' | 'right' | 'center'
}

export function ColumnHeaderFilter<TData, TValue>({
  column,
  align = 'left',
}: ColumnHeaderFilterProps<TData, TValue>) {
  const def = column.columnDef.meta?.filter
  if (!def) return null

  const value = column.getFilterValue()
  const active = isFilterValueActive(def, value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={def.label}
          className={cn(
            'relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors',
            'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            active
              ? 'text-primary'
              : 'text-muted-foreground/60 hover:text-foreground'
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          {active && (
            <span
              aria-hidden
              className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-card"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align === 'right' ? 'end' : 'start'}
        sideOffset={6}
        className="w-64 p-3"
      >
        <ColumnFilterEditor
          def={def}
          value={value}
          onChange={(v) => column.setFilterValue(v)}
          onClear={() => column.setFilterValue(undefined)}
          active={active}
        />
      </PopoverContent>
    </Popover>
  )
}

interface ColumnFilterEditorProps {
  def: ColumnFilterDef
  value: unknown
  onChange: (next: unknown) => void
  onClear: () => void
  active: boolean
}

function ColumnFilterEditor({
  def,
  value,
  onChange,
  onClear,
  active,
}: ColumnFilterEditorProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-6 items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {def.label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-hidden={!active}
          tabIndex={active ? 0 : -1}
          className={cn(
            '-mr-2 h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground',
            !active && 'pointer-events-none opacity-0'
          )}
          onClick={onClear}
        >
          <X className="h-3 w-3" />
          {t('common.filter.clear')}
        </Button>
      </div>

      {def.type === 'text' && (
        <TextFilterEditor def={def} value={value} onChange={onChange} />
      )}
      {def.type === 'select' && (
        <SelectFilterEditor def={def} value={value} onChange={onChange} />
      )}
      {def.type === 'multi-select' && (
        <MultiSelectFilterEditor def={def} value={value} onChange={onChange} />
      )}
      {def.type === 'boolean' && (
        <BooleanFilterEditor def={def} value={value} onChange={onChange} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Per-type editors
// ---------------------------------------------------------------------------

function TextFilterEditor({
  def,
  value,
  onChange,
}: {
  def: TextFilterDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<string>(
    typeof value === 'string' ? value : ''
  )
  const debounced = useDebouncedValue(draft, 300)

  // Mirror external resets (e.g. clear button).
  useEffect(() => {
    const external = typeof value === 'string' ? value : ''
    if (external !== draft) setDraft(external)
    // We intentionally only react to external `value` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const lastEmittedRef = useRef<string | undefined>(
    typeof value === 'string' ? value : ''
  )
  useEffect(() => {
    if (debounced === lastEmittedRef.current) return
    lastEmittedRef.current = debounced
    onChange(debounced.length > 0 ? debounced : undefined)
  }, [debounced, onChange])

  return (
    <Input
      autoFocus
      value={draft}
      placeholder={def.placeholder ?? t('common.filter.search')}
      onChange={(e) => setDraft(e.target.value)}
      className="h-8"
    />
  )
}

function SelectFilterEditor({
  def,
  value,
  onChange,
}: {
  def: SelectFilterDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const { t } = useTranslation()
  const current = typeof value === 'string' ? value : null

  return (
    <FilterOptionList>
      <FilterOption
        selected={current === null}
        muted
        onClick={() => onChange(undefined)}
      >
        {def.anyLabel ?? t('common.filter.any')}
      </FilterOption>
      {def.options.map((opt) => (
        <FilterOption
          key={opt.value}
          selected={current === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </FilterOption>
      ))}
    </FilterOptionList>
  )
}

function MultiSelectFilterEditor({
  def,
  value,
  onChange,
}: {
  def: MultiSelectFilterDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const selected = useMemo(
    () => new Set(Array.isArray(value) ? (value as string[]) : []),
    [value]
  )

  const toggle = (optionValue: string) => {
    const next = new Set(selected)
    if (next.has(optionValue)) next.delete(optionValue)
    else next.add(optionValue)
    onChange(next.size > 0 ? Array.from(next) : undefined)
  }

  return (
    <FilterOptionList>
      {def.options.map((opt) => (
        <FilterOption
          key={opt.value}
          selected={selected.has(opt.value)}
          onClick={() => toggle(opt.value)}
        >
          {opt.label}
        </FilterOption>
      ))}
    </FilterOptionList>
  )
}

function BooleanFilterEditor({
  def,
  value,
  onChange,
}: {
  def: BooleanFilterDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const { t } = useTranslation()
  const isAny = value !== true && value !== false

  return (
    <FilterOptionList>
      <FilterOption selected={isAny} muted onClick={() => onChange(undefined)}>
        {t('common.filter.any')}
      </FilterOption>
      <FilterOption selected={value === true} onClick={() => onChange(true)}>
        {def.trueLabel ?? t('common.filter.yes')}
      </FilterOption>
      <FilterOption selected={value === false} onClick={() => onChange(false)}>
        {def.falseLabel ?? t('common.filter.no')}
      </FilterOption>
    </FilterOptionList>
  )
}

// ---------------------------------------------------------------------------
// Shared list primitive — matches the combobox-item / dropdown-menu-item
// look used elsewhere: a clickable row with a check icon on the right when
// selected. No radio circle, no checkbox — lighter and consistent with the
// rest of the app.
// ---------------------------------------------------------------------------

function FilterOptionList({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-1 flex max-h-60 flex-col overflow-y-auto">
      {children}
    </div>
  )
}

interface FilterOptionProps {
  selected: boolean
  muted?: boolean
  onClick: () => void
  children: React.ReactNode
}

function FilterOption({
  selected,
  muted,
  onClick,
  children,
}: FilterOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-left text-sm outline-none transition-colors',
        'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground',
        muted && !selected && 'text-muted-foreground'
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected && (
        <Check className="absolute right-2 h-4 w-4 text-foreground" />
      )}
    </button>
  )
}
