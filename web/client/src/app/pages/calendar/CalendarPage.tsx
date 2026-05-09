import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { PageLayout } from '@/components/shared/PageLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/api/api-client'
import type { CoachingClass, Studio, Modality } from '@/api/studioos-api'
import { paths } from '@/app/paths'
import {
  ScheduleCalendar,
  type CalendarResource,
  type CalendarEvent,
  type CalendarCategory,
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
  dayStartHour: number,
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
      const startMinutes = (start.getHours() - dayStartHour) * 60 + start.getMinutes()
      const duration = Math.round((end.getTime() - start.getTime()) / 60000)
      const activeParticipants = c.participants?.filter(
        (p) => p.status === 'active' || p.status === 'attended' || p.status === 'pending',
      )

      return {
        id: c.id,
        resourceId: c.studio.id,
        start: startMinutes,
        duration,
        title: c.modality.name,
        subtitle: c.modality.name,
        category: String(c.modality.id),
        categoryColor: modalityColorMap.get(c.modality.id) ?? 'oklch(0.5 0.09 190)',
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

function toCalendarCategories(
  modalities: Modality[],
  colorMap: Map<number, string>,
): CalendarCategory[] {
  return modalities.map((m) => ({
    id: String(m.id),
    label: m.name,
    color: colorMap.get(m.id) ?? 'oklch(0.5 0.09 190)',
  }))
}

function computeDayHourRange(
  coachings: CoachingClass[],
  selectedDate: Date,
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
      <Skeleton className="h-[600px] w-full rounded-lg" />
    </div>
  )
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function CalendarPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const staticLoaded = useRef(false)

  const [initialLoad, setInitialLoad] = useState(true)
  const [coachings, setCoachings] = useState<CoachingClass[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [modalities, setModalities] = useState<Modality[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date())

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
      ]).then(([studiosRes, modalitiesRes]) => {
        const rawStudios = studiosRes?.data
        const studiosList = Array.isArray(rawStudios) ? rawStudios : (rawStudios as { results?: Studio[] })?.results
        if (studiosList) setStudios(studiosList)

        const rawModalities = modalitiesRes?.data
        const modalitiesList = Array.isArray(rawModalities) ? rawModalities : (rawModalities as { results?: Modality[] })?.results
        if (modalitiesList) setModalities(modalitiesList)
      })
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    apiClient.api
      .coachingsList({
        date_from: weekStart.toISOString(),
        date_to: weekEnd.toISOString(),
        status: 'scheduled',
      })
      .then((res) => {
        if (cancelled) return
        const raw = res?.data
        const list = Array.isArray(raw) ? raw : (raw as { results?: CoachingClass[] })?.results
        if (list) setCoachings(list)
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setInitialLoad(false)
      })

    return () => { cancelled = true }
  }, [weekKey])

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  const { dayStartHour, dayEndHour } = computeDayHourRange(coachings, selectedDate)

  const now = new Date()
  const isToday =
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear()
  const nowMinutes = isToday
    ? (now.getHours() - dayStartHour) * 60 + now.getMinutes()
    : undefined

  const calendarEvents = useMemo(
    () => toCalendarEvents(coachings, selectedDate, modalityColorMap, dayStartHour),
    [coachings, selectedDate, modalityColorMap, dayStartHour]
  )
  const calendarResources = useMemo(
    () => toCalendarResources(studios),
    [studios]
  )
  const calendarCategories = useMemo(
    () => toCalendarCategories(modalities, modalityColorMap),
    [modalities, modalityColorMap]
  )

  const dayLoadMap = useMemo(() => {
    const map = new Map<string, number>()
    const maxLoad = studios.length * (dayEndHour - dayStartHour)
    if (maxLoad <= 0) return map

    for (const c of coachings) {
      const start = new Date(c.start_datetime)
      const key = toDateKey(start)
      const dur = (new Date(c.end_datetime).getTime() - start.getTime()) / 3600000
      map.set(key, (map.get(key) ?? 0) + dur)
    }

    for (const [key, hours] of map) {
      map.set(key, Math.min(hours / maxLoad, 1))
    }

    return map
  }, [coachings, studios.length, dayStartHour, dayEndHour])

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={t('calendar.title')} backTo={paths.home}>
          <Button size="sm" onClick={() => navigate(paths.coachingsCreate)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('coachings.createSession')}
          </Button>
        </PageHeader>
        {initialLoad ? (
          <CalendarSkeleton />
        ) : (
          <ScheduleCalendar
            resources={calendarResources}
            events={calendarEvents}
            categories={calendarCategories}
            selectedDate={selectedDate}
            dayLoadMap={dayLoadMap}
            dayStartHour={dayStartHour}
            dayEndHour={dayEndHour}
            slotHeight={44}
            nowMinutes={nowMinutes}
            onDateChange={handleDateChange}
          />
        )}
      </div>
    </PageLayout>
  )
}

