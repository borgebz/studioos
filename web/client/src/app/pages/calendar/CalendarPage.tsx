import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, MapPin, Plus, Tag, User, X } from 'lucide-react'
import { PageLayout } from '@/components/shared/PageLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Authorized } from '@/auth/permissions'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { apiClient } from '@/api/api-client'
import type {
  CoachingClass,
  Studio,
  Modality,
  TeacherSummary,
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
        teacher: getTeacherName(c.teacher),
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

interface FilterOption {
  value: number
  label: string
  swatch?: string
}

function MultiSelectFilter({
  icon: Icon,
  label,
  options,
  selected,
  onChange,
  emptyText,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  options: FilterOption[]
  selected: Set<number>
  onChange: (next: Set<number>) => void
  emptyText: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const count = selected.size

  const summary =
    count === 0
      ? t('calendar.filters.all')
      : count === 1
        ? (options.find((o) => o.value === Array.from(selected)[0])?.label ??
          t('calendar.filters.allSelected', { count }))
        : t('calendar.filters.nSelected', { count })

  const toggle = (value: number) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next)
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(new Set())
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm transition-colors hover:bg-accent',
            count > 0 && 'border-primary/50'
          )}
        >
          <Icon className="size-4 text-muted-foreground shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight">
            <span className="text-[11px] font-medium text-muted-foreground">
              {label}
            </span>
            <span
              className={cn(
                'truncate text-sm font-medium',
                count > 0 ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {summary}
            </span>
          </div>
          {count > 0 ? (
            <span
              role="button"
              tabIndex={0}
              aria-label={t('calendar.filters.clear')}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={clear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onChange(new Set())
                }
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        {options.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">{emptyText}</div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {options.map((opt) => {
              const isChecked = selected.has(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => toggle(opt.value)}
                >
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded-sm border border-border shrink-0',
                      isChecked && 'border-primary bg-primary text-primary-foreground'
                    )}
                  >
                    {isChecked && <Check className="size-3" />}
                  </span>
                  {opt.swatch && (
                    <span
                      className="size-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: opt.swatch }}
                    />
                  )}
                  <span className="flex-1 truncate">{opt.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function CalendarPage() {
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

  useEffect(() => {
    let cancelled = false

    apiClient.api
      .getAllCoachings({
        date_from: weekStart.toISOString(),
        date_to: weekEnd.toISOString(),
        status: 'scheduled',
      })
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
  }, [weekKey])

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  const filteredCoachings = useMemo(() => {
    if (
      studioFilter.size === 0 &&
      modalityFilter.size === 0 &&
      teacherFilter.size === 0
    ) {
      return coachings
    }
    return coachings.filter((c) => {
      if (studioFilter.size > 0 && !studioFilter.has(c.studio.id)) return false
      if (modalityFilter.size > 0 && !modalityFilter.has(c.modality.id))
        return false
      if (teacherFilter.size > 0 && !teacherFilter.has(c.teacher.id))
        return false
      return true
    })
  }, [coachings, studioFilter, modalityFilter, teacherFilter])

  const filteredStudios = useMemo(() => {
    if (studioFilter.size === 0) return studios
    return studios.filter((s) => studioFilter.has(s.id))
  }, [studios, studioFilter])

  const { dayStartHour, dayEndHour } = computeDayHourRange(
    filteredCoachings,
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
      toCalendarEvents(
        filteredCoachings,
        selectedDate,
        modalityColorMap,
        dayStartHour
      ),
    [filteredCoachings, selectedDate, modalityColorMap, dayStartHour]
  )
  const calendarResources = useMemo(
    () => toCalendarResources(filteredStudios),
    [filteredStudios]
  )

  const dayLoadMap = useMemo(() => {
    const map = new Map<string, number>()
    const maxLoad = filteredStudios.length * (dayEndHour - dayStartHour)
    if (maxLoad <= 0) return map

    for (const c of filteredCoachings) {
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
  }, [filteredCoachings, filteredStudios.length, dayStartHour, dayEndHour])

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
    () => teachers.map((te) => ({ value: te.id, label: getTeacherSummaryName(te) })),
    [teachers]
  )

  const activeFilterCount =
    studioFilter.size + modalityFilter.size + teacherFilter.size

  const clearAll = () => {
    setStudioFilter(new Set())
    setModalityFilter(new Set())
    setTeacherFilter(new Set())
  }

  const filtersCard = (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-muted-foreground">
          {t('calendar.filters.title')}
        </span>
        <MultiSelectFilter
          icon={MapPin}
          label={t('calendar.filters.studios')}
          options={studioOptions}
          selected={studioFilter}
          onChange={setStudioFilter}
          emptyText={t('calendar.filters.noStudios')}
        />
        <MultiSelectFilter
          icon={Tag}
          label={t('calendar.filters.modalities')}
          options={modalityOptions}
          selected={modalityFilter}
          onChange={setModalityFilter}
          emptyText={t('calendar.filters.noModalities')}
        />
        <MultiSelectFilter
          icon={User}
          label={t('calendar.filters.teachers')}
          options={teacherOptions}
          selected={teacherFilter}
          onChange={setTeacherFilter}
          emptyText={t('calendar.filters.noTeachers')}
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
      <div className="mx-auto w-full max-w-6xl">
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
