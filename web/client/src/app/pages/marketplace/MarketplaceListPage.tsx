import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ShoppingBag } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { apiClient } from '@/api/api-client'
import type { ListingList } from '@/api/studioos-api'
import { usePaginatedList } from '@/hooks/use-paginated-list'
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
import { paths } from '@/app/paths'
import { StatusBadge, listingTypeLabel } from './marketplace-helpers'

// ---------------------------------------------------------------------------
// Browse Marketplace — read-only view of all public active listings
// ---------------------------------------------------------------------------

export function MarketplaceListPage() {
  const { t } = useTranslation()

  // -- Filters --
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // -- Data (public listings — active + public only) --
  const fetchPage = useCallback(
    () =>
      apiClient.api
        .marketplaceListingsRetrieve()
        .then((r) => r.data) as Promise<{
        count: number
        next: string | null
        previous: string | null
        results: ListingList[]
      }>,
    [],
  )

  const {
    items: listings,
    count,
    loading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refresh,
  } = usePaginatedList<ListingList>({ fetchPage })

  // -- Client-side filtering --
  const filtered = useMemo(
    () =>
      listings.filter((l) => {
        if (search) {
          const q = search.toLowerCase()
          if (
            !l.title.toLowerCase().includes(q) &&
            !l.product_name?.toLowerCase().includes(q)
          )
            return false
        }
        if (typeFilter !== 'all' && l.listing_type !== typeFilter) return false
        return true
      }),
    [listings, search, typeFilter],
  )

  // -- Columns --
  const columnHelper = useMemo(() => createColumnHelper<ListingList>(), [])

  const columns = useMemo(
    () => [
      // Product (thumbnail + title + meta)
      columnHelper.accessor('title', {
        header: () => t('marketplace.col.product'),
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-muted/30 overflow-hidden">
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
                <p className="text-sm font-medium truncate max-w-[260px]">
                  {row.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {row.product_name}
                  </span>
                  {row.variant_condition && (
                    <>
                      <span className="text-xs text-muted-foreground/40">
                        ·
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.variant_condition}
                      </span>
                    </>
                  )}
                  {row.variant_size && (
                    <>
                      <span className="text-xs text-muted-foreground/40">
                        ·
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.variant_size}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        },
      }),

      // Price
      columnHelper.accessor('asking_price', {
        header: () => t('marketplace.col.price'),
        cell: (info) => {
          const price = info.getValue()
          return price ? (
            <span className="text-sm font-medium">
              {t('common.currencySymbol')}
              {price}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )
        },
        meta: { className: 'hidden sm:table-cell' },
      }),

      // Type
      columnHelper.accessor('listing_type', {
        header: () => t('marketplace.col.type'),
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {listingTypeLabel(info.getValue(), t)}
          </span>
        ),
        meta: { className: 'hidden md:table-cell' },
      }),

      // Status (browse only shows active, but included for consistency)
      columnHelper.accessor('status', {
        header: () => t('marketplace.col.status'),
        cell: (info) => <StatusBadge status={info.getValue()} t={t} />,
      }),
    ],
    [columnHelper, t],
  )

  // -- Table instance (no row selection for browse) --
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
        <PageHeader title={t('marketplace.browseTitle')} backTo={paths.home} />

        {/* Filters */}
        <div className="rounded-lg border border-border bg-card p-4 mb-4 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('marketplace.search')}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
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
              <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                {t('marketplace.browseEmpty')}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {t('marketplace.browseEmptyDesc')}
              </p>
            </div>
          }
        />
      </div>
    </PageLayout>
  )
}
