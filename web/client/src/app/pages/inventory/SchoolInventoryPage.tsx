import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Warehouse } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { apiClient } from '@/api/api-client'
import type { ProductDetail } from '@/api/studioos-api'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { paths } from '@/app/paths'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ProductStatusBadge({
  status,
  t,
}: {
  status: string | undefined
  t: (k: string) => string
}) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          {t('schoolInventory.statusActive')}
        </Badge>
      )
    case 'inactive':
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          {t('schoolInventory.statusInactive')}
        </Badge>
      )
    case 'archived':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          {t('schoolInventory.statusArchived')}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      )
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SchoolInventoryPage() {
  const { t } = useTranslation()

  // -- Filters --
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // -- Data --
  const fetchPage = useCallback(
    () =>
      apiClient.api
        .inventorySchoolProductsRetrieve()
        .then((r) => r.data) as Promise<{
        count: number
        next: string | null
        previous: string | null
        results: ProductDetail[]
      }>,
    [],
  )

  const {
    items: products,
    count,
    loading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refresh,
  } = usePaginatedList<ProductDetail>({ fetchPage })

  // -- Client-side filtering --
  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (search) {
          const q = search.toLowerCase()
          if (
            !p.name.toLowerCase().includes(q) &&
            !p.brand?.toLowerCase().includes(q) &&
            !p.school_details?.inventory_code?.toLowerCase().includes(q)
          )
            return false
        }
        if (statusFilter !== 'all' && p.status !== statusFilter) return false
        return true
      }),
    [products, search, statusFilter],
  )

  // -- Columns --
  const columnHelper = useMemo(() => createColumnHelper<ProductDetail>(), [])

  const columns = useMemo(
    () => [
      // Product (thumbnail + name)
      columnHelper.accessor('name', {
        header: () => t('schoolInventory.col.product'),
        cell: (info) => {
          const row = info.row.original
          const primaryMedia = row.media?.find((m) => m.is_primary) ?? row.media?.[0]
          return (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-muted/30 overflow-hidden">
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
                <p className="text-sm font-medium truncate max-w-[260px]">
                  {row.name}
                </p>
                {row.description && (
                  <p className="text-xs text-muted-foreground truncate max-w-[260px] mt-0.5">
                    {row.description}
                  </p>
                )}
              </div>
            </div>
          )
        },
      }),

      // Brand
      columnHelper.accessor('brand', {
        header: () => t('schoolInventory.col.brand'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {info.getValue() || '—'}
          </span>
        ),
        meta: { className: 'hidden md:table-cell' },
      }),

      // Inventory Code
      columnHelper.display({
        id: 'inventory_code',
        header: () => t('schoolInventory.col.inventoryCode'),
        cell: (info) => (
          <span className="text-xs font-mono text-muted-foreground">
            {info.row.original.school_details?.inventory_code || '—'}
          </span>
        ),
        meta: { className: 'hidden sm:table-cell' },
      }),

      // Storage Location
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

      // Status
      columnHelper.accessor('status', {
        header: () => t('marketplace.col.status'),
        cell: (info) => (
          <ProductStatusBadge status={info.getValue()} t={t} />
        ),
      }),
    ],
    [columnHelper, t],
  )

  // -- Table instance --
  const table = useReactTable({
    data: filtered,
    columns,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <PageLayout fullHeight>
      <div className="mx-auto w-full max-w-6xl flex flex-col flex-1 min-h-0">
        <PageHeader title={t('schoolInventory.title')} backTo={paths.home} />

        {/* Filters */}
        <div className="rounded-lg border border-border bg-card p-4 mb-4 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('schoolInventory.search')}
                className="pl-9"
              />
            </div>
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

        {/* Table */}
        <DataTable
          table={table}
          fillHeight
          loading={loading}
          totalCount={count}
          onRefresh={refresh}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          emptyMessage={
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Warehouse className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                {t('schoolInventory.empty')}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {t('schoolInventory.emptyDesc')}
              </p>
            </div>
          }
        />
      </div>
    </PageLayout>
  )
}
