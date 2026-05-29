import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Trash2,
  Plus,
  Pencil,
  ImageIcon,
  Check,
  Info,
  CalendarClock,
} from 'lucide-react'
import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import { enumOptions } from '@/lib/enum-options'
import {
  AcquisitionTypeEnum,
  ConditionEnum,
  ListingTypeEnum,
  ProductVariantStatusEnum,
  TargetGenderEnum,
} from '@/api/studioos-api'
import type {
  Category,
  Color,
  ListingDetail,
  ProductDetail,
  ProductVariantRead,
  SizeSystem,
  SchoolListingCreateMultipart,
  PatchedListingUpdate,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TreeSelect, type TreeSelectNode } from '@/components/shared/TreeSelect'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { VariantBookingsCalendar } from '@/components/shared/VariantBookingsCalendar'
import { CardSection } from '@/components/shared/CardSection'
import { ColorSwatchPicker } from '@/components/shared/ColorSwatchPicker'
import { MediaUpload, type MediaFile } from '@/components/shared/MediaUpload'
import { DatePicker } from '@/components/shared/DatePicker'
import { toast } from 'sonner'
import { paths } from '@/app/paths'
import { cn } from '@/lib/utils'
import {
  createListingSchema,
  defaultListingValues,
  type CreateListingFormValues,
} from './create-listing-schema'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListingFormMode = 'create' | 'edit'

export interface ListingFormProps {
  mode: ListingFormMode
  /** Existing listing data when editing. Required in edit mode. */
  listing?: ListingDetail
}

// ---------------------------------------------------------------------------
// Constants — sourced from the generated API client.
// Never hand-roll these arrays; if a value is missing, fix @extend_schema on
// the API side and regenerate. See §10 of UI_GUIDELINES.md.
// ---------------------------------------------------------------------------

const LISTING_TYPES = enumOptions(ListingTypeEnum, 'marketplace.type')
const CONDITIONS = enumOptions(ConditionEnum, 'marketplace.condition')
const ACQUISITION_TYPES = enumOptions(
  AcquisitionTypeEnum,
  'marketplace.acquisition'
)

// Variant status has more values in the API than the form exposes — listing
// authors should only set `available`, `maintenance`, or `inactive` from the
// UI; `sold`, `donated`, `archived` are reached by domain events.
const VARIANT_STATUSES = enumOptions(
  ProductVariantStatusEnum,
  'marketplace.variantStatus'
).filter(
  (o) =>
    o.value === 'available' ||
    o.value === 'maintenance' ||
    o.value === 'inactive'
)

