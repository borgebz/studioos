import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import {
  CalendarDays,
  ClipboardList,
  Mail,
  Pencil,
  Phone,
  Receipt,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { Authorized, usePermissions } from '@/auth/permissions'
import type {
  BillingEntryList,
  CoachingClass,
  EnrollmentRead,
  FineList,
  Permission,
  RoleList,
  UserResponse,
} from '@/api/studioos-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CardSection } from '@/components/shared/CardSection'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'

import { DeactivateUserDialog } from './DeactivateUserDialog'

function userName(user: UserResponse): string {
  const full = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return user.display_name || full || user.email
}

function StatusPill({ active }: { active?: boolean }) {
  const { t } = useTranslation()
  return (
    <Badge
      className={cn(
        'font-normal',
        active
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {active ? t('users.status.active') : t('users.status.inactive')}
    </Badge>
  )
}

export function UserDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const userId = id ? Number(id) : NaN

  const [user, setUser] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const dataLoaded = useRef(false)

  useEffect(() => {
    if (dataLoaded.current) return
    if (Number.isNaN(userId)) {
      setLoading(false)
      return
    }
    dataLoaded.current = true
    apiClient.api
      .getUser(userId)
      .then((res) => {
        if (res.data) setUser(res.data)
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={t('users.detail.title')} backTo={paths.users} />
          <Skeleton className="h-32 rounded-lg mb-6" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </PageLayout>
    )
  }

  if (!user) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={t('users.detail.title')} backTo={paths.users} />
          <p className="text-sm text-muted-foreground">
            {t('users.edit.userNotFound')}
          </p>
        </div>
      </PageLayout>
    )
  }

  return <LoadedUserDetail user={user} onUserChange={setUser} />
}

function LoadedUserDetail({
  user,
  onUserChange,
}: {
  user: UserResponse
  onUserChange: (u: UserResponse) => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const canEdit = can('accounts.change_user')
  const canDeactivate = can('accounts.can_deactivate_user')
  const canResendInvite = can('accounts.can_invite_user')

  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [resending, setResending] = useState(false)

  const handleResendInvite = async () => {
    setResending(true)
    try {
      await apiClient.api.accountsUsersResendInviteCreate(user.id)
      toast.success(t('users.resendInviteSuccess'))
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setResending(false)
    }
  }

  const displayName = userName(user)
  const isActive = user.is_active !== false
  const phone = [user.phone_country_code, user.phone]
    .filter(Boolean)
    .join(' ')
    .trim()

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-6">
        <PageHeader title={displayName} backTo={paths.users}>
          {canEdit && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(paths.userEdit.replace(':id', String(user.id)))
              }
            >
              <Pencil className="h-4 w-4" />
              {t('users.detail.edit')}
            </Button>
          )}
          {!isActive && canResendInvite && (
            <Button
              variant="outline"
              onClick={handleResendInvite}
              disabled={resending}
            >
              <Mail className="h-4 w-4" />
              {t('users.rowActions.resendInvite')}
            </Button>
          )}
          {isActive && canDeactivate && (
            <Authorized permission="accounts.can_deactivate_user">
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeactivateOpen(true)}
              >
                <UserX className="h-4 w-4" />
                {t('users.rowActions.deactivate')}
              </Button>
            </Authorized>
          )}
        </PageHeader>

        {/* Hero card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="h-20 w-20 shrink-0">
              {user.photo_url && (
                <AvatarImage src={user.photo_url} alt={displayName} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-semibold text-foreground truncate">
                  {displayName}
                </h2>
                <StatusPill active={isActive} />
              </div>
              <div className="mt-1 flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </span>
                {phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {phone}
                  </span>
                )}
              </div>
              <div className="mt-3 text-sm text-foreground">
                {(user.role ?? []).length === 0 ? (
                  <span className="text-muted-foreground">
                    {t('users.noRole')}
                  </span>
                ) : (
                  (user.role ?? []).map((r) => r.name).join(', ')
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">
              {t('users.detail.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger value="coachings">
              {t('users.detail.tabs.coachings')}
            </TabsTrigger>
            <TabsTrigger value="enrollments">
              {t('users.detail.tabs.enrollments')}
            </TabsTrigger>
            <TabsTrigger value="billing">
              {t('users.detail.tabs.billing')}
            </TabsTrigger>
            <TabsTrigger value="permissions">
              {t('users.detail.tabs.permissions')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab user={user} dateLocale={dateLocale} />
          </TabsContent>
          <TabsContent value="coachings" className="mt-4">
            <CoachingsTab userId={user.id} dateLocale={dateLocale} />
          </TabsContent>
          <TabsContent value="enrollments" className="mt-4">
            <EnrollmentsTab userId={user.id} dateLocale={dateLocale} />
          </TabsContent>
          <TabsContent value="billing" className="mt-4">
            <BillingTab userId={user.id} dateLocale={dateLocale} />
          </TabsContent>
          <TabsContent value="permissions" className="mt-4">
            <PermissionsTab user={user} />
          </TabsContent>
        </Tabs>
      </div>

      <DeactivateUserDialog
        user={deactivateOpen ? user : null}
        onClose={() => setDeactivateOpen(false)}
        onDeactivated={onUserChange}
      />
    </PageLayout>
  )
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverviewTab({
  user,
  dateLocale,
}: {
  user: UserResponse
  dateLocale: Locale
}) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
      <div className="flex flex-col gap-6">
        <CardSection title={t('users.detail.identityCard')}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-sm">
            <Row
              label={t('users.edit.firstName')}
              value={user.first_name}
              stacked
            />
            <Row
              label={t('users.edit.lastName')}
              value={user.last_name}
              stacked
            />
            <Row label={t('users.edit.email')} value={user.email} stacked />
            <Row
              label={t('users.edit.phone')}
              value={
                [user.phone_country_code, user.phone]
                  .filter(Boolean)
                  .join(' ')
                  .trim() || null
              }
              stacked
            />
            <Row
              label={t('users.edit.language')}
              value={user.language ? t(`lang.${user.language}`) : null}
              stacked
            />
          </dl>
        </CardSection>

        <CardSection title={t('users.edit.addressCard')}>
          <dl className="space-y-2 text-sm">
            <Row label={t('users.edit.address')} value={user.address || null} />
            <Row
              label={t('users.edit.postalCode')}
              value={user.postal_code || null}
            />
          </dl>
        </CardSection>
      </div>

      <div className="flex flex-col gap-6">
        <CardSection title={t('users.edit.metadataCard')}>
          <dl className="space-y-2 text-sm">
            <Row
              label={t('users.edit.joined')}
              value={format(new Date(user.created_at), 'd MMM yyyy', {
                locale: dateLocale,
              })}
            />
            <Row
              label={t('users.detail.lastLogin')}
              value={
                user.last_login
                  ? format(new Date(user.last_login), 'd MMM yyyy HH:mm', {
                      locale: dateLocale,
                    })
                  : t('users.detail.never')
              }
            />
          </dl>
        </CardSection>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  mono = false,
  stacked = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  stacked?: boolean
}) {
  if (stacked) {
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd
          className={cn('text-foreground truncate', mono && 'font-mono')}
        >
          {value || '—'}
        </dd>
      </div>
    )
  }
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd
        className={cn(
          'text-foreground text-right truncate',
          mono && 'font-mono'
        )}
      >
        {value || '—'}
      </dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Coachings
// ---------------------------------------------------------------------------

function CoachingsTab({
  userId,
  dateLocale,
}: {
  userId: number
  dateLocale: Locale
}) {
  const { t } = useTranslation()
  const [taught, setTaught] = useState<CoachingClass[]>([])
  const [requested, setRequested] = useState<CoachingClass[]>([])
  const [participated, setParticipated] = useState<CoachingClass[]>([])
  const [loading, setLoading] = useState(true)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    Promise.all([
      apiClient.api.getAllCoachings({ teacher_id: [userId] }).catch(() => null),
      apiClient.api
        .getAllCoachings({ requested_by_id: userId })
        .catch(() => null),
      apiClient.api
        .getAllCoachings({ participant_id: userId })
        .catch(() => null),
    ])
      .then(([t1, t2, t3]) => {
        setTaught(t1?.data?.results ?? [])
        setRequested(t2?.data?.results ?? [])
        setParticipated(t3?.data?.results ?? [])
      })
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <Skeleton className="h-48 rounded-lg" />

  const groups: { key: string; titleKey: string; rows: CoachingClass[] }[] = [
    { key: 'taught', titleKey: 'users.detail.coachings.taught', rows: taught },
    {
      key: 'requested',
      titleKey: 'users.detail.coachings.requested',
      rows: requested,
    },
    {
      key: 'participated',
      titleKey: 'users.detail.coachings.participated',
      rows: participated,
    },
  ]

  const total = taught.length + requested.length + participated.length
  if (total === 0) {
    return (
      <CardSection>
        <p className="text-sm text-muted-foreground py-6 text-center">
          {t('users.detail.coachings.empty')}
        </p>
      </CardSection>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map(
        (g) =>
          g.rows.length > 0 && (
            <CardSection
              key={g.key}
              title={`${t(g.titleKey)} · ${g.rows.length}`}
            >
              <ul className="divide-y divide-border">
                {g.rows.slice(0, 10).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {c.modality?.name ?? '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.start_datetime
                            ? format(
                                new Date(c.start_datetime),
                                'd MMM yyyy · HH:mm',
                                { locale: dateLocale }
                              )
                            : '—'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-normal">
                      {c.status
                        ? t(`coachingRequests.status.${c.status}`, c.status)
                        : '—'}
                    </Badge>
                  </li>
                ))}
              </ul>
              {g.rows.length > 10 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {t('users.detail.coachings.more', {
                    count: g.rows.length - 10,
                  })}
                </p>
              )}
            </CardSection>
          )
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

function EnrollmentsTab({
  userId,
  dateLocale,
}: {
  userId: number
  dateLocale: Locale
}) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<EnrollmentRead[]>([])
  const [loading, setLoading] = useState(true)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    apiClient.api
      .enrollmentsListList({ student_id: userId })
      .then((res) => {
        const data = res.data as
          | EnrollmentRead[]
          | { results?: EnrollmentRead[] }
          | undefined
        setRows(Array.isArray(data) ? data : (data?.results ?? []))
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <Skeleton className="h-48 rounded-lg" />

  if (rows.length === 0) {
    return (
      <CardSection>
        <p className="text-sm text-muted-foreground py-6 text-center">
          {t('users.detail.enrollments.empty')}
        </p>
      </CardSection>
    )
  }

  return (
    <CardSection title={t('users.detail.enrollments.title')}>
      <ul className="divide-y divide-border">
        {rows.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between py-3 text-sm gap-3"
          >
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">
                {e.period?.academic_year ?? '—'} · {e.enrollment_type}
              </div>
              <div className="text-xs text-muted-foreground">
                {e.created_at
                  ? format(new Date(e.created_at), 'd MMM yyyy', {
                      locale: dateLocale,
                    })
                  : ''}
              </div>
            </div>
            <Badge variant="outline" className="font-normal">
              {e.status}
            </Badge>
          </li>
        ))}
      </ul>
    </CardSection>
  )
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

function BillingTab({
  userId,
  dateLocale,
}: {
  userId: number
  dateLocale: Locale
}) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<BillingEntryList[]>([])
  const [fines, setFines] = useState<FineList[]>([])
  const [loading, setLoading] = useState(true)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    Promise.all([
      apiClient.api
        .billingEntriesList({ student_id: userId })
        .catch(() => null),
      apiClient.api.billingFinesList({ student_id: userId }).catch(() => null),
    ])
      .then(([eRes, fRes]) => {
        setEntries(eRes?.data ?? [])
        setFines(fRes?.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <Skeleton className="h-48 rounded-lg" />

  if (entries.length === 0 && fines.length === 0) {
    return (
      <CardSection>
        <p className="text-sm text-muted-foreground py-6 text-center">
          {t('users.detail.billing.empty')}
        </p>
      </CardSection>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-6">
        {entries.length > 0 && (
          <CardSection
            title={`${t('users.detail.billing.entries')} · ${entries.length}`}
          >
            <ul className="divide-y divide-border">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between py-3 text-sm gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <TruncatedText
                        text={e.source_type}
                        className="font-medium text-foreground"
                      />
                      <div className="text-xs text-muted-foreground">
                        {e.created_at
                          ? format(new Date(e.created_at), 'd MMM yyyy', {
                              locale: dateLocale,
                            })
                          : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-foreground tabular-nums">
                      {t('common.currencySymbol')}
                      {e.amount_due}
                    </span>
                    <Badge variant="outline" className="font-normal">
                      {e.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardSection>
        )}

        {fines.length > 0 && (
          <CardSection
            title={`${t('users.detail.billing.fines')} · ${fines.length}`}
          >
            <ul className="divide-y divide-border">
              {fines.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between py-3 text-sm gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <TruncatedText
                        text={f.reason}
                        className="font-medium text-foreground"
                      />
                      <div className="text-xs text-muted-foreground">
                        {f.created_at
                          ? format(new Date(f.created_at), 'd MMM yyyy', {
                              locale: dateLocale,
                            })
                          : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-foreground tabular-nums">
                      {t('common.currencySymbol')}
                      {f.amount}
                    </span>
                    <Badge variant="outline" className="font-normal">
                      {f.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardSection>
        )}
      </div>
    </TooltipProvider>
  )
}

function TruncatedText({
  text,
  className,
}: {
  text: string | null | undefined
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setOverflowing(el.scrollWidth > el.clientWidth)
  }, [text])

  const content = (
    <div ref={ref} className={cn('truncate', className)}>
      {text || '—'}
    </div>
  )

  if (!overflowing || !text) return content

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top">{text}</TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Permissions (read-only)
// ---------------------------------------------------------------------------

function PermissionsTab({ user }: { user: UserResponse }) {
  const { t } = useTranslation()
  const [allPerms, setAllPerms] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    apiClient.api
      .rolesPermissionsAvailableList()
      .then((res) => setAllPerms(res.data ?? []))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  const userPerms = useMemo(() => {
    const ids = new Set(user.user_permission_ids ?? [])
    return allPerms.filter((p) => ids.has(p.id))
  }, [allPerms, user.user_permission_ids])

  const groupedPerms = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of userPerms) {
      const list = map.get(p.app_label) ?? []
      list.push(p)
      map.set(p.app_label, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [userPerms])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
      <CardSection
        title={t('users.permissions.permissionsCard')}
        description={t('users.permissions.permissionsReadOnlyDesc')}
      >
        {loading ? (
          <Skeleton className="h-32 rounded" />
        ) : userPerms.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t('users.permissions.noCustomPerms')}
          </p>
        ) : (
          <div className="space-y-4">
            {groupedPerms.map(([app, perms]) => (
              <div key={app}>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  {app}
                </div>
                <ul className="space-y-1">
                  {perms.map((p) => (
                    <li key={p.id} className="py-1.5">
                      <div className="text-sm font-medium text-foreground">
                        {p.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {p.app_label}.{p.codename}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardSection>

      <CardSection
        title={t('users.permissions.rolesCard')}
        description={t('users.permissions.rolesReadOnlyDesc')}
      >
        {(user.role ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('users.noRole')}</p>
        ) : (
          <ul className="space-y-1 text-sm text-foreground">
            {(user.role ?? []).map((r) => (
              <li key={r.code}>{r.name}</li>
            ))}
          </ul>
        )}
      </CardSection>
    </div>
  )
}

// Re-exports kept off to keep the module self-contained.
export type { Permission, RoleList, UserResponse }
