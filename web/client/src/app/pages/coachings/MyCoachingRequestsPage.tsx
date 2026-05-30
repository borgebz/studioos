import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  CalendarCheck2,
  Check,
  HandHelping,
  Inbox as InboxIcon,
  MessageSquarePlus,
  MoreHorizontal,
  UserMinus,
  Users,
  X,
} from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { apiClient } from '@/api/api-client'
import { useAuth } from '@/auth/useAuth'
import { usePermissions } from '@/auth/permissions'
import {
  usePaginatedList,
  type PaginatedResponse,
} from '@/hooks/usePaginatedList'
import {
  CoachingClassStatusEnum,
  type CoachingClass,
  type CoachingParticipant,
} from '@/api/studioos-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { PAGE_CONTENT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { paths } from '@/app/paths'

import { AcceptCoachingDialog } from './AcceptCoachingDialog'
import { RejectCoachingDialog } from './RejectCoachingDialog'
import { AcceptInvitationDialog } from './AcceptInvitationDialog'
import { TeacherConfirmSessionDialog } from './TeacherConfirmSessionDialog'
import { ConfirmAttendanceDialog } from './ConfirmAttendanceDialog'
import { CancelParticipationDialog } from './CancelParticipationDialog'
import { getCoachingRowActions } from './coaching-row-actions'

function userName(
  user: CoachingClass['teacher'] | CoachingClass['requested_by'] | null
): string {
  if (!user) return ''
  const full = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return full || user.email
}

/**
 * Identify the "actual student" for a guardian-filed request — the participant
 * whose `student.parent_id` matches the requester. Returns null when the
 * requester is also the student (regular flow).
 */
function dependentForRequest(coaching: CoachingClass) {
  const requester = coaching.requested_by
  if (!requester) return null
  const dep = coaching.participants?.find(
    (p) => p.student?.parent_id === requester.id
  )
  return dep?.student ?? null
}

