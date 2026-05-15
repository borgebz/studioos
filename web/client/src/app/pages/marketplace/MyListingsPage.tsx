import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Tag,
} from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { ListingList, Status421Enum } from '@/api/studioos-api'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { paths } from '@/app/paths'
import { StatusBadge, listingTypeLabel } from './marketplace-helpers'

// ---------------------------------------------------------------------------
// My Listings — user's own listings with create / edit / delete
// ---------------------------------------------------------------------------

export function MyListingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // -- Filters --
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // -- Data (user's own listings — all statuses) --
  const fetchPage = useCallback(
    () =>
      apiClient.api
        .marketplaceListingsMineRetrieve()
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
    setItems: setListings,
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
        if (statusFilter !== 'all' && l.status !== statusFilter) return false
        return true
      }),
    [listings, search, typeFilter, statusFilter],
  )

  // -- Delete dialog --
  const [deleteTarget, setDeleteTarget] = useState<ListingList | null>(null)

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
                    <Tag className="h-4 w-4 text-muted-foreground/40" />
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

      // Status (shows draft / active / closed)
      columnHelper.accessor('status', {
        header: () => t('marketplace.col.status'),
        cell: (info) => <StatusBadge status={info.getValue()} t={t} />,
      }),

      // Actions (per-row edit / delete)
      columnHelper.display({
        id: 'actions',
        header: () => (
          <span className="sr-only">{t('marketplace.col.actions')}</span>
        ),
        size: 48,
        cell: (info) => {
          const row = info.row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">{t('marketplace.actions')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    navigate(`${paths.myListings}/${row.id}`)
                  }
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('marketplace.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(row)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('marketplace.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }),
    ],
    [columnHelper, navigate, t],
  )

  // -- Table instance (no row selection — single-row management only) --
  const table = useReactTable({
    data: filtered,
    columns,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const handleSingleDelete = async () => {
    if (!deleteTarget) return
    try {
      await apiClient.api.marketplaceListingsPartialUpdate(
        deleteTarget.id,
        { status: 'closed' as Status421Enum },
      )
      setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      toast.success(t('marketplace.deleteSuccess'))
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <PageLayout fullHeight>
      <div className="mx-auto w-full max-w-6xl flex flex-col flex-1 min-h-0">
        <PageHeader title={t('myListings.title')} backTo={paths.home}>
          <Button onClick={() => navigate(paths.marketplaceCreate)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('marketplace.createListing')}
          </Button>
        </PageHeader>

        {/* Filters */}
        <div className="rounded-lg border border-border bg-card p-4 mb-4 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('myListings.search')}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="flex-1 sm:w-[160px] sm:flex-none">
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 sm:w-[160px] sm:flex-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('marketplace.allStatuses')}
                  </SelectItem>
                  <SelectItem value="draft">
                    {t('marketplace.statusDraft')}
                  </SelectItem>
                  <SelectItem value="active">
                    {t('marketplace.statusActive')}
                  </SelectItem>
                  <SelectItem value="closed">
                    {t('marketplace.statusSold')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <Tag className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                {t('myListings.empty')}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                {t('myListings.emptyDesc')}
              </p>
              <Button
                size="sm"
                onClick={() => navigate(paths.marketplaceCreate)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('marketplace.createListing')}
              </Button>
            </div>
          }
        />
      </div>

      {/* Single Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('marketplace.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('marketplace.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('marketplace.cancel')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleSingleDelete}>
                {t('marketplace.deleteConfirm')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}
