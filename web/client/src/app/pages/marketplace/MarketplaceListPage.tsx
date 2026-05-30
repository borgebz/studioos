import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, ShoppingBag, Tag } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { apiClient } from '@/api/api-client'
import type { ListingList } from '@/api/studioos-api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { useColumnFilters } from '@/components/ui/data-table-filters'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { PAGE_CONTENT } from '@/lib/layout'
import { ListingCard } from '@/components/shared/ListingCard'
import { ListingsGridView } from '@/components/shared/ListingsGridView'
import {
  ListingsToolbar,
  ViewToggleButton,
  type SortKey,
  type ToolbarChip,
  type ViewMode,
} from '@/components/shared/ListingsToolbar'
import { paths } from '@/app/paths'
import { StatusBadge, listingTypeLabel } from './marketplace-helpers'

type ListingType = 'rent' | 'sell' | 'lend' | 'donate'
type ListingCondition = 'new' | 'excellent' | 'good' | 'fair' | 'damaged'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function MarketplaceListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [sortBy, setSortBy] = useState<SortKey>('recent')
  const [view, setView] = useState<ViewMode>('grid')

  const sortKeyToOrdering = (key: SortKey) => {
    switch (key) {
      case 'priceAsc':
        return 'asking_price' as const
      case 'priceDesc':
        return '-asking_price' as const
      default:
        return '-created_at' as const
    }
  }

  // ── Data-table columns (list view) ────────────────────────────────────────
  const columnHelper = useMemo(() => createColumnHelper<ListingList>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: () => t('marketplace.col.product'),
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30">
                {row.primary_media_url ? (
                  <img
                    src={row.primary_media_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="max-w-[260px] truncate text-sm font-medium">
                  {row.title}
                </p>
                <p className="max-w-[260px] truncate text-xs text-muted-foreground">
                  {row.product_name}
                </p>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('asking_price', {
        header: () => t('marketplace.col.price'),
        cell: (info) => {
          const price = info.getValue()
          return price ? (
            <span className="text-sm font-medium">
              {t('common.currencySymbol')} {price}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )
        },
        meta: { className: 'hidden sm:table-cell' },
      }),
      columnHelper.accessor('listing_type', {
        header: () => t('marketplace.col.type'),
        meta: {
          className: 'hidden md:table-cell',
          filter: {
            type: 'select',
            label: t('marketplace.col.type'),
            anyLabel: t('marketplace.allTypes'),
            options: [
              { value: 'sell', label: t('marketplace.typeSell') },
              { value: 'rent', label: t('marketplace.typeRent') },
              { value: 'lend', label: t('marketplace.typeLend') },
              { value: 'donate', label: t('marketplace.typeDonate') },
            ],
          },
        },
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {listingTypeLabel(info.getValue(), t)}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'condition',
        header: () =>
          t('marketplace.col.condition', {
            defaultValue: 'Condition',
          }),
        meta: {
          className: 'hidden lg:table-cell',
          filter: {
            type: 'select',
            label: t('marketplace.col.condition', {
              defaultValue: 'Condition',
            }),
            anyLabel: t('marketplace.allConditions'),
            options: [
              { value: 'new', label: t('marketplace.conditionNew') },
              {
                value: 'excellent',
                label: t('marketplace.conditionExcellent'),
              },
              { value: 'good', label: t('marketplace.conditionGood') },
              { value: 'fair', label: t('marketplace.conditionFair') },
              { value: 'damaged', label: t('marketplace.conditionDamaged') },
            ],
          },
        },
        cell: (info) => {
          const conditions = info.row.original.condition_summary ?? []
          return conditions.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {conditions
                .map((c) =>
                  t(`marketplace.condition${capitalize(String(c))}`, {
                    defaultValue: String(c),
                  })
                )
                .join(', ')}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )
        },
      }),
      columnHelper.accessor('status', {
        header: () => t('marketplace.col.status'),
        cell: (info) => <StatusBadge status={info.getValue()} t={t} />,
      }),
    ],
    [columnHelper, t]
  )

  const { columnFilters, setColumnFilters } = useColumnFilters<ListingList>({
    columns,
    syncToUrl: true,
  })

  const typeFilter =
    (columnFilters.find((f) => f.id === 'listing_type')?.value as
      | ListingType
      | undefined) ?? null

  const conditionFilter =
    (columnFilters.find((f) => f.id === 'condition')?.value as
      | ListingCondition
      | undefined) ?? null

  const setTypeFilter = useCallback(
    (next: ListingType | 'all') => {
      setColumnFilters((prev) => {
        const without = prev.filter((f) => f.id !== 'listing_type')
        if (next === 'all') return without
        return [...without, { id: 'listing_type', value: next }]
      })
    },
    [setColumnFilters]
  )

  const setConditionFilter = useCallback(
    (next: ListingCondition | 'all') => {
      setColumnFilters((prev) => {
        const without = prev.filter((f) => f.id !== 'condition')
        if (next === 'all') return without
        return [...without, { id: 'condition', value: next }]
      })
    },
    [setColumnFilters]
  )

  const fetchPage = useCallback(() => {
    const query: {
      search?: string
      listing_type?: ListingType
      condition?: string
      ordering?: '-created_at' | 'created_at' | 'asking_price' | '-asking_price'
    } = {}
    if (search.trim()) query.search = search.trim()
    if (typeFilter) query.listing_type = typeFilter
    if (conditionFilter) query.condition = conditionFilter
    query.ordering = sortKeyToOrdering(sortBy)
    return apiClient.api
      .marketplaceListingsRetrieve(query)
      .then((r) => r.data) as Promise<{
      count: number
      next: string | null
      previous: string | null
      results: ListingList[]
    }>
  }, [search, typeFilter, conditionFilter, sortBy])

  const {
    items: listings,
    count,
    loading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refresh,
  } = usePaginatedList<ListingList>({
    fetchPage,
    resetDeps: [search, typeFilter, conditionFilter, sortBy],
  })

  const table = useReactTable({
    data: listings,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    manualFiltering: true,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const chips: ToolbarChip[] = useMemo(() => {
    const list: ToolbarChip[] = []
    if (typeFilter)
      list.push({
        key: 'type',
        label: listingTypeLabel(typeFilter, t),
        onClear: () => setTypeFilter('all'),
      })
    if (conditionFilter)
      list.push({
        key: 'condition',
        label: t(`marketplace.condition${capitalize(conditionFilter)}`, {
          defaultValue: conditionFilter,
        }),
        onClear: () => setConditionFilter('all'),
      })
    if (searchInput)
      list.push({
        key: 'search',
        label: `"${searchInput}"`,
        onClear: () => setSearchInput(''),
      })
    return list
  }, [
    typeFilter,
    conditionFilter,
    searchInput,
    setTypeFilter,
    setConditionFilter,
    t,
  ])

  const emptyBrowse = (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <Tag className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm font-medium text-muted-foreground">
        {t('marketplace.browseEmpty')}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        {t('marketplace.browseEmptyDesc')}
      </p>
    </div>
  )

  return (
    <PageLayout>
      <div className={PAGE_CONTENT}>
        <PageHeader title={t('marketplace.browseTitle')} backTo={paths.home}>
          <ViewToggleButton view={view} onChange={setView} />
        </PageHeader>

        {/* Inline filter row — no card, no extra chrome. Search spans both
            views; enum selects only appear in grid view (table view uses
            column-header filters). Sort is view-independent. */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('marketplace.search')}
              className="pl-9"
            />
          </div>
          {view === 'grid' && (
            <>
              <Select
                value={typeFilter ?? 'all'}
                onValueChange={(v) => setTypeFilter(v as ListingType | 'all')}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('marketplace.allTypes')}
                  </SelectItem>
                  <SelectItem value="sell">
                    {t('marketplace.typeSell')}
                  </SelectItem>
                  <SelectItem value="rent">
                    {t('marketplace.typeRent')}
                  </SelectItem>
                  <SelectItem value="lend">
                    {t('marketplace.typeLend')}
                  </SelectItem>
                  <SelectItem value="donate">
                    {t('marketplace.typeDonate')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={conditionFilter ?? 'all'}
                onValueChange={(v) =>
                  setConditionFilter(v as ListingCondition | 'all')
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('marketplace.allConditions')}
                  </SelectItem>
                  <SelectItem value="new">
                    {t('marketplace.conditionNew')}
                  </SelectItem>
                  <SelectItem value="excellent">
                    {t('marketplace.conditionExcellent')}
                  </SelectItem>
                  <SelectItem value="good">
                    {t('marketplace.conditionGood')}
                  </SelectItem>
                  <SelectItem value="fair">
                    {t('marketplace.conditionFair')}
                  </SelectItem>
                  <SelectItem value="damaged">
                    {t('marketplace.conditionDamaged')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
        </div>

        <ListingsToolbar chips={chips} />

        {view === 'grid' ? (
          <ListingsGridView
            items={listings}
            getKey={(it) => it.id}
            loading={loading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            renderItem={(item) => (
              <ListingCard
                item={item}
                variant="browse"
                onOpen={() =>
                  navigate(
                    paths.marketplaceDetail.replace(':id', String(item.id))
                  )
                }
              />
            )}
            empty={emptyBrowse}
          />
        ) : (
          <DataTable
            table={table}
            loading={loading}
            totalCount={count}
            onRefresh={refresh}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            emptyMessage={emptyBrowse}
          />
        )}
      </div>
    </PageLayout>
  )
}
