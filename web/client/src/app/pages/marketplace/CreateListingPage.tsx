import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { apiClient } from '@/api/api-client'
import type {
  Category,
  Color,
  SizeSystem,
  ListingTypeEnum,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { CardSection } from '@/components/shared/CardSection'
import { MediaUpload, type MediaFile } from '@/components/shared/MediaUpload'
import { toast } from 'sonner'
import { paths } from '@/app/paths'
import { cn } from '@/lib/utils'

const LISTING_TYPES: { value: ListingTypeEnum; labelKey: string }[] = [
  { value: 'sell' as ListingTypeEnum, labelKey: 'marketplace.typeSell' },
  { value: 'rent' as ListingTypeEnum, labelKey: 'marketplace.typeRent' },
  { value: 'lend' as ListingTypeEnum, labelKey: 'marketplace.typeLend' },
  { value: 'donate' as ListingTypeEnum, labelKey: 'marketplace.typeDonate' },
]

const CONDITIONS = [
  { value: 'new', labelKey: 'marketplace.conditionNew' },
  { value: 'excellent', labelKey: 'marketplace.conditionExcellent' },
  { value: 'good', labelKey: 'marketplace.conditionGood' },
  { value: 'fair', labelKey: 'marketplace.conditionFair' },
  { value: 'damaged', labelKey: 'marketplace.conditionDamaged' },
]

const GENDERS = [
  { value: 'female', labelKey: 'marketplace.genderFemale' },
  { value: 'male', labelKey: 'marketplace.genderMale' },
  { value: 'unisex', labelKey: 'marketplace.genderUnisex' },
]

interface VariantData {
  id: string
  condition: string
  sku: string
  sizeSystemId: string
  sizeId: string
  selectedColorIds: number[]
  notes: string
  isExpanded: boolean
}

let variantCounter = 0
function createVariant(): VariantData {
  return {
    id: `variant-${Date.now()}-${variantCounter++}`,
    condition: 'good',
    sku: '',
    sizeSystemId: '',
    sizeId: '',
    selectedColorIds: [],
    notes: '',
    isExpanded: true,
  }
}

export function CreateListingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [colors, setColors] = useState<Color[]>([])

  // Media
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])

  // Listing fields
  const [listingType, setListingType] = useState<string>('sell')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  // Product fields
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [targetGender, setTargetGender] = useState<string>('')
  const [brand, setBrand] = useState('')
  const [material, setMaterial] = useState('')

  // Variants (multiple)
  const [variants, setVariants] = useState<VariantData[]>([createVariant()])

  // School details
  const [inventoryCode, setInventoryCode] = useState('')
  const [storageLocation, setStorageLocation] = useState('')
  const [schoolNotes, setSchoolNotes] = useState('')

  const [discardOpen, setDiscardOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      const [categoriesRes, colorsRes] = await Promise.all([
        apiClient.inventory.inventoryCategoriesList().catch(() => null),
        apiClient.inventory.inventoryColorsList().catch(() => null),
      ])
      if (categoriesRes?.data) setCategories(categoriesRes.data)
      if (colorsRes?.data) setColors(colorsRes.data)
    }
    void load()
  }, [])

  const updateVariant = useCallback(
    (id: string, updates: Partial<VariantData>) => {
      setVariants((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updates } : v)),
      )
    },
    [],
  )

  const addVariant = useCallback(() => {
    setVariants((prev) => {
      const collapsed = prev.map((v) => ({ ...v, isExpanded: false }))
      return [...collapsed, createVariant()]
    })
  }, [])

  const removeVariant = useCallback((id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id))
  }, [])

  const toggleVariantExpand = useCallback((id: string) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, isExpanded: !v.isExpanded } : v,
      ),
    )
  }, [])

  const toggleVariantColor = useCallback((variantId: string, colorId: number) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              selectedColorIds: v.selectedColorIds.includes(colorId)
                ? v.selectedColorIds.filter((c) => c !== colorId)
                : [...v.selectedColorIds, colorId],
            }
          : v,
      ),
    )
  }, [])

  const handleSave = async () => {
    const missing: string[] = []
    if (!title) missing.push(t('marketplace.title'))
    if (!listingType) missing.push(t('marketplace.listingType'))
    if (!productName) missing.push(t('marketplace.productName'))
    if (missing.length > 0) {
      toast.warning(t('marketplace.missingFields'), {
        description: missing.join(', '),
      })
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        listing_type: listingType as ListingTypeEnum,
        title,
        description,
        asking_price: askingPrice || null,
        is_public: isPublic,
        product: {
          name: productName,
          description: productDescription,
          category_id: categoryId ? Number(categoryId) : undefined,
          target_gender: targetGender || null,
          brand: brand || null,
          material: material || null,
          media: mediaFiles
            .filter((f) => f.url)
            .map((f, i) => ({
              image: f.url,
              is_primary: f.isPrimary,
              sort_order: i,
            })),
          variants: variants.map((v) => ({
            condition: v.condition,
            sku: v.sku || null,
            size_id: v.sizeId ? Number(v.sizeId) : null,
            color_ids: v.selectedColorIds,
            notes: v.notes || '',
          })),
          ...(inventoryCode || storageLocation || schoolNotes
            ? {
                school_details: {
                  inventory_code: inventoryCode || undefined,
                  storage_location: storageLocation || undefined,
                  notes: schoolNotes || undefined,
                },
              }
            : {}),
        },
      }

      await apiClient.marketplace.marketplaceSchoolListingsCreate(payload)

      toast.success(t('marketplace.createSuccess'))
      navigate(paths.marketplace)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t('marketplace.createError')
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    navigate(paths.marketplace)
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
        <Button variant="outline" onClick={() => navigate(paths.marketplace)}>
          {t('marketplace.back')}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {t('marketplace.createListing')}
        </Button>
      </div>
    </>
  )

  return (
    <PageLayout footer={footerContent}>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          title={t('marketplace.createTitle')}
          backTo={paths.marketplace}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Main Column */}
          <div className="flex flex-col gap-6">
            {/* Product Information */}
            <CardSection title={t('marketplace.productInfo')}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="productName">
                    {t('marketplace.productName')}
                  </Label>
                  <Input
                    id="productName"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder={t('marketplace.productNamePlaceholder')}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="productDescription">
                    {t('marketplace.productDescription')}
                  </Label>
                  <Textarea
                    id="productDescription"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder={t(
                      'marketplace.productDescriptionPlaceholder',
                    )}
                    rows={3}
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">
                      {t('marketplace.category')}
                    </Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger id="category" className="mt-1.5">
                        <SelectValue
                          placeholder={t('marketplace.selectCategory')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="gender">
                      {t('marketplace.targetGender')}
                    </Label>
                    <Select
                      value={targetGender}
                      onValueChange={setTargetGender}
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
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">{t('marketplace.brand')}</Label>
                    <Input
                      id="brand"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder={t('marketplace.brandPlaceholder')}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="material">
                      {t('marketplace.material')}
                    </Label>
                    <Input
                      id="material"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder={t('marketplace.materialPlaceholder')}
                      className="mt-1.5"
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
                  variants.map((variant, index) => (
                    <VariantCard
                      key={variant.id}
                      variant={variant}
                      index={index}
                      colors={colors}
                      categorySizeSystems={
                        categoryId
                          ? (categories.find((c) => c.id === Number(categoryId))
                              ?.size_systems as SizeSystem[]) ?? []
                          : []
                      }
                      hasCategorySelected={!!categoryId}
                      onUpdate={updateVariant}
                      onRemove={removeVariant}
                      onToggleExpand={toggleVariantExpand}
                      onToggleColor={toggleVariantColor}
                      canRemove={variants.length > 1}
                      t={t}
                    />
                  ))
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
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
                    <Label htmlFor="inventoryCode">
                      {t('marketplace.inventoryCode')}
                    </Label>
                    <Input
                      id="inventoryCode"
                      value={inventoryCode}
                      onChange={(e) => setInventoryCode(e.target.value)}
                      placeholder={t('marketplace.inventoryCodePlaceholder')}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="storageLocation">
                      {t('marketplace.storageLocation')}
                    </Label>
                    <Input
                      id="storageLocation"
                      value={storageLocation}
                      onChange={(e) => setStorageLocation(e.target.value)}
                      placeholder={t(
                        'marketplace.storageLocationPlaceholder',
                      )}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="schoolNotes">
                    {t('marketplace.schoolNotes')}
                  </Label>
                  <Textarea
                    id="schoolNotes"
                    value={schoolNotes}
                    onChange={(e) => setSchoolNotes(e.target.value)}
                    placeholder={t('marketplace.schoolNotesPlaceholder')}
                    rows={2}
                    className="mt-1.5"
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
                  <Label htmlFor="listingType">
                    {t('marketplace.listingType')}
                  </Label>
                  <Select value={listingType} onValueChange={setListingType}>
                    <SelectTrigger id="listingType" className="mt-1.5">
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
                  <Label htmlFor="title">
                    {t('marketplace.listingTitle')}
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('marketplace.listingTitlePlaceholder')}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">
                    {t('marketplace.listingDescription')}
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t(
                      'marketplace.listingDescriptionPlaceholder',
                    )}
                    rows={3}
                    className="mt-1.5"
                  />
                </div>

                <Separator />

                <div>
                  <Label htmlFor="askingPrice">
                    {t('marketplace.askingPrice')}
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      €
                    </span>
                    <Input
                      id="askingPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      inputMode="decimal"
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                      className="pl-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
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
                            ?.labelKey ?? '',
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
                  value={
                    categoryId
                      ? categories.find((c) => c.id === Number(categoryId))
                          ?.name
                      : undefined
                  }
                />
                <SummaryRow
                  label={t('marketplace.media')}
                  value={
                    mediaFiles.length > 0
                      ? t('marketplace.photoCount', { count: mediaFiles.length })
                      : undefined
                  }
                />
                <Separator />
                <SummaryRow
                  label={t('marketplace.variants')}
                  value={
                    variants.length > 0
                      ? String(variants.length)
                      : undefined
                  }
                />
                <Separator />
                <SummaryRow
                  label={t('marketplace.askingPrice')}
                  value={askingPrice ? `€${askingPrice}` : undefined}
                />
              </div>
            </CardSection>
          </div>
        </div>
      </div>

      {/* Discard Confirmation */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('marketplace.discardTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('marketplace.discardDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('marketplace.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t('marketplace.discardConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}

function VariantCard({
  variant,
  index,
  colors,
  categorySizeSystems,
  hasCategorySelected,
  onUpdate,
  onRemove,
  onToggleExpand,
  onToggleColor,
  canRemove,
  t,
}: {
  variant: VariantData
  index: number
  colors: Color[]
  categorySizeSystems: SizeSystem[]
  hasCategorySelected: boolean
  onUpdate: (id: string, updates: Partial<VariantData>) => void
  onRemove: (id: string) => void
  onToggleExpand: (id: string) => void
  onToggleColor: (variantId: string, colorId: number) => void
  canRemove: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const selectedSizeSystem = categorySizeSystems.find(
    (ss) => ss.id === Number(variant.sizeSystemId),
  )
  const availableSizes = selectedSizeSystem?.sizes ?? []

  const conditionLabel = CONDITIONS.find(
    (c) => c.value === variant.condition,
  )
  const sizeLabel = availableSizes.find(
    (s) => s.id === Number(variant.sizeId),
  )
  const colorCount = variant.selectedColorIds.length

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header — always visible, acts as accordion toggle */}
      <button
        type="button"
        onClick={() => onToggleExpand(variant.id)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors rounded-lg min-h-[48px]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {t('marketplace.variant', { number: index + 1 })}
            </p>
            {!variant.isExpanded && (
              <p className="text-xs text-muted-foreground truncate">
                {conditionLabel && t(conditionLabel.labelKey)}
                {sizeLabel && ` · ${sizeLabel.name}`}
                {colorCount > 0 &&
                  ` · ${t('marketplace.colorCount', { count: colorCount })}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(variant.id)
              }}
              className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {variant.isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {variant.isExpanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>{t('marketplace.condition')}</Label>
              <Select
                value={variant.condition}
                onValueChange={(v) =>
                  onUpdate(variant.id, { condition: v })
                }
              >
                <SelectTrigger className="mt-1.5">
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
              <Label>{t('marketplace.sku')}</Label>
              <Input
                value={variant.sku}
                onChange={(e) =>
                  onUpdate(variant.id, { sku: e.target.value })
                }
                placeholder={t('marketplace.skuPlaceholder')}
                className="mt-1.5"
              />
            </div>
          </div>

          <Separator />

          {!hasCategorySelected ? (
            <p className="text-sm text-muted-foreground">
              {t('marketplace.selectCategoryForSize')}
            </p>
          ) : categorySizeSystems.length === 0 ? null : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('marketplace.sizeSystem')}</Label>
                <Select
                  value={variant.sizeSystemId}
                  onValueChange={(v) =>
                    onUpdate(variant.id, {
                      sizeSystemId: v,
                      sizeId: '',
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5">
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
                <Label>{t('marketplace.size')}</Label>
                <Select
                  value={variant.sizeId}
                  onValueChange={(v) =>
                    onUpdate(variant.id, { sizeId: v })
                  }
                  disabled={!variant.sizeSystemId}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue
                      placeholder={t('marketplace.selectSize')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSizes.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Colors */}
          {colors.length > 0 && (
            <div>
              <Label>{t('marketplace.colors')}</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() =>
                      onToggleColor(variant.id, color.id)
                    }
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors min-h-[36px]',
                      variant.selectedColorIds.includes(color.id)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-foreground hover:bg-accent',
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-border"
                      style={{ backgroundColor: color.hex_code }}
                    />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>{t('marketplace.variantNotes')}</Label>
            <Textarea
              value={variant.notes}
              onChange={(e) =>
                onUpdate(variant.id, { notes: e.target.value })
              }
              placeholder={t('marketplace.variantNotesPlaceholder')}
              rows={2}
              className="mt-1.5"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
        {value || <span className="text-muted-foreground/50">—</span>}
      </span>
    </div>
  )
}
