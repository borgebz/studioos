import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import {
  ClipboardCheck,
  Eye,
  Inbox as InboxIcon,
  PersonStanding,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import {
  EnrollmentReadStatusEnum,
  EnrollmentTypeEnum,
  type EnrollmentRead,
} from '@/api/studioos-api'
import {
  usePaginatedList,
  type PaginatedResponse,
} from '@/hooks/usePaginatedList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { useColumnFilters } from '@/components/ui/data-table-filters'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { cn } from '@/lib/utils'
import { paths } from '@/app/paths'

const REVIEWABLE_STATUSES: EnrollmentReadStatusEnum[] = [
  EnrollmentReadStatusEnum.Submitted,
  EnrollmentReadStatusEnum.UnderReview,
]

function toPaginatedResponse(data: unknown): PaginatedResponse<EnrollmentRead> {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data as EnrollmentRead[],
    }
  }
  if (data && typeof data === 'object' && 'results' in data) {
    const d = data as {
      count?: number
      next?: string | null
      previous?: string | null
      results?: unknown
    }
    const results = Array.isArray(d.results)
      ? (d.results as EnrollmentRead[])
      : []
    return {
      count: d.count ?? results.length,
      next: d.next ?? null,
      previous: d.previous ?? null,
      results,
    }
  }
  return { count: 0, next: null, previous: null, results: [] }
}

function EnrollmentStatusPill({
  status,
}: {
  status?: EnrollmentReadStatusEnum
}) {
  const { t } = useTranslation()
  if (!status) return null

  const styles: Record<EnrollmentReadStatusEnum, string> = {
    submitted:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    under_review:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    approved:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-muted text-muted-foreground',
  }

  return (
    <Badge className={cn('font-normal', styles[status])}>
      {t(`enrollmentRequests.status.${status}`)}
    </Badge>
  )
}

