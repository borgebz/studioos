/**
 * RequestBookingDialog — proposes a transaction on a listing.
 *
 * For `rent` listings the user picks a start/end date range plus an optional
 * message. For `sell` / `lend` / `donate` listings dates are dropped — the
 * payload is just a message, the server treats the request as an interest.
 *
 * Both shapes hit the same endpoint (`marketplaceListingsRequestCreate`) which
 * creates a pending `Transaction`. Phase 2 will surface this transaction
 * inside a listing-scoped conversation so the two parties can negotiate.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { toast } from 'sonner'
import { CalendarClock, XCircle } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { ListingDetail } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DatePicker } from '@/components/shared/DatePicker'
import {
  WeekStripCalendar,
  type WeekStripBand,
  type WeekStripLegendEntry,
} from '@/components/shared/WeekStripCalendar'
import { parseApiError } from '@/lib/api-errors'

interface RequestBookingDialogProps {
  listing: ListingDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: () => void
}

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

function endOfDay(date: Date | undefined): Date | undefined {
  if (!date) return undefined
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function startOfDay(date: Date | undefined): Date | undefined {
  if (!date) return undefined
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function RequestBookingDialog({
  listing,
  open,
  onOpenChange,
  onSubmitted,
}: RequestBookingDialogProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS
  const isRent = listing.listing_type === 'rent'

  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  // Reset form when reopened so users don't see stale picks from a prior listing.
  useEffect(() => {
    if (!open) return
    setStartDate(undefined)
    setEndDate(undefined)
    setNotes('')
    setWeekStart(startOfWeek(new Date()))
  }, [open, listing.id])

  const titleKey =
    listing.listing_type === 'rent'
      ? 'marketplace.requestBooking.titleRent'
      : listing.listing_type === 'sell'
        ? 'marketplace.requestBooking.titleSell'
        : listing.listing_type === 'lend'
          ? 'marketplace.requestBooking.titleLend'
          : 'marketplace.requestBooking.titleDonate'

  // Booked windows from the server, dropped into the calendar as red bands
  // so the user can see what's already taken before picking a range.
  const bookingBands: WeekStripBand[] = useMemo(() => {
    if (!isRent) return []
    const windows = (listing.active_booking_windows ?? []) as BookingWindow[]
    const out: WeekStripBand[] = []
    windows.forEach((w, i) => {
      if (!w.start_at || !w.end_at) return
      out.push({
        id: `booked-${i}`,
        variant: 'negative',
        icon: <XCircle className="h-3 w-3" />,
        label: t('marketplace.requestBooking.windowsLegendBooked'),
        start: new Date(w.start_at),
        end: new Date(w.end_at),
      })
    })
    return out
  }, [listing.active_booking_windows, isRent, t])

  // The user's tentative pick is drawn as a teal "highlight" band so they
  // can sanity-check it against the red ones before sending.
  const requestBands: WeekStripBand[] = useMemo(() => {
    if (!isRent || !startDate) return []
    const s = startOfDay(startDate)!
    const e = endOfDay(endDate ?? startDate)!
    return [
      {
        id: 'pending-request',
        variant: 'highlight',
        icon: <CalendarClock className="h-3 w-3" />,
        label: t('marketplace.requestBooking.windowsLegendRequest'),
        start: s,
        end: e,
      },
    ]
  }, [isRent, startDate, endDate, t])

  const legend: WeekStripLegendEntry[] = useMemo(() => {
    if (!isRent) return []
    const items: WeekStripLegendEntry[] = []
    if (bookingBands.length > 0) {
      items.push({
        variant: 'negative',
        icon: <XCircle className="h-3 w-3" />,
        label: t('marketplace.requestBooking.windowsLegendBooked'),
      })
    }
    if (startDate) {
      items.push({
        variant: 'highlight',
        icon: <CalendarClock className="h-3 w-3" />,
        label: t('marketplace.requestBooking.windowsLegendRequest'),
      })
    }
    return items
  }, [isRent, bookingBands.length, startDate, t])

  const handleSubmit = async () => {
    if (isRent) {
      if (!startDate || !endDate) {
        toast.error(t('marketplace.requestBooking.errorDatesRequired'))
        return
      }
      if (endDate.getTime() < startDate.getTime()) {
        toast.error(t('marketplace.requestBooking.errorEndBeforeStart'))
        return
      }
    }

    setSubmitting(true)
    try {
      await apiClient.api.marketplaceListingsRequestCreate(listing.id, {
        listing_id: listing.id,
        start_at: isRent && startDate ? startOfDay(startDate)!.toISOString() : null,
        end_at: isRent && endDate ? endOfDay(endDate)!.toISOString() : null,
        notes: notes.trim(),
      })
      toast.success(t('marketplace.requestBooking.success'))
      onSubmitted?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>
            {isRent
              ? t('marketplace.requestBooking.descriptionRent')
              : t('marketplace.requestBooking.descriptionNonRent')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {isRent && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start-at">
                    {t('marketplace.requestBooking.startAt')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    value={startDate}
                    onChange={(d) => {
                      setStartDate(d)
                      if (d && endDate && endDate.getTime() < d.getTime()) {
                        setEndDate(undefined)
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-at">
                    {t('marketplace.requestBooking.endAt')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker value={endDate} onChange={setEndDate} />
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <WeekStripCalendar
                  weekStart={weekStart}
                  onWeekChange={setWeekStart}
                  bands={[...bookingBands, ...requestBands]}
                  legend={legend}
                  locale={dateLocale}
                  dayFreeMessage={t(
                    'marketplace.detail.noBookingWindows'
                  )}
                />
              </div>
              {bookingBands.length > 0 && (
                <p className="text-xs italic text-muted-foreground">
                  {t('marketplace.detail.bookingWindowsDesc')}
                </p>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">
              {t('marketplace.requestBooking.notes')}
            </Label>
            <Textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('marketplace.requestBooking.notesPlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('marketplace.requestBooking.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? t('marketplace.requestBooking.submitting')
              : t('marketplace.requestBooking.submit')}
          </Button>
        </DialogFooter>

        {isRent && startDate && endDate && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {format(startOfDay(startDate)!, 'PPP', { locale: dateLocale })}
            {' – '}
            {format(endOfDay(endDate)!, 'PPP', { locale: dateLocale })}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
