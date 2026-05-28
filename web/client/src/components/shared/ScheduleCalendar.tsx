import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Clock, MapPin, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
export interface CalendarResource {
  id: string | number
  name: string
  subtitle?: string
  capacity?: number
}

export interface CalendarEvent {
  id: string | number
  resourceId: string | number
  start: number
  duration: number
  title: string
  subtitle?: string
  category: string
  categoryColor: string
  teacher?: string
  enrolled?: number
  status?: string
}

export interface CalendarCategory {
  id: string
  label: string
  color: string
}

export interface ScheduleCalendarProps {
  resources: CalendarResource[]
  events: CalendarEvent[]
  categories?: CalendarCategory[]
  dayStartHour?: number
  dayEndHour?: number
  slotMinutes?: number
  slotHeight?: number
  nowMinutes?: number
  selectedDate?: Date
  dayLoadMap?: Map<string, number>
  filtersSlot?: React.ReactNode
  onDateChange?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
}

const GUTTER_WIDTH = 72
const COL_MIN_WIDTH = 150

function formatTime(minutesFromStart: number, dayStartHour: number): string {
  const totalMinutes = dayStartHour * 60 + minutesFromStart
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function EventBlock({
  event,
  slotHeight,
  slotMinutes,
  dayStartHour,
  onClick,
}: {
  event: CalendarEvent
  slotHeight: number
  slotMinutes: number
  dayStartHour: number
  onClick: () => void
}) {
  const { t } = useTranslation()
  const top = (event.start / slotMinutes) * slotHeight + GRID_TOP_PAD
  const height = (event.duration / slotMinutes) * slotHeight
  const isShort = event.duration <= 45
  const isTiny = event.duration <= 30

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={event.title || t('calendar.eventDetails')}
          className={cn(
            'absolute left-1 right-1 overflow-hidden rounded-md border border-border bg-card text-left transition-shadow hover:shadow-md hover:z-10',
            'flex flex-col gap-0.5',
            isTiny ? 'px-2 py-0.5' : isShort ? 'px-2.5 py-1' : 'px-3 py-2'
          )}
          style={{
            top,
            height: height - 2,
            borderLeftWidth: 3,
            borderLeftColor: event.categoryColor,
          }}
          onClick={onClick}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
              {formatTime(event.start, dayStartHour)}
            </span>
            {!isTiny && (
              <span
                className="text-[10px] font-medium"
                style={{ color: event.categoryColor }}
              >
                {event.subtitle}
              </span>
            )}
          </div>
          <span
            className={cn(
              'font-medium leading-tight text-foreground truncate',
              isTiny ? 'text-xs' : isShort ? 'text-xs' : 'text-sm'
            )}
          >
            {event.title}
          </span>
          {!isShort && event.teacher && (
            <span className="mt-auto text-xs text-muted-foreground truncate">
              {event.teacher}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[220px]">
        <p className="font-medium">{event.title}</p>
        <p className="text-xs text-muted-foreground">
          {formatTime(event.start, dayStartHour)} –{' '}
          {formatTime(event.start + event.duration, dayStartHour)} ·{' '}
          {event.duration}min
        </p>
        {event.teacher && (
          <p className="text-xs text-muted-foreground">{event.teacher}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

const GRID_TOP_PAD = 8

function TimeGutter({
  totalSlots,
  slotHeight,
  slotMinutes,
  dayStartHour,
}: {
  totalSlots: number
  slotHeight: number
  slotMinutes: number
  dayStartHour: number
}) {
  const ticks = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i <= totalSlots; i++) arr.push(i * slotMinutes)
    return arr
  }, [totalSlots, slotMinutes])

  return (
    <div
      className="relative shrink-0 border-r border-border bg-card"
      style={{
        width: GUTTER_WIDTH,
        height: totalSlots * slotHeight + GRID_TOP_PAD,
      }}
    >
      {ticks.map((minutes) => {
        const totalMin = dayStartHour * 60 + minutes
        const isHour = totalMin % 60 === 0
        return (
          <div
            key={minutes}
            className={cn(
              'absolute right-2 -translate-y-1/2 text-right font-mono text-[10px] tracking-wider',
              isHour ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}
            style={{ top: (minutes / slotMinutes) * slotHeight + GRID_TOP_PAD }}
          >
            {isHour
              ? formatTime(minutes, dayStartHour)
              : `:${String(totalMin % 60).padStart(2, '0')}`}
          </div>
        )
      })}
    </div>
  )
}

function ResourceColumn({
  events,
  totalSlots,
  slotHeight,
  slotMinutes,
  dayStartHour,
  isLast,
  onEventClick,
}: {
  resource: CalendarResource
  events: CalendarEvent[]
  totalSlots: number
  slotHeight: number
  slotMinutes: number
  dayStartHour: number
  isLast: boolean
  onEventClick: (event: CalendarEvent) => void
}) {
  const totalHeight = totalSlots * slotHeight + GRID_TOP_PAD

  return (
    <div
      className={cn(
        'relative shrink-0',
        !isLast && 'border-r border-border/50'
      )}
      style={{
        minWidth: COL_MIN_WIDTH,
        flex: '1 0 0%',
        height: totalHeight,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${slotHeight - 1}px, var(--color-border) ${slotHeight - 1}px, var(--color-border) ${slotHeight}px)`,
        backgroundSize: `100% ${slotHeight * 2}px`,
        backgroundPositionY: `${GRID_TOP_PAD + slotHeight - 1}px`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${slotHeight * 2 - 1}px, var(--color-border) ${slotHeight * 2 - 1}px, var(--color-border) ${slotHeight * 2}px)`,
          backgroundPositionY: `${GRID_TOP_PAD}px`,
        }}
      />
      {events.map((event) => (
        <EventBlock
          key={event.id}
          event={event}
          slotHeight={slotHeight}
          slotMinutes={slotMinutes}
          dayStartHour={dayStartHour}
          onClick={() => onEventClick(event)}
        />
      ))}
    </div>
  )
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const INITIAL_RANGE = 30
const EXPAND_BY = 30
const DAY_ITEM_WIDTH = 52

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  )
}

function makeDay(base: Date, offset: number): Date {
  const d = new Date(base)
  d.setDate(base.getDate() + offset)
  d.setHours(0, 0, 0, 0)
  return d
}

function useTick() {
  const ctxRef = useRef<AudioContext | null>(null)
  const lastTickRef = useRef(0)

  useEffect(() => {
    return () => {
      try {
        ctxRef.current?.close()
      } catch {
        // ignore – browser may have already discarded the context
      }
      ctxRef.current = null
    }
  }, [])

  return useCallback(() => {
    try {
      const now = performance.now()
      if (now - lastTickRef.current < 60) return
      lastTickRef.current = now

      if (!ctxRef.current) {
        ctxRef.current = new AudioContext()
      }
      const ctx = ctxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 1800
      gain.gain.setValueAtTime(0.03, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.03)
    } catch {
      // AudioContext not supported or blocked by browser policy
    }
  }, [])
}

function DayRoulette({
  selectedDate,
  dayLoadMap,
  onDateChange,
}: {
  selectedDate: Date
  dayLoadMap?: Map<string, number>
  onDateChange: (date: Date) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const mountedRef = useRef(false)
  const userClickedRef = useRef(false)
  const anchorRef = useRef<Date | null>(null)
  if (!anchorRef.current) {
    const d = new Date(selectedDate)
    d.setHours(0, 0, 0, 0)
    anchorRef.current = d
  }

  const [rangeBefore, setRangeBefore] = useState(INITIAL_RANGE)
  const [rangeAfter, setRangeAfter] = useState(INITIAL_RANGE)
  const { t, i18n } = useTranslation()
  const [visibleMonth, setVisibleMonth] = useState(
    () =>
      `${t(`scheduleCalendar.months.${selectedDate.getMonth()}`)} ${selectedDate.getFullYear()}`
  )
  const startSentinelRef = useRef<HTMLDivElement>(null)
  const endSentinelRef = useRef<HTMLDivElement>(null)
  const tick = useTick()
  const lastCenterIdx = useRef(-1)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const anchor = anchorRef.current
  const days = useMemo(() => {
    const result: Date[] = []
    for (let i = -rangeBefore; i <= rangeAfter; i++) {
      result.push(makeDay(anchor, i))
    }
    return result
  }, [anchor, rangeBefore, rangeAfter])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const startEl = startSentinelRef.current
    const endEl = endSentinelRef.current
    if (!startEl || !endEl) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (entry.target === startEl) {
            const scr = el
            const prevWidth = scr.scrollWidth
            setRangeBefore((r) => r + EXPAND_BY)
            requestAnimationFrame(() => {
              scr.scrollLeft += scr.scrollWidth - prevWidth
            })
          } else if (entry.target === endEl) {
            setRangeAfter((r) => r + EXPAND_BY)
          }
        }
      },
      { root: el, rootMargin: '0px 400px 0px 400px', threshold: 0 }
    )
    io.observe(startEl)
    io.observe(endEl)
    return () => io.disconnect()
  }, [days.length])

  useEffect(() => {
    if (!selectedRef.current) return
    if (userClickedRef.current) {
      userClickedRef.current = false
      return
    }
    selectedRef.current.scrollIntoView({
      behavior: mountedRef.current ? 'smooth' : 'instant',
      inline: 'center',
      block: 'nearest',
    })
    mountedRef.current = true
  }, [toDateKey(selectedDate)])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let raf = 0
    const handleScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const centerX = el.scrollLeft + el.clientWidth / 2
        const idx = Math.round(centerX / DAY_ITEM_WIDTH)
        if (idx !== lastCenterIdx.current) {
          lastCenterIdx.current = idx
          tick()
        }
        const clampedIdx = Math.max(0, Math.min(idx, days.length - 1))
        const centeredDay = days[clampedIdx]
        if (centeredDay) {
          const label = `${t(`scheduleCalendar.months.${centeredDay.getMonth()}`)} ${centeredDay.getFullYear()}`
          setVisibleMonth((prev) => (prev === label ? prev : label))
        }
      })
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(raf)
    }
  }, [tick, days])

  const handleTodayClick = useCallback(() => {
    onDateChange(today)
  }, [today, onDateChange])

  const isSelectedToday = isSameDay(selectedDate, today)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-foreground tracking-tight">
            {visibleMonth}
          </span>
          <span className="text-xs text-muted-foreground">
            {selectedDate.getDate()}{' '}
            {t(`scheduleCalendar.monthsShort.${selectedDate.getMonth()}`)}{' '}
            {t('scheduleCalendar.selected')}
          </span>
        </div>
        {!isSelectedToday && (
          <button
            type="button"
            aria-label={t('calendar.today')}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
            onClick={handleTodayClick}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t('scheduleCalendar.today')}
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex w-full gap-1 overflow-x-auto px-[calc(50%-24px)]"
        style={{
          scrollSnapType: 'x proximity',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div ref={startSentinelRef} className="h-1 w-1 shrink-0" />
        {days.map((day) => {
          const isDaySelected = isSameDay(day, selectedDate)
          const isDayToday = isSameDay(day, today)
          const key = toDateKey(day)
          const load = dayLoadMap?.get(key) ?? 0
          const isFirstOfMonth = day.getDate() === 1
          return (
            <button
              key={key}
              ref={isDaySelected ? selectedRef : undefined}
              type="button"
              aria-label={t('calendar.selectDay', {
                date: day.toLocaleDateString(i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }),
              })}
              className={cn(
                'flex min-w-[48px] shrink-0 flex-col items-center gap-0.5 rounded-md px-2.5 py-1.5 transition-colors',
                isDaySelected
                  ? 'bg-foreground text-background'
                  : isDayToday
                    ? 'ring-1 ring-primary/40 hover:bg-accent text-foreground'
                    : 'hover:bg-accent text-foreground'
              )}
              style={{ scrollSnapAlign: 'center' }}
              onClick={() => {
                userClickedRef.current = true
                onDateChange(day)
              }}
            >
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isDaySelected
                    ? 'text-background/70'
                    : isFirstOfMonth
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground'
                )}
              >
                {isFirstOfMonth
                  ? t(`scheduleCalendar.monthsShort.${day.getMonth()}`)
                  : t(`scheduleCalendar.daysShort.${DAY_KEYS[day.getDay()]}`)}
              </span>
              <span className="text-lg font-medium leading-none">
                {day.getDate()}
              </span>
              <div
                className={cn(
                  'h-[2px] w-4 rounded-full',
                  isDaySelected ? 'bg-background/30' : 'bg-border'
                )}
              >
                <div
                  className={cn(
                    'h-full rounded-full',
                    isDaySelected ? 'bg-background' : 'bg-primary'
                  )}
                  style={{ width: `${Math.round(load * 100)}%` }}
                />
              </div>
            </button>
          )
        })}
        <div ref={endSentinelRef} className="h-1 w-1 shrink-0" />
      </div>
    </div>
  )
}

