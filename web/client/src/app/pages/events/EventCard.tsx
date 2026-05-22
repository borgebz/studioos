import { useTranslation } from 'react-i18next'
import { Calendar, Heart, MapPin } from 'lucide-react'
import type { EventList } from '@/api/studioos-api'
import { EventStateEnum } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  EventCover,
  EventStateBadge,
  useDateFormatter,
  eventDateLine,
} from './events-helpers'

interface EventCardProps {
  event: EventList & {
    interest_count?: number
    comment_count?: number
    description?: string
  }
  onOpen: () => void
  onToggleInterest?: () => void
  interested?: boolean
}

export function EventCard({
  event,
  onOpen,
  onToggleInterest,
  interested,
}: EventCardProps) {
  const { t } = useTranslation()
  const fmt = useDateFormatter()
  const cancelled = event.event_state === EventStateEnum.Cancelled
  const completed = event.event_state === EventStateEnum.Completed
  const dim = cancelled || completed
  const dl = eventDateLine(event.event_date, fmt)

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label={event.title}
      >
        <div className="relative">
          <EventCover
            src={event.cover_photo_url}
            alt={event.title}
            cancelled={cancelled}
          />
          {event.event_state && (
            <div className="absolute left-3 top-3">
              <EventStateBadge value={event.event_state} />
            </div>
          )}
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          {dl ? (
            <span>
              {dl.weekday}, {dl.date} · {dl.time}
            </span>
          ) : (
            <span>{t('events.dateTbd')}</span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm"
        >
          <h3
            className={cn(
              'text-base font-semibold leading-snug tracking-tight text-foreground',
              cancelled && 'line-through decoration-muted-foreground/60',
            )}
          >
            {event.title || t('events.noTitle')}
          </h3>
        </button>

        {event.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
            {event.description}
          </p>
        )}

        {event.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5" />
              {event.interest_count ?? 0}
            </span>
          </div>
          {onToggleInterest && (
            <Button
              type="button"
              variant={interested ? 'secondary' : 'outline'}
              size="sm"
              disabled={dim}
              onClick={(e) => {
                e.stopPropagation()
                onToggleInterest()
              }}
              className={cn(
                'h-7 gap-1.5 px-2.5 text-xs',
                interested && 'text-primary',
              )}
            >
              <Heart
                className={cn('size-3.5', interested && 'fill-primary')}
              />
              {interested
                ? t('events.interest.secondaryActive')
                : t('events.interest.secondary')}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
