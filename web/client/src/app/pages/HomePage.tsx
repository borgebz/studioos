import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { enUS, pt } from 'date-fns/locale'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  ClipboardCheck,
  MessageSquarePlus,
  Plus,
  Ticket,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { PageLayout } from '@/components/shared/PageLayout'
import { CardSection } from '@/components/shared/CardSection'
import {
  WeekStripCalendar,
  type WeekStripBand,
} from '@/components/shared/WeekStripCalendar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useAuth } from '@/auth/useAuth'
import { usePermissions } from '@/auth/permissions'
import { paths } from '@/app/paths'
import { apiClient } from '@/api/api-client'
import type { CoachingClass, Studio } from '@/api/studioos-api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0]
}

function getWeekRange(date: Date): { start: Date; end: Date; days: Date[] } {
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  return { start: monday, end: sunday, days }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function teacherName(t: CoachingClass['teacher']): string {
  const parts = [t.first_name, t.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : t.email
}

// Studio palette mirrors the modality color set used in CalendarPage — same
// brand-tied tones, so a viewer can mentally connect the home chart to the
// calendar without learning a new key.
const STUDIO_COLORS = [
  'oklch(0.58 0.09 190)',
  'oklch(0.62 0.10 45)',
  'oklch(0.58 0.10 340)',
  'oklch(0.50 0.10 270)',
  'oklch(0.58 0.08 145)',
  'oklch(0.55 0.10 25)',
  'oklch(0.55 0.08 240)',
]

// ---------------------------------------------------------------------------
// Greeting
// ---------------------------------------------------------------------------

function Greeting({ firstName }: { firstName: string }) {
  const { t, i18n } = useTranslation()
  const now = new Date()
  const hour = now.getHours()
  const greetingKey =
    hour < 12
      ? 'home.greetingMorning'
      : hour < 19
        ? 'home.greetingAfternoon'
        : 'home.greetingEvening'
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)
  const dateLabelCap = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t(greetingKey)}
        {firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{dateLabelCap}</p>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

interface QuickAction {
  key: string
  labelKey: string
  icon: LucideIcon
  to: string
  permission?: string | string[]
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'createCoaching',
    labelKey: 'home.actions.createCoaching',
    icon: Plus,
    to: paths.coachingsCreate,
    permission: 'coachings.can_schedule_coaching',
  },
  {
    key: 'requestCoaching',
    labelKey: 'home.actions.requestCoaching',
    icon: MessageSquarePlus,
    to: paths.coachingsRequest,
    permission: 'accounts.can_participate_in_coaching',
  },
  {
    key: 'reviewEnrollments',
    labelKey: 'home.actions.reviewEnrollments',
    icon: ClipboardCheck,
    to: paths.enrollmentRequests,
    permission: 'enrollments.can_review_enrollment',
  },
  {
    key: 'createEvent',
    labelKey: 'home.actions.createEvent',
    icon: Ticket,
    to: paths.eventsCreate,
    permission: 'events.add_event',
  },
  {
    key: 'inviteUser',
    labelKey: 'home.actions.inviteUser',
    icon: UserPlus,
    to: paths.invites,
    permission: 'accounts.can_invite_user',
  },
  {
    key: 'myAvailability',
    labelKey: 'home.actions.myAvailability',
    icon: CalendarClock,
    to: paths.myAvailability,
    permission: 'accounts.can_teach',
  },
  {
    key: 'openEnrollmentPeriod',
    labelKey: 'home.actions.openEnrollmentPeriod',
    icon: CalendarPlus,
    to: paths.enrollmentPeriodCreate,
    permission: 'enrollments.can_manage_periods',
  },
]

function QuickActions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can, canAny } = usePermissions()

  const visible = QUICK_ACTIONS.filter((a) => {
    if (!a.permission) return true
    return Array.isArray(a.permission)
      ? canAny(...a.permission)
      : can(a.permission)
  }).slice(0, 4)

  if (visible.length === 0) return null

  return (
    <CardSection
      title={t('home.quickActions')}
      description={t('home.quickActionsDesc')}
    >
      <div className="overflow-hidden rounded-lg border border-border">
        <ul className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:[&>*:nth-child(n+3)]:border-t sm:[&>*:nth-child(2n)]:border-l sm:border-border">
          {visible.map((action) => {
            const Icon = action.icon
            return (
              <li key={action.key}>
                <button
                  type="button"
                  onClick={() => navigate(action.to)}
                  className="group flex w-full items-center gap-3 bg-card px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {t(action.labelKey)}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </CardSection>
  )
}

// ---------------------------------------------------------------------------
// My week — WeekStripCalendar surface for students / teachers.
// Staff (coordination/direction) don't see this widget — the organisation-wide
// calendar lives at /calendar; the home surface is the *personal* one.
// ---------------------------------------------------------------------------

function MyWeek({
  userId,
  canTeach,
}: {
  userId: number
  canTeach: boolean
}) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const [weekStart, setWeekStart] = useState(() => {
    const { start } = getWeekRange(new Date())
    return start
  })

  const [loading, setLoading] = useState(true)
  const [coachings, setCoachings] = useState<CoachingClass[]>([])

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }, [weekStart])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const baseQuery = {
      date_from: weekStart.toISOString(),
      date_to: weekEnd.toISOString(),
    }

    // A user may participate as a student and (if a teacher) lead sessions —
    // run both queries and merge by id so they see everything that's theirs.
    const requests = [
      apiClient.api.getAllCoachings({
        ...baseQuery,
        participant_id: userId,
      }),
    ]
    if (canTeach) {
      requests.push(
        apiClient.api.getAllCoachings({
          ...baseQuery,
          teacher_id: [userId],
        })
      )
    }

    Promise.all(requests.map((p) => p.catch(() => null)))
      .then((responses) => {
        if (cancelled) return
        const seen = new Map<number, CoachingClass>()
        for (const res of responses) {
          const data = res?.data as unknown
          const items =
            (Array.isArray(data)
              ? data
              : ((data as { results?: CoachingClass[] })?.results ?? [])) ?? []
          for (const c of items) {
            if (!seen.has(c.id)) seen.set(c.id, c)
          }
        }
        setCoachings(Array.from(seen.values()))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, canTeach, weekStart, weekEnd])

  const bands: WeekStripBand[] = useMemo(
    () =>
      coachings.map((c) => {
        const start = new Date(c.start_datetime)
        const end = new Date(c.end_datetime)
        const subtitle = [
          c.studio?.name,
          c.teacher && teacherName(c.teacher),
        ]
          .filter(Boolean)
          .join(' · ')
        return {
          id: c.id,
          variant: 'highlight',
          icon: <CalendarClock className="h-3 w-3" />,
          label: c.modality?.name ?? '—',
          start,
          end,
          subtitle: subtitle || null,
        }
      }),
    [coachings]
  )

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">{t('home.weeklyCoachings')}</h2>
      </div>
      <WeekStripCalendar
        weekStart={weekStart}
        onWeekChange={setWeekStart}
        bands={bands}
        loading={loading}
        emptyMessage={t('home.noCoachingsThisWeek')}
        dayFreeMessage={t('home.dayFree')}
        locale={dateLocale}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Staff KPIs — pure typographic stat tiles, no icons or color squares.
// ---------------------------------------------------------------------------

interface KpiState {
  pendingEnrollments: number | null
  activeEnrollments: number | null
  coachingsThisWeek: number | null
  upcomingEvents: number | null
}

function StaffKpis() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])
  const { start, end } = useMemo(() => getWeekRange(today), [today])
  const [state, setState] = useState<KpiState>({
    pendingEnrollments: null,
    activeEnrollments: null,
    coachingsThisWeek: null,
    upcomingEvents: null,
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiClient.api
        .enrollmentsListList({ status: ['submitted', 'under_review'] })
        .catch(() => null),
      apiClient.api
        .enrollmentsListList({ status: ['approved'] })
        .catch(() => null),
      apiClient.api
        .getAllCoachings({
          date_from: start.toISOString(),
          date_to: end.toISOString(),
        })
        .catch(() => null),
      apiClient.api.eventsList().catch(() => null),
    ]).then(([pending, active, coachings, events]) => {
      if (cancelled) return
      const coachingsItems = (() => {
        const data = coachings?.data as unknown
        return Array.isArray(data)
          ? data
          : ((data as { results?: unknown[] })?.results ?? [])
      })()
      const eventsItems = (() => {
        const data = events?.data as unknown
        return Array.isArray(data)
          ? data
          : ((data as { results?: unknown[] })?.results ?? [])
      })()
      const upcoming = eventsItems.filter((e) => {
        const ev = e as { start_datetime?: string; status?: string }
        if (!ev.start_datetime) return false
        return new Date(ev.start_datetime).getTime() >= today.getTime()
      }).length
      setState({
        pendingEnrollments: pending?.data?.length ?? 0,
        activeEnrollments: active?.data?.length ?? 0,
        coachingsThisWeek: coachingsItems.length,
        upcomingEvents: upcoming,
      })
    })
    return () => {
      cancelled = true
    }
  }, [start, end, today])

  const items: {
    key: string
    label: string
    value: number | null
    to?: string
  }[] = [
    {
      key: 'pending',
      label: t('home.kpi.pendingEnrollments'),
      value: state.pendingEnrollments,
      to: paths.enrollmentRequests,
    },
    {
      key: 'active',
      label: t('home.kpi.activeEnrollments'),
      value: state.activeEnrollments,
    },
    {
      key: 'coachings',
      label: t('home.kpi.coachingsThisWeek'),
      value: state.coachingsThisWeek,
      to: paths.calendar,
    },
    {
      key: 'events',
      label: t('home.kpi.upcomingEvents'),
      value: state.upcomingEvents,
      to: paths.events,
    },
  ]

  return (
    <CardSection title={t('home.kpi.title')}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
        {items.map((it) => {
          const inner = (
            <>
              {it.value === null ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <dd className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
                  {it.value}
                </dd>
              )}
              <dt className="mt-2 text-xs font-medium leading-tight text-muted-foreground">
                {it.label}
              </dt>
            </>
          )
          return it.to ? (
            <button
              key={it.key}
              type="button"
              onClick={() => navigate(it.to!)}
              className="group flex flex-col items-start text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {inner}
            </button>
          ) : (
            <div key={it.key} className="flex flex-col items-start">
              {inner}
            </div>
          )
        })}
      </dl>
    </CardSection>
  )
}

