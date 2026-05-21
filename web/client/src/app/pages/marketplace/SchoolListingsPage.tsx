import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
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
import { ListingCard } from '@/components/shared/ListingCard'
import { ListingsGridView } from '@/components/shared/ListingsGridView'
import {
  ListingsToolbar,
  type SortKey,
  type ToolbarChip,
  type ViewMode,
} from '@/components/shared/ListingsToolbar'
import { paths } from '@/app/paths'
import { StatusBadge, listingTypeLabel } from './marketplace-helpers'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function SchoolListingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [conditionFilter, setConditionFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortKey>('recent')
  const [view, setView] = useState<ViewMode>('grid')

  const sortKeyToOrdering = (key: SortKey) => {
    switch (key) {
      case 'priceAsc': return 'asking_price' as const
      case 'priceDesc': return '-asking_price' as const
      default: return '-created_at' as const
    }
  }

  const fetchPage = useCallback(() => {
    const query: {
      search?: string
      listing_type?: 'rent' | 'sell' | 'lend' | 'donate'
      status?: 'draft' | 'active' | 'closed'
      condition?: string
      ordering?: '-created_at' | 'created_at' | 'asking_price' | '-asking_price'
    } = {}
    if (search.trim()) query.search = search.trim()
    if (typeFilter !== 'all')
      query.listing_type = typeFilter as typeof query.listing_type
    if (statusFilter !== 'all')
      query.status = statusFilter as typeof query.status
    if (conditionFilter !== 'all') query.condition = conditionFilter
    query.ordering = sortKeyToOrdering(sortBy)
    return apiClient.api
      .marketplaceSchoolListingsRetrieve(query)
      .then((r) => r.data) as Promise<{
      count: number
      next: string | null
      previous: string | null
      results: ListingList[]
    }>
  }, [search, typeFilter, statusFilter, conditionFilter, sortBy])

  const {
    items: listings,
    count,
    loading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refresh,
    setItems: setListings,
  } = usePaginatedList<ListingList>({
    fetchPage,
    resetDeps: [search, typeFilter, statusFilter, conditionFilter, sortBy],
  })

  const [deleteTarget, setDeleteTarget] = useState<ListingList | null>(null)

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
                    <Store className="h-4 w-4 text-muted-foreground/40" />
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
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {listingTypeLabel(info.getValue(), t)}
          </span>
        ),
        meta: { className: 'hidden md:table-cell' },
      }),
      columnHelper.accessor('status', {
        header: () => t('marketplace.col.status'),
        cell: (info) => <StatusBadge status={info.getValue()} t={t} />,
      }),
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
                    navigate(
                      paths.marketplaceEdit.replace(':id', String(row.id)),
                    )
                  }
                >
                  <Pencil className="h-4 w-4" />
                  {t('marketplace.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(row)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
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

  const table = useReactTable({
    data: listings,
    columns,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const chips: ToolbarChip[] = useMemo(() => {
    const list: ToolbarChip[] = []
    if (typeFilter !== 'all')
      list.push({
        key: 'type',
        label: listingTypeLabel(typeFilter, t),
        onClear: () => setTypeFilter('all'),
      })
    if (statusFilter !== 'all')
      list.push({
        key: 'status',
        label: t(`marketplace.status${capitalize(statusFilter)}`, {
          defaultValue: statusFilter,
        }),
        onClear: () => setStatusFilter('all'),
      })
    if (conditionFilter !== 'all')
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
  }, [typeFilter, statusFilter, conditionFilter, searchInput, t])

  const emptyState = (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <Store className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm font-medium text-muted-foreground">
        {t('schoolListings.empty')}
      </p>
      <p className="mt-1 mb-4 text-xs text-muted-foreground/60">
        {t('schoolListings.emptyDesc')}
      </p>
      <Button
        size="sm"
        onClick={() => navigate(`${paths.schoolListings}/create`)}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('marketplace.createListing')}
      </Button>
    </div>
  )

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={t('schoolListings.title')} backTo={paths.home}>
          <Button onClick={() => navigate(`${paths.schoolListings}/create`)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('marketplace.createListing')}
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
                placeholder={t('marketplace.search')}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
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
                <SelectTrigger className="w-full sm:w-[150px]">
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
              <Select
                value={conditionFilter}
                onValueChange={setConditionFilter}
              >
                <SelectTrigger className="w-full sm:w-[170px]">
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
            </div>
          </div>
        </div>

        <ListingsToolbar
          chips={chips}
          sortBy={sortBy}
          onSortChange={setSortBy}
          view={view}
          onViewChange={setView}
        />

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
                variant="owner"
                onOpen={() =>
                  navigate(
                    paths.marketplaceEdit.replace(':id', String(item.id)),
                  )
                }
                onEdit={() =>
                  navigate(
                    paths.marketplaceEdit.replace(':id', String(item.id)),
                  )
                }
                onDelete={() => setDeleteTarget(item)}
              />
            )}
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
