/**
 * ListingOfferDialog — buyer expresses interest via chat (Vinted-style).
 *
 * Creates a new listing-scoped conversation + offer, then navigates to Messages.
 * Variant selection happens here, not on the listing page.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { enUS, pt } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDot,
  ImageIcon,
  Sparkles,
  Star,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import {
  ConditionEnum,
  type ListingDetail,
  type ListingVariant,
} from '@/api/studioos-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  CurrencyAmountInput,
  formatMarketplacePrice,
} from '@/components/shared/CurrencyAmountInput'
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
import { sortProductMedia } from '@/components/shared/ProductMediaGallery'
import { parseApiError } from '@/lib/api-errors'
import { cn } from '@/lib/utils'

export type ListingOfferDialogMode = 'buy' | 'offer' | 'ask'

interface ListingOfferDialogProps {
  listing: ListingDetail
  mode: ListingOfferDialogMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: (conversationId: number) => void
}

interface BookingWindow {
  start_at?: string
  end_at?: string
}

interface VariantColor {
  id: number
  name: string
  hex_code: string
}

interface VariantMediaRef {
  id: number
  image: string
  is_primary?: boolean
  sort_order?: number
}

const CONDITION_LABEL_KEYS: Record<string, string> = {
  new: 'marketplace.conditionNew',
  excellent: 'marketplace.conditionExcellent',
  good: 'marketplace.conditionGood',
  fair: 'marketplace.conditionFair',
  damaged: 'marketplace.conditionDamaged',
}

const CONDITION_ICONS: Record<string, LucideIcon> = {
  [ConditionEnum.New]: Sparkles,
  [ConditionEnum.Excellent]: Star,
  [ConditionEnum.Good]: CheckCircle2,
  [ConditionEnum.Fair]: CircleDot,
  [ConditionEnum.Damaged]: AlertTriangle,
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

function isAvailable(v: ListingVariant): boolean {
  return v.status === 'available'
}

export function ListingOfferDialog({
  listing,
  mode,
  open,
  onOpenChange,
  onSubmitted,
}: ListingOfferDialogProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS
  const currency = t('common.currencySymbol')
  const needsDates =
    mode !== 'ask' &&
    (listing.listing_type === 'rent' || listing.listing_type === 'lend')
  const variants = useMemo(
    () => (listing.variants ?? []).filter(isAvailable),
    [listing.variants]
  )

  const productMedia = useMemo(
    () => sortProductMedia(listing.product?.media ?? []),
    [listing.product?.media]
  )
  const productCover = productMedia[0]?.image ?? null

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null
  )
  const variant = variants.find((v) => v.id === selectedVariantId) ?? null

  const defaultPrice = useMemo(() => {
    const raw = listing.asking_price
    if (raw == null || raw === '') return ''
    const n = Number(raw)
    if (!Number.isNaN(n) && Number.isInteger(n)) return String(n)
    return String(raw)
  }, [listing.asking_price])

  const [offeredPrice, setOfferedPrice] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  useEffect(() => {
    if (!open) return
    setSelectedVariantId(variants[0]?.id ?? null)
    setOfferedPrice(mode === 'offer' ? '' : defaultPrice)
    setStartDate(undefined)
    setEndDate(undefined)
    setNotes('')
    setWeekStart(startOfWeek(new Date()))
  }, [open, listing.id, mode, variants, defaultPrice])

  const titleKey =
    mode === 'ask'
      ? 'marketplace.offerDialog.titleAsk'
      : mode === 'offer'
        ? 'marketplace.offerDialog.titleOffer'
        : listing.listing_type === 'rent'
          ? 'marketplace.offerDialog.titleRent'
          : listing.listing_type === 'sell'
            ? 'marketplace.offerDialog.titleBuy'
            : listing.listing_type === 'lend'
              ? 'marketplace.offerDialog.titleLend'
              : 'marketplace.offerDialog.titleDonate'

  const askingText =
    formatMarketplacePrice(listing.asking_price, currency) ??
    t('marketplace.priceNegotiable')

  const bookingBands: WeekStripBand[] = useMemo(() => {
    if (!needsDates || !variant) return []
    const windows = (variant.booking_windows ?? []) as BookingWindow[]
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
  }, [variant, needsDates, t])

  const requestBands: WeekStripBand[] = useMemo(() => {
    if (!needsDates || !startDate) return []
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
  }, [needsDates, startDate, endDate, t])

  const legend: WeekStripLegendEntry[] = useMemo(() => {
    if (!needsDates) return []
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
  }, [needsDates, bookingBands.length, startDate, t])

  const handleSubmit = async () => {
    if (mode !== 'ask' && !selectedVariantId) {
      toast.error(t('marketplace.offerDialog.errorVariantRequired'))
      return
    }
    if (needsDates) {
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
      const priceRaw = offeredPrice.trim()
      const res = await apiClient.api.marketplaceListingsOffersCreate(listing.id, {
        variant_id: mode === 'ask' ? selectedVariantId : selectedVariantId!,
        offered_price: priceRaw ? priceRaw : null,
        start_at: needsDates && startDate ? startOfDay(startDate)!.toISOString() : null,
        end_at: needsDates && endDate ? endOfDay(endDate)!.toISOString() : null,
        message: notes.trim(),
        is_inquiry: mode === 'ask',
      })
      toast.success(t('marketplace.offerDialog.success'))
      onOpenChange(false)
      if (res.data?.conversation_id) {
        onSubmitted?.(res.data.conversation_id)
      }
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pb-3 pt-6">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {t(titleKey)}
          </DialogTitle>
          <DialogDescription>
            {mode === 'ask'
              ? t('marketplace.offerDialog.descriptionAsk')
              : needsDates
                ? t('marketplace.offerDialog.descriptionDates')
                : t('marketplace.offerDialog.descriptionSimple')}
          </DialogDescription>
        </DialogHeader>

        {/* Receipt-style listing summary */}
        <div className="mx-6 mb-4 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-md border border-border bg-card">
            {productCover ? (
              <img
                src={productCover}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <ImageIcon className="size-5 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {listing.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('marketplace.detail.askingPriceLabel')}{' '}
              <span className="tabular-nums text-foreground/80">
                {askingText}
              </span>
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
          <div className="space-y-5">
            {variants.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {mode === 'ask'
                    ? t('marketplace.offerDialog.pickVariantOptional')
                    : t('marketplace.offerDialog.pickVariant')}
                </Label>
                <div className="space-y-2">
                  {mode === 'ask' && (
                    <VariantOption
                      label={t('marketplace.offerDialog.anyVariant')}
                      hint={t('marketplace.offerDialog.descriptionAsk')}
                      selected={selectedVariantId === null}
                      onClick={() => setSelectedVariantId(null)}
                    />
                  )}
                  {variants.map((v) => (
                    <VariantCard
                      key={v.id}
                      variant={v}
                      selected={selectedVariantId === v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      currency={currency}
                      fallbackImage={productCover}
                      listingAskingPrice={listing.asking_price ?? null}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}

            {mode !== 'ask' && (
              <div className="space-y-1.5">
                <Label htmlFor="offered-price" className="text-sm font-medium">
                  {mode === 'offer'
                    ? t('marketplace.offerDialog.bidPrice')
                    : t('marketplace.offerDialog.priceLabel')}
                </Label>
                <CurrencyAmountInput
                  id="offered-price"
                  value={offeredPrice}
                  onChange={setOfferedPrice}
                  placeholder={t('marketplace.offerDialog.pricePlaceholder')}
                />
                {mode === 'offer' && listing.asking_price && (
                  <p className="text-[11px] text-muted-foreground">
                    {t('marketplace.offerCard.asking')}{' '}
                    <span className="tabular-nums">{askingText}</span>
                  </p>
                )}
              </div>
            )}

            {needsDates && variant && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {t('marketplace.requestBooking.startAt')} —{' '}
                    {t('marketplace.requestBooking.endAt')}
                  </Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {t('marketplace.requestBooking.startAt')}{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <DatePicker value={startDate} onChange={setStartDate} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
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
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="offer-notes" className="text-sm font-medium">
                {t('marketplace.offerDialog.message')}
              </Label>
              <Textarea
                id="offer-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('marketplace.offerDialog.messagePlaceholder')}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? t('marketplace.offerDialog.submitting')
              : t('marketplace.offerDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Variant card (the rich, visual buy/rent option) ───
function VariantCard({
  variant,
  selected,
  onClick,
  currency,
  fallbackImage,
  listingAskingPrice,
  t,
}: {
  variant: ListingVariant
  selected: boolean
  onClick: () => void
  currency: string
  fallbackImage: string | null
  listingAskingPrice: string | null
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const variantMedia = (variant.media ?? []) as VariantMediaRef[]
  const sortedVariantMedia = sortProductMedia(variantMedia)
  const thumbImg = sortedVariantMedia[0]?.image ?? fallbackImage

  const sizeLabel = variant.size?.name ?? null
  const conditionKey = CONDITION_LABEL_KEYS[variant.condition]
  const conditionLabel = conditionKey ? t(conditionKey) : variant.condition
  const ConditionIcon = CONDITION_ICONS[variant.condition] ?? CircleDot

  const colors = (variant.colors ?? []) as VariantColor[]

  const rawPrice =
    variant.effective_price ?? variant.asking_price ?? listingAskingPrice
  const priceText =
    formatMarketplacePrice(rawPrice, currency) ??
    t('marketplace.priceNegotiable')

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-all',
        selected
          ? 'border-primary bg-primary/[0.03] ring-1 ring-primary'
          : 'border-border hover:border-primary/40 hover:bg-muted/30'
      )}
    >
      {/* Thumbnail */}
      <div className="size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted/40">
        {thumbImg ? (
          <img
            src={thumbImg}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageIcon className="size-5 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {sizeLabel && (
            <Badge
              variant="outline"
              className="h-5 border-border bg-background px-1.5 text-[10px] font-semibold"
            >
              {sizeLabel}
            </Badge>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ConditionIcon className="size-3" />
            {conditionLabel}
          </span>
        </div>
        {colors.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            {colors.slice(0, 5).map((c) => (
              <span
                key={c.id}
                title={c.name}
                className="size-3 rounded-full border border-border/60"
                style={{ backgroundColor: c.hex_code }}
                aria-label={c.name}
              />
            ))}
            {colors.length > 5 && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                +{colors.length - 5}
              </span>
            )}
          </div>
        )}
        {variant.public_notes && (
          <p className="mt-1 line-clamp-1 text-[11px] italic text-muted-foreground">
            “{variant.public_notes}”
          </p>
        )}
      </div>

      {/* Right side: price + radio */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {priceText}
        </p>
        <span
          className={cn(
            'flex size-4 items-center justify-center rounded-full border transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background'
          )}
          aria-hidden="true"
        >
          {selected && <Check className="size-2.5" />}
        </span>
      </div>
    </button>
  )
}

function VariantOption({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string
  hint?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-all',
        selected
          ? 'border-primary bg-primary/[0.03] ring-1 ring-primary'
          : 'border-border hover:border-primary/40 hover:bg-muted/30'
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-muted-foreground">
        <CircleDot className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && (
          <p className="line-clamp-1 text-[11px] text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
          selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background'
        )}
        aria-hidden="true"
      >
        {selected && <Check className="size-2.5" />}
      </span>
    </button>
  )
}
