import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ShoppingBag,
  DollarSign,
  CheckSquare,
  X,
} from 'lucide-react'
import { apiClient } from '@/api/api-client'
import type { ListingList, Status421Enum } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
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
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { paths } from '@/app/paths'
import { cn } from '@/lib/utils'

function statusBadge(status: string | undefined, t: (k: string) => string) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          {t('marketplace.statusActive')}
        </Badge>
      )
    case 'closed':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          {t('marketplace.statusSold')}
        </Badge>
      )
    default:
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          {t('marketplace.statusDraft')}
        </Badge>
      )
  }
}

function listingTypeLabel(type: string, t: (k: string) => string) {
  const map: Record<string, string> = {
    sell: t('marketplace.typeSell'),
    rent: t('marketplace.typeRent'),
    lend: t('marketplace.typeLend'),
    donate: t('marketplace.typeDonate'),
  }
  return map[type] || type
}

export function MarketplaceListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [listings, setListings] = useState<ListingList[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Selection for bulk edit
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Bulk edit dialogs
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [newPrice, setNewPrice] = useState('')

  // Single delete
  const [deleteTarget, setDeleteTarget] = useState<ListingList | null>(null)

  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      try {
        const res =
          await apiClient.marketplace.marketplaceSchoolListingsRetrieve()
        if (res.data?.results) setListings(res.data.results)
      } catch {
        // graceful — empty list
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const filtered = listings.filter((l) => {
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
  })

  const allSelected =
    filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id))
  const someSelected = selectedIds.size > 0

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)))
    }
  }, [allSelected, filtered])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkPriceApply = async () => {
    if (!newPrice) return
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          apiClient.marketplace
            .marketplaceSchoolListingsPartialUpdate(id, {
              asking_price: newPrice,
            })
            .catch(() => null),
        ),
      )
      setListings((prev) =>
        prev.map((l) =>
          selectedIds.has(l.id) ? { ...l, asking_price: newPrice } : l,
        ),
      )
      toast.success(
        t('marketplace.bulkEditSuccess', { count: selectedIds.size }),
      )
      clearSelection()
      setBulkPriceOpen(false)
      setNewPrice('')
    } catch {
      toast.error(t('marketplace.createError'))
    }
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          apiClient.marketplace
            .marketplaceSchoolListingsPartialUpdate(id, {
              status: 'closed' as Status421Enum,
            })
            .catch(() => null),
        ),
      )
      setListings((prev) => prev.filter((l) => !selectedIds.has(l.id)))
      toast.success(
        t('marketplace.bulkEditDeleteSuccess', { count: selectedIds.size }),
      )
      clearSelection()
      setBulkDeleteOpen(false)
    } catch {
      toast.error(t('marketplace.createError'))
    }
  }

  const handleSingleDelete = async () => {
    if (!deleteTarget) return
    try {
      await apiClient.marketplace.marketplaceSchoolListingsPartialUpdate(
        deleteTarget.id,
        { status: 'closed' as Status421Enum },
      )
      setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      toast.success(t('marketplace.deleteSuccess'))
    } catch {
      toast.error(t('marketplace.createError'))
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader title="Marketplace">
          <Button onClick={() => navigate(paths.marketplaceCreate)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('marketplace.createListing')}
          </Button>
        </PageHeader>

        {/* Filters Card */}
        <div className="rounded-lg border border-border bg-card p-4 mb-4">
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
          <div className="sticky top-14 z-20 rounded-lg border border-primary/30 bg-primary/5 backdrop-blur p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4 text-primary" />
              {t('marketplace.selected', { count: selectedIds.size })}
              <button
                onClick={clearSelection}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
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

        {/* Listings */}
        <div className="rounded-lg border border-border bg-card">
          {/* Header row */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label={t('marketplace.selectAll')}
            />
            <span className="text-xs text-muted-foreground">
              {t('marketplace.listingCount', {
                count: filtered.length,
              })}
            </span>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-14 w-14 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                {t('marketplace.noListings')}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                {t('marketplace.noListingsDesc')}
              </p>
              <Button
                size="sm"
                onClick={() => navigate(paths.marketplaceCreate)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('marketplace.createListing')}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((listing) => (
                <div
                  key={listing.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                    selectedIds.has(listing.id) && 'bg-primary/5',
                  )}
                >
                  <Checkbox
                    checked={selectedIds.has(listing.id)}
                    onCheckedChange={() => toggleSelect(listing.id)}
                    aria-label={`Select ${listing.title}`}
                    className="shrink-0"
                  />

                  {/* Thumbnail */}
                  <div className="h-14 w-14 shrink-0 rounded-lg border border-border bg-muted/30 overflow-hidden">
                    {listing.primary_media_url ? (
                      <img
                        src={listing.primary_media_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {listing.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {listing.product_name}
                      </span>
                      {listing.variant_condition && (
                        <>
                          <span className="text-xs text-muted-foreground/40">
                            ·
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {listing.variant_condition}
                          </span>
                        </>
                      )}
                      {listing.variant_size && (
                        <>
                          <span className="text-xs text-muted-foreground/40">
                            ·
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {listing.variant_size}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="hidden sm:block text-right shrink-0">
                    {listing.asking_price ? (
                      <span className="text-sm font-medium">
                        €{listing.asking_price}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Type badge */}
                  <span className="hidden sm:inline text-xs text-muted-foreground">
                    {listingTypeLabel(listing.listing_type, t)}
                  </span>

                  {/* Status */}
                  {statusBadge(listing.status, t)}

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(`${paths.marketplace}/${listing.id}`)
                        }
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        {t('marketplace.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(listing)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('marketplace.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Price Dialog */}
      <Dialog open={bulkPriceOpen} onOpenChange={setBulkPriceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('marketplace.bulkEditPrice')}</DialogTitle>
            <DialogDescription>
              {t('marketplace.selected', { count: selectedIds.size })}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="bulkPrice">{t('marketplace.newPrice')}</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                €
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
            <Button
              variant="outline"
              onClick={() => setBulkPriceOpen(false)}
            >
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
                count: selectedIds.size,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('marketplace.bulkEditConfirmDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('marketplace.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t('marketplace.bulkEditDelete')}
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
            <AlertDialogTitle>
              {t('marketplace.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('marketplace.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('marketplace.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSingleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t('marketplace.deleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}
