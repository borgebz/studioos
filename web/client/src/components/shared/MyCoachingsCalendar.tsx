/**
 * MyCoachingsCalendar — compact "this week" calendar for non-direction users.
 *
 * Direction/coordination uses ScheduleCalendar (the multi-studio resource grid)
 * to triage every session at once. Teachers, students and guardians only ever
 * see their own sessions, so a 7-day strip is enough and reads far better on
 * mobile. The component wraps the shared WeekStripCalendar and translates
 * CoachingClass rows into bands coloured by status.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Hourglass,
  MapPin,
  User as UserIcon,
} from 'lucide-react'
import { enUS, pt } from 'date-fns/locale'
import { format } from 'date-fns'

import { apiClient } from '@/api/api-client'
import {
  CoachingClassStatusEnum,
  type CoachingClass,
} from '@/api/studioos-api'
import {
  WeekStripCalendar,
  type WeekStripBand,
  type WeekStripBandVariant,
  type WeekStripLegendEntry,
} from '@/components/shared/WeekStripCalendar'

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function endOfWeek(weekStart: Date): Date {
  const end = new Date(weekStart)
  end.setDate(weekStart.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function userName(
  user: CoachingClass['teacher'] | CoachingClass['requested_by'] | null
): string {
  if (!user) return ''
  const full = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return full || user.email
}

/**
 * Map a coaching's status to a band variant + icon.
 * - scheduled / completed → positive (emerald)
 * - cancelled / rejected → negative (rose)
 * - everything else (requested / pending_approval / waiting_confirmation / pending_completion_approval)
 *   → warning (amber) — these are in-flight states the user should pay attention to.
 */
function statusBandStyle(
  status: CoachingClassStatusEnum | undefined
): { variant: WeekStripBandVariant; icon: React.ReactNode } {
  switch (status) {
    case CoachingClassStatusEnum.Scheduled:
    case CoachingClassStatusEnum.Completed:
      return {
        variant: 'positive',
        icon: <CalendarCheck className="h-3 w-3" />,
      }
    case CoachingClassStatusEnum.Cancelled:
    case CoachingClassStatusEnum.Rejected:
      return {
        variant: 'negative',
        icon: <CalendarX className="h-3 w-3" />,
      }
    default:
      return {
        variant: 'warning',
        icon: <Hourglass className="h-3 w-3" />,
      }
  }
}

export type MyCoachingsScope =
  | { kind: 'teacher'; teacherId: number }
  | { kind: 'participant'; userId: number }

export interface MyCoachingsCalendarProps {
  scope: MyCoachingsScope
  /** Optional initial date to anchor the visible week. */
  initialDate?: Date
  emptyMessage?: string
}

export function MyCoachingsCalendar({
  scope,
  initialDate,
  emptyMessage,
}: MyCoachingsCalendarProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(initialDate ?? new Date())
  )
  const [coachings, setCoachings] = useState<CoachingClass[]>([])
  const [loading, setLoading] = useState(false)
  const hasLoaded = useRef(false)

  const weekEnd = useMemo(() => endOfWeek(weekStart), [weekStart])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const query: Parameters<typeof apiClient.api.getAllCoachings>[0] = {
      date_from: weekStart.toISOString(),
      date_to: weekEnd.toISOString(),
    }
    if (scope.kind === 'teacher') query.teacher_id = [scope.teacherId]
    else query.participant_id = scope.userId

    apiClient.api
      .getAllCoachings(query)
      .then((res) => {
        if (cancelled) return
        const data = res?.data as unknown
        const items: CoachingClass[] = Array.isArray(data)
          ? (data as CoachingClass[])
          : ((data as { results?: CoachingClass[] })?.results ?? [])
        setCoachings(items)
        hasLoaded.current = true
      })
      .catch(() => {
        if (!cancelled) setCoachings([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [weekStart, weekEnd, scope.kind, 'teacherId' in scope ? scope.teacherId : null, 'userId' in scope ? scope.userId : null])

  const bands: WeekStripBand[] = useMemo(() => {
    return coachings
      .filter((c) => c.modality)
      .map((c) => {
        const start = new Date(c.start_datetime)
        const end = new Date(c.end_datetime)
        const { variant, icon } = statusBandStyle(c.status)
        const studio = c.studio?.name
        const teacher = c.teacher ? userName(c.teacher) : null
        const subtitleParts: string[] = []
        if (teacher && scope.kind !== 'teacher') subtitleParts.push(teacher)
        if (studio) subtitleParts.push(studio)
        return {
          id: c.id,
          variant,
          icon,
          label: c.modality.name,
          start,
          end,
          subtitle: subtitleParts.join(' · ') || null,
          popoverContent: (
            <div className="space-y-1.5">
              <p className="font-medium">{c.modality.name}</p>
              <div className="space-y-0.5 text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {format(start, 'EEE d MMM, HH:mm', { locale: dateLocale })}
                  {' – '}
                  {format(end, 'HH:mm')}
                </p>
                {teacher && (
                  <p className="flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5" />
                    {teacher}
                  </p>
                )}
                {studio && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {studio}
                  </p>
                )}
                {c.status && (
                  <p className="pt-1 text-xs">
                    {t(`coachingRequests.status.${c.status}`)}
                  </p>
                )}
              </div>
            </div>
          ),
        }
      })
  }, [coachings, dateLocale, scope.kind, t])

  const legend: WeekStripLegendEntry[] = useMemo(
    () => [
      {
        variant: 'positive',
        icon: <CalendarCheck className="h-3 w-3" />,
        label: t('myCoachingsCalendar.legend.scheduled'),
      },
      {
        variant: 'warning',
        icon: <Hourglass className="h-3 w-3" />,
        label: t('myCoachingsCalendar.legend.pending'),
      },
      {
        variant: 'negative',
        icon: <CalendarX className="h-3 w-3" />,
        label: t('myCoachingsCalendar.legend.cancelled'),
      },
    ],
    [t]
  )

  return (
    <div className="rounded-lg border border-border bg-card">
      <WeekStripCalendar
        weekStart={weekStart}
        onWeekChange={setWeekStart}
        bands={bands}
        legend={legend}
        loading={loading && !hasLoaded.current}
        emptyMessage={emptyMessage ?? t('myCoachingsCalendar.empty')}
        dayFreeMessage={t('myCoachingsCalendar.dayFree')}
        locale={dateLocale}
      />
    </div>
  )
}
