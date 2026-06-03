import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { toast } from 'sonner'
import { CalendarClock, Loader2, Search, Star, XCircle } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  BookingTypeEnum,
  ProductVariantRead,
  SchoolBookingRow,
  VariantBooking,
  VariantBookingStatusEnum,
  VariantBookingWrite,
} from '@/api/studioos-api'
import { BookingTypeEnum as BookingTypeEnumValue } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/shared/DatePicker'
import { TimePicker } from '@/components/shared/TimePicker'
import {
  WeekStripCalendar,
  type WeekStripBand,
  type WeekStripLegendEntry,
} from '@/components/shared/WeekStripCalendar'
import { parseApiError } from '@/lib/api-errors'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

import {
  bookingTypeLabel,
  BOOKING_TYPE_VALUES,
} from './booking-helpers'

interface BookingDialogProps {
  open: boolean
  editingId: number | null
  onClose: () => void
  onSaved: () => void
}

interface VariantPick {
  variantId: number
  productId: number
  label: string
}

function isoFromDateAndTime(date: Date, hhmm: string): string {
  const [h, m] = hhmm.split(':').map((s) => Number(s) || 0)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function timeOnly(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function BookingDialog({
  open,
  editingId,
  onClose,
  onSaved,
}: BookingDialogProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const isEdit = editingId != null

  // Form state
  const [pickedVariant, setPickedVariant] = useState<VariantPick | null>(null)
  const [type, setType] = useState<BookingTypeEnum>(
    BookingTypeEnumValue.Reservation
  )
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [startTime, setStartTime] = useState('10:00')
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState('18:00')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

  // Existing bookings for the picked variant — fed into the WeekStripCalendar
  // so the user can see when the item is already taken before locking dates.
  const [variantBookings, setVariantBookings] = useState<VariantBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const [submitting, setSubmitting] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset / hydrate on open
  useEffect(() => {
    if (!open) return
    setError(null)
    if (!isEdit) {
      setPickedVariant(null)
      setType(BookingTypeEnumValue.Reservation)
      setStartDate(null)
      setStartTime('10:00')
      setEndDate(null)
      setEndTime('18:00')
      setTitle('')
      setNotes('')
      return
    }
    // Edit mode: fetch the booking detail; also fetch the variant + product
    // so we can show "Product · size · color" in the picker slot.
    setLoadingDetail(true)
    apiClient.api
      .inventoryBookingsRetrieve(editingId)
      .then(async (res) => {
        const b = res.data
        if (!b) return
        setType(b.booking_type)
        setTitle(b.title ?? '')
        setNotes(b.notes ?? '')
        const s = new Date(b.start_at)
        const e = new Date(b.end_at)
        setStartDate(s)
        setStartTime(timeOnly(b.start_at))
        setEndDate(e)
        setEndTime(timeOnly(b.end_at))
        // Position the calendar on the week containing the edited booking.
        setWeekStart(startOfWeek(s))

        // Reconstruct a picker label so the user can see what they're editing.
        try {
          const vRes = await apiClient.api.inventoryVariantsRetrieve(b.variant)
          const v: ProductVariantRead | undefined = vRes.data ?? undefined
          // Variant doesn't carry product info; the booking row already has it,
          // so as a heuristic fall back to "Variant #id" if we can't resolve.
          setPickedVariant({
            variantId: b.variant,
            productId: 0,
            label: v?.sku
              ? `${t('inventoryBookings.dialog.variantLabel')} · ${v.sku}`
              : `${t('inventoryBookings.dialog.variantLabel')} #${b.variant}`,
          })
        } catch {
          setPickedVariant({
            variantId: b.variant,
            productId: 0,
            label: `${t('inventoryBookings.dialog.variantLabel')} #${b.variant}`,
          })
        }
      })
      .catch((err) => {
        setError(parseApiError(err, t) ?? t('common.unexpectedError'))
      })
      .finally(() => setLoadingDetail(false))
  }, [open, isEdit, editingId, t])

  // Fetch the variant's existing bookings whenever the picked variant changes.
  // Filtered client-side per visible week — the list endpoint returns all rows.
  useEffect(() => {
    if (!open || !pickedVariant) {
      setVariantBookings([])
      return
    }
    setBookingsLoading(true)
    apiClient.api
      .inventoryVariantsBookingsRetrieve(pickedVariant.variantId)
      .then((res) => {
        setVariantBookings(res.data?.results ?? [])
      })
      .catch(() => setVariantBookings([]))
      .finally(() => setBookingsLoading(false))
  }, [open, pickedVariant])

  // Current-slot overlay reflecting the user's in-progress date+time selection.
  const currentSlot = useMemo(() => {
    if (!startDate || !endDate) return null
    const s = new Date(startDate)
    const [sh, sm] = startTime.split(':').map(Number)
    s.setHours(sh ?? 0, sm ?? 0, 0, 0)
    const e = new Date(endDate)
    const [eh, em] = endTime.split(':').map(Number)
    e.setHours(eh ?? 0, em ?? 0, 0, 0)
    if (e <= s) return null
    return { start: s, end: e }
  }, [startDate, startTime, endDate, endTime])

  // Map bookings → bands. Cancelled rows are ignored. The booking being edited
  // is excluded so it doesn't show up as a conflict against itself.
  const calendarBands: WeekStripBand[] = useMemo(() => {
    const result: WeekStripBand[] = []
    for (const b of variantBookings) {
      if (editingId != null && b.id === editingId) continue
      if (b.status === 'cancelled') continue
      const start = new Date(b.start_at)
      const end = new Date(b.end_at)
      // For multi-day bookings, render one band per overlapped day so the user
      // can see the full span across the week strip.
      const cursor = new Date(start)
      cursor.setHours(0, 0, 0, 0)
      const lastDay = new Date(end)
      lastDay.setHours(0, 0, 0, 0)
      while (cursor <= lastDay) {
        const dayStart = new Date(cursor)
        const dayEnd = new Date(cursor)
        dayEnd.setHours(23, 59, 59, 999)
        const segStart = start > dayStart ? start : dayStart
        const segEnd = end < dayEnd ? end : dayEnd
        result.push({
          id: `vb-${b.id}-${format(cursor, 'yyyy-MM-dd')}`,
          variant: 'negative',
          icon: <XCircle className="h-3 w-3" />,
          label: bookingTypeLabel(t, b.booking_type),
          start: segStart,
          end: segEnd,
          subtitle: b.title || null,
          popoverContent: (
            <>
              <p className="font-medium mb-1 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                {bookingTypeLabel(t, b.booking_type)}
              </p>
              <div className="space-y-1 text-muted-foreground">
                <p>
                  {format(start, 'EEE dd MMM, HH:mm')}–{format(end, 'HH:mm')}
                </p>
                {b.title && <p className="font-medium">{b.title}</p>}
              </div>
            </>
          ),
        })
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    if (currentSlot) {
      result.push({
        id: 'current-slot',
        variant: 'highlight',
        icon: <Star className="h-3 w-3" />,
        label: t('inventoryBookings.dialog.yourSlot'),
        start: currentSlot.start,
        end: currentSlot.end,
      })
    }
    return result
  }, [variantBookings, editingId, currentSlot, t])

  const calendarLegend: WeekStripLegendEntry[] = useMemo(() => {
    const items: WeekStripLegendEntry[] = [
      {
        variant: 'negative',
        icon: <XCircle className="h-3 w-3" />,
        label: t('inventoryBookings.dialog.legendBooked'),
      },
    ]
    if (currentSlot) {
      items.push({
        variant: 'highlight',
        icon: <Star className="h-3 w-3" />,
        label: t('inventoryBookings.dialog.yourSlot'),
      })
    }
    return items
  }, [currentSlot, t])

  const validate = (): string | null => {
    if (!pickedVariant) return t('inventoryBookings.errors.variantRequired')
    if (!startDate) return t('inventoryBookings.errors.startRequired')
    if (!endDate) return t('inventoryBookings.errors.endRequired')
    const startIso = isoFromDateAndTime(startDate, startTime)
    const endIso = isoFromDateAndTime(endDate, endTime)
    if (startIso >= endIso) return t('inventoryBookings.errors.startBeforeEnd')
    if (!title.trim()) return t('inventoryBookings.errors.titleRequired')
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const payload: VariantBookingWrite = {
        booking_type: type,
        start_at: isoFromDateAndTime(startDate!, startTime),
        end_at: isoFromDateAndTime(endDate!, endTime),
        title: title.trim(),
        notes: notes.trim(),
      }

      if (!isEdit && pickedVariant) {
        await apiClient.api.inventoryVariantsBookingsCreate(
          pickedVariant.variantId,
          payload
        )
        toast.success(t('inventoryBookings.saveSuccess'))
        onSaved()
      } else if (isEdit && editingId != null) {
        await apiClient.api.inventoryBookingsPartialUpdate(editingId, payload)
        toast.success(t('inventoryBookings.saveSuccess'))
        onSaved()
      }
    } catch (err) {
      setError(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) onClose()
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('inventoryBookings.dialog.editTitle')
              : t('inventoryBookings.dialog.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('inventoryBookings.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        {loadingDetail ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            <Loader2 className="inline size-4 animate-spin" />
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">
                {t('inventoryBookings.dialog.variantLabel')}{' '}
                <span className="text-destructive">*</span>
              </Label>
              <VariantPicker
                pickedLabel={pickedVariant?.label ?? null}
                disabled={isEdit}
                onPick={(v) => setPickedVariant(v)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">
                  {t('inventoryBookings.dialog.typeLabel')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as BookingTypeEnum)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKING_TYPE_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {bookingTypeLabel(t, v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="booking-title" className="mb-1.5 block">
                  {t('inventoryBookings.dialog.titleLabel')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="booking-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('inventoryBookings.dialog.titlePlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">
                  {t('inventoryBookings.dialog.startDate')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={startDate ?? undefined}
                  onChange={(d) => setStartDate(d ?? null)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">
                  {t('inventoryBookings.dialog.startTime')}
                </Label>
                <TimePicker value={startTime} onChange={setStartTime} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">
                  {t('inventoryBookings.dialog.endDate')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={endDate ?? undefined}
                  onChange={(d) => setEndDate(d ?? null)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">
                  {t('inventoryBookings.dialog.endTime')}
                </Label>
                <TimePicker value={endTime} onChange={setEndTime} />
              </div>
            </div>

            {pickedVariant && (
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">
                    {t('inventoryBookings.dialog.existingBookingsTitle')}
                  </h4>
                </div>
                <WeekStripCalendar
                  weekStart={weekStart}
                  onWeekChange={setWeekStart}
                  bands={calendarBands}
                  legend={calendarLegend}
                  loading={bookingsLoading}
                  emptyMessage={t('inventoryBookings.dialog.noExistingBookings')}
                  dayFreeMessage={t('inventoryBookings.dialog.dayFree')}
                  locale={dateLocale}
                />
              </div>
            )}

            <div>
              <Label htmlFor="booking-notes" className="mb-1.5 block">
                {t('inventoryBookings.dialog.notesLabel')}
              </Label>
              <Textarea
                id="booking-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('inventoryBookings.dialog.notesPlaceholder')}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loadingDetail}
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Variant picker ───────────────────────────────────────────────────────
//
// School products are paginated and each has its own variants. To keep
// V1 simple this picker shows a "product search → variant picker" flow:
// (1) type to search school products, (2) tap a product to load its variants,
// (3) tap a variant to confirm. Coordination usually books a specific item so
// a flat global variant list isn't necessary here.

interface VariantPickerProps {
  pickedLabel: string | null
  disabled?: boolean
  onPick: (v: VariantPick) => void
}

function VariantPicker({ pickedLabel, disabled, onPick }: VariantPickerProps) {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 250)
  const [products, setProducts] = useState<
    { id: number; name: string }[]
  >([])
  const [variantsByProduct, setVariantsByProduct] = useState<
    Map<number, ProductVariantRead[]>
  >(new Map())
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products.slice(0, 20)
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 20)
  }, [products, search])

  useEffect(() => {
    if (disabled || pickedLabel || products.length > 0) return
    setLoading(true)
    apiClient.api
      .inventorySchoolProductsRetrieve({})
      .then((res) => {
        const arr = res.data?.results ?? []
        setProducts(arr.map((p) => ({ id: p.id, name: p.name })))
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [disabled, pickedLabel, products.length])

  const loadVariants = async (productId: number) => {
    if (variantsByProduct.has(productId)) return
    try {
      const res =
        await apiClient.api.inventoryProductsVariantsRetrieve(productId)
      const list = res.data?.results ?? []
      setVariantsByProduct((prev) => {
        const next = new Map(prev)
        next.set(productId, list)
        return next
      })
    } catch {
      // ignore — selecting again will retry
    }
  }

  if (disabled || pickedLabel) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
        {pickedLabel ?? t('inventoryBookings.dialog.variantPickerEmpty')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('inventoryBookings.dialog.variantSearchPlaceholder')}
          className="pl-9"
          autoFocus
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border border-border">
        {loading && (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            {t('inventoryBookings.dialog.variantNoMatches')}
          </div>
        )}
        {!loading &&
          filtered.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              variants={variantsByProduct.get(p.id) ?? null}
              onExpand={() => loadVariants(p.id)}
              onPick={(variantId, label) =>
                onPick({
                  variantId,
                  productId: p.id,
                  label: `${p.name} · ${label}`,
                })
              }
            />
          ))}
      </div>
    </div>
  )
}

function ProductRow({
  product,
  variants,
  onExpand,
  onPick,
}: {
  product: { id: number; name: string }
  variants: ProductVariantRead[] | null
  onExpand: () => void
  onPick: (variantId: number, label: string) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const handleToggle = () => {
    if (!open && variants === null) onExpand()
    setOpen((prev) => !prev)
  }

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent/40"
        onClick={handleToggle}
      >
        <span className="font-medium">{product.name}</span>
        <span className="text-xs text-muted-foreground">
          {open
            ? t('inventoryBookings.dialog.hide')
            : t('inventoryBookings.dialog.show')}
        </span>
      </button>
      {open && (
        <div className="border-t border-border bg-muted/20">
          {variants === null ? (
            <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : variants.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {t('inventoryBookings.dialog.noVariants')}
            </div>
          ) : (
            variants.map((v) => {
              const size = v.size?.name ?? '—'
              const sku = v.sku ? ` · ${v.sku}` : ''
              const label = `${size}${sku}`
              return (
                <button
                  key={v.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent/60"
                  onClick={() => onPick(v.id, label)}
                >
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {v.status}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// Silence unused-var lint if the status import stays referenced through enum values only.
void ({} as VariantBookingStatusEnum)
void ({} as SchoolBookingRow)
