/**
 * ProductVariantList — the rich, card-based list of a product's variants.
 *
 * Shared between the marketplace listing detail (buyer view) and the inventory
 * product detail (owner view). Each row shows a thumbnail, size, condition,
 * colors, status, price and optional notes. Works for both `ListingVariant`
 * (which carries an `effective_price`) and `ProductVariantRead`.
 */
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDot,
  Gift,
  ImageIcon,
  ShoppingBag,
  Sparkles,
  Star,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import {
  AcquisitionTypeEnum,
  ConditionEnum,
  ProductVariantStatusEnum,
  type TransactionDetail,
} from '@/api/studioos-api'
import { Badge } from '@/components/ui/badge'
import { formatMarketplacePrice } from '@/components/shared/CurrencyAmountInput'
import { sortProductMedia } from '@/components/shared/ProductMediaGallery'
import { VariantBookingCalendar } from '@/components/shared/VariantBookingCalendar'
import { CollapsibleSection } from '@/components/shared/CollapsibleSection'
import {
  counterpartyName,
  isOwnerSale,
  realizedRevenue,
  transactionStatusBadgeClass,
  transactionStatusLabel,
  transactionTypeLabel,
} from '@/components/shared/transaction-helpers'
import { cn } from '@/lib/utils'

const CONDITION_LABEL_KEYS: Record<string, string> = {
  [ConditionEnum.New]: 'marketplace.conditionNew',
  [ConditionEnum.Excellent]: 'marketplace.conditionExcellent',
  [ConditionEnum.Good]: 'marketplace.conditionGood',
  [ConditionEnum.Fair]: 'marketplace.conditionFair',
  [ConditionEnum.Damaged]: 'marketplace.conditionDamaged',
}

const CONDITION_ICONS: Record<string, LucideIcon> = {
  [ConditionEnum.New]: Sparkles,
  [ConditionEnum.Excellent]: Star,
  [ConditionEnum.Good]: CheckCircle2,
  [ConditionEnum.Fair]: CircleDot,
  [ConditionEnum.Damaged]: AlertTriangle,
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  [ProductVariantStatusEnum.Available]: 'marketplace.variantStatusAvailable',
  [ProductVariantStatusEnum.Maintenance]: 'marketplace.variantStatusMaintenance',
  [ProductVariantStatusEnum.Inactive]: 'marketplace.variantStatusInactive',
  [ProductVariantStatusEnum.Sold]: 'marketplace.statusSold',
  [ProductVariantStatusEnum.Donated]: 'marketplace.typeDonate',
  [ProductVariantStatusEnum.Archived]: 'marketplace.statusDraft',
}

const STATUS_ICONS: Record<string, LucideIcon> = {
  [ProductVariantStatusEnum.Available]: CheckCircle2,
  [ProductVariantStatusEnum.Maintenance]: Wrench,
  [ProductVariantStatusEnum.Inactive]: Ban,
  [ProductVariantStatusEnum.Sold]: ShoppingBag,
  [ProductVariantStatusEnum.Donated]: Gift,
  [ProductVariantStatusEnum.Archived]: Ban,
}