export function EnrollmentRequestsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const [startingReviewId, setStartingReviewId] = useState<number | null>(null)

  const handleStartReview = useCallback(
    async (row: EnrollmentRead) => {
      const target = paths.enrollmentReview.replace(':id', String(row.id))
      if (row.status === EnrollmentReadStatusEnum.UnderReview) {
        navigate(target)
        return
      }
      setStartingReviewId(row.id)
      try {
        await apiClient.api.enrollmentsStartReviewCreate(row.id)
      } catch (err) {
        // Navigate anyway — under_review is advisory.
        toast.warning(
          parseApiError(err, t) ?? t('enrollmentRequests.startReviewWarning')
        )
      } finally {
        setStartingReviewId(null)
        navigate(target)
      }
    },
    [navigate, t]
  )

  const columnHelper = useMemo(() => createColumnHelper<EnrollmentRead>(), [])

  const columns = useMemo(
    () => [
      columnHelper.accessor('created_at', {
        header: () => t('enrollmentRequests.col.submitted'),
        cell: (info) => {
          const v = info.getValue()
          if (!v) return <span className="text-muted-foreground">—</span>
          const d = new Date(v)
          return (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {format(d, 'd MMM yyyy', { locale: dateLocale })}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(d, 'HH:mm')}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor('student_name', {
        header: () => t('enrollmentRequests.col.student'),
        cell: (info) => (
          <div className="flex flex-col min-w-0 max-w-[200px]">
            <span className="font-medium truncate" title={info.getValue()}>
              {info.getValue()}
            </span>
            <span
              className="text-xs text-muted-foreground truncate"
              title={info.row.original.student_email}
            >
              {info.row.original.student_email}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('parent_name', {
        header: () => t('enrollmentRequests.col.guardian'),
        cell: (info) => (
          <div className="flex flex-col min-w-0 max-w-[200px]">
            <span className="truncate" title={info.getValue()}>
              {info.getValue()}
            </span>
            <span
              className="text-xs text-muted-foreground truncate"
              title={info.row.original.parent_email}
            >
              {info.row.original.parent_email}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.enrollment_modalities?.length ?? 0, {
        id: 'modalities',
        header: () => t('enrollmentRequests.col.modalities'),
        cell: (info) => (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <PersonStanding className="h-3.5 w-3.5" />
            <span>{info.getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor('enrollment_type', {
        header: () => t('enrollmentRequests.col.type'),
        meta: {
          filter: {
            type: 'multi-select',
            label: t('enrollmentRequests.col.type'),
            options: [
              {
                value: EnrollmentTypeEnum.New,
                label: t('enrollmentRequests.type.new'),
              },
              {
                value: EnrollmentTypeEnum.Renewal,
                label: t('enrollmentRequests.type.renewal'),
              },
            ],
          },
        },
        cell: (info) => {
          const type = info.getValue()
          if (!type) return <span className="text-muted-foreground">—</span>
          return (
            <span className="text-sm">
              {t(`enrollmentRequests.type.${type}`)}
            </span>
          )
        },
      }),
      columnHelper.accessor('status', {
        header: () => t('enrollmentRequests.col.status'),
        meta: {
          filter: {
            type: 'multi-select',
            label: t('enrollmentRequests.col.status'),
            options: [
              {
                value: EnrollmentReadStatusEnum.Submitted,
                label: t('enrollmentRequests.status.submitted'),
              },
              {
                value: EnrollmentReadStatusEnum.UnderReview,
                label: t('enrollmentRequests.status.under_review'),
              },
              {
                value: EnrollmentReadStatusEnum.Approved,
                label: t('enrollmentRequests.status.approved'),
              },
              {
                value: EnrollmentReadStatusEnum.Rejected,
                label: t('enrollmentRequests.status.rejected'),
              },
              {
                value: EnrollmentReadStatusEnum.Cancelled,
                label: t('enrollmentRequests.status.cancelled'),
              },
            ],
          },
        },
        cell: (info) => <EnrollmentStatusPill status={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: () => (
          <span className="sr-only">{t('enrollmentRequests.col.actions')}</span>
        ),
        cell: (info) => {
          const row = info.row.original
          const isReviewable = REVIEWABLE_STATUSES.includes(
            row.status ?? EnrollmentReadStatusEnum.Submitted
          )
          const target = paths.enrollmentReview.replace(':id', String(row.id))

          if (!isReviewable) {
            return (
              <TooltipProvider delayDuration={200}>
                <div className="flex justify-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('enrollmentRequests.view')}
                        onClick={() => navigate(target)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('enrollmentRequests.view')}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            )
          }

          const isUnderReview =
            row.status === EnrollmentReadStatusEnum.UnderReview
          const isLoadingRow = startingReviewId === row.id
          const label = isUnderReview
            ? t('enrollmentRequests.continueReview')
            : t('enrollmentRequests.startReview')

          return (
            <TooltipProvider delayDuration={200}>
              <div className="flex justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={label}
                      disabled={isLoadingRow}
                      onClick={() => handleStartReview(row)}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )
        },
      }),
    ],
    [columnHelper, dateLocale, handleStartReview, navigate, startingReviewId, t]
  )

  const { columnFilters, setColumnFilters } = useColumnFilters<EnrollmentRead>({
    columns,
    syncToUrl: true,
    defaultFilters: [
      {
        id: 'status',
        value: [
          EnrollmentReadStatusEnum.Submitted,
          EnrollmentReadStatusEnum.UnderReview,
        ],
      },
    ],
  })

  const statusFilter = useMemo(
    () =>
      (columnFilters.find((f) => f.id === 'status')?.value as
        | EnrollmentReadStatusEnum[]
        | undefined) ?? null,
    [columnFilters]
  )
  const typeFilter = useMemo(
    () =>
      (columnFilters.find((f) => f.id === 'enrollment_type')?.value as
        | EnrollmentTypeEnum[]
        | undefined) ?? null,
    [columnFilters]
  )
  const statusKey = statusFilter ? statusFilter.slice().sort().join(',') : ''
  const typeKey = typeFilter ? typeFilter.slice().sort().join(',') : ''

  const fetchPage = useCallback(async (): Promise<
    PaginatedResponse<EnrollmentRead>
  > => {
    const res = await apiClient.api.enrollmentsListList({
      ...(statusFilter && statusFilter.length > 0
        ? { status: statusFilter }
        : {}),
      ...(typeFilter && typeFilter.length > 0
        ? { enrollment_type: typeFilter }
        : {}),
    })
    return toPaginatedResponse(res.data)
  }, [statusFilter, typeFilter])

  const {
    items: rows,
    count,
    loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refresh,
  } = usePaginatedList<EnrollmentRead>({
    fetchPage,
    resetDeps: [statusKey, typeKey],
  })

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
        <PageHeader title={t('enrollmentRequests.title')} backTo={paths.home} />

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('enrollmentRequests.subtitle')}
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
              <span>{t('enrollmentRequests.empty')}</span>
            </div>
          }
        />
      </div>
    </PageLayout>
  )
}
