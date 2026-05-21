import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, Plus, Pencil, Info } from 'lucide-react'
import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type {
  Category,
  Color,
  SizeSystem,
  ProductCreate,
  SchoolProductCreate,
  InlineVariant,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { CardSection } from '@/components/shared/CardSection'
import { ColorSwatchPicker } from '@/components/shared/ColorSwatchPicker'
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
  context: ProductFormContext
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONDITIONS = [
  { value: 'new', labelKey: 'marketplace.conditionNew' },
  { value: 'excellent', labelKey: 'marketplace.conditionExcellent' },
  { value: 'good', labelKey: 'marketplace.conditionGood' },
  { value: 'fair', labelKey: 'marketplace.conditionFair' },
  { value: 'damaged', labelKey: 'marketplace.conditionDamaged' },
]

const ACQUISITION_TYPES = [
  { value: 'purchased', labelKey: 'marketplace.acquisitionPurchased' },
  { value: 'donated', labelKey: 'marketplace.acquisitionDonated' },
  { value: 'school_owned', labelKey: 'marketplace.acquisitionSchoolOwned' },
  { value: 'other', labelKey: 'marketplace.acquisitionOther' },
]

const GENDERS = [
  { value: 'female', labelKey: 'marketplace.genderFemale' },
  { value: 'male', labelKey: 'marketplace.genderMale' },
  { value: 'unisex', labelKey: 'marketplace.genderUnisex' },
]

const PRODUCT_STATUSES = [
  { value: 'active', labelKey: 'schoolInventory.statusActive' },
  { value: 'inactive', labelKey: 'schoolInventory.statusInactive' },
  { value: 'archived', labelKey: 'schoolInventory.statusArchived' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface VariantData {
  id: string
  condition: string
  acquisitionType: string
  sku: string
  sizeSystemId: string
  sizeId: string
  selectedColorIds: number[]
  notes: string
}

let variantCounter = 0
function createVariant(): VariantData {
  return {
    id: `variant-${Date.now()}-${variantCounter++}`,
    condition: 'good',
    acquisitionType: '',
    sku: '',
    sizeSystemId: '',
    sizeId: '',
    selectedColorIds: [],
    notes: '',
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductForm({ context }: ProductFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const isSchool = context === 'school'
  const backTarget = isSchool ? paths.schoolInventory : paths.myInventory
  const headerTitle = t('inventory.createTitle')
  const submitLabel = t('inventory.createProduct')

  // Reference data
  const [categories, setCategories] = useState<Category[]>([])
  const [colors, setColors] = useState<Color[]>([])

  // Non-form state
  const [variants, setVariants] = useState<VariantData[]>([])
  const [discardOpen, setDiscardOpen] = useState(false)
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<VariantData | null>(null)
  const [draft, setDraft] = useState<VariantData>(createVariant())

  const { register, handleSubmit, control, watch } =
    useForm<CreateProductFormValues>({
      resolver: zodResolver(createProductSchema),
      defaultValues: defaultProductValues,
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

  const categorySizeSystems: SizeSystem[] = useMemo(() => {
    if (!categoryId) return []
    for (const c of categories) {
      if (c.id === Number(categoryId))
        return (c.size_systems as SizeSystem[]) ?? []
      const sub = (c.subcategories as Category[]).find(
        (s) => s.id === Number(categoryId),
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
          (s) => s.id === Number(id),
        )
        if (sub) return sub.name
      }
      return undefined
    },
    [categories],
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
        prev.map((v) => (v.id === editingVariant.id ? { ...draft } : v)),
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

  const getVariantSummaryParts = useCallback(
    (v: VariantData): string[] => {
      const parts: string[] = []
      const cond = CONDITIONS.find((c) => c.value === v.condition)
      if (cond) parts.push(t(cond.labelKey))
      if (v.sizeId) {
        const ss = categorySizeSystems.find(
          (s) => s.id === Number(v.sizeSystemId),
        )
        const size = ss?.sizes?.find((s) => s.id === Number(v.sizeId))
        if (size) parts.push(size.name)
      }
      if (v.selectedColorIds.length > 0) {
        parts.push(
          t('marketplace.colorCount', { count: v.selectedColorIds.length }),
        )
      }
      return parts
    },
    [t, categorySizeSystems],
  )

  const onSubmit = async (data: CreateProductFormValues) => {
    setIsSaving(true)

    try {
      const inlineVariants: InlineVariant[] = variants.map((v) => ({
        condition: v.condition,
        acquisition_type: v.acquisitionType || undefined,
        sku: v.sku || null,
        size_id: v.sizeId ? Number(v.sizeId) : null,
        color_ids: v.selectedColorIds,
        notes: v.notes || '',
      }))

      const basePayload = {
        name: data.name,
        description: data.description,
        category_id: data.category_id ? Number(data.category_id) : undefined,
        target_gender: data.target_gender || null,
        brand: data.brand || null,
        material: data.material || null,
        status: (data.status || 'active') as ProductCreate['status'],
        variants: inlineVariants,
      }

      if (isSchool) {
        const payload: SchoolProductCreate = {
          ...basePayload,
          ...(data.inventory_code || data.storage_location || data.school_notes
            ? {
                school_details: {
                  inventory_code: data.inventory_code || undefined,
                  storage_location: data.storage_location || undefined,
                  notes: data.school_notes || undefined,
                },
              }
            : {}),
        }
        await apiClient.api.inventorySchoolProductsCreate(payload)
      } else {
        const payload: ProductCreate = basePayload
        await apiClient.api.inventoryProductsCreate(payload)
      }

      toast.success(t('inventory.createSuccess'))
      navigate(backTarget)
    } catch (err) {
      toast.error(
        parseApiError(err, t, 'inventory.createError') ??
          t('inventory.createError'),
      )
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
    (ss) => ss.id === Number(draft.sizeSystemId),
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
                        <Select value={field.value} onValueChange={field.onChange}>
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

                      return (
                        <div
                          key={variant.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
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
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
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
                            ?.labelKey ?? '',
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

      {/* Variant Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          className="sm:max-w-lg p-0 flex flex-col gap-0"
          showCloseButton={false}
        >
          <SheetHeader className="px-6 py-5 border-b border-border shrink-0">
            <SheetTitle>
              {editingVariant
                ? t('marketplace.editVariant')
                : t('marketplace.addVariant')}
            </SheetTitle>
            <SheetDescription>
              {t('inventory.variantSheetDesc')}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-6 space-y-6">
              {/* ── Condition & Details ── */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
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
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
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
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
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

              {/* ── Notes ── */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  {t('marketplace.variantNotes')}
                </p>
                <Textarea
                  id="variant-notes"
                  value={draft.notes}
                  onChange={(e) => updateDraft({ notes: e.target.value })}
                  placeholder={t('marketplace.variantNotesPlaceholder')}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="shrink-0 border-t border-border bg-background px-6 py-4 flex flex-row items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              {t('marketplace.cancel')}
            </Button>
            <Button onClick={saveVariant}>
              {editingVariant
                ? t('marketplace.saveVariant')
                : t('marketplace.addVariant')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
