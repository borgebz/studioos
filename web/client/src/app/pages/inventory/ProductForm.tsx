import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import { enumOptions } from '@/lib/enum-options'
import { ProductStatusEnum, TargetGenderEnum } from '@/api/studioos-api'
import type {
  Category,
  Color,
  SizeSystem,
  ProductCreateMultipart,
  SchoolProductCreateMultipart,
  PatchedProductUpdateMultipart,
  PatchedSchoolProductUpdateMultipart,
  ProductDetail,
  ProductVariantRead,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { PAGE_CONTENT } from '@/lib/layout'
import { CardSection } from '@/components/shared/CardSection'
import { MediaUpload, type MediaFile } from '@/components/shared/MediaUpload'
import { VariantsSection } from '@/components/shared/VariantsSection'
import {
  type VariantData,
  isExistingVariant,
  mapReadVariantToData,
  resolveVariantSizeSystems,
} from '@/components/shared/variant-data'
import { toast } from 'sonner'
import { paths } from '@/app/paths'
import {
  createProductSchema,
  defaultProductValues,
  type CreateProductFormValues,
} from './create-product-schema'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductFormContext = 'personal' | 'school'

export interface ProductFormProps {
  mode?: 'create' | 'edit'
  context: ProductFormContext
  /** Required when mode is 'edit' — the product being edited. */
  product?: ProductDetail
}

const PRODUCT_STATUSES = enumOptions(ProductStatusEnum, 'schoolInventory.status')
const GENDERS = enumOptions(TargetGenderEnum, 'marketplace.gender')

// ---------------------------------------------------------------------------
// Edit-mode prefill helpers
// ---------------------------------------------------------------------------

function buildEditDefaults(product: ProductDetail): CreateProductFormValues {
  return {
    name: product.name ?? '',
    description: product.description ?? '',
    category_id: product.category ? String(product.category) : '',
    target_gender: product.target_gender ?? '',
    brand: product.brand ?? '',
    material: product.material ?? '',
    status: product.status ?? 'active',
    inventory_code: product.school_details?.inventory_code ?? '',
    storage_location: product.school_details?.storage_location ?? '',
    school_notes: product.school_details?.notes ?? '',
  }
}

function buildEditMedia(media: ProductDetail['media']): MediaFile[] {
  return (media ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m) => ({
      id: String(m.id),
      url: m.image,
      isPrimary: m.is_primary ?? false,
    }))
}

