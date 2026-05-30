import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale/pt'
import { Check, Inbox as InboxIcon, X } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { usePermissions } from '@/auth/permissions'
import {
  ReasonEnum,
  FineStatusEnum,
  BillingEntryStatusEnum,
  type FineDetail,
  type FineList,
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
import { PAGE_CONTENT } from '@/lib/layout'
import { paths } from '@/app/paths'
import { cn } from '@/lib/utils'

import { ApproveFineDialog } from './ApproveFineDialog'
import { WaiveFineDialog } from './WaiveFineDialog'

function studentName(student: FineList['student']): string {
  if (!student) return ''
  const full = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
  return full || student.email
}

/**
 * Combines fine.status with the linked entry's status. An approved fine whose
 * resulting charge has been cancelled is a distinct state worth surfacing.
 */
function effectiveStatusKey(fine: FineList): string {
  if (
    fine.status === FineStatusEnum.Approved &&
    fine.billing_entry?.status === BillingEntryStatusEnum.Cancelled
  ) {
    return 'approvedAndCancelled'
  }
  return fine.status
}

function StatusPill({ fine }: { fine: FineList }) {
  const { t } = useTranslation()
  const key = effectiveStatusKey(fine)

  const styles: Record<string, string> = {
    pending_review:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    waived: 'bg-muted text-muted-foreground',
    approvedAndCancelled:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }

  // Display label: "approvedAndCancelled" still shows "Aprovada" in the pill,
  // with the tooltip providing the nuance — keeps the column visually scannable.
  const labelKey =
    key === 'approvedAndCancelled' ? 'approved' : (fine.status as string)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={cn('font-normal cursor-default', styles[key])}>
          {t(`billingFines.status.${labelKey}`)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t(`billingFines.statusHint.${key}`)}</TooltipContent>
    </Tooltip>
  )
}

