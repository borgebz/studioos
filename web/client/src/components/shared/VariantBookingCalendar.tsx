/**
 * VariantBookingCalendar — a collapsible week-strip calendar for one variant.
 *
 * Two modes:
 *  - `viewer` (a buyer browsing a listing): shows occupancy only — red "busy"
 *    bands built from the variant's public `booking_windows`. No fetch.
 *  - `owner` (the unit's owner / school manager): lazily fetches the variant's
 *    full bookings on first expand and renders rich bands coloured by status,
 *    with type / status / title / notes / dates in a popover. Read-only —
 *    managing bookings stays in the dedicated bookings admin.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import {
  CalendarClock,
  CalendarDays,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import {
  VariantBookingStatusEnum,
  type VariantBooking,
} from '@/api/studioos-api'
import {
  WeekStripCalendar,
  type WeekStripBand,
  type WeekStripBandVariant,
  type WeekStripLegendEntry,
} from '@/components/shared/WeekStripCalendar'
import { CollapsibleSection } from '@/components/shared/CollapsibleSection'
import {
  bookingStatusLabel,
  bookingTypeLabel,
} from '@/app/pages/inventory-bookings/booking-helpers'

interface BookingWindow {
  start_at?: string
  end_at?: string
}

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** Map a booking status onto one of the strip's four palettes. */
function statusToVariant(status: string): WeekStripBandVariant {
  switch (status) {
    case VariantBookingStatusEnum.Pending:
      return 'warning'
    case VariantBookingStatusEnum.Completed:
    case VariantBookingStatusEnum.Cancelled:
      return 'positive' // not shown busy anymore — greyish-positive reads as "past/clear"
    default:
      // confirmed, blocked → occupied
      return 'negative'
  }
}

export function VariantBookingCalendar({
  variantId,
  bookingWindows = [],
  mode,
}: {
  variantId: number
  bookingWindows?: BookingWindow[]
  mode: 'owner' | 'viewer'
}) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  // Owner-only lazily-fetched bookings.
  const [bookings, setBookings] = useState<VariantBooking[] | null>(null)
  const [loading, setLoading] = useState(false)

  const loadOwnerBookings = async () => {
    if (mode !== 'owner') return
    setLoading(true)
    try {
      const res = await apiClient.api.inventoryVariantsBookingsRetrieve(variantId)
      const data = res.data as { results?: VariantBooking[] } | VariantBooking[]
      setBookings(Array.isArray(data) ? data : (data.results ?? []))
    } catch {
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  // Viewer: occupancy-only red bands from public windows.
  const viewerBands: WeekStripBand[] = useMemo(() => {
    if (mode !== 'viewer') return []
    const out: WeekStripBand[] = []
    bookingWindows.forEach((w, i) => {
      if (!w.start_at || !w.end_at) return
      out.push({
        id: `busy-${i}`,
        variant: 'negative',
        icon: <XCircle className="h-3 w-3" />,
        label: t('marketplace.variantCalendar.busy'),
        start: new Date(w.start_at),
        end: new Date(w.end_at),
      })
    })
    return out
  }, [mode, bookingWindows, t])

  // Owner: rich bands from the fetched bookings.
  const ownerBands: WeekStripBand[] = useMemo(() => {
    if (mode !== 'owner' || !bookings) return []
    return bookings
      .filter((b) => b.status !== VariantBookingStatusEnum.Cancelled)
      .map((b) => ({
        id: b.id,
        variant: statusToVariant(b.status),
        icon: <CalendarClock className="h-3 w-3" />,
        label: bookingTypeLabel(t, b.booking_type),
        start: new Date(b.start_at),
        end: new Date(b.end_at),
        subtitle: b.title || null,
        popoverContent: (
          <div className="space-y-1.5">
            <p className="font-medium text-foreground">
              {b.title || bookingTypeLabel(t, b.booking_type)}
            </p>
            <dl className="space-y-1 text-xs text-muted-foreground">
              <Row
                label={t('marketplace.variantCalendar.bookingType')}
                value={bookingTypeLabel(t, b.booking_type)}
              />
              <Row
                label={t('marketplace.variantCalendar.bookingStatus')}
                value={bookingStatusLabel(t, b.status)}
              />
              <Row
                label={t('marketplace.variantCalendar.dates')}
                value={`${format(new Date(b.start_at), 'PP', {
                  locale: dateLocale,
                })} – ${format(new Date(b.end_at), 'PP', { locale: dateLocale })}`}
              />
            </dl>
            {b.notes && (
              <p className="border-t border-border pt-1.5 text-xs italic text-muted-foreground">
                {b.notes}
              </p>
            )}
          </div>
        ),
      }))
  }, [mode, bookings, t, dateLocale])

  const bands = mode === 'owner' ? ownerBands : viewerBands

  const legend: WeekStripLegendEntry[] = useMemo(() => {
    if (mode === 'viewer') {
      return bands.length
        ? [
            {
              variant: 'negative',
              icon: <XCircle className="h-3 w-3" />,
              label: t('marketplace.variantCalendar.busy'),
            },
          ]
        : []
    }
    return [
      {
        variant: 'negative',
        icon: <CalendarClock className="h-3 w-3" />,
        label: t('marketplace.variantCalendar.legendBooked'),
      },
      {
        variant: 'warning',
        icon: <CalendarClock className="h-3 w-3" />,
        label: t('marketplace.variantCalendar.legendPending'),
      },
    ]
  }, [mode, bands.length, t])

  const Icon: LucideIcon = CalendarDays
  const title = (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5 text-muted-foreground" />
      {mode === 'owner'
        ? t('marketplace.variantCalendar.titleOwner')
        : t('marketplace.variantCalendar.titleViewer')}
    </span>
  )
  const summary =
    mode === 'owner'
      ? bookings == null
        ? undefined
        : t('marketplace.variantCalendar.bookingCount', {
            count: bands.length,
          })
      : t('marketplace.variantCalendar.busyCount', { count: bands.length })

  return (
    <CollapsibleSection
      title={title}
      summary={summary}
      onFirstOpen={loadOwnerBookings}
      className="bg-background/40"
    >
      <WeekStripCalendar
        weekStart={weekStart}
        onWeekChange={setWeekStart}
        bands={bands}
        legend={legend}
        loading={loading}
        locale={dateLocale}
        fillRange
        emptyMessage={
          mode === 'owner'
            ? t('marketplace.variantCalendar.emptyOwner')
            : t('marketplace.variantCalendar.emptyViewer')
        }
        dayFreeMessage={t('marketplace.variantCalendar.free')}
      />
    </CollapsibleSection>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  )
}
