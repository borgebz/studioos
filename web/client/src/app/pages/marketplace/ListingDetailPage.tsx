/**
 * ListingDetailPage — product-first marketplace browse view (Vinted-style).
 *
 * The listing represents the whole product; variant choice happens in the
 * offer/buy dialog. The page focuses on photos, story, specs, the available
 * variants, price, and seller.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDot,
  Gift,
  Heart,
  HeartHandshake,
  ImageIcon,
  MessageSquare,
  Package,
  Pencil,
  Repeat,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import {
  AcquisitionTypeEnum,
  ConditionEnum,
  OwnerTypeEnum,
  ProductVariantStatusEnum,
  TargetGenderEnum,
  type ListingDetail,
  type ListingTypeEnum,
  type ListingVariant,
} from '@/api/studioos-api'
import { useAuth } from '@/auth/useAuth'
import { usePermissions } from '@/auth/permissions'
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
import { formatMarketplacePrice } from '@/components/shared/CurrencyAmountInput'
import {
  ProductMediaGallery,
  sortProductMedia,
} from '@/components/shared/ProductMediaGallery'
import { paths } from '@/app/paths'
import { parseApiError } from '@/lib/api-errors'
import { getInitials } from '@/lib/user-utils'
import { cn } from '@/lib/utils'

import { ListingOfferDialog, type ListingOfferDialogMode } from './ListingOfferDialog'
import { listingEditPath } from './marketplace-helpers'

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

const GENDER_LABEL_KEYS: Record<string, string> = {
  [TargetGenderEnum.Female]: 'marketplace.genderFemale',
  [TargetGenderEnum.Male]: 'marketplace.genderMale',
  [TargetGenderEnum.Unisex]: 'marketplace.genderUnisex',
}

interface OwnerDisplay {
  type?: 'school' | 'member'
  display_name?: string | null
  photo_url?: string | null
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

function buyCtaKey(type: ListingTypeEnum): string {
  switch (type) {
    case 'rent':
      return 'marketplace.detail.buyRent'
    case 'sell':
      return 'marketplace.detail.buyNow'
    case 'lend':
      return 'marketplace.detail.requestLoan'
    case 'donate':
      return 'marketplace.detail.requestClaim'
    default:
      return 'marketplace.detail.buyNow'
  }
}

export function ListingDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const listingId = id ? Number(id) : NaN
  const { user } = useAuth()

  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [loading, setLoading] = useState(() => Number.isFinite(listingId))
  const [offerDialogOpen, setOfferDialogOpen] = useState(false)
  const [offerDialogMode, setOfferDialogMode] =
    useState<ListingOfferDialogMode>('buy')
  const [favBusy, setFavBusy] = useState(false)
  const dataLoaded = useRef<number | null>(null)

  useEffect(() => {
    if (!Number.isFinite(listingId)) return
    if (dataLoaded.current === listingId) return
    dataLoaded.current = listingId
    const load = async () => {
      setLoading(true)
      try {
        const res = await apiClient.api.marketplaceListingsRetrieve2(listingId)
        setListing(res.data ?? null)
      } catch {
        setListing(null)
      } finally {
        setLoading(false)
      }
    }
    void load()
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
      offerDialogOpen={offerDialogOpen}
      setOfferDialogOpen={setOfferDialogOpen}
      offerDialogMode={offerDialogMode}
      setOfferDialogMode={setOfferDialogMode}
      favBusy={favBusy}
      setFavBusy={setFavBusy}
      currentUserId={user?.id ?? null}
      navigate={navigate}
      t={t}
    />
  )
}

interface LoadedProps {
  listing: ListingDetail
  onListingChange: (l: ListingDetail) => void
  offerDialogOpen: boolean
  setOfferDialogOpen: (v: boolean) => void
  offerDialogMode: ListingOfferDialogMode
  setOfferDialogMode: (v: ListingOfferDialogMode) => void
  favBusy: boolean
  setFavBusy: (v: boolean) => void
  currentUserId: number | null
  navigate: ReturnType<typeof useNavigate>
  t: (key: string, opts?: Record<string, unknown>) => string
}

function isAvailable(v: ListingVariant | undefined): boolean {
  return !!v && v.status === 'available'
}

function LoadedListingDetail({
  listing,
  onListingChange,
  offerDialogOpen,
  setOfferDialogOpen,
  offerDialogMode,
  setOfferDialogMode,
  favBusy,
  setFavBusy,
  currentUserId,
  navigate,
  t,
}: LoadedProps) {
  const TypeIcon = TYPE_ICONS[listing.listing_type] ?? Tag
  const { can } = usePermissions()
  const owner = (listing.owner_display ?? {}) as OwnerDisplay
  const productOwnerId =
    typeof listing.product?.owner === 'number' ? listing.product.owner : null
  const isOwnedByMe =
    productOwnerId !== null &&
    currentUserId !== null &&
    productOwnerId === currentUserId
  const isSchoolProduct =
    listing.product?.owner_type === OwnerTypeEnum.School
  const canManageListing =
    (isOwnedByMe && can('marketplace.view_own_listings')) ||
    (isSchoolProduct && can('marketplace.manage_school_listings'))
  const isFreeListing =
    listing.listing_type === 'lend' || listing.listing_type === 'donate'

  const media = useMemo(() => listing.product?.media ?? [], [listing.product?.media])
  const sortedMedia = useMemo(() => sortProductMedia(media), [media])
  const fallbackImage = sortedMedia[0]?.image ?? null
  const variants = useMemo(() => listing.variants ?? [], [listing.variants])
  const availableVariants = useMemo(
    () => variants.filter(isAvailable),
    [variants]
  )

  const typeLabel = t(TYPE_LABEL_KEYS[listing.listing_type] ?? '', {
    defaultValue: listing.listing_type,
  })

  const currency = t('common.currencySymbol')

  const priceFrom = useMemo(() => {
    const nums = availableVariants
      .map((v) => v.effective_price ?? listing.asking_price)
      .filter((p) => p != null && p !== '')
      .map(Number)
      .filter((n) => !Number.isNaN(n))
    if (nums.length === 0) {
      const base = listing.asking_price
      if (base != null && base !== '' && !Number.isNaN(Number(base))) {
        return Number(base)
      }
      return null
    }
    return Math.min(...nums)
  }, [availableVariants, listing.asking_price])

  const priceDisplay = (() => {
    if (priceFrom != null) {
      return (
        formatMarketplacePrice(priceFrom, currency) ??
        t('marketplace.priceNegotiable')
      )
    }
    return isFreeListing
      ? t('marketplace.priceFree')
      : t('marketplace.priceNegotiable')
  })()

  const openOfferDialog = (mode: ListingOfferDialogMode) => {
    setOfferDialogMode(mode)
    setOfferDialogOpen(true)
  }

  const hasAvailableVariants = availableVariants.length > 0

  const ownerName =
    owner.type === 'school'
      ? t('marketplace.detail.ownedBySchool')
      : owner.display_name || t('marketplace.detail.memberPlaceholder')

  const ownerLine = isOwnedByMe
    ? t('marketplace.detail.ownedByYou')
    : owner.type === 'school'
      ? t('marketplace.detail.ownedBySchool')
      : t('marketplace.detail.ownedByMember', { name: ownerName })

  const canRequest = hasAvailableVariants

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

  // ── Specifications shown in the side info card ──
  const specs: { label: string; value: string }[] = []
  if (listing.product?.brand) {
    specs.push({
      label: t('marketplace.detail.specBrand'),
      value: listing.product.brand,
    })
  }
  if (listing.product?.material) {
    specs.push({
      label: t('marketplace.detail.specMaterial'),
      value: listing.product.material,
    })
  }
  if (listing.product?.target_gender) {
    const key = GENDER_LABEL_KEYS[listing.product.target_gender]
    if (key) {
      specs.push({
        label: t('marketplace.targetGender'),
        value: t(key),
      })
    }
  }

  return (
    <PageLayout>
      <div className={PAGE_CONTENT}>
        <PageHeader title={listing.title} backTo={paths.marketplace} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
          {/* ─── Main column ─── */}
          <div className="space-y-6">
            <ProductMediaGallery
              media={media}
              alt={listing.title}
              heroOverlay={
                <div className="pointer-events-none absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-foreground/85 px-2.5 py-1 text-[11px] font-semibold text-background backdrop-blur">
                  <TypeIcon className="size-3" />
                  {typeLabel}
                </div>
              }
            />

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

            {/* Specifications */}
            {specs.length > 0 && (
              <CardSection title={t('marketplace.detail.specs')}>
                <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  {specs.map((s) => (
                    <div
                      key={s.label}
                      className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-2 last:border-b-0 last:pb-0 sm:[&:nth-last-child(2)]:border-b-0 sm:[&:nth-last-child(2)]:pb-0"
                    >
                      <dt className="text-sm text-muted-foreground">
                        {s.label}
                      </dt>
                      <dd className="truncate text-sm font-medium text-foreground">
                        {s.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardSection>
            )}

            {/* Variants — full inventory of options on this product */}
            {variants.length > 0 && (
              <CardSection
                title={t('marketplace.detail.availableVariants')}
                description={t('marketplace.detail.availableVariantsDesc')}
              >
                <div className="space-y-3">
                  {variants.map((variant, idx) => (
                    <VariantRow
                      key={variant.id}
                      variant={variant}
                      index={idx}
                      fallbackImage={fallbackImage}
                      listingAskingPrice={listing.asking_price ?? null}
                      isFreeListing={isFreeListing}
                      currency={currency}
                      t={t}
                    />
                  ))}
                </div>
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
                      priceFrom == null && 'font-medium italic text-foreground'
                    )}
                  >
                    {priceDisplay}
                  </p>
                  {priceFrom != null && availableVariants.length > 1 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('marketplace.detail.priceFromHint')}
                    </p>
                  )}
                  {hasAvailableVariants ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('marketplace.detail.variantsAvailableCount', {
                        count: availableVariants.length,
                      })}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('marketplace.detail.noVariantsAvailable')}
                    </p>
                  )}
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

              <div className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-5">
                <Badge variant="outline" className="font-normal">
                  <TypeIcon className="size-3" />
                  {typeLabel}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  <Package className="size-3" />
                  {t('marketplace.variantCount', { count: variants.length })}
                </Badge>
              </div>

              {/* Actions — Vinted-style */}
              <div className="mt-6 space-y-2">
                {canManageListing ? (
                  <Button
                    className="w-full"
                    onClick={() => navigate(listingEditPath(listing.id))}
                  >
                    <Pencil className="size-4" />
                    {t('marketplace.detail.editListing')}
                  </Button>
                ) : !isOwnedByMe ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={!canRequest}
                        onClick={() => openOfferDialog('offer')}
                      >
                        {t('marketplace.detail.makeOffer')}
                      </Button>
                      <Button
                        className="w-full"
                        disabled={!canRequest}
                        onClick={() => openOfferDialog('buy')}
                      >
                        {t(buyCtaKey(listing.listing_type))}
                      </Button>
                    </div>
                    {!canRequest && (
                      <p className="text-center text-xs text-muted-foreground">
                        {t('marketplace.detail.unavailableHint')}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openOfferDialog('ask')}
                    >
                      <MessageSquare className="size-4" />
                      {t('marketplace.detail.messageOwner')}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {!isOwnedByMe && (
        <ListingOfferDialog
          listing={listing}
          mode={offerDialogMode}
          open={offerDialogOpen}
          onOpenChange={setOfferDialogOpen}
          onSubmitted={(conversationId) => {
            navigate(paths.messagesConversation(conversationId))
          }}
        />
      )}
    </PageLayout>
  )
}

// ─── Variant row ───
function VariantRow({
  variant,
  index,
  fallbackImage,
  listingAskingPrice,
  isFreeListing,
  currency,
  t,
}: {
  variant: ListingVariant
  index: number
  fallbackImage: string | null
  listingAskingPrice: string | null
  isFreeListing: boolean
  currency: string
  t: (key: string, opts?: Record<string, unknown>) => string
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
    variant.effective_price ?? variant.asking_price ?? listingAskingPrice
  const priceText =
    formatMarketplacePrice(rawPrice, currency) ??
    (isFreeListing
      ? t('marketplace.priceFree')
      : t('marketplace.priceNegotiable'))

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
        'group relative flex gap-4 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm',
        !isAvailable && 'opacity-75'
      )}
    >
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
          <p className="rounded-md border-l-2 border-primary/40 bg-muted/30 px-3 py-1.5 text-xs italic text-muted-foreground">
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
  )
}