function EventDrawer({
  event,
  open,
  onClose,
  dayStartHour,
  resource,
}: {
  event: CalendarEvent | null
  open: boolean
  onClose: () => void
  dayStartHour: number
  resource?: CalendarResource
}) {
  const { t } = useTranslation()
  if (!event) return null

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col sm:max-w-[400px]">
        <SheetHeader>
          <div
            className="text-[10px] font-medium tracking-wide"
            style={{ color: event.categoryColor }}
          >
            {event.subtitle}
          </div>
          <SheetTitle className="text-xl">{event.title}</SheetTitle>
          <SheetDescription className="sr-only">
            {t('scheduleCalendar.eventDetails')}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="grid grid-cols-[90px_1fr] gap-3 items-baseline">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {t('scheduleCalendar.time')}
            </span>
            <span className="text-sm">
              {formatTime(event.start, dayStartHour)} –{' '}
              {formatTime(event.start + event.duration, dayStartHour)}
              <span className="ml-2 text-muted-foreground">
                ({event.duration}min)
              </span>
            </span>
          </div>
          <Separator />

          {resource && (
            <>
              <div className="grid grid-cols-[90px_1fr] gap-3 items-baseline">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> {t('scheduleCalendar.studio')}
                </span>
                <span className="text-sm">
                  {resource.name}
                  {resource.subtitle && (
                    <span className="ml-1 text-muted-foreground">
                      ({resource.subtitle})
                    </span>
                  )}
                </span>
              </div>
              <Separator />
            </>
          )}

          {event.teacher && (
            <>
              <div className="grid grid-cols-[90px_1fr] gap-3 items-baseline">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3 w-3" /> {t('scheduleCalendar.teacher')}
                </span>
                <span className="text-sm">{event.teacher}</span>
              </div>
              <Separator />
            </>
          )}

          {event.enrolled != null && (
            <>
              <div className="grid grid-cols-[90px_1fr] gap-3 items-baseline">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> {t('scheduleCalendar.enrolled')}
                </span>
                <span className="text-sm">
                  {event.enrolled}
                  {resource?.capacity != null && (
                    <span className="text-muted-foreground">
                      {' '}
                      / {resource.capacity}
                    </span>
                  )}
                </span>
              </div>
              <Separator />
            </>
          )}

          <div className="grid grid-cols-[90px_1fr] gap-3 items-baseline">
            <span className="text-xs font-medium text-muted-foreground">
              {t('scheduleCalendar.category')}
            </span>
            <Badge
              variant="outline"
              className="w-fit"
              style={{
                borderColor: event.categoryColor,
                color: event.categoryColor,
              }}
            >
              {event.subtitle}
            </Badge>
          </div>
        </div>

        <div className="mt-auto flex gap-2 border-t border-border pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('scheduleCalendar.close')}
          </Button>
          <Button className="flex-1">{t('scheduleCalendar.edit')}</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ScheduleCalendar({
  resources,
  events,
  dayStartHour = 15,
  dayEndHour = 22,
  slotMinutes = 30,
  slotHeight = 44,
  nowMinutes,
  selectedDate,
  dayLoadMap,
  filtersSlot,
  onDateChange,
  onEventClick,
}: ScheduleCalendarProps) {
  const { t } = useTranslation()
  const [drawerEvent, setDrawerEvent] = useState<CalendarEvent | null>(null)

  const currentDate = useMemo(() => selectedDate ?? new Date(), [selectedDate])

  const nowTop =
    nowMinutes != null
      ? (nowMinutes / (slotMinutes ?? 30)) * (slotHeight ?? 44) + GRID_TOP_PAD
      : 0

  const totalMinutes = (dayEndHour - dayStartHour) * 60
  const totalSlots = totalMinutes / slotMinutes

  const eventsByResource = useMemo(() => {
    const m: Record<string | number, CalendarEvent[]> = {}
    resources.forEach((r) => (m[r.id] = []))
    events.forEach((e) => {
      if (m[e.resourceId]) m[e.resourceId].push(e)
    })
    return m
  }, [resources, events])

  const resourceMap = useMemo(
    () => Object.fromEntries(resources.map((r) => [r.id, r])),
    [resources]
  )

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      onEventClick?.(event)
      setDrawerEvent(event)
    },
    [onEventClick]
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar card */}
      {onDateChange && (
        <div className="rounded-lg border border-border bg-card p-4">
          <DayRoulette
            selectedDate={currentDate}
            dayLoadMap={dayLoadMap}
            onDateChange={onDateChange}
          />
        </div>
      )}

      {/* Filters card (optional) */}
      {filtersSlot}

      {/* Grid card — memoized so day-click re-renders don't touch the grid */}
      {useMemo(
        () => (
          <div className="rounded-lg border border-border bg-card overflow-x-auto overflow-y-hidden">
            <div
              className="flex flex-col"
              style={{
                minWidth: GUTTER_WIDTH + resources.length * COL_MIN_WIDTH,
              }}
            >
              {/* Column headers */}
              <div className="flex border-b border-border bg-card">
                <div
                  className="sticky left-0 z-10 shrink-0 border-r border-border bg-card px-3 py-2.5"
                  style={{ width: GUTTER_WIDTH }}
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {t('scheduleCalendar.time')}
                  </span>
                </div>
                {resources.map((resource, idx) => (
                  <div
                    key={resource.id}
                    className={cn(
                      'shrink-0 px-3 py-2.5',
                      idx < resources.length - 1 && 'border-r border-border/50'
                    )}
                    style={{ minWidth: COL_MIN_WIDTH, flex: '1 0 0%' }}
                  >
                    <div className="text-sm font-medium text-foreground">
                      {resource.name}
                    </div>
                    {resource.subtitle && (
                      <div className="text-[10px] text-muted-foreground">
                        {resource.subtitle}
                      </div>
                    )}
                    {resource.capacity != null && (
                      <div className="text-[10px] text-muted-foreground">
                        {t('scheduleCalendar.maxCap', {
                          capacity: resource.capacity,
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="relative flex">
                <div className="sticky left-0 z-10">
                  <TimeGutter
                    totalSlots={totalSlots}
                    slotHeight={slotHeight}
                    slotMinutes={slotMinutes}
                    dayStartHour={dayStartHour}
                  />
                  {nowMinutes != null && (
                    <div
                      className="pointer-events-none absolute left-0 z-30 -translate-y-1/2"
                      style={{ top: nowTop }}
                    >
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                    </div>
                  )}
                </div>
                <div className="relative flex flex-1">
                  {resources.map((resource, idx) => (
                    <ResourceColumn
                      key={resource.id}
                      resource={resource}
                      events={eventsByResource[resource.id] || []}
                      totalSlots={totalSlots}
                      slotHeight={slotHeight}
                      slotMinutes={slotMinutes}
                      dayStartHour={dayStartHour}
                      isLast={idx === resources.length - 1}
                      onEventClick={handleEventClick}
                    />
                  ))}
                </div>

                {nowMinutes != null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20"
                    style={{ top: nowTop }}
                  >
                    <div className="h-px bg-destructive/60" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ),
        [
          resources,
          eventsByResource,
          totalSlots,
          slotHeight,
          slotMinutes,
          dayStartHour,
          nowMinutes,
          nowTop,
          handleEventClick,
        ]
      )}

      {/* Event detail drawer */}
      <EventDrawer
        event={drawerEvent}
        open={drawerEvent !== null}
        onClose={() => setDrawerEvent(null)}
        dayStartHour={dayStartHour}
        resource={drawerEvent ? resourceMap[drawerEvent.resourceId] : undefined}
      />
    </div>
  )
}
