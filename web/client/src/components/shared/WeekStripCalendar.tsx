/**
 * WeekStripCalendar — a reusable 7-day week strip that renders coloured "bands"
 * per day. Built for surfaces like the teacher availability viewer and the
 * variant booking dialog, where you need a compact "what's happening this week"
 * view alongside other UI.
 *
 * Layout:
 *   - sm+ : 7-column grid (one column per weekday)
 *   - <sm : vertical list with a day pill on the left, bands stacking on the right
 *
 * The component is presentational. Consumers own the data fetch, the date range,
 * and the meaning of each band (just supply variant + icon + label).
 */
import { useMemo, type ReactNode } from 'react'
import { format, startOfDay, type Locale } from 'date-fns'
import { enUS } from 'date-fns/locale'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Visual variants. Add new ones here when the design system expands; keep the
 * palette small so consumers can map their data confidently.
 */
export type WeekStripBandVariant =
  | 'positive'
  | 'negative'
  | 'warning'
  | 'highlight'

const VARIANT_STYLES: Record<
  WeekStripBandVariant,
  { container: string; icon: string; text: string }
> = {
  positive: {
    container:
      'bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/15',
    icon: 'text-emerald-700 dark:text-emerald-400',
    text: 'text-emerald-800 dark:text-emerald-300',
  },
  negative: {
    container: 'bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/15',
    icon: 'text-rose-700 dark:text-rose-400',
    text: 'text-rose-900 dark:text-rose-200',
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15',
    icon: 'text-amber-700 dark:text-amber-400',
    text: 'text-amber-900 dark:text-amber-200',
  },
  highlight: {
    container: 'bg-primary/15 border-primary border-2',
    icon: 'text-primary',
    text: 'text-primary',
  },
}

/** One coloured rectangle inside a day cell. */
export interface WeekStripBand {
  /** Stable React key. */
  id: string | number
  /** Drives palette + accent. */
  variant: WeekStripBandVariant
  /** Small icon shown at the start of the identity line. */
  icon: ReactNode
  /** Short text shown next to the icon — the band's identity ("Available", "Busy", ...). */
  label: string
  /** Datetime range. The component uses the start date to bucket the band by day. */
  start: Date
  end: Date
  /** Optional secondary line shown below the time (e.g. modality, title). */
  subtitle?: string | null
  /** Optional top-right marker (e.g. recurring icon). */
  badge?: ReactNode
  /** Optional popover body. If present, the band becomes clickable and opens a popover. */
  popoverContent?: ReactNode
}

/** Compact (icon, label) chip rendered in the legend row. */
export interface WeekStripLegendEntry {
  variant: WeekStripBandVariant
  icon: ReactNode
  label: string
}

export interface WeekStripCalendarProps {
  /** Monday of the week being displayed. Consumer keeps this in state. */
  weekStart: Date
  /** Called when the user clicks the prev/next week buttons. */
  onWeekChange: (newWeekStart: Date) => void
  /** Flat list of bands. Component buckets them by day internally. */
  bands: WeekStripBand[]
  /** Optional legend chips rendered above the grid. */
  legend?: WeekStripLegendEntry[]
  /** Replaces the day grid with a skeleton when true. */
  loading?: boolean
  /** Message shown when the visible week has no bands at all. */
  emptyMessage?: string
  /** Mobile-only placeholder shown on a day with no bands ("Free all day"). */
  dayFreeMessage?: string
  /** Locale used to format weekday names (Seg/Mon/...). */
  locale?: Locale
  /**
   * Date-range mode. When true, the time of day is ignored and each band fills
   * every day in its `[start, end]` date range (so a multi-day booking appears
   * on every day it covers, not just its start day). Leave off for intraday
   * sessions that should appear once at their start time.
   */
  fillRange?: boolean
  /** Optional class on the outer wrapper. */
  className?: string
}