// ---------------------------------------------------------------------------
// Coachings by studio — daily stacked bar chart (recharts)
// ---------------------------------------------------------------------------

type ChartRow = {
  day: string
  date: Date
  [studioKey: string]: number | string | Date
}

function CoachingsByStudioChart() {
  const { t, i18n } = useTranslation()
  const today = useMemo(() => new Date(), [])
  const range = useMemo(() => {
    const end = new Date(today)
    end.setHours(23, 59, 59, 999)
    const start = new Date(today)
    start.setDate(today.getDate() - 13)
    start.setHours(0, 0, 0, 0)
    const days: Date[] = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
    return { start, end, days }
  }, [today])

  const [loading, setLoading] = useState(true)
  const [coachings, setCoachings] = useState<CoachingClass[]>([])
  const [studios, setStudios] = useState<Studio[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiClient.api
        .getAllCoachings({
          date_from: range.start.toISOString(),
          date_to: range.end.toISOString(),
        })
        .catch(() => null),
      apiClient.api.studiosList().catch(() => null),
    ])
      .then(([coachingsRes, studiosRes]) => {
        if (cancelled) return
        const data = coachingsRes?.data as unknown
        const items =
          (Array.isArray(data)
            ? data
            : ((data as { results?: CoachingClass[] })?.results ?? [])) ?? []
        setCoachings(items)
        setStudios(studiosRes?.data ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range.start, range.end])

  const activeStudios = useMemo(() => {
    const ids = new Set<number>()
    for (const c of coachings) if (c.studio) ids.add(c.studio.id)
    return studios.filter((s) => ids.has(s.id))
  }, [studios, coachings])

  const chartConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    activeStudios.forEach((s, i) => {
      cfg[`studio_${s.id}`] = {
        label: s.name,
        color: STUDIO_COLORS[i % STUDIO_COLORS.length],
      }
    })
    return cfg
  }, [activeStudios])

  const data: ChartRow[] = useMemo(() => {
    return range.days.map((d) => {
      const row: ChartRow = {
        day: new Intl.DateTimeFormat(i18n.language, {
          day: 'numeric',
          month: 'short',
        }).format(d),
        date: d,
      }
      for (const s of activeStudios) row[`studio_${s.id}`] = 0
      for (const c of coachings) {
        if (!c.studio) continue
        if (!isSameDay(new Date(c.start_datetime), d)) continue
        const key = `studio_${c.studio.id}`
        row[key] = ((row[key] as number) ?? 0) + 1
      }
      return row
    })
  }, [coachings, activeStudios, range.days, i18n.language])

  const total = coachings.length

  return (
    <CardSection
      title={t('home.chart.title')}
      description={t('home.chart.subtitle')}
    >
      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : total === 0 ? (
        <p className="rounded-lg border border-border px-4 py-10 text-center text-sm italic text-muted-foreground">
          {t('home.chart.empty')}
        </p>
      ) : (
        <div>
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <BarChart
              data={data}
              margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="2 4"
                className="stroke-border/50"
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                interval="preserveStartEnd"
                minTickGap={20}
                fontSize={11}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, payload) => {
                      const d = (payload?.[0]?.payload as ChartRow | undefined)
                        ?.date
                      if (!d) return ''
                      return new Intl.DateTimeFormat(i18n.language, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      }).format(d)
                    }}
                  />
                }
              />
              {activeStudios.map((s, i) => {
                const isLast = i === activeStudios.length - 1
                return (
                  <Bar
                    key={s.id}
                    dataKey={`studio_${s.id}`}
                    stackId="studios"
                    fill={`var(--color-studio_${s.id})`}
                    radius={isLast ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                    maxBarSize={24}
                  />
                )
              })}
            </BarChart>
          </ChartContainer>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {activeStudios.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <span
                  className="size-2 rounded-[2px]"
                  style={{
                    backgroundColor:
                      STUDIO_COLORS[i % STUDIO_COLORS.length],
                  }}
                />
                <span className="text-xs text-muted-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardSection>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function HomePage() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const firstName = user ? getFirstName(user.full_name) : ''
  const isStaff = can('coachings.change_coachingclass')
  const showKpis = can('enrollments.can_review_enrollment') || isStaff
  // The personal week strip is only meaningful for people who actually
  // participate in or lead sessions. Staff see the org-wide calendar at
  // /calendar; the home surface is theirs for high-level state instead.
  const showMyWeek =
    !isStaff &&
    (can('accounts.can_participate_in_coaching') || can('accounts.can_teach'))
  const canTeach = can('accounts.can_teach')
  const showChart = isStaff

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <Greeting firstName={firstName} />

        {isStaff ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
            <div className="space-y-6">
              <QuickActions />
              {showChart && <CoachingsByStudioChart />}
            </div>
            {showKpis && (
              <aside className="space-y-6">
                <StaffKpis />
              </aside>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <QuickActions />
            {showMyWeek && user && (
              <MyWeek userId={user.id} canTeach={canTeach} />
            )}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
