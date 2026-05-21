import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale/pt'
import { Ban, Inbox as InboxIcon } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { usePermissions } from '@/auth/permissions'
import {
  SourceTypeEnum,
  BillingEntryStatusEnum,
  type BillingEntryDetail,
  type BillingEntryList,
} from '@/api/studioos-api'
import {
  usePaginatedList,
  type PaginatedResponse,
} from '@/hooks/usePaginatedList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTable } from '@/components/ui/data-table'
import { useColumnFilters } from '@/components/ui/data-table-filters'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { paths } from '@/app/paths'
import { cn } from '@/lib/utils'

import { CancelBillingEntryDialog } from './CancelBillingEntryDialog'

function studentName(student: BillingEntryList['student']): string {
  if (!student) return ''
  const full = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
  return full || student.email
}

function StatusPill({ status }: { status: BillingEntryStatusEnum }) {
  const { t } = useTranslation()

  const styles: Record<BillingEntryStatusEnum, string> = {
    [BillingEntryStatusEnum.Pending]:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    [BillingEntryStatusEnum.Exported]:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    [BillingEntryStatusEnum.Cancelled]: 'bg-muted text-muted-foreground',
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={cn('font-normal cursor-default', styles[status])}>
          {t(`billing.status.${status}`)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t(`billing.statusHint.${status}`)}</TooltipContent>
    </Tooltip>
  )
}


export function BillingEntriesPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canCancel = can('billing.can_cancel_billingentry')
  const currency = t('common.currencySymbol')

  const [cancelTarget, setCancelTarget] = useState<BillingEntryList | null>(
    null,
  )

  const columnHelper = useMemo(
    () => createColumnHelper<BillingEntryList>(),
    [],
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('created_at', {
        header: () => t('billing.col.date'),
        cell: (info) => {
          const dt = new Date(info.getValue())
          return (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {format(dt, 'd MMM yyyy', { locale: pt })}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(dt, 'HH:mm')}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor((row) => studentName(row.student), {
        id: 'student',
        header: () => t('billing.col.student'),
        cell: (info) => {
          const name = info.getValue()
          const email = info.row.original.student?.email
          if (!name) {
            return (
              <span className="text-muted-foreground">
                {t('billing.anonymousStudent')}
              </span>
            )
          }
          return (
            <div className="flex flex-col">
              <span className="font-medium">{name}</span>
              {email && email !== name && (
                <span className="text-xs text-muted-foreground">{email}</span>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor('description', {
        header: () => t('billing.col.description'),
        cell: (info) => (
          <span
            className="block max-w-[420px] truncate text-foreground"
            title={info.getValue()}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('source_type', {
        header: () => t('billing.col.source'),
        meta: {
          filter: {
            type: 'select',
            label: t('billing.col.source'),
            anyLabel: t('billing.filter.allSources'),
            options: [
              { value: SourceTypeEnum.Coaching, label: t('billing.source.coaching') },
              { value: SourceTypeEnum.Fine, label: t('billing.source.fine') },
              { value: SourceTypeEnum.Marketplace, label: t('billing.source.marketplace') },
            ],
          },
        },
        cell: (info) => (
          <span className="text-foreground">
            {t(`billing.source.${info.getValue()}`)}
          </span>
        ),
      }),
      columnHelper.accessor('amount_due', {
        header: () => (
          <div className="text-right">{t('billing.col.amount')}</div>
        ),
        cell: (info) => (
          <div className="text-right font-medium tabular-nums">
            {currency}
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: () => t('billing.col.status'),
        meta: {
          filter: {
            type: 'select',
            label: t('billing.col.status'),
            anyLabel: t('billing.filter.allStatuses'),
            options: [
              { value: BillingEntryStatusEnum.Pending, label: t('billing.status.pending') },
              { value: BillingEntryStatusEnum.Exported, label: t('billing.status.exported') },
              { value: BillingEntryStatusEnum.Cancelled, label: t('billing.status.cancelled') },
            ],
          },
        },
        cell: (info) => (
          <TooltipProvider delayDuration={200}>
            <StatusPill status={info.getValue()} />
          </TooltipProvider>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => (
          <span className="sr-only">{t('billing.col.actions')}</span>
        ),
        cell: (info) => {
          const row = info.row.original
          const isPending = row.status === BillingEntryStatusEnum.Pending
          if (!isPending || !canCancel) {
            return (
              <span className="text-xs text-muted-foreground">
                {t('billing.noActions')}
              </span>
            )
          }
          return (
            <TooltipProvider delayDuration={200}>
              <div className="flex justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t('billing.cancel')}
                      onClick={() => setCancelTarget(row)}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('billing.cancelTooltip')}</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )
        },
      }),
    ],
    [columnHelper, t, canCancel, currency],
  )

  const { columnFilters, setColumnFilters } = useColumnFilters<BillingEntryList>({
    columns,
    syncToUrl: true,
    defaultFilters: [{ id: 'status', value: BillingEntryStatusEnum.Pending }],
  })

  const statusFilter =
    (columnFilters.find((f) => f.id === 'status')?.value as
      | BillingEntryStatusEnum
      | undefined) ?? null
  const sourceFilter =
    (columnFilters.find((f) => f.id === 'source_type')?.value as
      | SourceTypeEnum
      | undefined) ?? null

  const fetchPage = useCallback(async (): Promise<
    PaginatedResponse<BillingEntryList>
  > => {
    const res = await apiClient.api.billingEntriesList({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(sourceFilter ? { source_type: sourceFilter } : {}),
    })
    const items = (res.data ?? []) as unknown as BillingEntryList[]
    return {
      count: items.length,
      next: null,
      previous: null,
      results: items,
    }
  }, [statusFilter, sourceFilter])

  const {
    items: rows,
    count,
    loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refresh,
    setItems: setRows,
  } = usePaginatedList<BillingEntryList>({
    fetchPage,
    resetDeps: [statusFilter, sourceFilter],
  })

  const handleCancelled = useCallback(
    (updated: BillingEntryDetail) => {
      setRows((prev) => {
        const slim: BillingEntryList = {
          id: updated.id,
          source_type: updated.source_type,
          student: updated.student,
          amount_due: updated.amount_due,
          description: updated.description,
          status: updated.status,
          coaching_class: updated.coaching_class
            ? {
                id: updated.coaching_class.id,
                start_datetime: updated.coaching_class.start_datetime,
                end_datetime: updated.coaching_class.end_datetime,
                modality: updated.coaching_class.modality,
              }
            : null,
          fine: updated.fine,
          created_at: updated.created_at,
        }
        const next = prev.map((r) => (r.id === slim.id ? slim : r))
        if (!statusFilter) return next
        return next.filter((r) => r.status === statusFilter)
      })
      toast.success(t('billing.cancelSuccess'))
    },
    [statusFilter, t, setRows],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <PageLayout fullHeight>
      <div className="mx-auto w-full max-w-6xl flex flex-col flex-1 min-h-0">
        <PageHeader title={t('billing.title')} backTo={paths.home} />

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('billing.subtitle')}
        </p>

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
            <div className="flex flex-col items-center gap-2 py-4">
              <InboxIcon className="h-6 w-6 text-muted-foreground/60" />
              <span>{t('billing.empty')}</span>
            </div>
          }
        />
      </div>

      <CancelBillingEntryDialog
        entry={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={handleCancelled}
      />
    </PageLayout>
  )
}
