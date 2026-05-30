import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MessageSquarePlus, Plus, X } from 'lucide-react'
import { PageLayout } from '@/components/shared/PageLayout'
import { PAGE_CONTENT } from '@/lib/layout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Authorized, usePermissions } from '@/auth/permissions'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MyCoachingsCalendar } from '@/components/shared/MyCoachingsCalendar'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox'

interface FilterOption<T extends string | number = number> {
  value: T
  label: string
  swatch?: string
}

const MAX_VISIBLE_CHIPS = 1

function FilterCombobox<T extends string | number>({
  items,
  value,
  onValueChange,
  placeholder,
  emptyText,
}: {
  items: FilterOption<T>[]
  value: T[]
  onValueChange: (next: T[]) => void
  placeholder: string
  emptyText: string
}) {
  const anchor = useComboboxAnchor()
  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={value as unknown as FilterOption<T>[]}
      onValueChange={(next) => onValueChange(next as unknown as T[])}
      itemToStringLabel={(item: FilterOption<T>) => item.label}
      itemToStringValue={(item: FilterOption<T>) => String(item.value)}
    >
      <ComboboxChips
        ref={anchor}
        className="h-9 min-h-9 w-[200px] flex-nowrap overflow-hidden"
      >
        <ComboboxValue>
          {(values: T[]) => {
            const visible = values.slice(0, MAX_VISIBLE_CHIPS)
            const overflow = values.length - visible.length
            return (
              <Fragment>
                {visible.map((v) => {
                  const item = items.find((i) => i.value === v)
                  return (
                    <ComboboxChip
                      key={String(v)}
                      {...({ value: v } as { value: T })}
                      className="max-w-[110px]"
                    >
                      {item?.swatch && (
                        <span
                          className="size-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: item.swatch }}
                        />
                      )}
                      <span className="truncate">
                        {item?.label ?? String(v)}
                      </span>
                    </ComboboxChip>
                  )
                })}
                {overflow > 0 && (
                  <span
                    className="flex h-[calc(--spacing(5.5))] shrink-0 items-center rounded-sm bg-muted px-1.5 text-xs font-medium text-muted-foreground"
                    aria-label={`+${overflow}`}
                  >
                    +{overflow}
                  </span>
                )}
                <ComboboxChipsInput
                  className="min-w-0 flex-1"
                  placeholder={values.length === 0 ? placeholder : ''}
                />
              </Fragment>
            )
          }}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: FilterOption<T>) => (
            <ComboboxItem key={String(item.value)} value={item.value}>
              {item.swatch && (
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.swatch }}
                />
              )}
              <span>{item.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
import { apiClient } from '@/api/api-client'
import {
  CoachingClassStatusEnum,
  type CoachingClass,
  type Studio,
  type Modality,
  type TeacherSummary,
} from '@/api/studioos-api'
import { paths } from '@/app/paths'
import {
  ScheduleCalendar,
  type CalendarResource,
  type CalendarEvent,
} from '@/components/shared/ScheduleCalendar'

const MODALITY_COLORS = [
  'oklch(0.58 0.09 190)',
  'oklch(0.62 0.10 45)',
  'oklch(0.58 0.10 340)',
  'oklch(0.50 0.10 270)',
  'oklch(0.58 0.08 145)',
  'oklch(0.55 0.10 25)',
  'oklch(0.55 0.08 240)',
  'oklch(0.52 0.07 90)',
  'oklch(0.60 0.09 310)',
  'oklch(0.56 0.10 120)',
]

function getModalityColor(index: number): string {
  return MODALITY_COLORS[index % MODALITY_COLORS.length]
}

function getTeacherName(teacher: CoachingClass['teacher']): string {
  const parts = [teacher.first_name, teacher.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : teacher.email
}

function getTeacherSummaryName(teacher: TeacherSummary): string {
  const parts = [teacher.first_name, teacher.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : teacher.email
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

function toCalendarEvents(
  coachings: CoachingClass[],
  selectedDate: Date,
  modalityColorMap: Map<number, string>,
  dayStartHour: number
): CalendarEvent[] {
  return coachings
    .filter((c) => {
      // Studio is nullable on the server (e.g. unassigned requests) —
      // the calendar groups by studio, so those rows can't be rendered.
      if (!c.studio || !c.modality) return false
      const start = new Date(c.start_datetime)
      return (
        start.getDate() === selectedDate.getDate() &&
        start.getMonth() === selectedDate.getMonth() &&
        start.getFullYear() === selectedDate.getFullYear()
      )
    })
    .map((c) => {
      const start = new Date(c.start_datetime)
      const end = new Date(c.end_datetime)
      const startMinutes =
        (start.getHours() - dayStartHour) * 60 + start.getMinutes()
      const duration = Math.round((end.getTime() - start.getTime()) / 60000)
      const activeParticipants = c.participants?.filter(
        (p) =>
          p.status === 'active' ||
          p.status === 'attended' ||
          p.status === 'pending'
      )

      return {
        id: c.id,
        resourceId: c.studio.id,
        start: startMinutes,
        duration,
        title: c.modality.name,
        subtitle: c.modality.name,
        category: String(c.modality.id),
        categoryColor:
          modalityColorMap.get(c.modality.id) ?? 'oklch(0.5 0.09 190)',
        teacher: c.teacher ? getTeacherName(c.teacher) : undefined,
        enrolled: activeParticipants?.length,
        status: c.status,
      }
    })
}

function toCalendarResources(studios: Studio[]): CalendarResource[] {
  return studios.map((s) => ({
    id: s.id,
    name: s.name,
    subtitle: s.description,
    capacity: s.max_capacity,
  }))
}

function computeDayHourRange(
  coachings: CoachingClass[],
  selectedDate: Date
): { dayStartHour: number; dayEndHour: number } {
  let earliest = 24
  let latest = 0

  for (const c of coachings) {
    if (!c.studio) continue
    const start = new Date(c.start_datetime)
    const end = new Date(c.end_datetime)
    if (
      start.getDate() === selectedDate.getDate() &&
      start.getMonth() === selectedDate.getMonth() &&
      start.getFullYear() === selectedDate.getFullYear()
    ) {
      earliest = Math.min(earliest, start.getHours())
      latest = Math.max(latest, end.getHours() + (end.getMinutes() > 0 ? 1 : 0))
    }
  }

  if (earliest >= latest) {
    return { dayStartHour: 8, dayEndHour: 20 }
  }

  return { dayStartHour: earliest, dayEndHour: Math.min(latest, 24) }
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-[600px] w-full rounded-lg" />
    </div>
  )
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function CalendarPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { can, canAny } = usePermissions()

  // Direction/coordination sees the full studio grid (multi-resource calendar);
  // everyone else (teachers, students, guardians) sees a compact week strip
  // showing only their own coachings.
  const isCoordinator = can('coachings.change_coachingclass')
  const isTeacher = can('accounts.can_teach')
  // Anyone with permission to file a coaching request gets the entry-point
  // button — students, guardians and teachers all have add_coachingclass.
  const canRequestCoaching = canAny(
    'coachings.add_coachingclass',
    'accounts.can_participate_in_coaching',
    'accounts.can_choose_for_dependents'
  )

  const userId = user?.id ?? null

  if (!isCoordinator) {
    return (
      <PersonalCalendarView
        canRequest={canRequestCoaching}
        scope={
          isTeacher && userId !== null
            ? { kind: 'teacher', teacherId: userId }
            : userId !== null
              ? { kind: 'participant', userId }
              : null
        }
        onRequestCoaching={() => navigate(paths.coachingsRequest)}
      />
    )
  }

  return <CoordinatorCalendarView />
}

function PersonalCalendarView({
  scope,
  canRequest,
  onRequestCoaching,
}: {
  scope:
    | { kind: 'teacher'; teacherId: number }
    | { kind: 'participant'; userId: number }
    | null
  canRequest: boolean
  onRequestCoaching: () => void
}) {
  const { t } = useTranslation()

  return (
    <PageLayout>
      <div className={PAGE_CONTENT}>
        <PageHeader title={t('calendar.title')} backTo={paths.home}>
          {canRequest && (
            <Button size="sm" onClick={onRequestCoaching}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              {t('nav.requestCoaching')}
            </Button>
          )}
        </PageHeader>
        {scope ? (
          <MyCoachingsCalendar scope={scope} />
        ) : (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            {t('myCoachingsCalendar.signInPrompt')}
          </div>
        )}
      </div>
    </PageLayout>
  )
}

function CoordinatorCalendarView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const staticLoaded = useRef(false)

  const [initialLoad, setInitialLoad] = useState(true)
  const [coachings, setCoachings] = useState<CoachingClass[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [modalities, setModalities] = useState<Modality[]>([])
  const [teachers, setTeachers] = useState<TeacherSummary[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const [studioFilter, setStudioFilter] = useState<Set<number>>(new Set())
  const [modalityFilter, setModalityFilter] = useState<Set<number>>(new Set())
  const [teacherFilter, setTeacherFilter] = useState<Set<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<
    Set<CoachingClassStatusEnum>
  >(() => new Set([CoachingClassStatusEnum.Scheduled]))

  const { start: weekStart, end: weekEnd } = getWeekRange(selectedDate)
  const weekKey = weekStart.toISOString()

  const modalityColorMap = useMemo(
    () => new Map(modalities.map((m, i) => [m.id, getModalityColor(i)])),
    [modalities]
  )

  useEffect(() => {
    if (!staticLoaded.current) {
      staticLoaded.current = true
      Promise.all([
        apiClient.api.studiosList().catch(() => null),
        apiClient.api.modalitiesList().catch(() => null),
        apiClient.api.accountsTeachersList().catch(() => null),
      ]).then(([studiosRes, modalitiesRes, teachersRes]) => {
        if (studiosRes?.data) setStudios(studiosRes.data)
        if (modalitiesRes?.data) setModalities(modalitiesRes.data)
        if (teachersRes?.data) setTeachers(teachersRes.data)
      })
    }
  }, [])

  const studioFilterKey = useMemo(
    () => Array.from(studioFilter).sort().join(','),
    [studioFilter]
  )
  const modalityFilterKey = useMemo(
    () => Array.from(modalityFilter).sort().join(','),
    [modalityFilter]
  )
  const teacherFilterKey = useMemo(
    () => Array.from(teacherFilter).sort().join(','),
    [teacherFilter]
  )
  const statusFilterKey = useMemo(
    () => Array.from(statusFilter).sort().join(','),
    [statusFilter]
  )

  useEffect(() => {
    let cancelled = false

    const query: Parameters<typeof apiClient.api.getAllCoachings>[0] = {
      date_from: weekStart.toISOString(),
      date_to: weekEnd.toISOString(),
    }
    if (studioFilter.size > 0) query.studio_id = Array.from(studioFilter)
    if (modalityFilter.size > 0) query.modality_id = Array.from(modalityFilter)
    if (teacherFilter.size > 0) query.teacher_id = Array.from(teacherFilter)
    if (statusFilter.size > 0) query.status = Array.from(statusFilter)

    apiClient.api
      .getAllCoachings(query)
      .then((res) => {
        if (cancelled) return
        const data = res?.data as any
        const items = Array.isArray(data) ? data : (data?.results ?? [])
        setCoachings(items)
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setInitialLoad(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    weekKey,
    studioFilterKey,
    modalityFilterKey,
    teacherFilterKey,
    statusFilterKey,
  ])

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  // Studios shown as columns: if the user picked a studio subset, restrict the
  // columns to that subset; otherwise show every studio.
  const visibleStudios = useMemo(() => {
    if (studioFilter.size === 0) return studios
    return studios.filter((s) => studioFilter.has(s.id))
  }, [studios, studioFilter])

  const { dayStartHour, dayEndHour } = computeDayHourRange(
    coachings,
    selectedDate
  )

  const now = new Date()
  const isToday =
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear()
  const nowMinutes = isToday
    ? (now.getHours() - dayStartHour) * 60 + now.getMinutes()
    : undefined

  const calendarEvents = useMemo(
    () =>
      toCalendarEvents(coachings, selectedDate, modalityColorMap, dayStartHour),
    [coachings, selectedDate, modalityColorMap, dayStartHour]
  )
  const calendarResources = useMemo(
    () => toCalendarResources(visibleStudios),
    [visibleStudios]
  )

  const dayLoadMap = useMemo(() => {
    const map = new Map<string, number>()
    const maxLoad = visibleStudios.length * (dayEndHour - dayStartHour)
    if (maxLoad <= 0) return map

    for (const c of coachings) {
      if (!c.studio) continue
      const start = new Date(c.start_datetime)
      const key = toDateKey(start)
      const dur =
        (new Date(c.end_datetime).getTime() - start.getTime()) / 3600000
      map.set(key, (map.get(key) ?? 0) + dur)
    }

    for (const [key, hours] of map) {
      map.set(key, Math.min(hours / maxLoad, 1))
    }

    return map
  }, [coachings, visibleStudios.length, dayStartHour, dayEndHour])

  const studioOptions: FilterOption[] = useMemo(
    () => studios.map((s) => ({ value: s.id, label: s.name })),
    [studios]
  )
  const modalityOptions: FilterOption[] = useMemo(
    () =>
      modalities.map((m) => ({
        value: m.id,
        label: m.name,
        swatch: modalityColorMap.get(m.id),
      })),
    [modalities, modalityColorMap]
  )
  const teacherOptions: FilterOption[] = useMemo(
    () =>
      teachers.map((te) => ({
        value: te.id,
        label: getTeacherSummaryName(te),
      })),
    [teachers]
  )
  const statusOptions: FilterOption<CoachingClassStatusEnum>[] = useMemo(
    () =>
      Object.values(CoachingClassStatusEnum).map((value) => ({
        value,
        label: t(`coachingRequests.status.${value}`),
      })),
    [t]
  )

  const activeFilterCount =
    studioFilter.size +
    modalityFilter.size +
    teacherFilter.size +
    statusFilter.size

  const clearAll = () => {
    setStudioFilter(new Set())
    setModalityFilter(new Set())
    setTeacherFilter(new Set())
    setStatusFilter(new Set())
  }

  const filtersCard = (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-muted-foreground">
          {t('calendar.filters.title')}
        </span>
        <FilterCombobox
          items={studioOptions}
          value={Array.from(studioFilter)}
          onValueChange={(next) => setStudioFilter(new Set(next))}
          placeholder={t('calendar.filters.studios')}
          emptyText={t('calendar.filters.noStudios')}
        />
        <FilterCombobox
          items={modalityOptions}
          value={Array.from(modalityFilter)}
          onValueChange={(next) => setModalityFilter(new Set(next))}
          placeholder={t('calendar.filters.modalities')}
          emptyText={t('calendar.filters.noModalities')}
        />
        <FilterCombobox
          items={teacherOptions}
          value={Array.from(teacherFilter)}
          onValueChange={(next) => setTeacherFilter(new Set(next))}
          placeholder={t('calendar.filters.teachers')}
          emptyText={t('calendar.filters.noTeachers')}
        />
        <FilterCombobox
          items={statusOptions}
          value={Array.from(statusFilter)}
          onValueChange={(next) => setStatusFilter(new Set(next))}
          placeholder={t('calendar.filters.status')}
          emptyText={t('calendar.filters.noStatus')}
        />
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-9 text-xs"
            onClick={clearAll}
          >
            <X className="mr-1 size-3.5" />
            {t('calendar.filters.clearAll')}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <PageLayout>
      <div className={PAGE_CONTENT}>
        <PageHeader title={t('calendar.title')} backTo={paths.home}>
          <Authorized permission="coachings.can_schedule_coaching">
            <Button size="sm" onClick={() => navigate(paths.coachingsCreate)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('coachings.createSession')}
            </Button>
          </Authorized>
        </PageHeader>
        {initialLoad ? (
          <CalendarSkeleton />
        ) : (
          <ScheduleCalendar
            resources={calendarResources}
            events={calendarEvents}
            selectedDate={selectedDate}
            dayLoadMap={dayLoadMap}
            dayStartHour={dayStartHour}
            dayEndHour={dayEndHour}
            slotHeight={44}
            nowMinutes={nowMinutes}
            onDateChange={handleDateChange}
            filtersSlot={filtersCard}
          />
        )}
      </div>
    </PageLayout>
  )
}