const ACQUISITION_LABEL_KEYS: Record<string, string> = {
  [AcquisitionTypeEnum.Purchased]: 'marketplace.acquisitionPurchased',
  [AcquisitionTypeEnum.Donated]: 'marketplace.acquisitionDonated',
  [AcquisitionTypeEnum.SchoolOwned]: 'marketplace.acquisitionSchoolOwned',
  [AcquisitionTypeEnum.Other]: 'marketplace.acquisitionOther',
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

/** The subset of variant fields this list renders — satisfied by both
 *  `ListingVariant` and `ProductVariantRead`. */
export interface DisplayVariant {
  id: number
  sku?: string | null
  condition: string
  status: string
  acquisition_type: string
  asking_price?: string | null
  public_notes?: string | null
  size?: { name?: string | null } | null
  colors?: unknown[]
  media?: unknown[]
  /** Present on `ListingVariant`; absent on `ProductVariantRead`. */
  effective_price?: string | null
  /** Public occupancy windows — present on `ListingVariant` only. */
  booking_windows?: { start_at?: string; end_at?: string }[]
}

type Translate = (key: string, opts?: Record<string, unknown>) => string

export type VariantListMode = 'owner' | 'viewer'

export function ProductVariantList({
  variants,
  fallbackImage,
  fallbackPrice,
  isFreeListing = false,
  currency,
  mode = 'viewer',
  txByVariant,
  ownerUserId = null,
  t,
}: {
  variants: DisplayVariant[]
  fallbackImage: string | null
  /** Listing asking price used when a variant has no price of its own. */
  fallbackPrice?: string | null
  isFreeListing?: boolean
  currency: string
  /** `owner` unlocks rich booking detail + per-variant revenue/transactions. */
  mode?: VariantListMode
  /** Owner-only: transactions grouped by variant id. */
  txByVariant?: Map<number, TransactionDetail[]>
  /** Owner-only: the current user id, to tell sales from purchases. */
  ownerUserId?: number | null
  t: Translate
}) {
  return (
    <div className="space-y-3">
      {variants.map((variant, idx) => (
        <VariantRow
          key={variant.id}
          variant={variant}
          index={idx}
          fallbackImage={fallbackImage}
          fallbackPrice={fallbackPrice ?? null}
          isFreeListing={isFreeListing}
          currency={currency}
          mode={mode}
          transactions={txByVariant?.get(variant.id) ?? []}
          ownerUserId={ownerUserId}
          t={t}
        />
      ))}
    </div>
  )
}

function VariantRow({
  variant,
  index,
  fallbackImage,
  fallbackPrice,
  isFreeListing,
  currency,
  mode,
  transactions,
  ownerUserId,
  t,
}: {
  variant: DisplayVariant
  index: number
  fallbackImage: string | null
  fallbackPrice: string | null
  isFreeListing: boolean
  currency: string
  mode: VariantListMode
  transactions: TransactionDetail[]
  ownerUserId: number | null
  t: Translate
}) {
  const variantMedia = (variant.media ?? []) as VariantMediaRef[]
  const sortedVariantMedia = sortProductMedia(variantMedia)
  const thumbImg = sortedVariantMedia[0]?.image ?? fallbackImage

  const sizeLabel = variant.size?.name ?? null
  const conditionKey = CONDITION_LABEL_KEYS[variant.condition]
  const conditionLabel = conditionKey ? t(conditionKey) : variant.condition
  const ConditionIcon = CONDITION_ICONS[variant.condition] ?? CircleDot

  const statusKey = STATUS_LABEL_KEYS[variant.status]
  const statusLabel = statusKey ? t(statusKey) : variant.status
  const StatusIcon = STATUS_ICONS[variant.status] ?? CircleDot

  const acquisitionKey = ACQUISITION_LABEL_KEYS[variant.acquisition_type]
  const acquisitionLabel = acquisitionKey ? t(acquisitionKey) : null

  const colors = (variant.colors ?? []) as VariantColor[]

  const rawPrice =
    variant.effective_price ?? variant.asking_price ?? fallbackPrice
  const priceText =
    formatMarketplacePrice(rawPrice, currency) ??
    (isFreeListing
      ? t('marketplace.priceFree')
      : t('marketplace.priceNegotiable'))

  const isOwner = mode === 'owner'
  const variantRevenue = isOwner ? realizedRevenue(transactions, ownerUserId) : 0
  const saleCount = isOwner
    ? transactions.filter((tx) => isOwnerSale(tx, ownerUserId)).length
    : 0

  const isAvailable = variant.status === ProductVariantStatusEnum.Available
  const statusTone = (() => {
    switch (variant.status) {
      case ProductVariantStatusEnum.Available:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case ProductVariantStatusEnum.Maintenance:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case ProductVariantStatusEnum.Sold:
      case ProductVariantStatusEnum.Donated:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  })()

  return (
    <div
      className={cn(
        'group relative space-y-3 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm',
        !isAvailable && 'opacity-75'
      )}
    >
      <div className="flex gap-4">
      {/* Thumbnail */}
      <div className="size-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted/40 sm:size-24">
        {thumbImg ? (
          <img
            src={thumbImg}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageIcon className="size-6 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-sm font-semibold leading-tight text-foreground">
                {sizeLabel
                  ? `${t('marketplace.detail.specSize')} ${sizeLabel}`
                  : t('marketplace.variant', { number: index + 1 })}
              </p>
              {variant.sku && (
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  · {variant.sku}
                </span>
              )}
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ConditionIcon className="size-3.5" />
              {conditionLabel}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {priceText}
            </p>
            <Badge
              className={cn(
                'mt-1 inline-flex gap-1 border-0 text-[10px] font-medium',
                statusTone
              )}
            >
              <StatusIcon className="size-3" />
              {statusLabel}
            </Badge>
          </div>
        </div>

        {colors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {colors.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[11px] text-foreground/80"
              >
                <span
                  className="size-2.5 rounded-full border border-border/40"
                  style={{ backgroundColor: c.hex_code }}
                  aria-hidden="true"
                />
                {c.name}
              </span>
            ))}
          </div>
        )}

        {variant.public_notes && (
          <p className="rounded-md bg-muted/30 px-3 py-1.5 text-xs italic text-muted-foreground">
            “{variant.public_notes}”
          </p>
        )}

        {acquisitionLabel && (
          <p className="text-[11px] text-muted-foreground/80">
            {t('marketplace.acquisitionType')}: {acquisitionLabel}
          </p>
        )}
        </div>
      </div>

      {/* Owner: per-variant revenue + transaction history */}
      {isOwner && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">
              {t('marketplace.transactions.variantRevenue')}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatMarketplacePrice(variantRevenue, currency)}
            </span>
            <span className="text-muted-foreground">
              · {t('marketplace.transactions.salesCount', { count: saleCount })}
            </span>
          </div>
          {transactions.length > 0 && (
            <CollapsibleSection
              title={t('marketplace.transactions.variantHistory')}
              summary={transactions.length}
              className="bg-background/40"
            >
              <ul className="divide-y divide-border text-xs">
                {transactions.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-foreground">
                        {transactionTypeLabel(t, tx.transaction_type)}
                      </span>
                      <Badge
                        className={cn(
                          'border-0 text-[10px] font-medium',
                          transactionStatusBadgeClass(tx.status)
                        )}
                      >
                        {transactionStatusLabel(t, tx.status)}
                      </Badge>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
                      <span className="max-w-[120px] truncate">
                        {counterpartyName(tx)}
                      </span>
                      <span className="tabular-nums text-foreground">
                        {formatMarketplacePrice(tx.agreed_price, currency) ?? '—'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* Booking calendar — occupancy (viewer) or rich detail (owner) */}
      <VariantBookingCalendar
        variantId={variant.id}
        mode={mode}
        bookingWindows={variant.booking_windows}
      />
    </div>
  )
}