const GENDERS = enumOptions(TargetGenderEnum, 'marketplace.gender')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface VariantData {
  id: string
  condition: string
  acquisitionType: string
  status: string
  acquiredAt: string
  sku: string
  sizeSystemId: string
  sizeId: string
  selectedColorIds: number[]
  selectedMediaIds: string[]
  internalNotes: string
  publicNotes: string
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function createVariant(): VariantData {
  return {
    id: `variant-${crypto.randomUUID()}`,
    condition: 'good',
    acquisitionType: '',
    status: 'available',
    acquiredAt: todayISO(),
    sku: '',
    sizeSystemId: '',
    sizeId: '',
    selectedColorIds: [],
    selectedMediaIds: [],
    internalNotes: '',
    publicNotes: '',
  }
}

function buildEditDefaults(listing: ListingDetail): CreateListingFormValues {
  const product = listing.product
  const sd = product.school_details
  return {
    listing_type: listing.listing_type,
    title: listing.title,
    description: listing.description ?? '',
    asking_price: listing.asking_price ?? '',
    is_public: listing.is_public ?? false,
    product_name: product.name,
    product_description: product.description ?? '',
    category_id: product.category ? String(product.category) : '',
    target_gender: product.target_gender ?? '',
    brand: product.brand ?? '',
    material: product.material ?? '',
    inventory_code: sd?.inventory_code ?? '',
    storage_location: sd?.storage_location ?? '',
    school_notes: sd?.notes ?? '',
  }
}

function buildEditVariant(v: ProductVariantRead): VariantData {
  return {
    id: String(v.id),
    condition: v.condition ?? 'good',
    acquisitionType: v.acquisition_type ?? '',
    status: v.status ?? 'available',
    acquiredAt: v.acquired_at ?? todayISO(),
    sku: v.sku ?? '',
    sizeSystemId: '', // resolved after categories load
    sizeId: v.size ? String(v.size.id) : '',
    selectedColorIds: v.colors?.map((c) => c.id) ?? [],
    selectedMediaIds: v.media?.map((m) => String(m.id)) ?? [],
    internalNotes: v.internal_notes ?? '',
    publicNotes: v.public_notes ?? '',
  }
}

function buildEditMedia(product: ProductDetail): MediaFile[] {
  return (product.media ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m) => ({
      id: String(m.id),
      url: m.image,
      isPrimary: m.is_primary ?? false,
    }))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ListingForm({ mode, listing }: ListingFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isEdit = mode === 'edit'

  // Mode-dependent labels/paths
  const backTarget = isEdit ? paths.schoolListings : paths.marketplace
  const headerTitle = isEdit
    ? t('marketplace.editTitle')
    : t('marketplace.createTitle')
  const submitLabel = isEdit
    ? t('marketplace.updateListing')
    : t('marketplace.createListing')

  // Reference data
  const [categories, setCategories] = useState<Category[]>([])
  const [colors, setColors] = useState<Color[]>([])

  // Non-form state (media, variants, UI)
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(() =>
    isEdit && listing ? buildEditMedia(listing.product) : []
  )
  const [variants, setVariants] = useState<VariantData[]>(() =>
    isEdit && listing?.variant ? [buildEditVariant(listing.variant)] : []
  )
  const [discardOpen, setDiscardOpen] = useState(false)
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<VariantData | null>(null)
  const [draft, setDraft] = useState<VariantData>(createVariant())
  // The bookings calendar opens against a saved variant — newly drafted
  // variants don't have a server id yet, so the button is disabled for them.
  const [bookingsVariantId, setBookingsVariantId] = useState<number | null>(
    null
  )

  // Form — defaults depend on mode
  const formDefaults = useMemo(() => {
    if (isEdit && listing) return buildEditDefaults(listing)
    return defaultListingValues
  }, [isEdit, listing])

  const { register, handleSubmit, control, watch } =
    useForm<CreateListingFormValues>({
      resolver: zodResolver(createListingSchema),
      defaultValues: formDefaults,
    })

  const listingType = watch('listing_type')
  const askingPrice = watch('asking_price')
  const productName = watch('product_name')
  const categoryId = watch('category_id')

  const categoryTreeNodes: TreeSelectNode[] = React.useMemo(() => {
    const roots = categories.filter((c) => !c.parent)
    return roots.map((root) => ({
      value: String(root.id),
      label: root.name,
      children: (root.subcategories as Category[]).map((sub) => ({
        value: String(sub.id),
        label: sub.name,
      })),
    }))
  }, [categories])

  const categorySizeSystems: SizeSystem[] = React.useMemo(() => {
    if (!categoryId) return []
    for (const c of categories) {
      if (c.id === Number(categoryId))
        return (c.size_systems as SizeSystem[]) ?? []
      const sub = (c.subcategories as Category[]).find(
        (s) => s.id === Number(categoryId)
      )
      if (sub) return (sub.size_systems as SizeSystem[]) ?? []
    }
    return []
  }, [categoryId, categories])

  const findCategoryName = useCallback(
    (id: string): string | undefined => {
      for (const c of categories) {
        if (c.id === Number(id)) return c.name
        const sub = (c.subcategories as Category[]).find(
          (s) => s.id === Number(id)
        )
        if (sub) return sub.name
      }
      return undefined
    },
    [categories]
  )

  // Load reference data
  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      const [categoriesRes, colorsRes] = await Promise.all([
        apiClient.api.inventoryCategoriesList().catch(() => null),
        apiClient.api.inventoryColorsList().catch(() => null),
      ])
      if (categoriesRes?.data) setCategories(categoriesRes.data)
      if (colorsRes?.data) setColors(colorsRes.data)
    }
    void load()
  }, [])

  // In edit mode, resolve sizeSystemId once categories load
  useEffect(() => {
    if (!isEdit || categories.length === 0 || !listing?.variant?.size) return

    const targetSizeId = listing.variant.size.id
    setVariants((prev) =>
      prev.map((v) => {
        if (v.sizeSystemId) return v // already resolved
        // Search through all categories' size systems
        for (const cat of categories) {
          const cats = [cat, ...((cat.subcategories as Category[]) ?? [])]
          for (const c of cats) {
            for (const ss of (c.size_systems as SizeSystem[]) ?? []) {
              if (ss.sizes?.some((s) => s.id === targetSizeId)) {
                return { ...v, sizeSystemId: String(ss.id) }
              }
            }
          }
        }
        return v
      })
    )
  }, [isEdit, categories, listing])

  const openAddVariant = useCallback(() => {
    setEditingVariant(null)
    setDraft(createVariant())
    setSheetOpen(true)
  }, [])

  const openEditVariant = useCallback((v: VariantData) => {
    setEditingVariant(v)
    setDraft({ ...v })
    setSheetOpen(true)
  }, [])

  const saveVariant = useCallback(() => {
    if (editingVariant) {
      setVariants((prev) =>
        prev.map((v) => (v.id === editingVariant.id ? { ...draft } : v))
      )
    } else {
      setVariants((prev) => [...prev, { ...draft }])
    }
    setSheetOpen(false)
  }, [editingVariant, draft])

  const confirmDeleteVariant = useCallback(() => {
    if (deleteVariantId) {
      setVariants((prev) => prev.filter((v) => v.id !== deleteVariantId))
      setDeleteVariantId(null)
    }
  }, [deleteVariantId])

  const updateDraft = useCallback((updates: Partial<VariantData>) => {
    setDraft((prev) => ({ ...prev, ...updates }))
  }, [])

  const toggleDraftColor = useCallback((colorId: number) => {
    setDraft((prev) => ({
      ...prev,
      selectedColorIds: prev.selectedColorIds.includes(colorId)
        ? prev.selectedColorIds.filter((c) => c !== colorId)
        : [...prev.selectedColorIds, colorId],
    }))
  }, [])

  const toggleDraftMedia = useCallback((mediaId: string) => {
    setDraft((prev) => ({
      ...prev,
      selectedMediaIds: prev.selectedMediaIds.includes(mediaId)
        ? prev.selectedMediaIds.filter((m) => m !== mediaId)
        : [...prev.selectedMediaIds, mediaId],
    }))
  }, [])

  const getVariantSummaryParts = useCallback(
    (v: VariantData): string[] => {
      const parts: string[] = []
      const cond = CONDITIONS.find((c) => c.value === v.condition)
      if (cond) parts.push(t(cond.labelKey))
      if (v.sizeId) {
        const ss = categorySizeSystems.find(
          (s) => s.id === Number(v.sizeSystemId)
        )
        const size = ss?.sizes?.find((s) => s.id === Number(v.sizeId))
        if (size) parts.push(size.name)
      }
      if (v.selectedColorIds.length > 0) {
        parts.push(
          t('marketplace.colorCount', { count: v.selectedColorIds.length })
        )
      }
      return parts
    },
    [t, categorySizeSystems]
  )

  const onSubmit = async (data: CreateListingFormValues) => {
    setIsSaving(true)

    try {
      if (isEdit && listing) {
        // ── PATCH (edit) ──
        const payload: PatchedListingUpdate = {
          listing_type: data.listing_type as ListingTypeEnum,
          title: data.title,
          description: data.description,
          asking_price: data.asking_price || null,
          is_public: data.is_public,
          product: {
            name: data.product_name,
            description: data.product_description,
            category_id: data.category_id ? Number(data.category_id) : null,
            target_gender: data.target_gender || null,
            brand: data.brand || null,
            material: data.material || null,
            ...(data.inventory_code ||
            data.storage_location ||
            data.school_notes
              ? {
                  school_details: {
                    inventory_code: data.inventory_code || undefined,
                    storage_location: data.storage_location || undefined,
                    notes: data.school_notes || undefined,
                  },
                }
              : {}),
          },
          ...(variants.length > 0
            ? {
                variant: {
                  condition: variants[0].condition,
                  acquisition_type: variants[0].acquisitionType || null,
                  status: variants[0].status || 'available',
                  sku: variants[0].sku || null,
                  size_id: variants[0].sizeId
                    ? Number(variants[0].sizeId)
                    : null,
                  color_ids: variants[0].selectedColorIds,
                  notes: variants[0].publicNotes || '',
                  internal_notes: variants[0].internalNotes || '',
                },
              }
            : {}),
        }

        await apiClient.api.marketplaceSchoolListingsPartialUpdate(
          listing.id,
          payload
        )
        toast.success(t('marketplace.updateSuccess'))
        navigate(paths.schoolListings)
        return
      }

      // ── POST (create) ──
      const filesToUpload = mediaFiles.filter(
        (f): f is MediaFile & { file: File } => !!f.file
      )

      const payload = {
        listing_type: data.listing_type as ListingTypeEnum,
        title: data.title,
        description: data.description,
        asking_price: data.asking_price || null,
        is_public: data.is_public,
        product: {
          name: data.product_name,
          description: data.product_description,
          category_id: data.category_id ? Number(data.category_id) : undefined,
          target_gender: data.target_gender || null,
          brand: data.brand || null,
          material: data.material || null,
          media: filesToUpload.map((f, i) => ({
            is_primary: f.isPrimary,
            sort_order: i,
          })),
          variants: variants.map((v) => ({
            condition: v.condition,
            acquisition_type: v.acquisitionType || null,
            status: v.status || 'available',
            acquired_at: v.acquiredAt || null,
            sku: v.sku || null,
            size_id: v.sizeId ? Number(v.sizeId) : null,
            color_ids: v.selectedColorIds,
            notes: v.publicNotes || '',
            internal_notes: v.internalNotes || '',
          })),
          ...(data.inventory_code || data.storage_location || data.school_notes
            ? {
                school_details: {
                  inventory_code: data.inventory_code || undefined,
                  storage_location: data.storage_location || undefined,
                  notes: data.school_notes || undefined,
                },
              }
            : {}),
        },
      }

      const fd = new FormData()
      fd.append('payload', JSON.stringify(payload))
      filesToUpload.forEach((f, i) => {
        fd.append(`media_${i}`, f.file)
      })

      await apiClient.api.marketplaceSchoolListingsCreate(
        fd as unknown as SchoolListingCreateMultipart
      )

      toast.success(t('marketplace.createSuccess'))
      navigate(paths.marketplace)
    } catch (err) {
      const errorKey = isEdit
        ? 'marketplace.updateError'
        : 'marketplace.createError'
      toast.error(parseApiError(err, t, errorKey) ?? t(errorKey))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    navigate(backTarget)
  }

  const footerContent = (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDiscardOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {t('marketplace.discard')}
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(backTarget)}>
          {t('marketplace.back')}
        </Button>
        <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
          {submitLabel}
        </Button>
      </div>
    </>
  )

  const hasSingleSizeSystem = categorySizeSystems.length === 1

  // Auto-select when only one size system exists
  useEffect(() => {
    if (hasSingleSizeSystem && !draft.sizeSystemId && sheetOpen) {
      setDraft((prev) => ({
        ...prev,
        sizeSystemId: String(categorySizeSystems[0].id),
      }))
    }
  }, [hasSingleSizeSystem, draft.sizeSystemId, sheetOpen, categorySizeSystems])

  const draftSizeSystem = categorySizeSystems.find(
    (ss) => ss.id === Number(draft.sizeSystemId)
  )
  const draftAvailableSizes = draftSizeSystem?.sizes ?? []

  return (
    <PageLayout footer={footerContent}>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={headerTitle} backTo={backTarget} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Main Column */}
          <div className="flex flex-col gap-6">
            {/* Product Information */}
            <CardSection title={t('marketplace.productInfo')}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product_name">
                    {t('marketplace.productName')}
                  </Label>
                  <Input
                    id="product_name"
                    placeholder={t('marketplace.productNamePlaceholder')}
                    className="mt-1.5"
                    {...register('product_name')}
                  />
                </div>

                <div>
                  <Label htmlFor="product_description">
                    {t('marketplace.productDescription')}
                  </Label>
                  <Textarea
                    id="product_description"
                    placeholder={t('marketplace.productDescriptionPlaceholder')}
                    rows={3}
                    className="mt-1.5"
                    {...register('product_description')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">
                      {t('marketplace.category')}
                    </Label>
                    <Controller
                      name="category_id"
                      control={control}
                      render={({ field }) => (
                        <TreeSelect
                          nodes={categoryTreeNodes}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder={t('marketplace.selectCategory')}
                          triggerClassName="mt-1.5 w-full"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="gender">
                      {t('marketplace.targetGender')}
                    </Label>
                    <Controller
                      name="target_gender"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="gender" className="mt-1.5">
                            <SelectValue
                              placeholder={t('marketplace.selectGender')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDERS.map((g) => (
                              <SelectItem key={g.value} value={g.value}>
                                {t(g.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">{t('marketplace.brand')}</Label>
                    <Input
                      id="brand"
                      placeholder={t('marketplace.brandPlaceholder')}
                      className="mt-1.5"
                      {...register('brand')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="material">
                      {t('marketplace.material')}
                    </Label>
                    <Input
                      id="material"
                      placeholder={t('marketplace.materialPlaceholder')}
                      className="mt-1.5"
                      {...register('material')}
                    />
                  </div>
                </div>
              </div>
            </CardSection>

            {/* Media */}
            <CardSection
              title={t('marketplace.media')}
              description={t('marketplace.mediaDesc')}
            >
              <MediaUpload value={mediaFiles} onChange={setMediaFiles} />
            </CardSection>

            {/* Variants */}
            <CardSection
              title={t('marketplace.variants')}
              description={t('marketplace.variantsDesc')}
            >
              <div className="space-y-3">
                {variants.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t('marketplace.noVariants')}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {t('marketplace.noVariantsHint')}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {variants.map((variant, index) => {
                      const parts = getVariantSummaryParts(variant)
                      const variantMedia = mediaFiles.filter((m) =>
                        variant.selectedMediaIds.includes(m.id)
                      )
                      const thumbUrl = variantMedia[0]?.url

                      return (
                        <div
                          key={variant.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
                          {/* Thumbnail */}
                          <div className="h-10 w-10 shrink-0 rounded-md border border-border bg-muted/30 overflow-hidden">
                            {thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {t('marketplace.variant', {
                                number: index + 1,
                              })}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {parts.map((part, i) => (
                                <React.Fragment key={i}>
                                  {i > 0 && (
                                    <span className="text-xs text-muted-foreground/40">
                                      ·
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {part}
                                  </span>
                                </React.Fragment>
                              ))}
                              {variant.selectedMediaIds.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 ml-1"
                                >
                                  <ImageIcon className="h-3 w-3 mr-0.5" />
                                  {variant.selectedMediaIds.length}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {(() => {
                              // Show the bookings calendar only when this row
                              // maps to a saved server-side variant (numeric id).
                              const savedVariantId = Number(variant.id)
                              const hasSavedVariant =
                                Number.isFinite(savedVariantId) &&
                                !variant.id.startsWith('variant-')
                              if (!hasSavedVariant) return null
                              return (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0"
                                  aria-label={t('marketplace.viewBookings')}
                                  onClick={() =>
                                    setBookingsVariantId(savedVariantId)
                                  }
                                >
                                  <CalendarClock className="h-4 w-4" />
                                </Button>
                              )
                            })()}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0"
                              aria-label={t('marketplace.editVariant')}
                              onClick={() => openEditVariant(variant)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0 text-muted-foreground hover:text-destructive"
                              aria-label={t('marketplace.deleteVariant')}
                              onClick={() => setDeleteVariantId(variant.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openAddVariant}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('marketplace.addVariant')}
                </Button>
              </div>
            </CardSection>

            {/* School Details */}
            <CardSection
              title={t('marketplace.schoolDetails')}
              description={t('marketplace.schoolDetailsDesc')}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inventory_code">
                      {t('marketplace.inventoryCode')}
                    </Label>
                    <Input
                      id="inventory_code"
                      placeholder={t('marketplace.inventoryCodePlaceholder')}
                      className="mt-1.5"
                      {...register('inventory_code')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="storage_location">
                      {t('marketplace.storageLocation')}
                    </Label>
                    <Input
                      id="storage_location"
                      placeholder={t('marketplace.storageLocationPlaceholder')}
                      className="mt-1.5"
                      {...register('storage_location')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="school_notes">
                    {t('marketplace.schoolNotes')}
                  </Label>
                  <Textarea
                    id="school_notes"
                    placeholder={t('marketplace.schoolNotesPlaceholder')}
                    rows={2}
                    className="mt-1.5"
                    {...register('school_notes')}
                  />
                </div>
              </div>
            </CardSection>
          </div>

          {/* Side Column */}
          <div className="flex flex-col gap-6">
            {/* Listing Details */}
            <CardSection title={t('marketplace.listingDetails')}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="listing_type">
                    {t('marketplace.listingType')}
                  </Label>
                  <Controller
                    name="listing_type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="listing_type" className="mt-1.5">
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
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="title">{t('marketplace.listingTitle')}</Label>
                  <Input
                    id="title"
                    placeholder={t('marketplace.listingTitlePlaceholder')}
                    className="mt-1.5"
                    {...register('title')}
                  />
                </div>

                <div>
                  <Label htmlFor="description">
                    {t('marketplace.listingDescription')}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={t('marketplace.listingDescriptionPlaceholder')}
                    rows={3}
                    className="mt-1.5"
                    {...register('description')}
                  />
                </div>

                <Separator />

                <div>
                  <Label htmlFor="asking_price">
                    {t('marketplace.askingPrice')}
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {t('common.currencySymbol')}
                    </span>
                    <Input
                      id="asking_price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      inputMode="decimal"
                      className="pl-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      {...register('asking_price')}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {t('marketplace.public')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('marketplace.publicDesc')}
                    </p>
                  </div>
                  <Controller
                    name="is_public"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            </CardSection>

            {/* Summary */}
            <CardSection title={t('marketplace.summary')}>
              <div className="space-y-3">
                <SummaryRow
                  label={t('marketplace.listingType')}
                  value={
                    listingType
                      ? t(
                          LISTING_TYPES.find((lt) => lt.value === listingType)
                            ?.labelKey ?? ''
                        )
                      : undefined
                  }
                />
                <SummaryRow
                  label={t('marketplace.productName')}
                  value={productName || undefined}
                />
                <SummaryRow
                  label={t('marketplace.category')}
                  value={categoryId ? findCategoryName(categoryId) : undefined}
                />
                <SummaryRow
                  label={t('marketplace.media')}
                  value={
                    mediaFiles.length > 0
                      ? t('marketplace.photoCount', {
                          count: mediaFiles.length,
                        })
                      : undefined
                  }
                />
                <Separator />
                <SummaryRow
                  label={t('marketplace.variants')}
                  value={
                    variants.length > 0 ? String(variants.length) : undefined
                  }
                />
                <Separator />
                <SummaryRow
                  label={t('marketplace.askingPrice')}
                  value={
                    askingPrice
                      ? `${t('common.currencySymbol')}${askingPrice}`
                      : undefined
                  }
                />
              </div>
            </CardSection>
          </div>
        </div>
      </div>

      {/* Variant Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          className="sm:max-w-lg p-0 flex flex-col gap-0"
          showCloseButton={false}
        >
          {/* Sticky header */}
          <SheetHeader className="px-6 py-5 border-b border-border shrink-0">
            <SheetTitle>
              {editingVariant
                ? t('marketplace.editVariant')
                : t('marketplace.addVariant')}
            </SheetTitle>
            <SheetDescription>
              {t('marketplace.variantSheetDesc')}
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-6 space-y-6">
              {/* ── Condition & Details ── */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  {t('marketplace.condition')} &amp;{' '}
                  {t('marketplace.variantDetails')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="variant-condition">
                      {t('marketplace.condition')}
                    </Label>
                    <Select
                      value={draft.condition}
                      onValueChange={(v) => updateDraft({ condition: v })}
                    >
                      <SelectTrigger id="variant-condition" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {t(c.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="variant-status">
                      {t('marketplace.variantStatus')}
                    </Label>
                    <Select
                      value={draft.status}
                      onValueChange={(v) => updateDraft({ status: v })}
                    >
                      <SelectTrigger id="variant-status" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VARIANT_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {t(s.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="variant-acquisition-type">
                      {t('marketplace.acquisitionType')}
                    </Label>
                    <Select
                      value={draft.acquisitionType}
                      onValueChange={(v) => updateDraft({ acquisitionType: v })}
                    >
                      <SelectTrigger
                        id="variant-acquisition-type"
                        className="mt-1.5"
                      >
                        <SelectValue
                          placeholder={t('marketplace.selectAcquisition')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {ACQUISITION_TYPES.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            {t(a.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="variant-acquired-at">
                      {t('marketplace.acquiredAt')}
                    </Label>
                    <DatePicker
                      value={
                        draft.acquiredAt
                          ? new Date(draft.acquiredAt)
                          : undefined
                      }
                      onChange={(d) =>
                        updateDraft({
                          acquiredAt: d ? format(d, 'yyyy-MM-dd') : '',
                        })
                      }
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="variant-sku">{t('marketplace.sku')}</Label>
                  <Input
                    id="variant-sku"
                    value={draft.sku}
                    onChange={(e) => updateDraft({ sku: e.target.value })}
                    placeholder={t('marketplace.skuPlaceholder')}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* ── Size ── */}
              {(!categoryId || categorySizeSystems.length > 0) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3">
                      {t('marketplace.size')}
                    </p>
                    {!categoryId ? (
                      <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-border p-4">
                        <Info className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          {t('marketplace.selectCategoryForSize')}
                        </p>
                      </div>
                    ) : hasSingleSizeSystem ? (
                      <div>
                        <Label htmlFor="variant-size">
                          {t('marketplace.size')}
                        </Label>
                        <Select
                          value={draft.sizeId}
                          onValueChange={(v) => updateDraft({ sizeId: v })}
                        >
                          <SelectTrigger id="variant-size" className="mt-1.5">
                            <SelectValue
                              placeholder={t('marketplace.selectSize')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {draftAvailableSizes.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="variant-size-system">
                            {t('marketplace.sizeSystem')}
                          </Label>
                          <Select
                            value={draft.sizeSystemId}
                            onValueChange={(v) =>
                              updateDraft({ sizeSystemId: v, sizeId: '' })
                            }
                          >
                            <SelectTrigger
                              id="variant-size-system"
                              className="mt-1.5"
                            >
                              <SelectValue
                                placeholder={t('marketplace.selectSizeSystem')}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {categorySizeSystems.map((ss) => (
                                <SelectItem key={ss.id} value={String(ss.id)}>
                                  {ss.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="variant-size">
                            {t('marketplace.size')}
                          </Label>
                          <Select
                            value={draft.sizeId}
                            onValueChange={(v) => updateDraft({ sizeId: v })}
                            disabled={!draft.sizeSystemId}
                          >
                            <SelectTrigger id="variant-size" className="mt-1.5">
                              <SelectValue
                                placeholder={t('marketplace.selectSize')}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {draftAvailableSizes.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Colors ── */}
              {colors.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3">
                      {t('marketplace.colors')}
                    </p>
                    <ColorSwatchPicker
                      colors={colors}
                      selectedIds={draft.selectedColorIds}
                      onToggle={toggleDraftColor}
                    />
                  </div>
                </>
              )}

              <Separator />

              {/* ── Photos ── */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  {t('marketplace.variantPhotos')}
                </p>
                {mediaFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('marketplace.noPhotosForVariant')}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {t('marketplace.noPhotosForVariantHint')}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t('marketplace.variantPhotosDesc')}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {mediaFiles.map((media) => {
                        const selected = draft.selectedMediaIds.includes(
                          media.id
                        )
                        return (
                          <button
                            key={media.id}
                            type="button"
                            onClick={() => toggleDraftMedia(media.id)}
                            className={cn(
                              'relative aspect-square rounded-lg border-2 overflow-hidden transition-all',
                              selected
                                ? 'border-primary ring-1 ring-primary'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <img
                              src={media.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            {selected && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <div className="rounded-full bg-primary p-1">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              <Separator />

              {/* ── Notes ── */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  {t('marketplace.publicNotes')}
                </p>
                <Textarea
                  id="variant-public-notes"
                  value={draft.publicNotes}
                  onChange={(e) => updateDraft({ publicNotes: e.target.value })}
                  placeholder={t('marketplace.publicNotesPlaceholder')}
                  rows={2}
                />
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  {t('marketplace.internalNotes')}
                </p>
                <Textarea
                  id="variant-internal-notes"
                  value={draft.internalNotes}
                  onChange={(e) =>
                    updateDraft({ internalNotes: e.target.value })
                  }
                  placeholder={t('marketplace.internalNotesPlaceholder')}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-border bg-background px-6 py-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              {t('marketplace.cancel')}
            </Button>
            <Button onClick={saveVariant}>
              {editingVariant
                ? t('marketplace.saveVariant')
                : t('marketplace.addVariant')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Variant bookings calendar */}
      <Dialog
        open={bookingsVariantId != null}
        onOpenChange={(o) => {
          if (!o) setBookingsVariantId(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              {t('marketplace.variantBookingsTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('marketplace.variantBookingsDesc')}
            </DialogDescription>
          </DialogHeader>
          {bookingsVariantId != null && (
            <VariantBookingsCalendar variantId={bookingsVariantId} />
          )}
        </DialogContent>
      </Dialog>

      {/* Discard Confirmation */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('marketplace.discardTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('marketplace.discardDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('marketplace.cancel')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleDiscard}>
                {t('marketplace.discardConfirm')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Variant Confirmation */}
      <AlertDialog
        open={!!deleteVariantId}
        onOpenChange={() => setDeleteVariantId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('marketplace.removeVariant')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('marketplace.removeVariantDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('marketplace.cancel')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmDeleteVariant}>
                {t('marketplace.removeVariant')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
        {value || <span className="text-muted-foreground/50">—</span>}
      </span>
    </div>
  )
}