/** Size systems attached to a given category (within freshly-loaded data). */
function sizeSystemsForCategory(
  categories: Category[],
  categoryId: number | null | undefined
): SizeSystem[] {
  if (!categoryId) return []
  for (const c of categories) {
    if (c.id === categoryId) return (c.size_systems as SizeSystem[]) ?? []
    const sub = (c.subcategories as Category[]).find((s) => s.id === categoryId)
    if (sub) return (sub.size_systems as SizeSystem[]) ?? []
  }
  return []
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductForm({
  mode = 'create',
  context,
  product,
}: ProductFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const isEdit = mode === 'edit'
  const isSchool = context === 'school'
  const backTarget = isSchool ? paths.schoolInventory : paths.myInventory
  const detailTarget =
    isEdit && product
      ? (isSchool
          ? paths.schoolInventoryDetail
          : paths.myInventoryDetail
        ).replace(':id', String(product.id))
      : backTarget
  const headerTitle = isEdit
    ? t('inventory.editTitle')
    : t('inventory.createTitle')
  const submitLabel = isEdit
    ? t('inventory.saveProduct')
    : t('inventory.createProduct')

  // Reference data
  const [categories, setCategories] = useState<Category[]>([])
  const [colors, setColors] = useState<Color[]>([])

  // Non-form state
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(() =>
    isEdit && product ? buildEditMedia(product.media) : []
  )
  const [variants, setVariants] = useState<VariantData[]>([])
  const [discardOpen, setDiscardOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { register, handleSubmit, control, watch } =
    useForm<CreateProductFormValues>({
      resolver: zodResolver(createProductSchema),
      defaultValues:
        isEdit && product ? buildEditDefaults(product) : defaultProductValues,
    })

  const productName = watch('name')
  const categoryId = watch('category_id')
  const status = watch('status')

  const categoryTreeNodes: TreeSelectNode[] = useMemo(() => {
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

  const categorySizeSystems: SizeSystem[] = useMemo(
    () => sizeSystemsForCategory(categories, categoryId ? Number(categoryId) : null),
    [categoryId, categories]
  )

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

  // Load reference data (+ existing variants in edit mode)
  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      const [categoriesRes, colorsRes, variantsRes] = await Promise.all([
        apiClient.api.inventoryCategoriesList().catch(() => null),
        apiClient.api.inventoryColorsList().catch(() => null),
        isEdit && product
          ? apiClient.api
              .inventoryProductsVariantsRetrieve(product.id)
              .catch(() => null)
          : Promise.resolve(null),
      ])
      const loadedCategories = categoriesRes?.data ?? []
      if (categoriesRes?.data) setCategories(loadedCategories)
      if (colorsRes?.data) setColors(colorsRes.data)

      if (isEdit && product && variantsRes?.data) {
        const raw = variantsRes.data as
          | ProductVariantRead[]
          | { results?: ProductVariantRead[] }
        const list = Array.isArray(raw) ? raw : (raw.results ?? [])
        const sizeSystems = sizeSystemsForCategory(
          loadedCategories,
          product.category
        )
        setVariants(list.map((v) => mapReadVariantToData(v, sizeSystems)))
      }
    }
    void load()
  }, [isEdit, product])

  // Once the category's size systems are known, fill in any variant that has a
  // size but no resolved size system yet.
  useEffect(() => {
    if (!isEdit) return
    setVariants((prev) => resolveVariantSizeSystems(prev, categorySizeSystems))
  }, [categorySizeSystems, isEdit])

  const onSubmit = async (data: CreateProductFormValues) => {
    setIsSaving(true)

    try {
      // Media travels via multipart: each entry's metadata goes in the JSON
      // `payload`, new binaries are appended as `media_<i>` at the SAME index as
      // the entry. Existing media (no file) are kept via their `id`. The `key`
      // lets variants reference media (new or existing) for association.
      const mediaPayload = mediaFiles.map((m, i) => ({
        key: m.id,
        is_primary: m.isPrimary,
        sort_order: i,
        ...(m.file ? {} : { id: Number(m.id) }),
      }))

      const variantsPayload = variants.map((v) => ({
        ...(isEdit && isExistingVariant(v) ? { id: Number(v.id) } : {}),
        condition: v.condition,
        status: v.status || undefined,
        acquisition_type: v.acquisitionType || undefined,
        acquired_at: v.acquiredAt || null,
        asking_price: v.askingPrice || null,
        sku: v.sku || null,
        size_id: v.sizeId ? Number(v.sizeId) : null,
        color_ids: v.selectedColorIds,
        media_keys: v.selectedMediaIds,
        public_notes: v.publicNotes || '',
        internal_notes: v.internalNotes || '',
      }))

      const schoolDetails =
        isSchool &&
        (data.inventory_code || data.storage_location || data.school_notes)
          ? {
              school_details: {
                inventory_code: data.inventory_code || undefined,
                storage_location: data.storage_location || undefined,
                notes: data.school_notes || undefined,
              },
            }
          : {}

      const payload = {
        name: data.name,
        description: data.description,
        category_id: data.category_id ? Number(data.category_id) : undefined,
        target_gender: data.target_gender || null,
        brand: data.brand || null,
        material: data.material || null,
        status: data.status || 'active',
        media: mediaPayload,
        variants: variantsPayload,
        ...schoolDetails,
      }

      const fd = new FormData()
      fd.append('payload', JSON.stringify(payload))
      mediaFiles.forEach((m, i) => {
        if (m.file) fd.append(`media_${i}`, m.file)
      })

      if (isEdit && product) {
        if (isSchool) {
          await apiClient.api.inventorySchoolProductsPartialUpdate(
            product.id,
            fd as unknown as PatchedSchoolProductUpdateMultipart
          )
        } else {
          await apiClient.api.inventoryProductsPartialUpdate(
            product.id,
            fd as unknown as PatchedProductUpdateMultipart
          )
        }
        toast.success(t('inventory.updateSuccess'))
        navigate(detailTarget)
      } else {
        if (isSchool) {
          await apiClient.api.inventorySchoolProductsCreate(
            fd as unknown as SchoolProductCreateMultipart
          )
        } else {
          await apiClient.api.inventoryProductsCreate(
            fd as unknown as ProductCreateMultipart
          )
        }
        toast.success(t('inventory.createSuccess'))
        navigate(backTarget)
      }
    } catch (err) {
      const errorKey = isEdit ? 'inventory.updateError' : 'inventory.createError'
      toast.error(parseApiError(err, t, errorKey) ?? t(errorKey))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    navigate(isEdit ? detailTarget : backTarget)
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
        <Button
          variant="outline"
          onClick={() => navigate(isEdit ? detailTarget : backTarget)}
        >
          {t('marketplace.back')}
        </Button>
        <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
          {submitLabel}
        </Button>
      </div>
    </>
  )

  return (
    <PageLayout footer={footerContent}>
      <div className={PAGE_CONTENT}>
        <PageHeader title={headerTitle} backTo={detailTarget} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Main Column */}
          <div className="flex flex-col gap-6">
            {/* Product Information */}
            <CardSection title={t('marketplace.productInfo')}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('marketplace.productName')}</Label>
                  <Input
                    id="name"
                    placeholder={t('marketplace.productNamePlaceholder')}
                    className="mt-1.5"
                    {...register('name')}
                  />
                </div>

                <div>
                  <Label htmlFor="description">
                    {t('marketplace.productDescription')}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={t('marketplace.productDescriptionPlaceholder')}
                    rows={3}
                    className="mt-1.5"
                    {...register('description')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">{t('marketplace.category')}</Label>
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

            {/* Variants (shared editor) */}
            <VariantsSection
              variants={variants}
              onChange={setVariants}
              colors={colors}
              categorySizeSystems={categorySizeSystems}
              categoryId={categoryId}
              mediaFiles={mediaFiles}
            />

            {/* School Details — only for school context */}
            {isSchool && (
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
            )}
          </div>

          {/* Side Column */}
          <div className="flex flex-col gap-6">
            {/* Status */}
            <CardSection title={t('inventory.productDetails')}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">{t('marketplace.status')}</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="status" className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {t(s.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </CardSection>

            {/* Summary */}
            <CardSection title={t('marketplace.summary')}>
              <div className="space-y-3">
                <SummaryRow
                  label={t('marketplace.productName')}
                  value={productName || undefined}
                />
                <SummaryRow
                  label={t('marketplace.category')}
                  value={categoryId ? findCategoryName(categoryId) : undefined}
                />
                <SummaryRow
                  label={t('marketplace.status')}
                  value={
                    status
                      ? t(
                          PRODUCT_STATUSES.find((s) => s.value === status)
                            ?.labelKey ?? ''
                        )
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
              </div>
            </CardSection>
          </div>
        </div>
      </div>

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
