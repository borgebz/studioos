import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Repeat } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  Availability,
  AvailabilitySubmit,
  Modality,
  PatchedAvailabilityUpdate,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { DatePicker } from '@/components/shared/DatePicker'
import { TimePicker } from '@/components/shared/TimePicker'
import { parseApiError } from '@/lib/api-errors'

const ANY_MODALITY = '__any__'

// Weekday encoding matches the backend: 0=Mon, …, 6=Sun.
const WEEKDAYS: { value: number; labelKey: string }[] = [
  { value: 0, labelKey: 'availability.weekday.mon' },
  { value: 1, labelKey: 'availability.weekday.tue' },
  { value: 2, labelKey: 'availability.weekday.wed' },
  { value: 3, labelKey: 'availability.weekday.thu' },
  { value: 4, labelKey: 'availability.weekday.fri' },
  { value: 5, labelKey: 'availability.weekday.sat' },
  { value: 6, labelKey: 'availability.weekday.sun' },
]

function isoFromDateAndTime(date: Date, hhmm: string): string {
  const [h, m] = hhmm.split(':').map((s) => Number(s) || 0)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function dateOnlyIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateOnly(s: string | undefined | null): Date | null {
  if (!s) return null
  const [y, mo, d] = s.split('-').map((v) => Number(v))
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d))
    return null
  return new Date(y, mo - 1, d)
}

