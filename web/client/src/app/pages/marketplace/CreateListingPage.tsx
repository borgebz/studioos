import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, Package, ImagePlus } from 'lucide-react'
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
import { toast } from 'sonner'
import { paths } from '@/app/paths'

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

export function CreateListingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [sizeSystems, setSizeSystems] = useState<SizeSystem[]>([])

  // Listing fields
  const [listingType, setListingType] = useState<string>('sell')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  // Product fields (embedded)
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [targetGender, setTargetGender] = useState<string>('')
  const [brand, setBrand] = useState('')
  const [material, setMaterial] = useState('')

  // Variant fields (embedded in product)
  const [condition, setCondition] = useState<string>('good')
  const [sku, setSku] = useState('')
  const [sizeSystemId, setSizeSystemId] = useState<string>('')
  const [sizeId, setSizeId] = useState<string>('')
  const [selectedColorIds, setSelectedColorIds] = useState<number[]>([])
  const [variantNotes, setVariantNotes] = useState('')

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
      const [categoriesRes, colorsRes, sizeSystemsRes] = await Promise.all([
        apiClient.inventory.inventoryCategoriesList().catch(() => null),
        apiClient.inventory.inventoryColorsList().catch(() => null),
        apiClient.inventory.inventorySizeSystemsList().catch(() => null),
      ])
      if (categoriesRes?.data) setCategories(categoriesRes.data)
      if (colorsRes?.data) setColors(colorsRes.data)
      if (sizeSystemsRes?.data) setSizeSystems(sizeSystemsRes.data)
    }
    void load()
  }, [])

  const selectedSizeSystem = sizeSystems.find(
    (ss) => ss.id === Number(sizeSystemId),
  )
  const availableSizes = selectedSizeSystem?.sizes ?? []

  const toggleColor = (colorId: number) => {
    setSelectedColorIds((prev) =>
      prev.includes(colorId)
        ? prev.filter((id) => id !== colorId)
        : [...prev, colorId],
    )
  }

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
          variants: [
            {
              condition,
              sku: sku || null,
              size_id: sizeId ? Number(sizeId) : null,
              color_ids: selectedColorIds,
              notes: variantNotes || '',
            },
          ],
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
      const msg = err instanceof Error ? err.message : t('marketplace.createError')
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
                    placeholder={t('marketplace.productDescriptionPlaceholder')}
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
                    <Select value={targetGender} onValueChange={setTargetGender}>
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

            {/* Variant / Item Details */}
            <CardSection
              title={t('marketplace.variantDetails')}
              description={t('marketplace.variantDetailsDesc')}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition">
                      {t('marketplace.condition')}
                    </Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger id="condition" className="mt-1.5">
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
                    <Label htmlFor="sku">{t('marketplace.sku')}</Label>
                    <Input
                      id="sku"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder={t('marketplace.skuPlaceholder')}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sizeSystem">
                      {t('marketplace.sizeSystem')}
                    </Label>
                    <Select
                      value={sizeSystemId}
                      onValueChange={(v) => {
                        setSizeSystemId(v)
                        setSizeId('')
                      }}
                    >
                      <SelectTrigger id="sizeSystem" className="mt-1.5">
                        <SelectValue
                          placeholder={t('marketplace.selectSizeSystem')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {sizeSystems.map((ss) => (
                          <SelectItem key={ss.id} value={String(ss.id)}>
                            {ss.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="size">{t('marketplace.size')}</Label>
                    <Select
                      value={sizeId}
                      onValueChange={setSizeId}
                      disabled={!sizeSystemId}
                    >
                      <SelectTrigger id="size" className="mt-1.5">
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

                {/* Colors */}
                {colors.length > 0 && (
                  <div>
                    <Label>{t('marketplace.colors')}</Label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {colors.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => toggleColor(color.id)}
                          className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                            selectedColorIds.includes(color.id)
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border bg-background text-foreground hover:bg-accent'
                          }`}
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
                  <Label htmlFor="variantNotes">
                    {t('marketplace.variantNotes')}
                  </Label>
                  <Textarea
                    id="variantNotes"
                    value={variantNotes}
                    onChange={(e) => setVariantNotes(e.target.value)}
                    placeholder={t('marketplace.variantNotesPlaceholder')}
                    rows={2}
                    className="mt-1.5"
                  />
                </div>
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
                      placeholder={t('marketplace.storageLocationPlaceholder')}
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
                  <Label htmlFor="title">{t('marketplace.listingTitle')}</Label>
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
                    placeholder={t('marketplace.listingDescriptionPlaceholder')}
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
                <Separator />
                <SummaryRow
                  label={t('marketplace.condition')}
                  value={
                    condition
                      ? t(
                          CONDITIONS.find((c) => c.value === condition)
                            ?.labelKey ?? '',
                        )
                      : undefined
                  }
                />
                <SummaryRow
                  label={t('marketplace.size')}
                  value={
                    sizeId
                      ? availableSizes.find((s) => s.id === Number(sizeId))
                          ?.name
                      : undefined
                  }
                />
                <SummaryRow
                  label={t('marketplace.colors')}
                  value={
                    selectedColorIds.length > 0
                      ? selectedColorIds
                          .map(
                            (id) =>
                              colors.find((c) => c.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(', ')
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
