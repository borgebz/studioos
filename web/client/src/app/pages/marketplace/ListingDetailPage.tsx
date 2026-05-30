/**
 * ListingDetailPage — read-only browse view for a marketplace listing.
 *
 * A listing now represents a whole product, so the page surfaces the product
 * gallery + description and a picker over every variant. The buyer selects a
 * variant (size/condition) and the specs, availability and price update to
 * match; the booking/buy request carries the chosen variant. Owners get an
 * "Edit listing" affordance instead.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  HeartHandshake,
  ImageIcon,
  MessageSquare,
  Pencil,
  Repeat,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  ListingDetail,
  ListingTypeEnum,
  ListingVariant,
  ProductMedia,
} from '@/api/studioos-api'
import { useAuth } from '@/auth/useAuth'
import { Authorized } from '@/auth/permissions'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { PAGE_CONTENT } from '@/lib/layout'
import { CardSection } from '@/components/shared/CardSection'
import { paths } from '@/app/paths'
import { parseApiError } from '@/lib/api-errors'
import { getInitials } from '@/lib/user-utils'
import { cn } from '@/lib/utils'

import { RequestBookingDialog } from './RequestBookingDialog'

const TYPE_ICONS: Record<string, LucideIcon> = {
  sell: ShoppingBag,
  rent: Repeat,
  lend: HeartHandshake,
  donate: Gift,
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  sell: 'marketplace.typeSell',
  rent: 'marketplace.typeRent',
  lend: 'marketplace.typeLend',
  donate: 'marketplace.typeDonate',
}

const CONDITION_LABEL_KEYS: Record<string, string> = {
  new: 'marketplace.conditionNew',
  excellent: 'marketplace.conditionExcellent',
  good: 'marketplace.conditionGood',
  fair: 'marketplace.conditionFair',
  damaged: 'marketplace.conditionDamaged',
}

interface OwnerDisplay {
  type?: 'school' | 'member'
  display_name?: string | null
  photo_url?: string | null
}

interface ColorSummary {
  id?: number
  name?: string
  hex_code?: string
}

function requestCtaKey(type: ListingTypeEnum): string {
  switch (type) {
    case 'rent':
      return 'marketplace.detail.requestBooking'
    case 'sell':
      return 'marketplace.detail.requestPurchase'
    case 'lend':
      return 'marketplace.detail.requestLoan'
    case 'donate':
      return 'marketplace.detail.requestClaim'
    default:
      return 'marketplace.detail.requestBooking'
  }
}

export function ListingDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const listingId = id ? Number(id) : NaN
  const { user } = useAuth()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestOpen, setRequestOpen] = useState(false)
  const [favBusy, setFavBusy] = useState(false)
  const dataLoaded = useRef<number | null>(null)

  useEffect(() => {
    if (!Number.isFinite(listingId)) {
      setLoading(false)
      return
    }
    if (dataLoaded.current === listingId) return
    dataLoaded.current = listingId
    setLoading(true)
    apiClient.api
      .marketplaceListingsRetrieve2(listingId)
      .then((res) => setListing(res.data ?? null))
      .catch(() => setListing(null))
      .finally(() => setLoading(false))
  }, [listingId])

  if (loading) {
    return (
      <PageLayout>
        <div className={PAGE_CONTENT}>
          <PageHeader title="" backTo={paths.marketplace} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
            <div className="space-y-6">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!listing) {
    return (
      <PageLayout>
        <div className={PAGE_CONTENT}>
          <PageHeader
            title={t('marketplace.browseTitle')}
            backTo={paths.marketplace}
          />
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <Tag className="mx-auto mb-4 size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              {t('marketplace.detail.notFound')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('marketplace.detail.notFoundDesc')}
            </p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <LoadedListingDetail
      listing={listing}
      onListingChange={setListing}
      requestOpen={requestOpen}
      setRequestOpen={setRequestOpen}
      favBusy={favBusy}
      setFavBusy={setFavBusy}
      currentUserId={user?.id ?? null}
      navigate={navigate}
      t={t}
      dateLocale={dateLocale}
    />
  )
}

interface LoadedProps {
  listing: ListingDetail
  onListingChange: (l: ListingDetail) => void
  requestOpen: boolean
  setRequestOpen: (v: boolean) => void
  favBusy: boolean
  setFavBusy: (v: boolean) => void
  currentUserId: number | null
  navigate: ReturnType<typeof useNavigate>
  t: (key: string, opts?: Record<string, unknown>) => string
  dateLocale: typeof pt | typeof enUS
}

function isAvailable(v: ListingVariant | undefined): boolean {
  return !!v && v.status === 'available'
}

function LoadedListingDetail({
  listing,
  onListingChange,
  requestOpen,
  setRequestOpen,
  favBusy,
  setFavBusy,
  currentUserId,
  navigate,
  t,
  dateLocale,
}: LoadedProps) {
  const TypeIcon = TYPE_ICONS[listing.listing_type] ?? Tag
  const owner = (listing.owner_display ?? {}) as OwnerDisplay
  const productOwnerId =
    typeof listing.product?.owner === 'number' ? listing.product.owner : null
  const isOwnedByMe =
    productOwnerId !== null &&
    currentUserId !== null &&
    productOwnerId === currentUserId
  const isFreeListing =
    listing.listing_type === 'lend' || listing.listing_type === 'donate'

  const media = listing.product?.media ?? []
  const sortedMedia = useMemo(() => {
    return [...media].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1
      if (!a.is_primary && b.is_primary) return 1
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
  }, [media])
  const [activeMediaIdx, setActiveMediaIdx] = useState(0)
  const activeMedia: ProductMedia | undefined = sortedMedia[activeMediaIdx]

  // ── Variant selection ──────────────────────────────────────────────────
  const variants = useMemo(() => listing.variants ?? [], [listing.variants])
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    () => (variants.find(isAvailable) ?? variants[0])?.id ?? null
  )
  const variant =
    variants.find((v) => v.id === selectedVariantId) ?? variants[0]

  const colors = (variant?.colors ?? []) as ColorSummary[]
  const conditionLabel = variant?.condition
    ? t(CONDITION_LABEL_KEYS[variant.condition] ?? '', {
        defaultValue: variant.condition,
      })
    : null
  const typeLabel = t(TYPE_LABEL_KEYS[listing.listing_type] ?? '', {
    defaultValue: listing.listing_type,
  })

  // Effective price: variant override falls back to the listing's asking price.
  const effectivePrice = variant?.effective_price ?? listing.asking_price
  const priceDisplay = (() => {
    if (effectivePrice && effectivePrice !== '') {
      const n = Number(effectivePrice)
      if (!Number.isNaN(n)) {
        return `${t('common.currencySymbol')} ${n.toFixed(2)}`
      }
      return effectivePrice
    }
    return isFreeListing
      ? t('marketplace.priceFree')
      : t('marketplace.priceNegotiable')
  })()
  const priceIsNumber =
    !!effectivePrice &&
    effectivePrice !== '' &&
    !Number.isNaN(Number(effectivePrice))

  const ownerName =
    owner.type === 'school'
      ? t('marketplace.detail.ownedBySchool')
      : owner.display_name || t('marketplace.detail.memberPlaceholder')

  const ownerLine = isOwnedByMe
    ? t('marketplace.detail.ownedByYou')
    : owner.type === 'school'
      ? t('marketplace.detail.ownedBySchool')
      : t('marketplace.detail.ownedByMember', { name: ownerName })

  const canRequest = isAvailable(variant)

  const handleToggleFavorite = async () => {
    setFavBusy(true)
    const wasFavorited = listing.is_favorited
    onListingChange({
      ...listing,
      is_favorited: !wasFavorited,
      favorites_count: Math.max(
        0,
        listing.favorites_count + (wasFavorited ? -1 : 1)
      ),
    })
    try {
      if (wasFavorited) {
        await apiClient.api.marketplaceListingsFavoriteDestroy(listing.id)
      } else {
        await apiClient.api.marketplaceListingsFavoriteCreate(listing.id)
      }
    } catch (err) {
      onListingChange({
        ...listing,
        is_favorited: wasFavorited,
        favorites_count: listing.favorites_count,
      })
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setFavBusy(false)
    }
  }

  const handleRefetch = async () => {
    const r = await apiClient.api
      .marketplaceListingsRetrieve2(listing.id)
      .catch(() => null)
    if (r?.data) onListingChange(r.data)
  }

  return (
    <PageLayout>
      <div className={PAGE_CONTENT}>
        <PageHeader title={listing.title} backTo={paths.marketplace} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
          {/* ─── Main column ─── */}
          <div className="space-y-6">
            {/* Gallery */}
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                {activeMedia ? (
                  <img
                    src={activeMedia.image}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="size-10 text-muted-foreground/30" />
                  </div>
                )}
                {sortedMedia.length > 1 && (
                  <>
                    <GalleryNav
                      side="left"
                      onClick={() =>
                        setActiveMediaIdx(
                          (i) =>
                            (i - 1 + sortedMedia.length) % sortedMedia.length
                        )
                      }
                    />
                    <GalleryNav
                      side="right"
                      onClick={() =>
                        setActiveMediaIdx((i) => (i + 1) % sortedMedia.length)
                      }
                    />
                  </>
                )}
                <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-foreground/85 px-2.5 py-1 text-[11px] font-semibold text-background backdrop-blur">
                  <TypeIcon className="size-3" />
                  {typeLabel}
                </div>
              </div>

              {sortedMedia.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {sortedMedia.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMediaIdx(i)}
                      className={cn(
                        'size-16 shrink-0 overflow-hidden rounded-md border transition-colors',
                        i === activeMediaIdx
                          ? 'border-primary'
                          : 'border-border hover:border-primary/40'
                      )}
                      aria-label={`Photo ${i + 1}`}
                    >
                      <img
                        src={m.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <CardSection title={t('marketplace.productDescription')}>
              {listing.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {listing.description}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  {t('marketplace.detail.noDescription')}
                </p>
              )}
            </CardSection>

            {/* Variant picker — only when there's a real choice */}
            {variants.length > 1 && (
              <CardSection
                title={t('marketplace.detail.chooseVariant')}
                description={t('marketplace.detail.chooseVariantDesc')}
              >
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const selected = v.id === variant?.id
                    const available = isAvailable(v)
                    const label =
                      v.size?.name ||
                      t(CONDITION_LABEL_KEYS[v.condition] ?? '', {
                        defaultValue: v.condition,
                      })
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        aria-pressed={selected}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                          selected
                            ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                            : 'border-border bg-card text-foreground hover:border-primary/40',
                          !available && 'opacity-60'
                        )}
                      >
                        <span className="font-medium">{label}</span>
                        {!available && (
                          <span className="text-xs text-muted-foreground">
                            {t('marketplace.detail.variantUnavailable')}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardSection>
            )}

            {/* Specs (selected variant) */}
            <CardSection title={t('marketplace.detail.specs')}>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <Spec
                  label={t('marketplace.detail.specSize')}
                  value={variant?.size?.name ?? null}
                />
                <Spec
                  label={t('marketplace.detail.specCondition')}
                  value={conditionLabel ?? null}
                />
                <Spec
                  label={t('marketplace.detail.specBrand')}
                  value={listing.product?.brand ?? null}
                />
                <Spec
                  label={t('marketplace.detail.specMaterial')}
                  value={listing.product?.material ?? null}
                />
                {variant?.sku && (
                  <Spec
                    label={t('marketplace.detail.specSku')}
                    value={variant.sku}
                    mono
                  />
                )}
                {colors.length > 0 && (
                  <ColorSpec
                    label={t('marketplace.detail.specColors')}
                    colors={colors}
                  />
                )}
              </dl>
              {variant?.public_notes && (
                <div className="mt-5 border-t border-border pt-5">
                  <dt className="text-xs text-muted-foreground">
                    {t('marketplace.detail.specNotes')}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm text-foreground">
                    {variant.public_notes}
                  </dd>
                </div>
              )}
            </CardSection>

            {/* Booking windows for the selected variant (rent / lend) */}
            {(listing.listing_type === 'rent' ||
              listing.listing_type === 'lend') && (
              <CardSection
                title={t('marketplace.detail.bookingWindows')}
                description={t('marketplace.detail.bookingWindowsDesc')}
              >
                <BookingWindowsList
                  windows={variant?.booking_windows ?? []}
                  emptyMessage={t('marketplace.detail.noBookingWindows')}
                  locale={dateLocale}
                />
              </CardSection>
            )}
          </div>

          {/* ─── Sidebar ─── */}
          <aside className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              {/* Price + favorites */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('marketplace.detail.askingPriceLabel')}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-2xl font-semibold tracking-tight tabular-nums',
                      !priceIsNumber && 'italic font-medium text-foreground'
                    )}
                  >
                    {priceDisplay}
                  </p>
                </div>
                <TooltipProvider delayDuration={250}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleFavorite}
                        disabled={favBusy}
                        aria-label={
                          listing.is_favorited
                            ? t('marketplace.detail.unfavorite')
                            : t('marketplace.detail.favorite')
                        }
                      >
                        <Heart
                          className={cn(
                            'size-4 transition-colors',
                            listing.is_favorited &&
                              'fill-destructive text-destructive'
                          )}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('marketplace.detail.favoritesCount', {
                        count: listing.favorites_count,
                      })}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Owner identity */}
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-5">
                <Avatar size="default">
                  {owner.photo_url && (
                    <AvatarImage src={owner.photo_url} alt={ownerName} />
                  )}
                  <AvatarFallback>
                    {getInitials(
                      owner.type === 'school' ? 'StudioOS' : ownerName
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {ownerName}
                  </p>
                  <p className="text-xs text-muted-foreground">{ownerLine}</p>
                </div>
              </div>

              {/* Status + condition strip */}
              <div className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-5">
                <Badge variant="outline" className="font-normal">
                  <TypeIcon className="size-3" />
                  {typeLabel}
                </Badge>
                {conditionLabel && (
                  <Badge variant="outline" className="font-normal">
                    {conditionLabel}
                  </Badge>
                )}
                {variant?.size?.name && (
                  <Badge variant="outline" className="font-normal">
                    {t('marketplace.sizeShort')} {variant.size.name}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2">
                {isOwnedByMe ? (
                  <Authorized permission="marketplace.manage_school_listings">
                    <Button
                      className="w-full"
                      onClick={() =>
                        navigate(
                          paths.marketplaceEdit.replace(
                            ':id',
                            String(listing.id)
                          )
                        )
                      }
                    >
                      <Pencil className="size-4" />
                      {t('marketplace.detail.editListing')}
                    </Button>
                  </Authorized>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      disabled={!canRequest}
                      onClick={() => setRequestOpen(true)}
                    >
                      {t(requestCtaKey(listing.listing_type))}
                    </Button>
                    {!canRequest && (
                      <p className="text-center text-xs text-muted-foreground">
                        {t('marketplace.detail.variantUnavailableHint')}
                      </p>
                    )}
                    <TooltipProvider delayDuration={250}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block">
                            <Button
                              variant="outline"
                              className="w-full"
                              disabled
                            >
                              <MessageSquare className="size-4" />
                              {t('marketplace.detail.messageOwner')}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t('marketplace.detail.messageOwnerSoon')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {!isOwnedByMe && variant && (
        <RequestBookingDialog
          listing={listing}
          variant={variant}
          open={requestOpen}
          onOpenChange={setRequestOpen}
          onSubmitted={handleRefetch}
        />
      )}
    </PageLayout>
  )
}

// ---------------------------------------------------------------------------
// Small bits
// ---------------------------------------------------------------------------

function Spec({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'truncate text-sm text-foreground',
          mono && 'font-mono tabular-nums'
        )}
      >
        {value || '—'}
      </dd>
    </div>
  )
}

function ColorSpec({
  label,
  colors,
}: {
  label: string
  colors: ColorSummary[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap items-center gap-2">
        {colors.map((c, i) => (
          <span
            key={c.id ?? i}
            className="inline-flex items-center gap-1.5 text-sm text-foreground"
          >
            {c.hex_code && (
              <span
                className="size-3 rounded-sm ring-1 ring-border"
                style={{ backgroundColor: c.hex_code }}
                aria-hidden
              />
            )}
            {c.name ?? '—'}
          </span>
        ))}
      </dd>
    </div>
  )
}

function BookingWindowsList({
  windows,
  emptyMessage,
  locale,
}: {
  windows: Array<{ start_at?: string; end_at?: string } | Record<string, any>>
  emptyMessage: string
  locale: typeof pt | typeof enUS
}) {
  const valid = windows
    .map((w) => ({
      start: w.start_at ? new Date(w.start_at) : null,
      end: w.end_at ? new Date(w.end_at) : null,
    }))
    .filter(
      (w): w is { start: Date; end: Date } => w.start !== null && w.end !== null
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  if (valid.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">{emptyMessage}</p>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {valid.map((w, i) => (
        <li
          key={i}
          className="flex items-center gap-3 bg-card px-3 py-2.5 text-sm"
        >
          <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
          <span className="tabular-nums text-foreground">
            {format(w.start, 'PPP', { locale })}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="tabular-nums text-foreground">
            {format(w.end, 'PPP', { locale })}
          </span>
        </li>
      ))}
    </ul>
  )
}

function GalleryNav({
  side,
  onClick,
}: {
  side: 'left' | 'right'
  onClick: () => void
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 inline-flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background',
        side === 'left' ? 'left-3' : 'right-3'
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}
