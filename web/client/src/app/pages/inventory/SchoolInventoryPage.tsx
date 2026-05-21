import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Warehouse } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { apiClient } from '@/api/api-client'
import type { ProductDetail } from '@/api/studioos-api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { ProductCard } from '@/components/shared/ProductCard'
import { ProductStatusBadge } from '@/components/shared/ProductStatusBadge'
import { ListingsGridView } from '@/components/shared/ListingsGridView'
import {
  ListingsToolbar,
  type ToolbarChip,
  type ViewMode,
} from '@/components/shared/ListingsToolbar'
import { paths } from '@/app/paths'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function SchoolInventoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [view, setView] = useState<ViewMode>('grid')

  const fetchPage = useCallback(() => {
    const query: {
      name?: string
      status?: 'active' | 'inactive' | 'archived'
    } = {}
    if (search.trim()) query.name = search.trim()
    if (statusFilter !== 'all')
      query.status = statusFilter as typeof query.status
    return apiClient.api
      .inventorySchoolProductsRetrieve(query)
      .then((r) => r.data) as Promise<{
      count: number
      next: string | null
      previous: string | null
      results: ProductDetail[]
    }>
  }, [search, statusFilter])

  const {
    items: products,
    count,
    loading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refresh,
  } = usePaginatedList<ProductDetail>({
    fetchPage,
    resetDeps: [search, statusFilter],
  })

  // ── Data-table columns (list view) ────────────────────────────────────────
  const columnHelper = useMemo(() => createColumnHelper<ProductDetail>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: () => t('schoolInventory.col.product'),
        cell: (info) => {
          const row = info.row.original
          const primaryMedia =
            row.media?.find((m) => m.is_primary) ?? row.media?.[0]
          return (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30">
                {primaryMedia?.image ? (
                  <img
                    src={primaryMedia.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Warehouse className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="max-w-[260px] truncate text-sm font-medium">
                  {row.name}
                </p>
                {row.description && (
                  <p className="mt-0.5 max-w-[260px] truncate text-xs text-muted-foreground">
                    {row.description}
                  </p>
                )}
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('brand', {
        header: () => t('schoolInventory.col.brand'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {info.getValue() || '—'}
          </span>
        ),
        meta: { className: 'hidden md:table-cell' },
      }),
      columnHelper.display({
        id: 'inventory_code',
        header: () => t('schoolInventory.col.inventoryCode'),
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.row.original.school_details?.inventory_code || '—'}
          </span>
        ),
        meta: { className: 'hidden sm:table-cell' },
      }),
      columnHelper.display({
        id: 'storage_location',
        header: () => t('schoolInventory.col.storageLocation'),
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {info.row.original.school_details?.storage_location || '—'}
          </span>
        ),
        meta: { className: 'hidden lg:table-cell' },
      }),
      columnHelper.accessor('status', {
        header: () => t('marketplace.col.status'),
        cell: (info) => <ProductStatusBadge status={info.getValue()} />,
      }),
    ],
    [columnHelper, t],
  )

  const table = useReactTable({
    data: products,
    columns,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const chips: ToolbarChip[] = useMemo(() => {
    const list: ToolbarChip[] = []
    if (statusFilter !== 'all')
      list.push({
        key: 'status',
        label: t(`schoolInventory.status${capitalize(statusFilter)}`, {
          defaultValue: statusFilter,
        }),
        onClear: () => setStatusFilter('all'),
      })
    if (searchInput)
      list.push({
        key: 'search',
        label: `"${searchInput}"`,
        onClear: () => setSearchInput(''),
      })
    return list
  }, [statusFilter, searchInput, t])

  const emptyState = (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <Warehouse className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm font-medium text-muted-foreground">
        {t('schoolInventory.empty')}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        {t('schoolInventory.emptyDesc')}
      </p>
      <Button
        size="sm"
        className="mt-4"
        onClick={() => navigate(paths.schoolInventoryCreate)}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('inventory.createProduct')}
      </Button>
    </div>
  )

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={t('schoolInventory.title')} backTo={paths.home}>
          <Button onClick={() => navigate(paths.schoolInventoryCreate)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('inventory.createProduct')}
          </Button>
        </PageHeader>

        {/* Filter card */}
        <div className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('schoolInventory.search')}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('marketplace.allStatuses')}
                  </SelectItem>
                  <SelectItem value="active">
                    {t('schoolInventory.statusActive')}
                  </SelectItem>
                  <SelectItem value="inactive">
                    {t('schoolInventory.statusInactive')}
                  </SelectItem>
                  <SelectItem value="archived">
                    {t('schoolInventory.statusArchived')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ListingsToolbar
          chips={chips}
          hideSort
          view={view}
          onViewChange={setView}
        />

        {view === 'grid' ? (
          <ListingsGridView
            items={products}
            getKey={(it) => it.id}
            loading={loading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            renderItem={(item) => <ProductCard item={item} />}
            empty={emptyState}
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
            emptyMessage={emptyState}
          />
        )}
      </div>
    </PageLayout>
  )
}
