import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { CalendarClock, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { VariantBooking } from '@/api/studioos-api'
import { BookingTypeEnum } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Small per-variant week-grid of bookings. Mirrors the look of the teacher
 * availability calendar used when creating a coaching, but reads variant
 * bookings instead. Intended to be embedded inside dialogs/sheets on:
 *
 *  - the listing edit form (one calendar per variant), and
 *  - later, the public product detail page (so browsing users can see when
 *    a variant is held).
 */

interface VariantBookingsCalendarProps {
  variantId: number
  /** Optional cap on calendar height — recommended inside dialogs. */
  className?: string
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0 Sun … 6 Sat
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d
}

const TYPE_COLOR: Record<BookingTypeEnum, string> = {
  [BookingTypeEnum.Reservation]: 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-300',
  [BookingTypeEnum.Loan]: 'bg-sky-100 border-sky-300 text-sky-900 dark:bg-sky-900/30 dark:border-sky-700/50 dark:text-sky-300',
  [BookingTypeEnum.Rent]: 'bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-900/30 dark:border-cyan-700/50 dark:text-cyan-300',
  [BookingTypeEnum.Sale]: 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-700/50 dark:text-emerald-300',
  [BookingTypeEnum.Donation]: 'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-900/30 dark:border-violet-700/50 dark:text-violet-300',
  [BookingTypeEnum.SchoolUse]: 'bg-indigo-100 border-indigo-300 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-700/50 dark:text-indigo-300',
  [BookingTypeEnum.Maintenance]: 'bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-900/30 dark:border-orange-700/50 dark:text-orange-300',
  [BookingTypeEnum.Blocked]: 'bg-zinc-200 border-zinc-300 text-zinc-700 dark:bg-zinc-700/40 dark:border-zinc-600 dark:text-zinc-300',
}

function bookingTypeLabel(
  t: (k: string, opts?: { defaultValue?: string }) => string,
  type: string
): string {
  const key = `inventoryBookings.type.${type === 'school_use' ? 'schoolUse' : type}`
  return t(key, { defaultValue: type })
}

export function VariantBookingsCalendar({
  variantId,
  className,
}: VariantBookingsCalendarProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [bookings, setBookings] = useState<VariantBooking[]>([])
  const [loading, setLoading] = useState(true)
  const hasLoaded = useRef(false)

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + 6)
    d.setHours(23, 59, 59, 999)
    return d
  }, [weekStart])

  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      days.push(d)
    }
    return days
  }, [weekStart])

  // The list endpoint doesn't take a date range, but bookings on a single
  // variant are bounded in practice — refetch on each navigation so we always
  // see fresh status (cancel / confirm / etc.).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiClient.api
      .inventoryVariantsBookingsRetrieve(variantId)
      .then((res) => {
        if (cancelled) return
        setBookings(res.data?.results ?? [])
        hasLoaded.current = true
      })
      .catch(() => {
        if (cancelled) return
        setBookings([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [variantId, weekStart])

  /**
   * Group bookings by day-key. A multi-day booking is duplicated across each
   * day in the week it intersects so the grid mirrors real occupancy.
   */
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, VariantBooking[]>()
    for (const day of weekDays) {
      map.set(format(day, 'yyyy-MM-dd'), [])
    }
    for (const b of bookings) {
      const start = new Date(b.start_at)
      const end = new Date(b.end_at)
      for (const day of weekDays) {
        const dayStart = new Date(day)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(day)
        dayEnd.setHours(23, 59, 59, 999)
        if (end < dayStart || start > dayEnd) continue
        const key = format(day, 'yyyy-MM-dd')
        const arr = map.get(key)
        if (arr) arr.push(b)
      }
    }
    return map
  }, [bookings, weekDays])

  const prevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }
  const nextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const hasAnyInWeek = Array.from(bookingsByDay.values()).some(
    (arr) => arr.length > 0
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={prevWeek}
          aria-label={t('coachings.previousWeek')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(weekStart, 'dd MMM', { locale: dateLocale })} —{' '}
          {format(weekEnd, 'dd MMM yyyy', { locale: dateLocale })}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={nextWeek}
          aria-label={t('coachings.nextWeek')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading && !hasLoaded.current ? (
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-6 rounded" />
              ))}
            </div>
          ))}
        </div>
      ) : !hasAnyInWeek ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CalendarClock className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('variantBookings.empty')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            className={cn(
              'grid grid-cols-7 gap-1.5 transition-opacity duration-200',
              loading ? 'opacity-40 pointer-events-none' : 'opacity-100'
            )}
          >
            {weekDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const dayBookings = bookingsByDay.get(key) ?? []
              const isToday = format(new Date(), 'yyyy-MM-dd') === key
              return (
                <div key={key} className="min-h-[140px]">
                  <div
                    className={cn(
                      'text-center text-xs font-medium py-1.5 rounded-t-md',
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <div className="capitalize">
                      {format(day, 'EEE', { locale: dateLocale })}
                    </div>
                    <div className="text-[11px]">{format(day, 'dd')}</div>
                  </div>
                  <div className="space-y-1 p-1">
                    {dayBookings.map((b) => {
                      const start = new Date(b.start_at)
                      const end = new Date(b.end_at)
                      // Clip to the day so multi-day bookings show what they
                      // actually occupy on this particular day instead of
                      // repeating the original window (which makes every day
                      // look like "20:29–20:29" when start/end have the same
                      // time-of-day).
                      const dayStart = new Date(day)
                      dayStart.setHours(0, 0, 0, 0)
                      const dayEnd = new Date(day)
                      dayEnd.setHours(23, 59, 59, 999)
                      const visibleStart = start < dayStart ? dayStart : start
                      const visibleEnd = end > dayEnd ? dayEnd : end
                      const startsThisDay = start >= dayStart
                      const endsThisDay = end <= dayEnd
                      const isFullDay = !startsThisDay && !endsThisDay
                      const timeLabel = isFullDay
                        ? t('variantBookings.allDay')
                        : !startsThisDay
                          ? `→ ${format(visibleEnd, 'HH:mm')}`
                          : !endsThisDay
                            ? `${format(visibleStart, 'HH:mm')} →`
                            : `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`
                      const block = (
                        <div
                          key={b.id}
                          className={cn(
                            'rounded-md border px-1.5 py-1 cursor-default',
                            TYPE_COLOR[b.booking_type as BookingTypeEnum] ??
                              'bg-muted border-border'
                          )}
                        >
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span className="text-[11px] font-medium">
                              {timeLabel}
                            </span>
                          </div>
                          {b.title && (
                            <p className="text-[10px] truncate mt-0.5 opacity-80">
                              {b.title}
                            </p>
                          )}
                        </div>
                      )
                      return (
                        <TooltipProvider key={b.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>{block}</TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1 text-xs">
                                <p className="font-medium">
                                  {bookingTypeLabel(t, b.booking_type)}
                                </p>
                                <p>
                                  {format(start, 'dd MMM HH:mm', {
                                    locale: dateLocale,
                                  })}{' '}
                                  →{' '}
                                  {format(end, 'dd MMM HH:mm', {
                                    locale: dateLocale,
                                  })}
                                </p>
                                {b.title && <p>{b.title}</p>}
                                {b.notes && (
                                  <p className="italic opacity-80">{b.notes}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
