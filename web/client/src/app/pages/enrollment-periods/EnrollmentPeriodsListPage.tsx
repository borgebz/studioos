import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  CalendarRange,
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  X,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { EnrollmentPeriod } from '@/api/studioos-api'
import { PeriodTypeEnum } from '@/api/studioos-api'
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
import { parseApiError } from '@/lib/api-errors'
import { cn } from '@/lib/utils'
import { paths } from '@/app/paths'

function periodTypeLabel(t: (k: string) => string, type?: PeriodTypeEnum) {
  switch (type) {
    case PeriodTypeEnum.New:
      return t('enrollmentPeriods.type.new')
    case PeriodTypeEnum.Renewal:
      return t('enrollmentPeriods.type.renewal')
    case PeriodTypeEnum.Both:
      return t('enrollmentPeriods.type.both')
    default:
      return '—'
  }
}

export function EnrollmentPeriodsListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const canManage = can('enrollments.can_manage_periods')

  const [items, setItems] = useState<EnrollmentPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const dataLoaded = useRef(false)
  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiClient.api.enrollmentsPeriodsList().catch((err) => {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
      return null
    })
    const arr = Array.isArray(res?.data) ? res!.data : []
    setItems(arr)
    setLoading(false)
  }, [t])

  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    void load()
  }, [load])

  const handleToggle = useCallback(
    async (period: EnrollmentPeriod) => {
      setTogglingId(period.id)
      try {
        const res = period.is_open
          ? await apiClient.api.enrollmentsPeriodsCloseCreate(period.id)
          : await apiClient.api.enrollmentsPeriodsOpenCreate(period.id)
        if (res.data) {
          setItems((prev) =>
            prev.map((p) => (p.id === period.id ? res.data! : p))
          )
        }
        toast.success(
          period.is_open
            ? t('enrollmentPeriods.closeSuccess')
            : t('enrollmentPeriods.openSuccess')
        )
      } catch (err) {
        toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
      } finally {
        setTogglingId(null)
      }
    },
    [t]
  )

  const columnHelper = useMemo(
    () => createColumnHelper<EnrollmentPeriod>(),
    []
  )
  const columns = useMemo(
    () => [
      columnHelper.accessor('academic_year', {
        id: 'academic_year',
        header: () => t('enrollmentPeriods.col.academicYear'),
        cell: (info) => {
          const p = info.row.original
          if (!canManage) {
            return (
              <span className="font-medium text-foreground">
                {info.getValue()}
              </span>
            )
          }
          return (
            <button
              type="button"
              className="text-left font-medium text-foreground hover:text-primary"
              onClick={() =>
                navigate(
                  paths.enrollmentPeriodEdit.replace(':id', String(p.id))
                )
              }
            >
              {info.getValue()}
            </button>
          )
        },
      }),
      columnHelper.accessor('period_type', {
        id: 'period_type',
        header: () => t('enrollmentPeriods.col.type'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {periodTypeLabel(t, info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'window',
        header: () => t('enrollmentPeriods.col.window'),
        cell: (info) => {
          const p = info.row.original
          const s = format(new Date(p.start_date), 'd MMM yyyy', {
            locale: dateLocale,
          })
          const e = format(new Date(p.end_date), 'd MMM yyyy', {
            locale: dateLocale,
          })
          return (
            <span className="text-sm text-muted-foreground">
              {s} — {e}
            </span>
          )
        },
      }),
      columnHelper.accessor('is_open', {
        id: 'is_open',
        header: () => t('enrollmentPeriods.col.status'),
        cell: (info) => {
          const open = info.getValue()
          return (
            <Badge
              className={cn(
                'font-normal',
                open
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {open ? (
                <>
                  <Check className="size-3" />
                  {t('enrollmentPeriods.statusOpen')}
                </>
              ) : (
                <>
                  <X className="size-3" />
                  {t('enrollmentPeriods.statusClosed')}
                </>
              )}
            </Badge>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        size: 48,
        header: () => (
          <span className="sr-only">{t('enrollmentPeriods.col.actions')}</span>
        ),
        cell: (info) => {
          const p = info.row.original
          if (!canManage) return null
          const isToggling = togglingId === p.id
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('enrollmentPeriods.col.actions')}
                  disabled={isToggling}
                >
                  {isToggling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() =>
                    navigate(
                      paths.enrollmentPeriodEdit.replace(':id', String(p.id))
                    )
                  }
                >
                  <Pencil className="size-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleToggle(p)}>
                  <Power className="size-4" />
                  {p.is_open
                    ? t('enrollmentPeriods.close')
                    : t('enrollmentPeriods.open')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }),
    ],
    [columnHelper, t, dateLocale, canManage, navigate, togglingId, handleToggle]
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <PageLayout fullHeight>
      <div className="mx-auto w-full max-w-6xl flex flex-col flex-1 min-h-0">
        <PageHeader title={t('enrollmentPeriods.title')} backTo={paths.home}>
          <Authorized permission="enrollments.can_manage_periods">
            <Button onClick={() => navigate(paths.enrollmentPeriodCreate)}>
              <Plus className="h-4 w-4" />
              {t('enrollmentPeriods.create')}
            </Button>
          </Authorized>
        </PageHeader>

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('enrollmentPeriods.subtitle')}
        </p>

        <DataTable
          table={table}
          fillHeight
          loading={loading}
          totalCount={items.length}
          onRefresh={load}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-4">
              <CalendarRange className="h-6 w-6 text-muted-foreground/60" />
              <span>{t('enrollmentPeriods.empty')}</span>
            </div>
          }
        />
      </div>
    </PageLayout>
  )
}
