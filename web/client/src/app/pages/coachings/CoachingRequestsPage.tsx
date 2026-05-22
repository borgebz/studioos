import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { Check, HandHelping, MoreHorizontal, Pencil, Users, X, Inbox as InboxIcon } from 'lucide-react'
import { useNavigate, generatePath } from 'react-router-dom'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { usePermissions } from '@/auth/permissions'
import { CoachingClassStatusEnum, type CoachingClass } from '@/api/studioos-api'
import {
  usePaginatedList,
  type PaginatedResponse,
} from '@/hooks/usePaginatedList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { cn } from '@/lib/utils'

import { AcceptCoachingDialog } from './AcceptCoachingDialog'
import { ApproveCoachingDialog } from './ApproveCoachingDialog'
import { RejectCoachingDialog } from './RejectCoachingDialog'
import { paths } from '@/app/paths'

function userName(
  user: CoachingClass['teacher'] | CoachingClass['requested_by'] | null
): string {
  if (!user) return ''
  const full = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return full || user.email
}

function StatusPill({ status }: { status?: CoachingClassStatusEnum }) {
  const { t } = useTranslation()
  if (!status) return null

  const styles: Record<string, string> = {
    requested:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    pending_approval:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    scheduled:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    waiting_confirmation:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    pending_completion_approval:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-muted text-muted-foreground',
    cancelled: 'bg-muted text-muted-foreground',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={cn('font-normal cursor-default', styles[status])}>
          {t(`coachingRequests.status.${status}`)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {t(`coachingRequests.statusHint.${status}`)}
      </TooltipContent>
    </Tooltip>
  )
}

export function CoachingRequestsPage() {
  const { t, i18n } = useTranslation()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS
  const canManage = can('coachings.change_coachingclass')
  const canAccept = can('coachings.can_accept_coaching_as_teacher')

  const [acceptTarget, setAcceptTarget] = useState<CoachingClass | null>(null)
  const [approveTarget, setApproveTarget] = useState<CoachingClass | null>(null)
  const [rejectTarget, setRejectTarget] = useState<CoachingClass | null>(null)

  const columnHelper = useMemo(() => createColumnHelper<CoachingClass>(), [])

  const columns = useMemo(
    () => [
      columnHelper.accessor('start_datetime', {
        header: () => t('coachingRequests.col.when'),
        cell: (info) => {
          const startStr = info.getValue()
          const endStr = info.row.original.end_datetime
          if (!startStr) {
            return <span className="text-muted-foreground">—</span>
          }
          const start = new Date(startStr)
          const end = endStr ? new Date(endStr) : null
          return (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {format(start, 'EEE d MMM', { locale: dateLocale })}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(start, 'HH:mm')}
                {end ? ` – ${format(end, 'HH:mm')}` : ''}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor((row) => row.modality?.name ?? '', {
        id: 'modality',
        header: () => t('coachingRequests.col.modality'),
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-medium">{info.getValue()}</span>
            <span className="text-xs text-muted-foreground">
              {t('coachingRequests.withTeacher', {
                name: userName(info.row.original.teacher),
              })}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.studio?.name ?? '', {
        id: 'studio',
        header: () => t('coachingRequests.col.studio'),
        cell: (info) => {
          const name = info.getValue()
          if (!name) {
            return <span className="text-muted-foreground">—</span>
          }
          return <span>{name}</span>
        },
      }),
      columnHelper.accessor((row) => userName(row.requested_by), {
        id: 'requested_by',
        header: () => t('coachingRequests.col.requestedBy'),
        cell: (info) => {
          const requester = info.row.original.requested_by
          if (!requester) {
            return (
              <span className="text-muted-foreground">
                {t('coachingRequests.scheduledByStaff')}
              </span>
            )
          }
          return <span>{info.getValue()}</span>
        },
      }),
      columnHelper.accessor((row) => row.participants?.length ?? 0, {
        id: 'participants',
        header: () => t('coachingRequests.col.participants'),
        cell: (info) => (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{info.getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: () => t('coachingRequests.col.status'),
        meta: {
          filter: {
            type: 'multi-select',
            label: t('coachingRequests.col.status'),
            options: [
              { value: CoachingClassStatusEnum.Requested, label: t('coachingRequests.status.requested') },
              { value: CoachingClassStatusEnum.PendingApproval, label: t('coachingRequests.status.pending_approval') },
              { value: CoachingClassStatusEnum.Scheduled, label: t('coachingRequests.status.scheduled') },
              { value: CoachingClassStatusEnum.WaitingConfirmation, label: t('coachingRequests.status.waiting_confirmation') },
              { value: CoachingClassStatusEnum.PendingCompletionApproval, label: t('coachingRequests.status.pending_completion_approval') },
              { value: CoachingClassStatusEnum.Completed, label: t('coachingRequests.status.completed') },
              { value: CoachingClassStatusEnum.Cancelled, label: t('coachingRequests.status.cancelled') },
              { value: CoachingClassStatusEnum.Rejected, label: t('coachingRequests.status.rejected') },
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
        size: 48,
        header: () => (
          <span className="sr-only">{t('coachingRequests.col.actions')}</span>
        ),
        cell: (info) => {
          const row = info.row.original
          const status = row.status ?? CoachingClassStatusEnum.Requested
          const isRequested = status === CoachingClassStatusEnum.Requested
          const isPendingApproval =
            status === CoachingClassStatusEnum.PendingApproval

          const showAccept = isRequested && canAccept
          const showApprove = isPendingApproval && canManage
          const showReject = (isRequested || isPendingApproval) && canManage
          const isTerminal =
            status === CoachingClassStatusEnum.Completed ||
            status === CoachingClassStatusEnum.Cancelled ||
            status === CoachingClassStatusEnum.Rejected
          const showEdit = canManage && !isTerminal

          if (!showAccept && !showApprove && !showReject && !showEdit)
            return null
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">
                    {t('coachingRequests.col.actions')}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {showAccept && (
                  <DropdownMenuItem onClick={() => setAcceptTarget(row)}>
                    <HandHelping className="h-4 w-4 mr-2" />
                    {t('coachingRequests.accept')}
                  </DropdownMenuItem>
                )}
                {showApprove && (
                  <DropdownMenuItem onClick={() => setApproveTarget(row)}>
                    <Check className="h-4 w-4 mr-2" />
                    {t('coachingRequests.approve')}
                  </DropdownMenuItem>
                )}
                {showEdit && (
                  <DropdownMenuItem
                    onClick={() =>
                      navigate(
                        generatePath(paths.coachingsEdit, { id: String(row.id) }),
                      )
                    }
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('coachingRequests.edit')}
                  </DropdownMenuItem>
                )}
                {showReject && (
                  <DropdownMenuItem
                    onClick={() => setRejectTarget(row)}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('coachingRequests.reject')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }),
    ],
    [columnHelper, dateLocale, t, canManage, canAccept, navigate]
  )

  const { columnFilters, setColumnFilters } = useColumnFilters<CoachingClass>({
    columns,
    syncToUrl: true,
    defaultFilters: [
      {
        id: 'status',
        value: [
          CoachingClassStatusEnum.Requested,
          CoachingClassStatusEnum.PendingApproval,
        ],
      },
    ],
  })

  const statusFilter = useMemo(
    () =>
      (columnFilters.find((f) => f.id === 'status')?.value as
        | CoachingClassStatusEnum[]
        | undefined) ?? null,
    [columnFilters],
  )
  const statusKey = statusFilter ? statusFilter.slice().sort().join(',') : ''

  const fetchPage = useCallback(async (): Promise<
    PaginatedResponse<CoachingClass>
  > => {
    const res = await apiClient.api.getAllCoachings(
      statusFilter && statusFilter.length > 0
        ? { status: statusFilter }
        : {},
    )
    return res.data
  }, [statusFilter])

  const {
    items: rows,
    count,
    loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refresh,
    setItems: setRows,
  } = usePaginatedList<CoachingClass>({
    fetchPage,
    resetDeps: [statusKey],
  })

  const filterAfterMutation = useCallback(
    (next: CoachingClass[]) => {
      if (!statusFilter || statusFilter.length === 0) return next
      return next.filter((r) =>
        statusFilter.includes(r.status ?? CoachingClassStatusEnum.Requested),
      )
    },
    [statusFilter],
  )

  const handleAccepted = useCallback(
    (updated: CoachingClass) => {
      setRows((prev) =>
        filterAfterMutation(prev.map((r) => (r.id === updated.id ? updated : r))),
      )
      toast.success(t('coachingRequests.acceptSuccess'))
    },
    [filterAfterMutation, t, setRows],
  )

  const handleApproved = useCallback(
    (updated: CoachingClass) => {
      setRows((prev) =>
        filterAfterMutation(prev.map((r) => (r.id === updated.id ? updated : r))),
      )
      toast.success(t('coachingRequests.approveSuccess'))
    },
    [filterAfterMutation, t, setRows],
  )

  const handleRejected = useCallback(
    (updated: CoachingClass) => {
      setRows((prev) =>
        filterAfterMutation(prev.map((r) => (r.id === updated.id ? updated : r))),
      )
      toast.success(t('coachingRequests.rejectSuccess'))
    },
    [filterAfterMutation, t, setRows],
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
        <PageHeader title={t('coachingRequests.title')} backTo={paths.home} />

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('coachingRequests.subtitle')}
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
              <span>{t('coachingRequests.empty')}</span>
            </div>
          }
        />
      </div>

      <AcceptCoachingDialog
        coaching={acceptTarget}
        onClose={() => setAcceptTarget(null)}
        onAccepted={handleAccepted}
      />
      <ApproveCoachingDialog
        coaching={approveTarget}
        onClose={() => setApproveTarget(null)}
        onApproved={handleApproved}
      />
      <RejectCoachingDialog
        coaching={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onRejected={handleRejected}
      />
    </PageLayout>
  )
}
