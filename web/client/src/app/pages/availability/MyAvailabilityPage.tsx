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
  CalendarClock,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { Availability, ExpandedSlot, Modality } from '@/api/studioos-api'
import { useAuth } from '@/auth/useAuth'
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
import { PAGE_CONTENT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'

import { AvailabilityDialog } from './AvailabilityDialog'
import { DeleteAvailabilityDialog } from './DeleteAvailabilityDialog'

/** Look-ahead window — how far into the future we fetch on first paint. */
const LOOK_AHEAD_DAYS = 90

function timeRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${fmt(s)} — ${fmt(e)}`
}

/**
 * Reduce expanded slots into "logical rows" so a recurring rule appears
 * once instead of repeating 30 times. One-off slots stay 1:1.
 */
function reduceToLogicalRows(slots: ExpandedSlot[]): ExpandedSlot[] {
  const oneOffs: ExpandedSlot[] = []
  const recurringSeen = new Set<number>()
  const recurringRepresentatives: ExpandedSlot[] = []
  for (const s of slots) {
    if (s.is_recurring && s.recurring_id != null) {
      if (recurringSeen.has(s.recurring_id)) continue
      recurringSeen.add(s.recurring_id)
      recurringRepresentatives.push(s)
    } else {
      oneOffs.push(s)
    }
  }
  return [...oneOffs, ...recurringRepresentatives].sort((a, b) =>
    a.start_datetime.localeCompare(b.start_datetime)
  )
}

export function MyAvailabilityPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { can } = usePermissions()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS
  const longDatePattern = i18n.language.startsWith('pt')
    ? "EEEE, d 'de' MMMM"
    : 'EEEE, MMMM d'

  const canAdd = can('availability.add_teacheravailability')
  const canEdit = can('availability.change_teacheravailability')
  const canDelete = can('availability.delete_teacheravailability')

  const [slots, setSlots] = useState<ExpandedSlot[]>([])
  const [modalities, setModalities] = useState<Modality[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogState, setDialogState] = useState<{
    editingId: number | null
    editingIsRecurring: boolean
    open: boolean
  }>({ editingId: null, editingIsRecurring: false, open: false })
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number
    isRecurring: boolean
  } | null>(null)
  const dataLoaded = useRef(false)

  const userId = user?.id ?? null

  const load = useCallback(async () => {
    if (userId == null) return
    setLoading(true)
    const dateFrom = new Date()
    dateFrom.setHours(0, 0, 0, 0)
    const dateTo = new Date(dateFrom)
    dateTo.setDate(dateTo.getDate() + LOOK_AHEAD_DAYS)
    const [slotsRes, modsRes] = await Promise.all([
      apiClient.api
        .availabilityTeachersList(userId, {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
        })
        .catch((err) => {
          toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
          return null
        }),
      apiClient.api.modalitiesList().catch(() => null),
    ])
    setSlots(Array.isArray(slotsRes?.data) ? slotsRes!.data : [])
    setModalities(Array.isArray(modsRes?.data) ? modsRes!.data : [])
    setLoading(false)
  }, [userId, t])

  useEffect(() => {
    if (dataLoaded.current) return
    if (userId == null) return
    dataLoaded.current = true
    void load()
  }, [load, userId])

  const logicalRows = useMemo(() => reduceToLogicalRows(slots), [slots])

  const handleDeleted = (deletedId: number) => {
    setSlots((prev) =>
      prev.filter(
        (s) => s.id !== deletedId && s.recurring_id !== deletedId
      )
    )
  }

  const handleSaved = () => {
    // After create or edit, refetch — server expansions of recurring rules
    // make in-place merging fiddly.
    void load()
  }

  const columnHelper = useMemo(() => createColumnHelper<ExpandedSlot>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('start_datetime', {
        id: 'when',
        header: () => t('availability.col.when'),
        cell: (info) => {
          const slot = info.row.original
          if (slot.is_recurring) {
            return (
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-normal">
                  <Repeat className="size-3" />
                  {t('availability.recurring')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t('availability.recurringStartingHint', {
                    date: format(
                      new Date(slot.start_datetime),
                      longDatePattern,
                      { locale: dateLocale }
                    ),
                  })}
                </span>
              </div>
            )
          }
          return (
            <span className="font-medium text-foreground">
              {format(new Date(slot.start_datetime), longDatePattern, {
                locale: dateLocale,
              })}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'time',
        header: () => t('availability.col.time'),
        cell: (info) => {
          const slot = info.row.original
          return (
            <span className="text-sm text-muted-foreground tabular-nums">
              {timeRange(slot.start_datetime, slot.end_datetime)}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'modality',
        header: () => t('availability.col.modality'),
        cell: (info) => {
          const m = info.row.original.modality
          if (!m)
            return (
              <span className="text-sm text-muted-foreground italic">
                {t('availability.anyModality')}
              </span>
            )
          return <span className="text-sm">{m.name}</span>
        },
      }),
      columnHelper.accessor('notes', {
        id: 'notes',
        header: () => t('availability.col.notes'),
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
      columnHelper.display({
        id: 'actions',
        size: 48,
        header: () => (
          <span className="sr-only">{t('availability.col.actions')}</span>
        ),
        cell: (info) => {
          const slot = info.row.original
          const parentId = slot.is_recurring ? slot.recurring_id : slot.id
          if (parentId == null) return null
          if (!canEdit && !canDelete) return null
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('availability.col.actions')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canEdit && (
                  <DropdownMenuItem
                    onClick={() =>
                      setDialogState({
                        editingId: parentId,
                        editingIsRecurring: slot.is_recurring,
                        open: true,
                      })
                    }
                  >
                    <Pencil className="size-4" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        setDeleteTarget({
                          id: parentId,
                          isRecurring: slot.is_recurring,
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }),
    ],
    [columnHelper, t, longDatePattern, dateLocale, canEdit, canDelete]
  )

  const table = useReactTable({
    data: logicalRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <PageLayout fullHeight>
      <div className={cn(PAGE_CONTENT, 'flex flex-col flex-1 min-h-0')}>
        <PageHeader title={t('availability.title')} backTo={paths.home}>
          <Authorized permission="availability.add_teacheravailability">
            <Button
              size="sm"
              onClick={() =>
                setDialogState({
                  editingId: null,
                  editingIsRecurring: false,
                  open: true,
                })
              }
              disabled={!canAdd}
            >
              <Plus className="h-4 w-4" />
              {t('availability.create')}
            </Button>
          </Authorized>
        </PageHeader>

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('availability.subtitle', { days: LOOK_AHEAD_DAYS })}
        </p>

        <DataTable
          table={table}
          fillHeight
          loading={loading}
          totalCount={logicalRows.length}
          onRefresh={load}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-4">
              <CalendarClock
                className={cn('h-6 w-6 text-muted-foreground/60')}
              />
              <span>{t('availability.empty')}</span>
            </div>
          }
        />
      </div>

      {userId != null && (
        <AvailabilityDialog
          open={dialogState.open}
          userId={userId}
          editingId={dialogState.editingId}
          editingIsRecurring={dialogState.editingIsRecurring}
          modalities={modalities}
          onClose={() =>
            setDialogState({
              editingId: null,
              editingIsRecurring: false,
              open: false,
            })
          }
          onSaved={(saved: Availability) => {
            void saved
            handleSaved()
          }}
        />
      )}

      <DeleteAvailabilityDialog
        availabilityId={deleteTarget?.id ?? null}
        userId={userId}
        isRecurring={deleteTarget?.isRecurring ?? false}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </PageLayout>
  )
}