export function BillingFinesPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canReview = can('billing.can_review_fine')
  const currency = t('common.currencySymbol')

  const [approveTarget, setApproveTarget] = useState<FineList | null>(null)
  const [waiveTarget, setWaiveTarget] = useState<FineList | null>(null)

  const columnHelper = useMemo(() => createColumnHelper<FineList>(), [])

  const columns = useMemo(
    () => [
      columnHelper.accessor('created_at', {
        header: () => t('billingFines.col.date'),
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
        header: () => t('billingFines.col.student'),
        cell: (info) => {
          const name = info.getValue()
          const email = info.row.original.student?.email
          if (!name) {
            return (
              <span className="text-muted-foreground">
                {t('billingFines.anonymousStudent')}
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
      columnHelper.accessor((row) => row.coaching_class, {
        id: 'coaching',
        header: () => t('billingFines.col.coaching'),
        cell: (info) => {
          const coaching = info.getValue()
          if (!coaching) {
            return (
              <span className="text-muted-foreground">
                {t('billingFines.noCoaching')}
              </span>
            )
          }
          return (
            <div className="flex flex-col">
              <span className="font-medium">{coaching.modality?.name}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(coaching.start_datetime), 'd MMM yyyy HH:mm', {
                  locale: pt,
                })}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor('reason', {
        header: () => t('billingFines.col.reason'),
        meta: {
          filter: {
            type: 'multi-select',
            label: t('billingFines.col.reason'),
            options: [
              {
                value: ReasonEnum.Absence,
                label: t('billingFines.reason.absence'),
              },
              {
                value: ReasonEnum.LateCancellation,
                label: t('billingFines.reason.late_cancellation'),
              },
            ],
          },
        },
        cell: (info) => (
          <span className="text-foreground">
            {t(`billingFines.reason.${info.getValue()}`)}
          </span>
        ),
      }),
      columnHelper.accessor('amount', {
        header: () => (
          <div className="text-right">{t('billingFines.col.amount')}</div>
        ),
        cell: (info) => {
          const value = info.getValue()
          if (!value) {
            return <div className="text-right text-muted-foreground">—</div>
          }
          return (
            <div className="text-right font-medium tabular-nums">
              {currency}
              {value}
            </div>
          )
        },
      }),
      columnHelper.accessor((row) => effectiveStatusKey(row), {
        id: 'status',
        header: () => t('billingFines.col.status'),
        meta: {
          filter: {
            type: 'multi-select',
            label: t('billingFines.col.status'),
            options: [
              {
                value: FineStatusEnum.PendingReview,
                label: t('billingFines.status.pending_review'),
              },
              {
                value: FineStatusEnum.Approved,
                label: t('billingFines.status.approved'),
              },
              {
                value: FineStatusEnum.Waived,
                label: t('billingFines.status.waived'),
              },
            ],
          },
        },
        cell: (info) => (
          <TooltipProvider delayDuration={200}>
            <StatusPill fine={info.row.original} />
          </TooltipProvider>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => (
          <span className="sr-only">{t('billingFines.col.actions')}</span>
        ),
        cell: (info) => {
          const row = info.row.original
          const isPending = row.status === FineStatusEnum.PendingReview
          if (!isPending || !canReview) {
            return (
              <span className="text-xs text-muted-foreground">
                {t('billingFines.noActions')}
              </span>
            )
          }
          return (
            <TooltipProvider delayDuration={200}>
              <div className="flex justify-end gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t('billingFines.waive')}
                      onClick={() => setWaiveTarget(row)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('billingFines.waiveTooltip')}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('billingFines.approve')}
                      onClick={() => setApproveTarget(row)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('billingFines.approveTooltip')}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )
        },
      }),
    ],
    [columnHelper, t, canReview, currency]
  )

  const { columnFilters, setColumnFilters } = useColumnFilters<FineList>({
    columns,
    syncToUrl: true,
    defaultFilters: [{ id: 'status', value: [FineStatusEnum.PendingReview] }],
  })

  const statusFilter = useMemo(
    () =>
      (columnFilters.find((f) => f.id === 'status')?.value as
        | FineStatusEnum[]
        | undefined) ?? null,
    [columnFilters]
  )
  const reasonFilter = useMemo(
    () =>
      (columnFilters.find((f) => f.id === 'reason')?.value as
        | ReasonEnum[]
        | undefined) ?? null,
    [columnFilters]
  )

  const statusKey = statusFilter ? statusFilter.slice().sort().join(',') : ''
  const reasonKey = reasonFilter ? reasonFilter.slice().sort().join(',') : ''

  const fetchPage = useCallback(async (): Promise<
    PaginatedResponse<FineList>
  > => {
    const res = await apiClient.api.billingFinesList({
      ...(statusFilter && statusFilter.length > 0
        ? { status: statusFilter }
        : {}),
      ...(reasonFilter && reasonFilter.length > 0
        ? { reason: reasonFilter }
        : {}),
    })
    const items = (res.data ?? []) as unknown as FineList[]
    return {
      count: items.length,
      next: null,
      previous: null,
      results: items,
    }
  }, [statusFilter, reasonFilter])

  const {
    items: rows,
    count,
    loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refresh,
    setItems: setRows,
  } = usePaginatedList<FineList>({
    fetchPage,
    resetDeps: [statusKey, reasonKey],
  })

  const detailToList = useCallback(
    (detail: FineDetail): FineList => ({
      id: detail.id,
      reason: detail.reason,
      status: detail.status,
      amount: detail.amount,
      student: detail.student,
      coaching_class: detail.coaching_class
        ? {
            id: detail.coaching_class.id,
            start_datetime: detail.coaching_class.start_datetime,
            end_datetime: detail.coaching_class.end_datetime,
            modality: detail.coaching_class.modality,
          }
        : (null as unknown as FineList['coaching_class']),
      billing_entry: detail.billing_entry,
      reviewed_at: detail.reviewed_at,
      created_at: detail.created_at,
    }),
    []
  )

  const handleApproved = useCallback(
    (updated: FineDetail) => {
      const slim = detailToList(updated)
      setRows((prev) => {
        const next = prev.map((r) => (r.id === slim.id ? slim : r))
        if (!statusFilter || statusFilter.length === 0) return next
        return next.filter((r) => statusFilter.includes(r.status))
      })
      toast.success(t('billingFines.approveSuccess'))
    },
    [detailToList, statusFilter, t, setRows]
  )

  const handleWaived = useCallback(
    (updated: FineDetail) => {
      const slim = detailToList(updated)
      setRows((prev) => {
        const next = prev.map((r) => (r.id === slim.id ? slim : r))
        if (!statusFilter || statusFilter.length === 0) return next
        return next.filter((r) => statusFilter.includes(r.status))
      })
      toast.success(t('billingFines.waiveSuccess'))
    },
    [detailToList, statusFilter, t, setRows]
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
      <div className={cn(PAGE_CONTENT, 'flex flex-col flex-1 min-h-0')}>
        <PageHeader title={t('billingFines.title')} backTo={paths.home} />

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('billingFines.subtitle')}
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
              <span>{t('billingFines.empty')}</span>
            </div>
          }
        />
      </div>

      <ApproveFineDialog
        fine={approveTarget}
        onClose={() => setApproveTarget(null)}
        onApproved={handleApproved}
      />
      <WaiveFineDialog
        fine={waiveTarget}
        onClose={() => setWaiveTarget(null)}
        onWaived={handleWaived}
      />
    </PageLayout>
  )
}