function timeOnly(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`
}

interface AvailabilityDialogProps {
  open: boolean
  userId: number
  /** Existing parent Availability id when editing; null for create. */
  editingId: number | null
  /** Whether the edit target is a recurring rule (pre-locks mode). */
  editingIsRecurring: boolean
  modalities: Modality[]
  onClose: () => void
  onSaved: (saved: Availability, mode: 'create' | 'edit') => void
}

export function AvailabilityDialog({
  open,
  userId,
  editingId,
  editingIsRecurring,
  modalities,
  onClose,
  onSaved,
}: AvailabilityDialogProps) {
  const { t } = useTranslation()

  const isEdit = editingId != null

  // Mode toggle — on edit we lock to whatever the record is.
  const [isRecurring, setIsRecurring] = useState(false)

  // Shared fields
  const [modalityId, setModalityId] = useState<string>(ANY_MODALITY)
  const [notes, setNotes] = useState('')

  // One-off fields
  const [date, setDate] = useState<Date | null>(null)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')

  // Recurring fields
  const [days, setDays] = useState<number[]>([])
  const [validFrom, setValidFrom] = useState<Date | null>(null)
  const [validUntil, setValidUntil] = useState<Date | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Reset state when opening / closing.
  useEffect(() => {
    if (!open) return
    if (!isEdit) {
      setIsRecurring(false)
      setModalityId(ANY_MODALITY)
      setNotes('')
      setDate(null)
      setStartTime('09:00')
      setEndTime('11:00')
      setDays([])
      setValidFrom(null)
      setValidUntil(null)
      setError(null)
      return
    }
    // Edit mode: fetch the parent Availability so we render its full data.
    setLoadingDetail(true)
    setError(null)
    apiClient.api
      .availabilityTeachersRetrieve(editingId, userId)
      .then((res) => {
        const a = res.data
        if (!a) return
        setIsRecurring(editingIsRecurring)
        setModalityId(a.modality ? String(a.modality.id) : ANY_MODALITY)
        setNotes(a.notes ?? '')
        if (editingIsRecurring && a.recurring) {
          const r = a.recurring
          setDays(
            r.days_of_week
              .split(',')
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isFinite(n))
          )
          setStartTime(r.start_time.slice(0, 5))
          setEndTime(r.end_time.slice(0, 5))
          setValidFrom(parseDateOnly(r.valid_from))
          setValidUntil(parseDateOnly(r.valid_until ?? null))
        } else {
          const d = new Date(a.start_datetime)
          setDate(d)
          setStartTime(timeOnly(a.start_datetime))
          setEndTime(timeOnly(a.end_datetime))
        }
      })
      .catch((err) => {
        setError(parseApiError(err, t) ?? t('common.unexpectedError'))
      })
      .finally(() => setLoadingDetail(false))
  }, [open, isEdit, editingId, editingIsRecurring, userId, t])

  const toggleDay = (d: number) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    )
  }

  const validate = (): string | null => {
    if (isRecurring) {
      if (days.length === 0) return t('availability.errors.daysRequired')
      if (!startTime || !endTime) return t('availability.errors.timeRequired')
      if (startTime >= endTime)
        return t('availability.errors.startBeforeEnd')
      if (!validFrom) return t('availability.errors.fromRequired')
      if (validUntil && dateOnlyIso(validUntil) < dateOnlyIso(validFrom))
        return t('availability.errors.untilAfterFrom')
    } else {
      if (!date) return t('availability.errors.dateRequired')
      if (!startTime || !endTime) return t('availability.errors.timeRequired')
      if (startTime >= endTime)
        return t('availability.errors.startBeforeEnd')
    }
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
      // Builders for the two payload shapes.
      const buildOneOff = (): AvailabilitySubmit => ({
        start_datetime: isoFromDateAndTime(date!, startTime),
        end_datetime: isoFromDateAndTime(date!, endTime),
        modality_id:
          modalityId === ANY_MODALITY ? null : Number(modalityId),
        notes: notes.trim(),
      })

      const buildRecurring = (): AvailabilitySubmit => {
        // The API still wants a representative start/end_datetime; use the
        // first occurrence on or after valid_from so the server can compute
        // expansions.
        const baseDate = validFrom!
        return {
          start_datetime: isoFromDateAndTime(baseDate, startTime),
          end_datetime: isoFromDateAndTime(baseDate, endTime),
          modality_id:
            modalityId === ANY_MODALITY ? null : Number(modalityId),
          notes: notes.trim(),
          recurring: {
            days_of_week: days.join(','),
            start_time: `${startTime}:00`,
            end_time: `${endTime}:00`,
            valid_from: dateOnlyIso(validFrom!),
            valid_until: validUntil ? dateOnlyIso(validUntil) : null,
          },
        }
      }

      const payload: AvailabilitySubmit = isRecurring
        ? buildRecurring()
        : buildOneOff()

      if (!isEdit) {
        const res = await apiClient.api.availabilityTeachersCreate(
          userId,
          payload
        )
        if (res.data) {
          onSaved(res.data, 'create')
          toast.success(t('availability.saveSuccess'))
          onClose()
        }
      } else {
        // PATCH accepts the same shape as the create payload (minus required-ness).
        const patch: PatchedAvailabilityUpdate = {
          ...payload,
          // PatchedAvailabilityUpdate expects the optional `recurring` shape;
          // we already include it on the recurring branch.
        }
        const res = await apiClient.api.availabilityTeachersPartialUpdate(
          editingId!,
          userId,
          patch
        )
        if (res.data) {
          onSaved(res.data, 'edit')
          toast.success(t('availability.saveSuccess'))
          onClose()
        }
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('availability.dialog.editTitle')
              : t('availability.dialog.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('availability.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Recurring toggle — same affordance the coachings form uses.
            Disabled in edit mode because the API stores one-off and
            recurring as distinct records and doesn't migrate between them. */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {t('availability.dialog.recurringLabel')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('availability.dialog.recurringHint')}
              </p>
            </div>
          </div>
          <Switch
            checked={isRecurring}
            onCheckedChange={(checked) => !isEdit && setIsRecurring(checked)}
            disabled={isEdit}
          />
        </div>

        {loadingDetail ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('common.loading')}
          </p>
        ) : (
          <div className="space-y-4">
            {isRecurring ? (
              <>
                <div>
                  <Label className="mb-1.5 block">
                    {t('availability.fields.weekdays')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((w) => {
                      const checked = days.includes(w.value)
                      return (
                        <button
                          key={w.value}
                          type="button"
                          onClick={() => toggleDay(w.value)}
                          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                            checked
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background hover:bg-accent/40'
                          }`}
                        >
                          {t(w.labelKey)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block">
                      {t('availability.fields.startTime')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <TimePicker value={startTime} onChange={setStartTime} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">
                      {t('availability.fields.endTime')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <TimePicker value={endTime} onChange={setEndTime} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block">
                      {t('availability.fields.validFrom')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker
                      value={validFrom ?? undefined}
                      onChange={(d) => setValidFrom(d ?? null)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">
                      {t('availability.fields.validUntil')}
                    </Label>
                    <DatePicker
                      value={validUntil ?? undefined}
                      onChange={(d) => setValidUntil(d ?? null)}
                      placeholder={t('availability.fields.openEnded')}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="mb-1.5 block">
                    {t('availability.fields.date')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    value={date ?? undefined}
                    onChange={(d) => setDate(d ?? null)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block">
                      {t('availability.fields.startTime')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <TimePicker value={startTime} onChange={setStartTime} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">
                      {t('availability.fields.endTime')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <TimePicker value={endTime} onChange={setEndTime} />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label className="mb-1.5 block">
                {t('availability.fields.modality')}
              </Label>
              <Select value={modalityId} onValueChange={setModalityId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_MODALITY}>
                    {t('availability.fields.anyModality')}
                  </SelectItem>
                  {modalities.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="availability-notes" className="mb-1.5 block">
                {t('availability.fields.notes')}
              </Label>
              <Textarea
                id="availability-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('availability.fields.notesPlaceholder')}
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
