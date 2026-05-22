import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, MapPin, Plus, Ticket } from 'lucide-react'
import { apiClient } from '@/api/api-client'
import type { EventList } from '@/api/studioos-api'
import { VisibilityStateEnum } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLayout } from '@/components/shared/PageLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Authorized, usePermissions } from '@/auth/permissions'
import { paths } from '@/app/paths'
import { cn } from '@/lib/utils'
import {
  EventCover,
  EventStateBadge,
  isCancelled,
  isCompleted,
  isUpcoming,
  useDateFormatter,
  eventDateLine,
} from './events-helpers'
import { EventCard } from './EventCard'

type Tab = 'upcoming' | 'past' | 'cancelled' | 'all' | 'drafts'

// Optional fields not always present in the schema yet.
type EventListAug = EventList & {
  description?: string
  visibility_state?: VisibilityStateEnum
  interest_count?: number
  comment_count?: number
  interested?: boolean
  publication_scheduled_at?: string | null
}

export function EventsListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()

  const [items, setItems] = useState<EventListAug[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')

  const canManage = can('events.add_event') || can('events.change_event')
  // Tabs are an admin affordance only — community members see a single feed
  // of upcoming + past public events, no filter UI.
  const showTabs = canManage

  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      setLoading(true)
      const res = await apiClient.api.eventsList().catch(() => null)
      const arr = Array.isArray(res?.data)
        ? res!.data
        : ((res?.data as unknown as { results?: EventListAug[] } | undefined)
            ?.results ?? [])
      setItems(arr as EventListAug[])
      setLoading(false)
    }
    void load()
  }, [])

  const filtered = items

  const upcoming = useMemo(
    () =>
      filtered.filter(
        (e) =>
          (e.visibility_state ?? VisibilityStateEnum.Published) ===
            VisibilityStateEnum.Published &&
          !isCancelled(e) &&
          !isCompleted(e) &&
          isUpcoming(e),
      ),
    [filtered],
  )
  const past = useMemo(() => filtered.filter((e) => isCompleted(e)), [filtered])
  const cancelledList = useMemo(
    () => filtered.filter((e) => isCancelled(e)),
    [filtered],
  )
  const drafts = useMemo(
    () =>
      filtered.filter(
        (e) =>
          e.visibility_state === VisibilityStateEnum.Draft ||
          e.visibility_state === VisibilityStateEnum.Scheduled,
      ),
    [filtered],
  )

  const visible: EventListAug[] = useMemo(() => {
    switch (tab) {
      case 'upcoming':
        return upcoming
      case 'past':
        return past
      case 'cancelled':
        return cancelledList
      case 'drafts':
        return drafts
      case 'all':
        return filtered.filter(
          (e) =>
            (e.visibility_state ?? VisibilityStateEnum.Published) ===
            VisibilityStateEnum.Published,
        )
    }
  }, [tab, upcoming, past, cancelledList, drafts, filtered])

  const featured = tab === 'upcoming' ? upcoming[0] : undefined
  const grid = tab === 'upcoming' ? upcoming.slice(1) : visible

  const openEvent = (id: number) =>
    navigate(paths.eventsDetail.replace(':id', String(id)))

  const toggleInterest = async (e: EventListAug) => {
    const next = !e.interested
    setItems((prev) =>
      prev.map((it) =>
        it.id === e.id
          ? {
              ...it,
              interested: next,
              interest_count: Math.max(
                0,
                (it.interest_count ?? 0) + (next ? 1 : -1),
              ),
            }
          : it,
      ),
    )
    try {
      if (next) await apiClient.api.eventsInterestsCreate(e.id)
      else await apiClient.api.eventsInterestsMeDestroy(e.id)
    } catch {
      setItems((prev) =>
        prev.map((it) =>
          it.id === e.id
            ? {
                ...it,
                interested: !next,
                interest_count: Math.max(
                  0,
                  (it.interest_count ?? 0) + (next ? -1 : 1),
                ),
              }
            : it,
        ),
      )
    }
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'upcoming', label: t('events.tabs.upcoming'), count: upcoming.length },
    { id: 'past', label: t('events.tabs.past'), count: past.length },
    { id: 'cancelled', label: t('events.tabs.cancelled'), count: cancelledList.length },
    { id: 'drafts', label: t('events.tabs.drafts'), count: drafts.length },
    { id: 'all', label: t('events.tabs.all'), count: filtered.length },
  ]

  const isEmpty =
    !loading &&
    !featured &&
    grid.length === 0 &&
    (tab !== 'upcoming' || filtered.length === 0)

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={t('events.title')} backTo={paths.home}>
          <Authorized permission="events.add_event">
            <Button onClick={() => navigate(paths.eventsCreate)}>
              <Plus className="size-4" />
              {t('events.create')}
            </Button>
          </Authorized>
        </PageHeader>

        {/* Tabs — admin only */}
        {showTabs && (
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
            className="mb-6"
          >
            <TabsList>
              {tabs.map((it) => (
                <TabsTrigger key={it.id} value={it.id} className="gap-1.5">
                  {it.label}
                  <span className="text-muted-foreground">{it.count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {loading && <ListSkeleton />}

        {!loading && featured && tab === 'upcoming' && (
          <FeaturedEventCard
            event={featured}
            onOpen={() => openEvent(featured.id)}
            onToggleInterest={() => toggleInterest(featured)}
          />
        )}

        {!loading && grid.length > 0 && (
          <>
            {tab === 'upcoming' && featured && (
              <h2 className="mb-3 mt-8 text-sm font-medium text-muted-foreground">
                {t('events.sections.more')}
              </h2>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grid.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  onOpen={() => openEvent(e.id)}
                  onToggleInterest={() => toggleInterest(e)}
                  interested={e.interested}
                />
              ))}
            </div>
          </>
        )}

        {isEmpty && (
          <EmptyState
            canManage={canManage}
            draftsTab={tab === 'drafts'}
            onCreate={() => navigate(paths.eventsCreate)}
          />
        )}
      </div>
    </PageLayout>
  )
}

// ─── Featured (next event) ──────────────────────────────────────────────

function FeaturedEventCard({
  event,
  onOpen,
  onToggleInterest,
}: {
  event: EventListAug
  onOpen: () => void
  onToggleInterest: () => void
}) {
  const { t } = useTranslation()
  const fmt = useDateFormatter()
  const dl = eventDateLine(event.event_date, fmt)

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        {t('events.sections.featured')}
      </h2>
      <article className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
          <button
            type="button"
            onClick={onOpen}
            className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <EventCover
              src={event.cover_photo_url}
              alt={event.title}
              aspect="aspect-[16/10] lg:aspect-auto lg:h-full"
            />
          </button>
          <div className="flex flex-col gap-3.5 p-6 lg:p-7">
            <div className="flex flex-wrap gap-2">
              {event.event_state && (
                <EventStateBadge value={event.event_state} />
              )}
            </div>
            {dl ? (
              <div className="text-xs text-muted-foreground">
                {dl.weekday} · {dl.date} · {dl.time}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {t('events.dateTbd')}
              </div>
            )}
            <h2 className="font-serif text-3xl font-semibold italic leading-tight tracking-tight">
              {event.title}
            </h2>
            {event.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            )}
            {event.location && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span>{event.location}</span>
              </div>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
              <Button onClick={onOpen}>
                {t('events.open')}
              </Button>
              <Button variant="outline" onClick={onToggleInterest}>
                <Heart
                  className={cn(
                    'size-4',
                    event.interested && 'fill-primary text-primary',
                  )}
                />
                <span className="font-semibold">
                  {event.interest_count ?? 0}
                </span>
                <span className="text-muted-foreground">·</span>
                {event.interested
                  ? t('events.interest.primaryActive')
                  : t('events.interest.secondary')}
              </Button>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyState({
  canManage,
  draftsTab,
  onCreate,
}: {
  canManage: boolean
  draftsTab: boolean
  onCreate: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <Ticket className="mb-4 size-12 text-muted-foreground/30" />
      <p className="text-sm font-medium text-muted-foreground">
        {draftsTab
          ? t('events.list.emptyDraftTitle')
          : t('events.list.emptyTitle')}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        {draftsTab
          ? t('events.list.emptyDraftBody')
          : t('events.list.emptyBody')}
      </p>
      {canManage && (
        <Button size="sm" className="mt-4" onClick={onCreate}>
          <Plus className="size-4" />
          {t('events.create')}
        </Button>
      )}
    </div>
  )
}

// ─── Loading skeleton ────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <Skeleton className="aspect-[16/10] w-full lg:h-[260px]" />
          <div className="flex flex-col gap-3 p-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border"
          >
            <Skeleton className="aspect-[16/9] w-full" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
