import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { Eye, Mail, Pencil, Plus, UserX, Users as UsersIcon } from 'lucide-react'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { Authorized, usePermissions } from '@/auth/permissions'
import type { RoleList, UserResponse } from '@/api/studioos-api'
import {
  usePaginatedList,
  type PaginatedResponse,
} from '@/hooks/usePaginatedList'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'

import { DeactivateUserDialog } from './DeactivateUserDialog'

type StatusFilter = 'all' | 'active' | 'inactive'

function userName(user: UserResponse): string {
  const full = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return user.display_name || full || user.email
}

function RolesText({ roles }: { roles: UserResponse['role'] }) {
  const { t } = useTranslation()
  if (!roles || roles.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">{t('users.noRole')}</span>
    )
  }
  return (
    <span className="text-sm text-foreground truncate" title={roles.map((r) => r.name).join(', ')}>
      {roles.map((r) => r.name).join(', ')}
    </span>
  )
}

function StatusPill({ active }: { active?: boolean }) {
  const { t } = useTranslation()
  return (
    <Badge
      className={cn(
        'font-normal',
        active
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {active ? t('users.status.active') : t('users.status.inactive')}
    </Badge>
  )
}

import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export function UsersListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const canEdit = can('accounts.change_user')
  const canDeactivate = can('accounts.can_deactivate_user')
  const canResendInvite = can('accounts.can_invite_user')

  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const [roles, setRoles] = useState<RoleList[]>([])
  const rolesLoaded = useRef(false)

  const [deactivateTarget, setDeactivateTarget] =
    useState<UserResponse | null>(null)
  const [resendingId, setResendingId] = useState<number | null>(null)

  useEffect(() => {
    if (rolesLoaded.current) return
    rolesLoaded.current = true
    apiClient.api
      .rolesList()
      .then((res) => setRoles(res.data ?? []))
      .catch(() => null)
  }, [])

  const fetchPage = useCallback(async (): Promise<
    PaginatedResponse<UserResponse>
  > => {
    const query: {
      search?: string
      is_active?: boolean
      role_code?: string
    } = {}
    if (search.trim()) query.search = search.trim()
    if (statusFilter === 'active') query.is_active = true
    if (statusFilter === 'inactive') query.is_active = false
    if (roleFilter !== 'all') query.role_code = roleFilter
    const res = await apiClient.api.listUsers(query)
    return res.data
  }, [search, statusFilter, roleFilter])

  const {
    items: rows,
    count,
    loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refresh,
    setItems: setRows,
  } = usePaginatedList<UserResponse>({
    fetchPage,
    resetDeps: [search, statusFilter, roleFilter],
  })

  const handleResendInvite = async (user: UserResponse) => {
    setResendingId(user.id)
    try {
      await apiClient.api.accountsUsersResendInviteCreate(user.id)
      toast.success(t('users.resendInviteSuccess'))
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setResendingId(null)
    }
  }

  const handleDeactivated = useCallback(
    (updated: UserResponse) => {
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    },
    [setRows],
  )

  const columnHelper = useMemo(() => createColumnHelper<UserResponse>(), [])

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => userName(row), {
        id: 'user',
        header: () => t('users.col.user'),
        cell: (info) => {
          const user = info.row.original
          const name = userName(user)
          return (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-8 w-8 shrink-0">
                {user.photo_url && (
                  <AvatarImage src={user.photo_url} alt={name} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-foreground truncate">
                  {name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user.email}
                </span>
              </div>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'role',
        header: () => t('users.col.role'),
        cell: (info) => <RolesText roles={info.row.original.role} />,
      }),
      columnHelper.accessor(
        (row) =>
          [row.phone_country_code, row.phone].filter(Boolean).join(' ').trim(),
        {
          id: 'phone',
          header: () => t('users.col.phone'),
          cell: (info) => {
            const value = info.getValue()
            return value ? (
              <span className="text-sm text-foreground">{value}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          },
        },
      ),
      columnHelper.accessor('created_at', {
        id: 'joined',
        header: () => t('users.col.joined'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(info.getValue()), 'd MMM yyyy', {
              locale: dateLocale,
            })}
          </span>
        ),
      }),
      columnHelper.accessor('is_active', {
        id: 'status',
        header: () => t('users.col.status'),
        cell: (info) => <StatusPill active={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        size: 140,
        header: () => (
          <span className="sr-only">{t('users.col.actions')}</span>
        ),
        cell: (info) => {
          const user = info.row.original
          const showResend = canResendInvite && user.is_active === false
          const showDeactivate = canDeactivate && user.is_active !== false
          return (
            <TooltipProvider delayDuration={200}>
              <div className="flex justify-end gap-1">
                {showResend && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={resendingId === user.id}
                        aria-label={t('users.rowActions.resendInvite')}
                        onClick={() => handleResendInvite(user)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('users.rowActions.resendInvite')}
                    </TooltipContent>
                  </Tooltip>
                )}
                {showDeactivate && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t('users.rowActions.deactivate')}
                        onClick={() => setDeactivateTarget(user)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('users.rowActions.deactivate')}
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('users.rowActions.view')}
                      onClick={() =>
                        navigate(
                          paths.userDetail.replace(':id', String(user.id)),
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('users.rowActions.view')}
                  </TooltipContent>
                </Tooltip>
                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('users.rowActions.edit')}
                        onClick={() =>
                          navigate(
                            paths.userEdit.replace(':id', String(user.id)),
                          )
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('users.rowActions.edit')}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )
        },
      }),
    ],
    [
      columnHelper,
      dateLocale,
      t,
      canEdit,
      canDeactivate,
      canResendInvite,
      resendingId,
      navigate,
    ],
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <PageLayout fullHeight>
      <div className="mx-auto w-full max-w-6xl flex flex-col flex-1 min-h-0">
        <PageHeader title={t('users.title')} backTo={paths.home}>
          <Authorized permission="accounts.can_invite_user">
            <Button onClick={() => navigate(paths.invites)}>
              <Plus className="h-4 w-4" />
              {t('users.inviteCta')}
            </Button>
          </Authorized>
        </PageHeader>

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('users.subtitle')}
        </p>

        <div className="mb-4 flex flex-col gap-3 shrink-0 sm:flex-row sm:items-center">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('users.searchPlaceholder')}
            className="sm:max-w-xs"
            aria-label={t('users.searchPlaceholder')}
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('users.filter.allStatus')}</SelectItem>
              <SelectItem value="active">{t('users.filter.active')}</SelectItem>
              <SelectItem value="inactive">
                {t('users.filter.inactive')}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('users.filter.allRoles')}</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              <UsersIcon className="h-6 w-6 text-muted-foreground/60" />
              <span>{t('users.empty')}</span>
            </div>
          }
        />
      </div>

      <DeactivateUserDialog
        user={deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onDeactivated={handleDeactivated}
      />
    </PageLayout>
  )
}
