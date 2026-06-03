/**
 * VariantsSection — the shared variant editor used by both the product form
 * (inventory) and the listing form (marketplace).
 *
 * Owns the variant list (with photo thumbnail + summary), the add/edit Sheet
 * with the full field set (condition, status, acquisition, acquired date,
 * asking price, sku, size, colors, photo selection, public/internal notes),
 * and the delete confirmation. Parent components keep the `variants` array in
 * their own state and map it to their API payload on submit.
 */
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Plus, Pencil, Trash2, Info, ImageIcon, Check, CalendarClock } from 'lucide-react'

import { type Color, type SizeSystem } from '@/api/studioos-api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { CardSection } from '@/components/shared/CardSection'
import { ColorSwatchPicker } from '@/components/shared/ColorSwatchPicker'
import { DatePicker } from '@/components/shared/DatePicker'
import type { MediaFile } from '@/components/shared/MediaUpload'
import {
  CONDITIONS,
  ACQUISITION_TYPES,
  VARIANT_STATUSES,
  createVariant,
  isExistingVariant,
  getVariantSummaryParts,
  type VariantData,
} from '@/components/shared/variant-data'

// The variant model + helpers live in ./variant-data so forms can import them
// without pulling in this component.

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface VariantsSectionProps {
  variants: VariantData[]
  onChange: (variants: VariantData[]) => void
  colors: Color[]
  categorySizeSystems: SizeSystem[]
  categoryId: string
  mediaFiles: MediaFile[]
  /** When provided, saved variants show a "view bookings" action (listings). */
  onViewBookings?: (variantId: number) => void
}

export function VariantsSection({
  variants,
  onChange,
  colors,
  categorySizeSystems,
  categoryId,
  mediaFiles,
  onViewBookings,
}: VariantsSectionProps) {
  const { t } = useTranslation()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<VariantData | null>(null)
  const [draft, setDraft] = useState<VariantData>(createVariant())
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null)

  const hasSingleSizeSystem = categorySizeSystems.length === 1

  const openAddVariant = useCallback(() => {
    setEditingVariant(null)
    const fresh = createVariant()
    // Pre-select the only size system so the user goes straight to picking a size.
    if (hasSingleSizeSystem) {
      fresh.sizeSystemId = String(categorySizeSystems[0].id)
    }
    setDraft(fresh)
    setSheetOpen(true)
  }, [hasSingleSizeSystem, categorySizeSystems])

  const openEditVariant = useCallback((v: VariantData) => {
    setEditingVariant(v)
    setDraft({ ...v })
    setSheetOpen(true)
  }, [])

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

  const saveVariant = useCallback(() => {
    if (editingVariant) {
      onChange(
        variants.map((v) => (v.id === editingVariant.id ? { ...draft } : v))
      )
    } else {
      onChange([...variants, { ...draft }])
    }
    setSheetOpen(false)
  }, [editingVariant, draft, variants, onChange])

  const confirmDeleteVariant = useCallback(() => {
    if (deleteVariantId) {
      onChange(variants.filter((v) => v.id !== deleteVariantId))
      setDeleteVariantId(null)
    }
  }, [deleteVariantId, variants, onChange])

  const draftSizeSystem = categorySizeSystems.find(
    (ss) => ss.id === Number(draft.sizeSystemId)
  )
  const draftAvailableSizes = draftSizeSystem?.sizes ?? []

  return (
    <>
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
                const parts = getVariantSummaryParts(
                  variant,
                  t,
                  categorySizeSystems
                )
                const variantMedia = mediaFiles.filter((m) =>
                  variant.selectedMediaIds.includes(m.id)
                )
                const thumbUrl = variantMedia[0]?.url
                const savedVariantId = Number(variant.id)
                const hasSavedVariant = isExistingVariant(variant)

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
                        {t('marketplace.variant', { number: index + 1 })}
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
                      {onViewBookings && hasSavedVariant && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0"
                          aria-label={t('marketplace.viewBookings')}
                          onClick={() => onViewBookings(savedVariantId)}
                        >
                          <CalendarClock className="h-4 w-4" />
                        </Button>
                      )}
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
              {t('marketplace.variantSheetDesc')}
            </SheetDescription>
          </SheetHeader>

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
                        draft.acquiredAt ? new Date(draft.acquiredAt) : undefined
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="variant-sku">{t('marketplace.sku')}</Label>
                    <Input
                      id="variant-sku"
                      value={draft.sku}
                      onChange={(e) => updateDraft({ sku: e.target.value })}
                      placeholder={t('marketplace.skuPlaceholder')}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="variant-asking-price">
                      {t('marketplace.askingPrice')}
                    </Label>
                    <Input
                      id="variant-asking-price"
                      type="number"
                      inputMode="decimal"
                      value={draft.askingPrice}
                      onChange={(e) =>
                        updateDraft({ askingPrice: e.target.value })
                      }
                      placeholder="0.00"
                      className="mt-1.5"
                    />
                  </div>
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

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteVariantId}
        onOpenChange={() => setDeleteVariantId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('marketplace.removeVariant')}</AlertDialogTitle>
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
    </>
  )
}
