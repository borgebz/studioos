import { useTranslation } from 'react-i18next'
import { format, isPast, parseISO } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import {
  Archive,
  Ban,
  Calendar,
  CalendarClock,
  Check,
  CircleDashed,
  Drama,
  Eye,
  EyeOff,
  HelpCircle,
  Pencil,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EventStateEnum, VisibilityStateEnum } from '@/api/studioos-api'
import type { Event as EventDetail, EventList } from '@/api/studioos-api'
import { cn } from '@/lib/utils'

// ─── badges ────────────────────────────────────────────────────────────────

const STATE_STYLES: Record<EventStateEnum, string> = {
  [EventStateEnum.Planned]:
    'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-transparent',
  [EventStateEnum.DateTbd]:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-transparent',
  [EventStateEnum.Cancelled]:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-transparent',
  [EventStateEnum.Completed]:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-transparent',
}

const STATE_ICONS: Record<EventStateEnum, React.ComponentType<{ className?: string }>> = {
  [EventStateEnum.Planned]: Calendar,
  [EventStateEnum.DateTbd]: HelpCircle,
  [EventStateEnum.Cancelled]: Ban,
  [EventStateEnum.Completed]: Check,
}

export function EventStateBadge({
  value,
  className,
}: {
  value: EventStateEnum
  className?: string
}) {
  const { t } = useTranslation()
  const Icon = STATE_ICONS[value]
  return (
    <Badge className={cn('gap-1', STATE_STYLES[value], className)}>
      <Icon className="size-3" />
      {t(`events.state.${value}`)}
    </Badge>
  )
}

const VIS_STYLES: Record<VisibilityStateEnum, string> = {
  [VisibilityStateEnum.Draft]:
    'bg-muted text-muted-foreground border-transparent',
  [VisibilityStateEnum.Scheduled]:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-transparent',
  [VisibilityStateEnum.Published]:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-transparent',
  [VisibilityStateEnum.Archived]:
    'bg-muted text-muted-foreground border-transparent',
}

const VIS_ICONS: Record<VisibilityStateEnum, React.ComponentType<{ className?: string }>> = {
  [VisibilityStateEnum.Draft]: Pencil,
  [VisibilityStateEnum.Scheduled]: CalendarClock,
  [VisibilityStateEnum.Published]: Eye,
  [VisibilityStateEnum.Archived]: Archive,
}

export function EventVisibilityBadge({
  value,
  className,
}: {
  value: VisibilityStateEnum
  className?: string
}) {
  const { t } = useTranslation()
  const Icon = VIS_ICONS[value]
  return (
    <Badge variant="outline" className={cn('gap-1', VIS_STYLES[value], className)}>
      <Icon className="size-3" />
      {t(`events.visibility.${value}`)}
    </Badge>
  )
}

// ─── date helpers ──────────────────────────────────────────────────────────

function dateFnsLocale(lang: string) {
  return lang.startsWith('pt') ? pt : enUS
}

export function useDateFormatter() {
  const { i18n } = useTranslation()
  const locale = dateFnsLocale(i18n.language)
  return {
    formatDateLong: (iso: string) => format(parseISO(iso), 'PPPP', { locale }),
    formatDateShort: (iso: string) => format(parseISO(iso), 'd LLL yyyy', { locale }),
    formatTime: (iso: string) => format(parseISO(iso), 'HH:mm', { locale }),
    formatWeekday: (iso: string) => format(parseISO(iso), 'EEEE', { locale }),
    formatRelative: (iso: string) => format(parseISO(iso), 'd LLL · HH:mm', { locale }),
  }
}

export function eventDateLine(event_date: string | null | undefined, fmt: ReturnType<typeof useDateFormatter>) {
  if (!event_date) return null
  const weekday = fmt.formatWeekday(event_date)
  const date = fmt.formatDateShort(event_date)
  const time = fmt.formatTime(event_date)
  return { weekday, date, time }
}

// ─── derived selectors ────────────────────────────────────────────────────

export function isCancelled(event: { event_state?: EventStateEnum }) {
  return event.event_state === EventStateEnum.Cancelled
}
export function isCompleted(event: { event_state?: EventStateEnum }) {
  return event.event_state === EventStateEnum.Completed
}
export function isDraft(event: { visibility_state?: VisibilityStateEnum }) {
  return event.visibility_state === VisibilityStateEnum.Draft
}
export function isPublished(event: { visibility_state?: VisibilityStateEnum }) {
  return event.visibility_state === VisibilityStateEnum.Published
}

export function isUpcoming(event: EventList | EventDetail) {
  if (!event.event_date) return event.event_state === EventStateEnum.DateTbd
  return !isPast(parseISO(event.event_date))
}

// ─── EventCover ──────────────────────────────────────────────────────────

export function EventCover({
  src,
  alt,
  className,
  cancelled,
  aspect = 'aspect-[16/9]',
  iconSize = 'md',
}: {
  src?: string | null
  alt?: string
  className?: string
  cancelled?: boolean
  aspect?: string
  iconSize?: 'sm' | 'md' | 'lg'
}) {
  const iconClass =
    iconSize === 'lg' ? 'size-14' : iconSize === 'sm' ? 'size-6' : 'size-10'
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-muted/30',
        aspect,
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? ''}
          className={cn(
            'h-full w-full object-cover',
            cancelled && 'grayscale opacity-70',
          )}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <Drama className={cn(iconClass, 'text-muted-foreground/30')} />
        </div>
      )}
    </div>
  )
}

// Small icon-only helper components (used by EmptyState etc.)
export const EventStatusIcons = {
  Planned: STATE_ICONS[EventStateEnum.Planned],
  DateTbd: STATE_ICONS[EventStateEnum.DateTbd],
  Cancelled: STATE_ICONS[EventStateEnum.Cancelled],
  Completed: STATE_ICONS[EventStateEnum.Completed],
  Sparkle: CircleDashed,
  EyeOff,
}
