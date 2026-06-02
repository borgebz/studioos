/**
 * Shared variant model + helpers used by the product and listing forms and the
 * VariantsSection editor. Kept separate from the component file so it can export
 * non-component values without tripping react-refresh.
 */
import {
  AcquisitionTypeEnum,
  ConditionEnum,
  ProductVariantStatusEnum,
} from '@/api/studioos-api'
import { enumOptions } from '@/lib/enum-options'
import { format } from 'date-fns'
import type { SizeSystem } from '@/api/studioos-api'

export interface VariantData {
  id: string
  condition: string
  acquisitionType: string
  status: string
  acquiredAt: string
  askingPrice: string
  sku: string
  sizeSystemId: string
  sizeId: string
  selectedColorIds: number[]
  selectedMediaIds: string[]
  internalNotes: string
  publicNotes: string
}

/** Structural shape shared by ProductVariantRead and ListingVariant — the
 * fields the editor needs to prefill from a saved variant. */
export interface ReadVariantLike {
  id: number
  condition?: string | null
  acquisition_type?: string | null
  status?: string | null
  acquired_at?: string | null
  asking_price?: string | null
  sku?: string | null
  size?: { id: number } | null
  colors?: { id?: number }[]
  media?: { id?: number }[]
  internal_notes?: string | null
  public_notes?: string | null
}

export const CONDITIONS = enumOptions(ConditionEnum, 'marketplace.condition')
export const ACQUISITION_TYPES = enumOptions(
  AcquisitionTypeEnum,
  'marketplace.acquisition'
)
// Authors only set available / maintenance / inactive from the UI; the rest
// (sold, donated, archived) are reached through domain events.
export const VARIANT_STATUSES = enumOptions(
  ProductVariantStatusEnum,
  'marketplace.variantStatus'
).filter(
  (o) =>
    o.value === 'available' ||
    o.value === 'maintenance' ||
    o.value === 'inactive'
)

export function todayISO(): string {
  // Local calendar day — toISOString() is UTC and would return "yesterday"
  // when the form opens between midnight and the UTC offset.
  return format(new Date(), 'yyyy-MM-dd')
}

export function createVariant(): VariantData {
  return {
    id: `variant-${crypto.randomUUID()}`,
    condition: 'good',
    acquisitionType: '',
    status: 'available',
    acquiredAt: todayISO(),
    askingPrice: '',
    sku: '',
    sizeSystemId: '',
    sizeId: '',
    selectedColorIds: [],
    selectedMediaIds: [],
    internalNotes: '',
    publicNotes: '',
  }
}

/** Existing (server-side) variants keep their numeric id as a string; new ones
 * get a `variant-` prefix so submit paths can tell them apart. */
export function isExistingVariant(v: VariantData): boolean {
  return !v.id.startsWith('variant-')
}

/** Find which size system (among the category's) owns a given size id. */
export function resolveSizeSystemId(
  sizeSystems: SizeSystem[],
  sizeId: number | null | undefined
): string {
  if (!sizeId) return ''
  for (const ss of sizeSystems) {
    if (ss.sizes?.some((s) => s.id === sizeId)) return String(ss.id)
  }
  return ''
}

/** Map a read variant (from the API) into the editable VariantData shape. */
export function mapReadVariantToData(
  v: ReadVariantLike,
  sizeSystems: SizeSystem[]
): VariantData {
  const sizeId = v.size?.id ?? null
  return {
    id: String(v.id),
    condition: v.condition ?? 'good',
    acquisitionType: v.acquisition_type ?? '',
    status: v.status ?? 'available',
    acquiredAt: v.acquired_at ?? todayISO(),
    askingPrice: v.asking_price ?? '',
    sku: v.sku ?? '',
    sizeSystemId: resolveSizeSystemId(sizeSystems, sizeId),
    sizeId: sizeId ? String(sizeId) : '',
    selectedColorIds: (v.colors ?? [])
      .map((c) => c.id)
      .filter((id): id is number => typeof id === 'number'),
    selectedMediaIds: (v.media ?? [])
      .map((m) => m.id)
      .filter((id): id is number => typeof id === 'number')
      .map(String),
    internalNotes: v.internal_notes ?? '',
    publicNotes: v.public_notes ?? '',
  }
}

/** Fill in `sizeSystemId` for any variant that has a size but no resolved
 * system yet (used after the category's size systems finish loading). */
export function resolveVariantSizeSystems(
  variants: VariantData[],
  sizeSystems: SizeSystem[]
): VariantData[] {
  let changed = false
  const next = variants.map((v) => {
    if (v.sizeSystemId || !v.sizeId) return v
    const resolved = resolveSizeSystemId(sizeSystems, Number(v.sizeId))
    if (!resolved) return v
    changed = true
    return { ...v, sizeSystemId: resolved }
  })
  return changed ? next : variants
}

export function getVariantSummaryParts(
  v: VariantData,
  t: (key: string, opts?: Record<string, unknown>) => string,
  sizeSystems: SizeSystem[]
): string[] {
  const parts: string[] = []
  const cond = CONDITIONS.find((c) => c.value === v.condition)
  if (cond) parts.push(t(cond.labelKey))
  if (v.sizeId) {
    const ss = sizeSystems.find((s) => s.id === Number(v.sizeSystemId))
    const size = ss?.sizes?.find((s) => s.id === Number(v.sizeId))
    if (size) parts.push(size.name)
  }
  if (v.selectedColorIds.length > 0) {
    parts.push(t('marketplace.colorCount', { count: v.selectedColorIds.length }))
  }
  return parts
}
