import { useState, useMemo, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  CalendarClock,
  Repeat,
  Star,
  XCircle,
} from 'lucide-react'
import { apiClient } from '@/api/api-client'
import type {
  CoachingBusySlot,
  ExpandedSlot,
} from '@/api/studioos-api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  WeekStripCalendar,
  type WeekStripBand,
  type WeekStripLegendEntry,
} from '@/components/shared/WeekStripCalendar'

interface CurrentSlot {
  start: Date
  end: Date
}

export interface TeacherStudioAvailabilityDialogProps {
  open: boolean
  onClose: () => void
  teacherId: number
  teacherLabel: string
  studioId?: number | null
  studioLabel?: string
  currentSlot?: CurrentSlot | null
  excludeCoachingId?: number | null
}

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function overlaps(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
) {
  return a.start < b.end && a.end > b.start
}

export function TeacherStudioAvailabilityDialog({
  open,
  onClose,
  teacherId,
  teacherLabel,
  studioId,
  studioLabel,
  currentSlot,
  excludeCoachingId,
}: TeacherStudioAvailabilityDialogProps) {
  const { t, i18n } = useTranslation()
  const dateLocale =
    i18n.language === 'pt' || i18n.language === 'pt-PT' ? pt : enUS

  const [availability, setAvailability] = useState<ExpandedSlot[]>([])
  const [teacherBusy, setTeacherBusy] = useState<CoachingBusySlot[]>([])
  const [studioBusy, setStudioBusy] = useState<CoachingBusySlot[]>([])
  const [loading, setLoading] = useState(false)
  const hasLoaded = useRef(false)

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(currentSlot?.start ?? new Date())
  )

  useEffect(() => {
    if (!open && currentSlot) {
      setWeekStart(startOfWeek(currentSlot.start))
    }
  }, [open, currentSlot])

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }, [weekStart])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const dateFrom = weekStart.toISOString()
    const dateTo = weekEnd.toISOString()
    Promise.all([
      apiClient.api
        .availabilityTeachersList(teacherId, {
          date_from: dateFrom,
          date_to: dateTo,
        })
        .then((res) => res.data)
        .catch(() => [] as ExpandedSlot[]),
      apiClient.api
        .checkCoachingAvailability({
          teacher_id: teacherId,
          studio_id: studioId ?? undefined,
          date_from: dateFrom,
          date_to: dateTo,
          exclude_coaching_id: excludeCoachingId ?? undefined,
        })
        .then((res) => res.data)
        .catch(() => ({ teacher_busy: [], studio_busy: [] })),
    ])
      .then(([avail, conflicts]) => {
        setAvailability(avail)
        setTeacherBusy(conflicts.teacher_busy)
        setStudioBusy(conflicts.studio_busy)
        hasLoaded.current = true
      })
      .finally(() => setLoading(false))
  }, [open, teacherId, studioId, excludeCoachingId, weekStart, weekEnd])

  // Map domain data into the calendar's neutral band shape.
  // - Availability windows that overlap the teacher's own busy time are hidden
  //   (the busy block wins, the green would mislead).
  // - teacher_busy + studio_busy merge into a single "Not available" stream,
  //   deduped by id, with popover content explaining which side blocks.
  const bands: WeekStripBand[] = useMemo(() => {
    const teacherBusyRanges = teacherBusy.map((b) => ({
      start: new Date(b.start_datetime),
      end: new Date(b.end_datetime),
    }))
    const visibleAvailability = availability.filter((slot) => {
      const range = {
        start: new Date(slot.start_datetime),
        end: new Date(slot.end_datetime),
      }
      return !teacherBusyRanges.some((busy) => overlaps(range, busy))
    })

    const seen = new Set<number>()
    const unavailable: Array<{ busy: CoachingBusySlot; source: 'teacher' | 'studio' }> = []
    for (const busy of teacherBusy) {
      if (seen.has(busy.id)) continue
      seen.add(busy.id)
      unavailable.push({ busy, source: 'teacher' })
    }
    for (const busy of studioBusy) {
      if (seen.has(busy.id)) continue
      seen.add(busy.id)
      unavailable.push({ busy, source: 'studio' })
    }

    const result: WeekStripBand[] = []

    for (const slot of visibleAvailability) {
      const start = new Date(slot.start_datetime)
      const end = new Date(slot.end_datetime)
      result.push({
        id: `a-${slot.id ?? slot.recurring_id}-${slot.start_datetime}`,
        variant: 'positive',
        icon: <CalendarCheck className="h-3 w-3" />,
        label: t('coachings.availability.legend.teacherAvailability'),
        start,
        end,
        subtitle: slot.modality?.name ?? null,
        badge: slot.is_recurring ? (
          <Repeat className="h-2.5 w-2.5 text-muted-foreground" />
        ) : undefined,
      })
    }

    for (const item of unavailable) {
      const start = new Date(item.busy.start_datetime)
      const end = new Date(item.busy.end_datetime)
      result.push({
        id: `u-${item.busy.id}`,
        variant: 'negative',
        icon: <XCircle className="h-3 w-3" />,
        label: t('coachings.availability.legend.notAvailable'),
        start,
        end,
        subtitle: item.busy.modality?.name ?? null,
        popoverContent: (
          <>
            <p className="font-medium mb-1 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
              {item.source === 'teacher'
                ? t('coachings.availability.popover.teacherBusy')
                : t('coachings.availability.popover.studioBusy')}
            </p>
            <div className="space-y-1 text-muted-foreground">
              <p>
                {format(start, 'EEE dd MMM, HH:mm')}–{format(end, 'HH:mm')}
              </p>
              {item.busy.modality && (
                <p>
                  {t('coachings.modality')}: {item.busy.modality.name}
                </p>
              )}
            </div>
          </>
        ),
      })
    }

    if (currentSlot) {
      result.push({
        id: 'current-slot',
        variant: 'highlight',
        icon: <Star className="h-3 w-3" />,
        label: t('coachings.availability.legend.yourSlot'),
        start: currentSlot.start,
        end: currentSlot.end,
      })
    }

    return result
  }, [availability, teacherBusy, studioBusy, currentSlot, t])

  const legend: WeekStripLegendEntry[] = useMemo(() => {
    const items: WeekStripLegendEntry[] = [
      {
        variant: 'positive',
        icon: <CalendarCheck className="h-3 w-3" />,
        label: t('coachings.availability.legend.teacherAvailability'),
      },
      {
        variant: 'negative',
        icon: <XCircle className="h-3 w-3" />,
        label: t('coachings.availability.legend.notAvailable'),
      },
    ]
    if (currentSlot) {
      items.push({
        variant: 'highlight',
        icon: <Star className="h-3 w-3" />,
        label: t('coachings.availability.legend.yourSlot'),
      })
    }
    return items
  }, [currentSlot, t])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            {t('coachings.availability.title')}
          </DialogTitle>
          <DialogDescription>
            {studioLabel
              ? t('coachings.availability.descTeacherStudio', {
                  teacher: teacherLabel,
                  studio: studioLabel,
                })
              : t('coachings.availability.descTeacher', {
                  teacher: teacherLabel,
                })}
          </DialogDescription>
        </DialogHeader>

        <WeekStripCalendar
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          bands={bands}
          legend={legend}
          loading={loading && !hasLoaded.current}
          emptyMessage={t('coachings.availability.empty')}
          dayFreeMessage={t('coachings.availability.dayFree')}
          locale={dateLocale}
          className="flex-1 min-h-0"
        />
      </DialogContent>
    </Dialog>
  )
}