export function WeekStripCalendar({
  weekStart,
  onWeekChange,
  bands,
  legend,
  loading = false,
  emptyMessage,
  dayFreeMessage,
  locale = enUS,
  fillRange = false,
  className,
}: WeekStripCalendarProps) {
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
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

  const bandsByDay = useMemo(() => {
    const map = new Map<string, WeekStripBand[]>()
    for (const day of weekDays) map.set(format(day, 'yyyy-MM-dd'), [])
    for (const band of bands) {
      if (fillRange) {
        // Date-range mode: drop the band on every visible day it spans
        // (inclusive of the start and end dates), ignoring the time of day.
        const startDay = startOfDay(band.start).getTime()
        const endDay = startOfDay(band.end).getTime()
        for (const day of weekDays) {
          const t = startOfDay(day).getTime()
          if (t >= startDay && t <= endDay) {
            map.get(format(day, 'yyyy-MM-dd'))!.push(band)
          }
        }
      } else {
        const key = format(band.start, 'yyyy-MM-dd')
        map.get(key)?.push(band)
      }
    }
    // Sort each day chronologically so sessions stack top-to-bottom in time
    // order. Without this, bands are rendered in insertion order — the user
    // sees them appear in whatever order the API returned them.
    for (const dayBands of map.values()) {
      dayBands.sort((a, b) => a.start.getTime() - b.start.getTime())
    }
    return map
  }, [bands, weekDays, fillRange])

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    onWeekChange(d)
  }
  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    onWeekChange(d)
  }

  const isEmpty = bands.length === 0

  return (
    <div className={cn('flex flex-col', className)}>
      {legend && legend.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {legend.map((entry, i) => (
            <LegendChip key={i} entry={entry} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between p-3">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={prevWeek}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(weekStart, 'dd MMM', { locale })} —{' '}
          {format(weekEnd, 'dd MMM yyyy', { locale })}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={nextWeek}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <LoadingSkeleton />
        ) : isEmpty && emptyMessage ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-7 sm:gap-1.5">
            {weekDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const dayBands = bandsByDay.get(key) ?? []
              const isToday = format(new Date(), 'yyyy-MM-dd') === key
              const dayName = format(day, 'EEE', { locale })
              const dayNumber = format(day, 'dd')
              return (
                <div
                  key={key}
                  className="sm:min-h-[160px] flex items-stretch gap-2 sm:block"
                >
                  {/* Mobile day pill */}
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center w-12 shrink-0 rounded-md sm:hidden',
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <div className="text-[10px] font-medium uppercase">
                      {dayName}
                    </div>
                    <div className="text-sm font-semibold">{dayNumber}</div>
                  </div>
                  {/* Desktop header */}
                  <div
                    className={cn(
                      'hidden sm:block text-center text-xs font-medium py-1.5 rounded-t-md',
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <div className="capitalize">{dayName}</div>
                    <div className="text-[11px]">{dayNumber}</div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1 p-1">
                    {dayBands.map((band) => (
                      <Band
                        key={band.id}
                        band={band}
                        locale={locale}
                        hideTime={fillRange}
                      />
                    ))}
                    {dayBands.length === 0 && dayFreeMessage && (
                      <div className="flex items-center text-xs text-muted-foreground/70 italic sm:hidden h-12">
                        {dayFreeMessage}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function LegendChip({ entry }: { entry: WeekStripLegendEntry }) {
  const styles = VARIANT_STYLES[entry.variant]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
        styles.container
      )}
    >
      <span className={styles.icon}>{entry.icon}</span>
      <span className={cn('font-medium', styles.text)}>{entry.label}</span>
    </span>
  )
}

function Band({
  band,
  locale,
  hideTime = false,
}: {
  band: WeekStripBand
  locale: Locale
  hideTime?: boolean
}) {
  const styles = VARIANT_STYLES[band.variant]
  // Intraday bands show a time range; multi-day bands (e.g. an inventory
  // booking spanning several days) show the date span instead, since
  // "11:00–11:00" reads as a zero-length slot. In date-range (`hideTime`)
  // mode the band already fills each covered day, so no time line is shown.
  const sameDay =
    format(band.start, 'yyyy-MM-dd') === format(band.end, 'yyyy-MM-dd')
  const rangeLabel = sameDay
    ? `${format(band.start, 'HH:mm')}–${format(band.end, 'HH:mm')}`
    : `${format(band.start, 'd MMM', { locale })} – ${format(band.end, 'd MMM', { locale })}`
  const body = (
    <div className={cn('rounded-md border px-2 py-1.5', styles.container)}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={cn('shrink-0 flex items-center', styles.icon)}>
          {band.icon}
        </span>
        <span
          className={cn(
            'text-[11px] font-semibold truncate flex-1 min-w-0',
            styles.text
          )}
        >
          {band.label}
        </span>
        {band.badge && <span className="shrink-0">{band.badge}</span>}
      </div>
      {!hideTime && (
        <div className={cn('text-xs font-medium mt-1', styles.text)}>
          {rangeLabel}
        </div>
      )}
      {band.subtitle && (
        <p className="text-[11px] truncate opacity-80 mt-0.5">
          {band.subtitle}
        </p>
      )}
    </div>
  )

  if (!band.popoverContent) return body

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="block w-full text-left cursor-pointer"
          aria-label={band.label}
        >
          {body}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 text-sm">
        {band.popoverContent}
      </PopoverContent>
    </Popover>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, j) => (
            <Skeleton key={j} className="h-6 rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}