const STATUS_STYLES: Record<string, string> = {
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

function StatusPill({ status }: { status?: CoachingClassStatusEnum }) {
  const { t } = useTranslation()
  if (!status) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className={cn('font-normal cursor-default', STATUS_STYLES[status])}
        >
          {t(`coachingRequests.status.${status}`)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {t(`coachingRequests.statusHint.${status}`)}
      </TooltipContent>
    </Tooltip>
  )
}

export function MyCoachingRequestsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { can } = usePermissions()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const userId = user?.id ?? null

  // Which user→coaching relationships to OR-filter on, based on what the
  // current user is *capable* of. A teacher who's also a student gets both.
  const forMeRoles = useMemo<
    Array<'requester' | 'teacher' | 'participant' | 'dependent'>
  >(() => {
    const roles: Array<'requester' | 'teacher' | 'participant' | 'dependent'> =
      []
    // Anyone reaching this page can request — always include self-requested.
    if (can('coachings.add_coachingclass')) roles.push('requester')
    if (can('accounts.can_teach')) roles.push('teacher')
    if (can('accounts.can_participate_in_coaching')) roles.push('participant')
    if (can('coachings.can_confirm_dependent_coaching_attendance'))
      roles.push('dependent')
    return roles
  }, [can])
  const forMeRolesKey = forMeRoles.slice().sort().join(',')

  // -------------------------------------------------------------------------
  // Row-action dialog targets. Each one holds either { coaching } or
  // { coaching, participant, onBehalfOf } depending on whether the endpoint
  // is at the coaching level or the participant level.
  // -------------------------------------------------------------------------

  type ParticipantTarget = {
    coaching: CoachingClass
    participant: CoachingParticipant
    onBehalfOf: number | null
  }
  type AttendanceTarget = ParticipantTarget & { attended: boolean }

  const [acceptTarget, setAcceptTarget] = useState<CoachingClass | null>(null)
  const [rejectTarget, setRejectTarget] = useState<CoachingClass | null>(null)
  const [teacherConfirmTarget, setTeacherConfirmTarget] =
    useState<CoachingClass | null>(null)
  const [acceptInviteTarget, setAcceptInviteTarget] =
    useState<ParticipantTarget | null>(null)
  const [attendanceTarget, setAttendanceTarget] =
    useState<AttendanceTarget | null>(null)
  const [cancelParticipationTarget, setCancelParticipationTarget] =
    useState<ParticipantTarget | null>(null)

  const actorCtx = useMemo(
    () => ({
      userId: userId ?? -1,
      canTeach: can('accounts.can_teach'),
      canParticipate: can('accounts.can_participate_in_coaching'),
      canGuardian: can('coachings.can_confirm_dependent_coaching_attendance'),
    }),
    [userId, can]
  )

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
        cell: (info) => {
          const dep = dependentForRequest(info.row.original)
          return (
            <div className="flex flex-col">
              <span className="font-medium">{info.getValue()}</span>
              <span className="text-xs text-muted-foreground">
                {t('coachingRequests.withTeacher', {
                  name: userName(info.row.original.teacher),
                })}
              </span>
              {dep && (
                <span className="text-xs text-muted-foreground">
                  {t('coachingRequests.forDependent', { name: userName(dep) })}
                </span>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor((row) => row.studio?.name ?? '', {
        id: 'studio',
        header: () => t('coachingRequests.col.studio'),
        cell: (info) => {
          const name = info.getValue()
          if (!name) return <span className="text-muted-foreground">—</span>
          return <span>{name}</span>
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
              {
                value: CoachingClassStatusEnum.Requested,
                label: t('coachingRequests.status.requested'),
              },
              {
                value: CoachingClassStatusEnum.PendingApproval,
                label: t('coachingRequests.status.pending_approval'),
              },
              {
                value: CoachingClassStatusEnum.Scheduled,
                label: t('coachingRequests.status.scheduled'),
              },
              {
                value: CoachingClassStatusEnum.WaitingConfirmation,
                label: t('coachingRequests.status.waiting_confirmation'),
              },
              {
                value: CoachingClassStatusEnum.PendingCompletionApproval,
                label: t(
                  'coachingRequests.status.pending_completion_approval'
                ),
              },
              {
                value: CoachingClassStatusEnum.Completed,
                label: t('coachingRequests.status.completed'),
              },
              {
                value: CoachingClassStatusEnum.Cancelled,
                label: t('coachingRequests.status.cancelled'),
              },
              {
                value: CoachingClassStatusEnum.Rejected,
                label: t('coachingRequests.status.rejected'),
              },
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
          if (actorCtx.userId === -1) return null
          const row = info.row.original
          const a = getCoachingRowActions(row, actorCtx)
          const participantTarget =
            a.participant != null
              ? {
                  coaching: row,
                  participant: a.participant,
                  onBehalfOf: a.onBehalfOf,
                }
              : null

          const anyTeacherAction =
            a.teacherAccept || a.teacherReject || a.teacherConfirmSession
          const anyParticipantAction =
            a.participantAcceptInvite ||
            a.participantConfirmAttendance ||
            a.participantCancel

          if (!anyTeacherAction && !anyParticipantAction) return null

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
                {a.teacherAccept && (
                  <DropdownMenuItem onClick={() => setAcceptTarget(row)}>
                    <HandHelping className="h-4 w-4 mr-2" />
                    {t('coachingRequests.accept')}
                  </DropdownMenuItem>
                )}
                {a.teacherConfirmSession && (
                  <DropdownMenuItem
                    onClick={() => setTeacherConfirmTarget(row)}
                  >
                    <CalendarCheck2 className="h-4 w-4 mr-2" />
                    {t('myCoachings.actions.teacherConfirm')}
                  </DropdownMenuItem>
                )}
                {a.participantAcceptInvite && participantTarget && (
                  <DropdownMenuItem
                    onClick={() => setAcceptInviteTarget(participantTarget)}
                  >
                    <HandHelping className="h-4 w-4 mr-2" />
                    {t('myCoachings.actions.acceptInvite')}
                  </DropdownMenuItem>
                )}
                {a.participantConfirmAttendance && participantTarget && (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        setAttendanceTarget({
                          ...participantTarget,
                          attended: true,
                        })
                      }
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t('myCoachings.actions.markAttended')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setAttendanceTarget({
                          ...participantTarget,
                          attended: false,
                        })
                      }
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('myCoachings.actions.markAbsent')}
                    </DropdownMenuItem>
                  </>
                )}
                {(a.teacherAccept || a.participantAcceptInvite) &&
                  (a.teacherReject || a.participantCancel) && (
                    <DropdownMenuSeparator />
                  )}
                {a.teacherReject && (
                  <DropdownMenuItem
                    onClick={() => setRejectTarget(row)}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('coachingRequests.reject')}
                  </DropdownMenuItem>
                )}
                {a.participantCancel && participantTarget && (
                  <DropdownMenuItem
                    onClick={() =>
                      setCancelParticipationTarget(participantTarget)
                    }
                    className="text-destructive"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    {t('myCoachings.actions.cancelParticipation')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }),
    ],
    [columnHelper, dateLocale, t, actorCtx]
  )

  const { columnFilters, setColumnFilters } = useColumnFilters<CoachingClass>({
    columns,
    syncToUrl: true,
  })

  const statusFilter = useMemo(
    () =>
      (columnFilters.find((f) => f.id === 'status')?.value as
        | CoachingClassStatusEnum[]
        | undefined) ?? null,
    [columnFilters]
  )
  const statusKey = statusFilter ? statusFilter.slice().sort().join(',') : ''

  const [pageState] = useState({ ready: userId !== null })

  const fetchPage = useCallback(async (): Promise<
    PaginatedResponse<CoachingClass>
  > => {
    if (userId === null || forMeRoles.length === 0) {
      return { count: 0, next: null, previous: null, results: [] }
    }
    const res = await apiClient.api.getAllCoachings({
      for_me_roles: forMeRoles,
      ...(statusFilter && statusFilter.length > 0
        ? { status: statusFilter }
        : {}),
    })
    return res.data
  }, [userId, statusFilter, forMeRoles])

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
    resetDeps: [userId, statusKey, forMeRolesKey],
  })

  // Patch a coaching row in-place. Used by every mutation handler so the table
  // updates without a network round-trip.
  const patchCoaching = useCallback(
    (updated: CoachingClass) => {
      setRows((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      )
    },
    [setRows]
  )

  // Patch a single participant row inside a coaching.
  const patchParticipant = useCallback(
    (coachingId: number, updatedParticipant: CoachingParticipant) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === coachingId
            ? {
                ...r,
                participants: (r.participants ?? []).map((p) =>
                  p.id === updatedParticipant.id ? updatedParticipant : p
                ),
              }
            : r
        )
      )
    },
    [setRows]
  )

  const handleAccepted = useCallback(
    (updated: CoachingClass) => {
      patchCoaching(updated)
      toast.success(t('coachingRequests.acceptSuccess'))
    },
    [patchCoaching, t]
  )

  const handleRejected = useCallback(
    (updated: CoachingClass) => {
      patchCoaching(updated)
      toast.success(t('coachingRequests.rejectSuccess'))
    },
    [patchCoaching, t]
  )

  const handleTeacherConfirmed = useCallback(
    (updated: CoachingClass) => {
      patchCoaching(updated)
      toast.success(t('myCoachings.teacherConfirm.success'))
    },
    [patchCoaching, t]
  )

  const handleInviteAccepted = useCallback(
    (participant: CoachingParticipant) => {
      if (acceptInviteTarget) {
        patchParticipant(acceptInviteTarget.coaching.id, participant)
      }
      toast.success(t('myCoachings.acceptInvite.success'))
    },
    [acceptInviteTarget, patchParticipant, t]
  )

  const handleAttendanceConfirmed = useCallback(
    (participant: CoachingParticipant) => {
      if (attendanceTarget) {
        patchParticipant(attendanceTarget.coaching.id, participant)
      }
      toast.success(t('myCoachings.confirmAttendance.success'))
    },
    [attendanceTarget, patchParticipant, t]
  )

  const handleParticipationCancelled = useCallback(
    (participant: CoachingParticipant) => {
      if (cancelParticipationTarget) {
        patchParticipant(cancelParticipationTarget.coaching.id, participant)
      }
      toast.success(t('myCoachings.cancelParticipation.success'))
    },
    [cancelParticipationTarget, patchParticipant, t]
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
      <div className={cn(PAGE_CONTENT, 'flex flex-1 min-h-0 flex-col')}>
        <PageHeader
          title={t('myCoachingRequests.title')}
          backTo={paths.calendar}
        >
          <Button size="sm" onClick={() => navigate(paths.coachingsRequest)}>
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            {t('nav.requestCoaching')}
          </Button>
        </PageHeader>

        <p className="-mt-4 mb-6 shrink-0 text-sm text-muted-foreground">
          {t('myCoachingRequests.subtitle')}
        </p>

        <DataTable
          table={table}
          fillHeight
          loading={loading || !pageState.ready}
          totalCount={count}
          onRefresh={refresh}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          emptyMessage={
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <InboxIcon className="h-8 w-8 text-muted-foreground/60" />
              <span className="text-sm text-muted-foreground">
                {t('myCoachingRequests.empty')}
              </span>
              <Button
                size="sm"
                onClick={() => navigate(paths.coachingsRequest)}
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                {t('nav.requestCoaching')}
              </Button>
            </div>
          }
        />
      </div>
    </PageLayout>
  )
}
