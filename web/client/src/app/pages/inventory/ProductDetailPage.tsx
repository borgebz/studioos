/**
 * ProductDetailPage — the bridge between inventory and the marketplace.
 *
 * Shows a product, its media and its variants (the physical units), plus a
 * panel to publish the whole product as a marketplace listing (all variants
 * ride along) or jump to the live listing if it already has one.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Package, Plus, Tag } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import {
  ListingTypeEnum,
  type ListingCreate,
  type ProductDetail,
  type ProductVariantRead,
  type SchoolListingCreateMultipart,
} from '@/api/studioos-api'
import { enumOptions } from '@/lib/enum-options'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { PAGE_CONTENT } from '@/lib/layout'
import { CardSection } from '@/components/shared/CardSection'
import { ProductMediaGallery } from '@/components/shared/ProductMediaGallery'
import { ProductStatusBadge } from '@/components/shared/ProductStatusBadge'
import { StatusBadge, listingTypeLabel } from '@/app/pages/marketplace/marketplace-helpers'
import { paths } from '@/app/paths'
import { parseApiError } from '@/lib/api-errors'
import { toast } from 'sonner'

const LISTING_TYPES = enumOptions(ListingTypeEnum, 'marketplace.type')

const CONDITION_LABEL_KEYS: Record<string, string> = {
  new: 'marketplace.conditionNew',
  excellent: 'marketplace.conditionExcellent',
  good: 'marketplace.conditionGood',
  fair: 'marketplace.conditionFair',
  damaged: 'marketplace.conditionDamaged',
}

interface ProductListingInfo {
  id: number
  listing_type: string
  status: string
  is_public: boolean
}

export interface ProductDetailPageProps {
  context: 'personal' | 'school'
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function ProductDetailPage({ context }: ProductDetailPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const productId = id ? Number(id) : NaN
  const isSchool = context === 'school'
  const backTo = isSchool ? paths.schoolInventory : paths.myInventory

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [variants, setVariants] = useState<ProductVariantRead[]>([])
  const [loading, setLoading] = useState(true)
  const [listOpen, setListOpen] = useState(false)
  const loaded = useRef<number | null>(null)

  const load = useMemo(
    () => async () => {
      const [prodRes, varRes] = await Promise.all([
        (isSchool
          ? apiClient.api.inventorySchoolProductsRetrieve2(productId)
          : apiClient.api.inventoryProductsRetrieve2(productId)
        ).catch(() => null),
        apiClient.api
          .inventoryProductsVariantsRetrieve(productId)
          .catch(() => null),
      ])
      if (prodRes?.data) setProduct(prodRes.data)
      const vd = varRes?.data as
        | ProductVariantRead[]
        | { results?: ProductVariantRead[] }
        | null
      setVariants(Array.isArray(vd) ? vd : (vd?.results ?? []))
    },
    [isSchool, productId]
  )

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setLoading(false)
      return
    }
    if (loaded.current === productId) return
    loaded.current = productId
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [productId, load])

  const listing = (product?.listing ?? null) as ProductListingInfo | null

  if (loading) {
    return (
      <PageLayout>
        <div className={PAGE_CONTENT}>
          <PageHeader title="" backTo={backTo} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
            <div className="space-y-6">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!product) {
    return (
      <PageLayout>
        <div className={PAGE_CONTENT}>
          <PageHeader title={t('nav.myInventory')} backTo={backTo} />
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <Package className="mx-auto mb-4 size-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              {t('productDetail.notFound', {
                defaultValue: 'Product not found.',
              })}
            </p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className={PAGE_CONTENT}>
        <PageHeader title={product.name} backTo={backTo} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
          {/* ─── Main column ─── */}
          <div className="space-y-6">
            <ProductMediaGallery media={product.media} alt={product.name} />

            {product.description && (
              <CardSection title={t('marketplace.productDescription')}>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {product.description}
                </p>
              </CardSection>
            )}

            {/* Variants */}
            <CardSection
              title={t('marketplace.variants')}
              description={t('productDetail.variantsDesc', {
                defaultValue:
                  'The physical units of this product. Each can be sold or lent through the listing.',
              })}
            >
              {variants.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('productDetail.noVariants', {
                    defaultValue: 'No units yet.',
                  })}
                </p>
              ) : (
                <div className="overflow-x-auto overflow-y-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">
                          {t('marketplace.detail.specSize')}
                        </th>
                        <th className="py-2 pr-4 font-medium">
                          {t('marketplace.detail.specCondition')}
                        </th>
                        <th className="py-2 pr-4 font-medium">
                          {t('marketplace.sku', { defaultValue: 'SKU' })}
                        </th>
                        <th className="py-2 pr-4 font-medium">
                          {t('marketplace.col.status')}
                        </th>
                        <th className="py-2 font-medium">
                          {t('marketplace.askingPrice', {
                            defaultValue: 'Price',
                          })}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => (
                        <tr
                          key={v.id}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="py-2.5 pr-4">{v.size?.name ?? '—'}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {v.condition
                              ? t(CONDITION_LABEL_KEYS[v.condition] ?? '', {
                                  defaultValue: v.condition,
                                })
                              : '—'}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                            {v.sku || '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                            {t(
                              `marketplace.variantStatus${capitalize(
                                String(v.status)
                              )}`,
                              { defaultValue: String(v.status) }
                            )}
                          </td>
                          <td className="py-2.5 tabular-nums">
                            {v.asking_price
                              ? `${t('common.currencySymbol')} ${v.asking_price}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardSection>
          </div>

          {/* ─── Sidebar ─── */}
          <aside className="space-y-6">
            {/* Listing panel */}
            <CardSection title={t('productDetail.marketplace', {
              defaultValue: 'Marketplace',
            })}>
              {listing ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={listing.status} t={t} />
                    <span className="text-sm text-muted-foreground">
                      {listingTypeLabel(listing.listing_type, t)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      navigate(
                        paths.marketplaceDetail.replace(
                          ':id',
                          String(listing.id)
                        )
                      )
                    }
                  >
                    <ExternalLink className="size-4" />
                    {t('productDetail.viewListing', {
                      defaultValue: 'View on marketplace',
                    })}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('productDetail.notListed', {
                      defaultValue: 'This product is not on the marketplace yet.',
                    })}
                  </p>
                  <Button className="w-full" onClick={() => setListOpen(true)}>
                    <Plus className="size-4" />
                    {t('productDetail.listOnMarketplace', {
                      defaultValue: 'List on marketplace',
                    })}
                  </Button>
                </div>
              )}
            </CardSection>

            {/* Metadata */}
            <CardSection title={t('productDetail.details', {
              defaultValue: 'Details',
            })}>
              <dl className="space-y-3 text-sm">
                <MetaRow
                  label={t('marketplace.detail.specBrand')}
                  value={product.brand}
                />
                <MetaRow
                  label={t('marketplace.detail.specMaterial')}
                  value={product.material}
                />
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    {t('marketplace.col.status')}
                  </dt>
                  <dd>
                    <ProductStatusBadge status={product.status} />
                  </dd>
                </div>
                {isSchool && product.school_details?.inventory_code && (
                  <MetaRow
                    label={t('schoolInventory.col.inventoryCode')}
                    value={product.school_details.inventory_code}
                    mono
                  />
                )}
              </dl>
            </CardSection>
          </aside>
        </div>
      </div>

      <ListOnMarketplaceDialog
        open={listOpen}
        onOpenChange={setListOpen}
        productId={product.id}
        productName={product.name}
        isSchool={isSchool}
        onListed={() => {
          loaded.current = null
          setListOpen(false)
          void load()
        }}
      />
    </PageLayout>
  )
}

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono text-xs' : 'text-foreground'}>
        {value || '—'}
      </dd>
    </div>
  )
}

function ListOnMarketplaceDialog({
  open,
  onOpenChange,
  productId,
  productName,
  isSchool,
  onListed,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  productId: number
  productName: string
  isSchool: boolean
  onListed: () => void
}) {
  const { t } = useTranslation()
  const [listingType, setListingType] = useState<string>('sell')
  const [title, setTitle] = useState(productName)
  const [price, setPrice] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setListingType('sell')
      setTitle(productName)
      setPrice('')
      setIsPublic(true)
    }
  }, [open, productName])

  const submit = async () => {
    setSaving(true)
    try {
      const payload = {
        product_id: productId,
        listing_type: listingType as ListingTypeEnum,
        title: title.trim() || productName,
        description: '',
        asking_price: price || null,
        is_public: isPublic,
      }
      if (isSchool) {
        const fd = new FormData()
        fd.append('payload', JSON.stringify(payload))
        await apiClient.api.marketplaceSchoolListingsCreate(
          fd as unknown as SchoolListingCreateMultipart
        )
      } else {
        await apiClient.api.marketplaceListingsCreate(payload as ListingCreate)
      }
      toast.success(
        t('productDetail.listed', { defaultValue: 'Listed on the marketplace.' })
      )
      onListed()
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="inline-flex items-center gap-2">
              <Tag className="size-4" />
              {t('productDetail.listOnMarketplace', {
                defaultValue: 'List on marketplace',
              })}
            </span>
          </DialogTitle>
          <DialogDescription>
            {t('productDetail.listDialogDesc', {
              defaultValue:
                'Publish this product and all its available units to the marketplace.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="pd-type">{t('marketplace.listingType')}</Label>
            <Select value={listingType} onValueChange={setListingType}>
              <SelectTrigger id="pd-type" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LISTING_TYPES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>
                    {t(lt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pd-title">{t('marketplace.listingTitle')}</Label>
            <Input
              id="pd-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="pd-price">{t('marketplace.askingPrice')}</Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {t('common.currencySymbol')}
              </span>
              <Input
                id="pd-price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('marketplace.public')}</p>
              <p className="text-xs text-muted-foreground">
                {t('marketplace.publicDesc')}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('marketplace.cancel')}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {t('productDetail.listOnMarketplace', {
              defaultValue: 'List on marketplace',
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
