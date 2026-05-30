import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import {
  Ban,
  CalendarRange,
  Check,
  ChevronDown,
  Clock,
  ImageIcon,
  MessageSquare,
  X,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import type { ListingOffer } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import {
  CurrencyAmountInput,
  formatMarketplacePrice,
} from '@/components/shared/CurrencyAmountInput'
import { DatePicker } from '@/components/shared/DatePicker'
import { parseApiError } from '@/lib/api-errors'
import { cn } from '@/lib/utils'

interface ListingOfferCardProps {
  offerId: number
  meId: number | null
  onUpdated?: () => void
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

interface StatusVisual {
  tone: string
  ring: string
  icon: LucideIcon
}

function statusVisuals(status: string): StatusVisual {
  switch (status) {
    case 'completed':
      return {
        tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        ring: 'before:bg-emerald-500/60',
        icon: Check,
      }
    case 'rejected':
      return {
        tone: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        ring: 'before:bg-red-500/60',
        icon: X,
      }
    case 'cancelled':
      return {
        tone: 'bg-muted text-muted-foreground',
        ring: 'before:bg-muted-foreground/40',
        icon: Ban,
      }
    case 'negotiating':
      return {
        tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        ring: 'before:bg-amber-500/60',
        icon: MessageSquare,
      }
    default:
      return {
        tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        ring: 'before:bg-amber-500/60',
        icon: Clock,
      }
  }
}

export function ListingOfferCard({
  offerId,
  meId,
  onUpdated,
}: ListingOfferCardProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS
  const currency = t('common.currencySymbol')
  const [offer, setOffer] = useState<ListingOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [offeredPrice, setOfferedPrice] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.api.marketplaceOffersRetrieve(offerId)
      const data = res.data ?? null
      setOffer(data)
      if (data) {
        setOfferedPrice(
          data.offered_price != null && data.offered_price !== ''
            ? String(Number(data.offered_price))
            : ''
        )
        setStartDate(data.start_at ? new Date(data.start_at) : undefined)
        setEndDate(data.end_at ? new Date(data.end_at) : undefined)
      }
    } catch {
      setOffer(null)
    } finally {
      setLoading(false)
    }
  }, [offerId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || !offer) return null

  const isBuyer = meId != null && meId === offer.buyer_id
  const isSeller = meId != null && meId !== offer.buyer_id
  const editable =
    (offer.status === 'open' || offer.status === 'negotiating') &&
    !offer.is_inquiry
  const needsDates =
    offer.listing_type === 'rent' || offer.listing_type === 'lend'
  const statusLabel = t(`marketplace.offerCard.status.${offer.status}`, {
    defaultValue: offer.status,
  })
  const askingText =
    formatMarketplacePrice(offer.asking_price, currency) ??
    t('marketplace.priceNegotiable')
  const offeredText = formatMarketplacePrice(offer.offered_price, currency)
  const visuals = statusVisuals(offer.status)
  const StatusIcon = visuals.icon
  const thumbImg = offer.variant_photo_url ?? null

  const handleSaveTerms = async () => {
    setBusy(true)
    try {
      await apiClient.api.marketplaceOffersPartialUpdate(offer.id, {
        offered_price: offeredPrice.trim() || null,
        start_at:
          needsDates && startDate ? startOfDay(startDate)!.toISOString() : null,
        end_at: needsDates && endDate ? endOfDay(endDate)!.toISOString() : null,
      })
      toast.success(t('marketplace.offerCard.termsSaved'))
      await load()
      onUpdated?.()
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setBusy(false)
    }
  }

  const runAction = async (action: 'complete' | 'reject' | 'cancel') => {
    setBusy(true)
    try {
      if (action === 'complete') {
        await apiClient.api.marketplaceOffersCompleteCreate(offer.id)
        toast.success(t('marketplace.offerCard.completed'))
      } else if (action === 'reject') {
        await apiClient.api.marketplaceOffersRejectCreate(offer.id)
        toast.success(t('marketplace.offerCard.rejected'))
      } else {
        await apiClient.api.marketplaceOffersCancelCreate(offer.id)
        toast.success(t('marketplace.offerCard.cancelled'))
      }
      setExpanded(false)
      await load()
      onUpdated?.()
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shrink-0 px-3 md:px-5">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow',
          'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:content-[""]',
          visuals.ring,
          expanded && 'shadow-md'
        )}
      >
        {/* Header — always visible */}
        <button
          type="button"
          className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {/* Variant thumb */}
          <div className="size-9 shrink-0 overflow-hidden rounded-md border border-border bg-muted/40">
            {thumbImg ? (
              <img
                src={thumbImg}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <ImageIcon className="size-4 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Title + summary */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight tracking-tight text-foreground">
              {offer.listing_title}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {offer.variant_label && (
                <>
                  <span className="truncate">{offer.variant_label}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span className="tabular-nums text-foreground/70">
                {offeredText ?? askingText}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
              visuals.tone
            )}
          >
            <StatusIcon className="size-3" aria-hidden="true" />
            {statusLabel}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-3.5 shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </button>

        {/* Expanded body */}
        {expanded && (
          <div className="border-t border-border/60 px-3.5 pb-3 pt-3">
            {offer.is_inquiry ? (
              <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                {t('marketplace.offerCard.inquiryHint')}
              </p>
            ) : (
              <>
                {/* Price + dates summary row */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {t('marketplace.offerCard.asking')}
                    </span>
                    <span className="tabular-nums text-foreground/80">
                      {askingText}
                    </span>
                  </div>
                  {(offeredText || editable) && (
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        {t('marketplace.offerCard.offered')}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {offeredText ?? '—'}
                      </span>
                    </div>
                  )}
                  {needsDates && offer.start_at && offer.end_at && (
                    <div className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-[11px] tabular-nums text-muted-foreground">
                      <CalendarRange className="size-3.5 shrink-0" />
                      {format(new Date(offer.start_at), 'PP', {
                        locale: dateLocale,
                      })}
                      <span aria-hidden="true">→</span>
                      {format(new Date(offer.end_at), 'PP', {
                        locale: dateLocale,
                      })}
                    </div>
                  )}
                </div>

                {/* Editable block */}
                {editable && (
                  <div className="mt-3 space-y-2 rounded-md border border-border/60 bg-muted/20 p-2.5">
                    <div className="flex items-end gap-1.5">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {t('marketplace.offerCard.offered')}
                        </p>
                        <CurrencyAmountInput
                          value={offeredPrice}
                          onChange={setOfferedPrice}
                          inputClassName="h-8 text-sm"
                          disabled={busy}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 px-2.5 text-[11px]"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleSaveTerms()
                        }}
                      >
                        {t('marketplace.offerCard.saveTerms')}
                      </Button>
                    </div>

                    {needsDates && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <DatePicker value={startDate} onChange={setStartDate} />
                        <DatePicker value={endDate} onChange={setEndDate} />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {editable && (isSeller || isBuyer) && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-end gap-1.5">
                    {isBuyer && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation()
                          void runAction('cancel')
                        }}
                      >
                        <Ban className="size-3" />
                        {t('marketplace.offerCard.cancel')}
                      </Button>
                    )}
                    {isSeller && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px]"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation()
                            void runAction('reject')
                          }}
                        >
                          <X className="size-3" />
                          {t('marketplace.offerCard.reject')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2.5 text-[11px]"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation()
                            void runAction('complete')
                          }}
                        >
                          <Check className="size-3" />
                          {t('marketplace.offerCard.completeDeal')}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
