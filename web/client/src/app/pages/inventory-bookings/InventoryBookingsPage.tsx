import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Boxes,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  BookingTypeEnum,
  SchoolBookingRow,
  SchoolBookingVariantSummary,
  VariantBookingStatusEnum,
} from '@/api/studioos-api'
import { Authorized, usePermissions } from '@/auth/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { cn } from '@/lib/utils'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'

import {
  bookingStatusBadgeClass,
  bookingStatusLabel,
  bookingTypeLabel,
  BOOKING_STATUS_VALUES,
  BOOKING_TYPE_VALUES,
} from './booking-helpers'
import { BookingDialog } from './BookingDialog'
import { DeleteBookingDialog } from './DeleteBookingDialog'

function describeVariant(v: SchoolBookingVariantSummary | null): string {
  if (!v) return '—'
  const parts = [v.product_name]
  if (v.size?.name) parts.push(v.size.name)
  if (v.colors?.length) parts.push(v.colors.map((c) => c.name).join(', '))
  return parts.join(' · ')
}

export function InventoryBookingsPage() {
  const { t, i18n } = useTranslation()
  const { can } = usePermissions()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS
  // Plain "d MMM yyyy" (e.g. "23 set 2026" / "Sep 23, 2026"); we drop time of
  // day in the list since a window in days is the right granularity for the
  // back-office scan. Times are still visible in the create/edit dialog.
  const datePattern = i18n.language.startsWith('pt') ? 'd MMM yyyy' : 'MMM d, yyyy'

  const canManage = can('inventory.can_manage_variant_bookings')

  const [items, setItems] = useState<SchoolBookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolBookingRow | null>(
    null
  )
  const [typeFilter, setTypeFilter] = useState<BookingTypeEnum | undefined>()
  const [statusFilter, setStatusFilter] = useState<
    VariantBookingStatusEnum | undefined
  >()
  // Cancelled bookings are surfaced via the Status column filter (which
  // already exposes "Cancelled" as a multi-select option) so we don't need a
  // separate toggle. Default API call hides cancelled — the user can opt in
  // by selecting Cancelled in the Status filter.
  const dataLoaded = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    // The API hides cancelled rows by default — pass `include_cancelled` when
    // the user picks Cancelled in the Status column filter, otherwise the
    // server would return an empty list for that selection.
    const wantsCancelled =
      statusFilter === ('cancelled' as VariantBookingStatusEnum)
    const res = await apiClient.api
      .inventorySchoolBookingsRetrieve({
        booking_type: typeFilter,
        status: statusFilter,
        include_cancelled: wantsCancelled,
      })
      .catch((err) => {
        toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
        return null
      })
    setItems(res?.data?.results ?? [])
    setLoading(false)
  }, [t, typeFilter, statusFilter])

  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    void load()
  }, [load])

  // Re-fetch on filter changes (after initial mount).
  useEffect(() => {
    if (!dataLoaded.current) return
    void load()
  }, [load, typeFilter, statusFilter])

  const columnHelper = useMemo(() => createColumnHelper<SchoolBookingRow>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('variant_detail', {
        id: 'variant',
        header: () => t('inventoryBookings.col.variant'),
        cell: (info) => {
          const b = info.row.original
          return (
            <span className="font-medium text-foreground">
              {describeVariant(b.variant_detail)}
            </span>
          )
        },
      }),
      columnHelper.accessor('title', {
        id: 'title',
        header: () => t('inventoryBookings.col.title'),
        cell: (info) => {
          const v = (info.getValue() ?? '').trim()
          if (!v) return <span className="text-muted-foreground">—</span>
          return (
            <span className="text-sm text-muted-foreground line-clamp-1">
              {v}
            </span>
          )
        },
      }),
      columnHelper.accessor('booking_type', {
        id: 'booking_type',
        header: () => t('inventoryBookings.col.type'),
        meta: {
          filter: {
            type: 'select',
            label: t('inventoryBookings.filters.type'),
            anyLabel: t('inventoryBookings.filters.allTypes'),
            options: BOOKING_TYPE_VALUES.map((v) => ({
              value: v,
              label: bookingTypeLabel(t, v),
            })),
          },
        },
        // Plain text — only one badge per row (Status) per the design guide.
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {bookingTypeLabel(t, info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: () => t('inventoryBookings.col.status'),
        meta: {
          filter: {
            type: 'select',
            label: t('inventoryBookings.filters.status'),
            anyLabel: t('inventoryBookings.filters.allStatuses'),
            options: BOOKING_STATUS_VALUES.map((v) => ({
              value: v,
              label: bookingStatusLabel(t, v),
            })),
          },
        },
        cell: (info) => {
          const v = info.getValue()
          return (
            <Badge
              className={cn('font-normal', bookingStatusBadgeClass(v))}
            >
              {bookingStatusLabel(t, v)}
            </Badge>
          )
        },
      }),
      columnHelper.display({
        id: 'window',
        header: () => t('inventoryBookings.col.window'),
        cell: (info) => {
          const b = info.row.original
          const s = format(new Date(b.start_at), datePattern, {
            locale: dateLocale,
          })
          const e = format(new Date(b.end_at), datePattern, {
            locale: dateLocale,
          })
          // Collapse same-day windows so single-day bookings read as just one
          // date rather than "23 set 2026 → 23 set 2026".
          const label = s === e ? s : `${s} → ${e}`
          return (
            <span className="text-sm text-muted-foreground">{label}</span>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        size: 48,
        header: () => (
          <span className="sr-only">{t('inventoryBookings.col.actions')}</span>
        ),
        cell: (info) => {
          if (!canManage) return null
          const b = info.row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('inventoryBookings.col.actions')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    setEditingId(b.id)
                    setDialogOpen(true)
                  }}
                >
                  <Pencil className="size-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteTarget(b)}
                >
                  <Trash2 className="size-4" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }),
    ],
    [columnHelper, t, dateLocale, datePattern, canManage]
  )

  const table = useReactTable({
    data: items,
    columns,
    state: {
      columnFilters: [
        ...(typeFilter
          ? [{ id: 'booking_type', value: typeFilter }]
          : []),
        ...(statusFilter
          ? [{ id: 'status', value: statusFilter }]
          : []),
      ],
    },
    onColumnFiltersChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater(
              [
                ...(typeFilter
                  ? [{ id: 'booking_type', value: typeFilter }]
                  : []),
                ...(statusFilter
                  ? [{ id: 'status', value: statusFilter }]
                  : []),
              ] as { id: string; value: unknown }[]
            )
          : updater
      const typeEntry = next.find((f) => f.id === 'booking_type')
      const statusEntry = next.find((f) => f.id === 'status')
      setTypeFilter(typeEntry?.value as BookingTypeEnum | undefined)
      setStatusFilter(statusEntry?.value as VariantBookingStatusEnum | undefined)
    },
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <PageLayout fullHeight>
      <div className="mx-auto w-full max-w-6xl flex flex-col flex-1 min-h-0">
        <PageHeader title={t('inventoryBookings.title')} backTo={paths.home}>
          <Authorized permission="inventory.can_manage_variant_bookings">
            <Button
              size="sm"
              onClick={() => {
                setEditingId(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              {t('inventoryBookings.create')}
            </Button>
          </Authorized>
        </PageHeader>

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('inventoryBookings.subtitle')}
        </p>

        <DataTable
          table={table}
          fillHeight
          loading={loading}
          totalCount={items.length}
          onRefresh={load}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-4">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
              ) : (
                <Boxes className="h-6 w-6 text-muted-foreground/60" />
              )}
              <span>{t('inventoryBookings.empty')}</span>
            </div>
          }
        />
      </div>

      <BookingDialog
        open={dialogOpen}
        editingId={editingId}
        onClose={() => {
          setDialogOpen(false)
          setEditingId(null)
        }}
        onSaved={() => {
          setDialogOpen(false)
          setEditingId(null)
          void load()
        }}
      />

      <DeleteBookingDialog
        booking={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={(id) => {
          setItems((prev) => prev.filter((b) => b.id !== id))
        }}
      />
    </PageLayout>
  )
}
