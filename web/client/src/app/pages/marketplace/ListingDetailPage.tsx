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
  Gift,
  Heart,
  HeartHandshake,
  MessageSquare,
  Package,
  Pencil,
  Repeat,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import {
  OwnerTypeEnum,
  type ListingDetail,
  type ListingTypeEnum,
  type ListingVariant,
  type TransactionDetail,
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
import { formatMarketplacePrice } from '@/components/shared/CurrencyAmountInput'
import {
  ProductMediaGallery,
  sortProductMedia,
} from '@/components/shared/ProductMediaGallery'
import { ProductVariantList } from '@/components/shared/ProductVariantList'
import { ProductSpecsSection } from '@/components/shared/ProductSpecsSection'
import { ProductTransactionsSection } from '@/components/shared/ProductTransactionsSection'
import {
  fetchAllTransactions,
  groupTransactionsByVariant,
  txPageQuery,
} from '@/components/shared/transaction-helpers'
import { CardSection } from '@/components/shared/CardSection'
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

interface OwnerDisplay {
  type?: 'school' | 'member'
  display_name?: string | null
  photo_url?: string | null
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
  const mode = canManageListing ? 'owner' : 'viewer'
  const isFreeListing =
    listing.listing_type === 'lend' || listing.listing_type === 'donate'

  // Owner-only: fetch transactions for this listing's variants (history + revenue).
  const [transactions, setTransactions] = useState<TransactionDetail[]>([])
  useEffect(() => {
    if (!canManageListing) {
      setTransactions([])
      return
    }
    let active = true
    const run = async () => {
      const list = await fetchAllTransactions((page, pageSize) =>
        isSchoolProduct
          ? apiClient.api.marketplaceSchoolTransactionsRetrieve(
              txPageQuery(page, pageSize)
            )
          : apiClient.api.marketplaceTransactionsMineRetrieve(
              txPageQuery(page, pageSize)
            )
      )
      if (active) setTransactions(list)
    }
    void run()
    return () => {
      active = false
    }
  }, [canManageListing, isSchoolProduct, listing.id])

  const media = useMemo(() => listing.product?.media ?? [], [listing.product?.media])
  const sortedMedia = useMemo(() => sortProductMedia(media), [media])
  const fallbackImage = sortedMedia[0]?.image ?? null
  const variants = useMemo(() => listing.variants ?? [], [listing.variants])
  const availableVariants = useMemo(
    () => variants.filter(isAvailable),
    [variants]
  )

  const ownerUserId = isSchoolProduct ? null : currentUserId
  const productTransactions = useMemo(() => {
    const ids = new Set(variants.map((v) => v.id))
    return transactions.filter((tx) => ids.has(tx.variant_id))
  }, [transactions, variants])
  const txByVariant = useMemo(
    () => groupTransactionsByVariant(productTransactions, variants.map((v) => v.id)),
    [productTransactions, variants]
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
            {listing.product && (
              <ProductSpecsSection product={listing.product} t={t} />
            )}

            {/* Variants — full inventory of options on this product */}
            {variants.length > 0 && (
              <CardSection
                title={t('marketplace.detail.availableVariants')}
                description={t('marketplace.detail.availableVariantsDesc')}
              >
                <ProductVariantList
                  variants={variants}
                  fallbackImage={fallbackImage}
                  fallbackPrice={listing.asking_price ?? null}
                  isFreeListing={isFreeListing}
                  currency={currency}
                  mode={mode}
                  txByVariant={txByVariant}
                  ownerUserId={ownerUserId}
                  t={t}
                />
              </CardSection>
            )}

            {/* Transactions & revenue (owner only) */}
            {canManageListing && (
              <ProductTransactionsSection
                transactions={productTransactions}
                currency={currency}
                ownerUserId={ownerUserId}
                t={t}
              />
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
