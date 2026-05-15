import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Store,
  DollarSign,
  CheckSquare,
  X,
} from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type RowSelectionState,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DataTable, getSelectionColumn } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { paths } from '@/app/paths'
import { StatusBadge, listingTypeLabel } from './marketplace-helpers'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SchoolListingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // -- Filters --
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // -- Data --
  const fetchPage = useCallback(
    () =>
      apiClient.api
        .marketplaceSchoolListingsRetrieve()
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

  // -- Row selection --
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // -- Bulk / delete dialogs --
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ListingList | null>(null)

  // -- Columns --
  const columnHelper = useMemo(() => createColumnHelper<ListingList>(), [])

  const columns = useMemo(
    () => [
      getSelectionColumn<ListingList>(),

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
                    <Store className="h-4 w-4 text-muted-foreground/40" />
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

      // Status
      columnHelper.accessor('status', {
        header: () => t('marketplace.col.status'),
        cell: (info) => <StatusBadge status={info.getValue()} t={t} />,
      }),

      // Actions
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
                    navigate(`${paths.schoolListings}/${row.id}`)
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

  // -- Table instance --
  const table = useReactTable({
    data: filtered,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  })

  const selectedRows = table.getSelectedRowModel().rows
  const someSelected = selectedRows.length > 0

  // -- Bulk actions --
  const handleBulkPriceApply = async () => {
    if (!newPrice) return
    const ids = selectedRows.map((r) => r.original.id)
    try {
      await Promise.all(
        ids.map((id) =>
          apiClient.api
            .marketplaceSchoolListingsPartialUpdate(id, {
              asking_price: newPrice,
            })
            .catch(() => null),
        ),
      )
      const idSet = new Set(ids)
      setListings((prev) =>
        prev.map((l) =>
          idSet.has(l.id) ? { ...l, asking_price: newPrice } : l,
        ),
      )
      toast.success(t('marketplace.bulkEditSuccess', { count: ids.length }))
      table.resetRowSelection()
      setBulkPriceOpen(false)
      setNewPrice('')
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    }
  }

  const handleBulkDelete = async () => {
    const ids = selectedRows.map((r) => r.original.id)
    try {
      await Promise.all(
        ids.map((id) =>
          apiClient.api
            .marketplaceSchoolListingsPartialUpdate(id, {
              status: 'closed' as Status421Enum,
            })
            .catch(() => null),
        ),
      )
      const idSet = new Set(ids)
      setListings((prev) => prev.filter((l) => !idSet.has(l.id)))
      toast.success(
        t('marketplace.bulkEditDeleteSuccess', { count: ids.length }),
      )
      table.resetRowSelection()
      setBulkDeleteOpen(false)
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    }
  }

  const handleSingleDelete = async () => {
    if (!deleteTarget) return
    try {
      await apiClient.api.marketplaceSchoolListingsPartialUpdate(
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
        <PageHeader title={t('schoolListings.title')} backTo={paths.home}>
          <Button onClick={() => navigate(`${paths.schoolListings}/create`)}>
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
                placeholder={t('marketplace.search')}
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

        {/* Bulk Actions Bar */}
        {someSelected && (
          <div className="sticky top-14 z-20 rounded-lg border border-primary/30 bg-card p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4 text-primary" />
              {t('marketplace.selected', { count: selectedRows.length })}
              <button
                onClick={() => table.resetRowSelection()}
                aria-label={t('marketplace.clearSelection')}
                className="ml-1 rounded-full p-1 hover:bg-muted min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkPriceOpen(true)}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                {t('marketplace.bulkEditPrice')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('marketplace.bulkEditDelete')}
              </Button>
            </div>
          </div>
        )}

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
              <Store className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                {t('schoolListings.empty')}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                {t('schoolListings.emptyDesc')}
              </p>
              <Button
                size="sm"
                onClick={() => navigate(`${paths.schoolListings}/create`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('marketplace.createListing')}
              </Button>
            </div>
          }
        />
      </div>

      {/* Bulk Price Dialog */}
      <Dialog open={bulkPriceOpen} onOpenChange={setBulkPriceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('marketplace.bulkEditPrice')}</DialogTitle>
            <DialogDescription>
              {t('marketplace.selected', { count: selectedRows.length })}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="bulkPrice">{t('marketplace.newPrice')}</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {t('common.currencySymbol')}
              </span>
              <Input
                id="bulkPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                inputMode="decimal"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="pl-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPriceOpen(false)}>
              {t('marketplace.cancel')}
            </Button>
            <Button onClick={handleBulkPriceApply} disabled={!newPrice}>
              {t('marketplace.bulkEditApply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('marketplace.bulkEditConfirmDelete', {
                count: selectedRows.length,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('marketplace.bulkEditConfirmDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('marketplace.cancel')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleBulkDelete}>
                {t('marketplace.bulkEditDelete')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
