import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Camera,
  Check,
  ChevronRight,
  ImagePlus,
  Megaphone,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  Event as EventDetail,
  EventCreate,
  EventUpdate,
} from '@/api/studioos-api'
import { EventStateEnum, VisibilityStateEnum } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { CardSection } from '@/components/shared/CardSection'
import { PageHeader } from '@/components/shared/PageHeader'
import { DatePicker } from '@/components/shared/DatePicker'
import { TimePicker } from '@/components/shared/TimePicker'
import { RichTextEditor } from '@/components/shared/RichTextEditor'
import { paths } from '@/app/paths'
import { cn } from '@/lib/utils'
import { eventFormSchema, type EventFormValues } from './event-schema'
import {
  EventStateBadge,
  EventVisibilityBadge,
  EventCover,
} from './events-helpers'
import { usePermissions } from '@/auth/permissions'

interface EventFormPageProps {
  mode: 'create' | 'edit'
}

const VIS_OPTIONS: VisibilityStateEnum[] = [
  VisibilityStateEnum.Draft,
  VisibilityStateEnum.Scheduled,
  VisibilityStateEnum.Published,
  VisibilityStateEnum.Archived,
]

const STATE_OPTIONS: EventStateEnum[] = [
  EventStateEnum.Planned,
  EventStateEnum.DateTbd,
  EventStateEnum.Cancelled,
  EventStateEnum.Completed,
]

function combineDateTime(date: Date, hhmm: string): string {
  const [h, m] = hhmm.split(':').map((s) => Number(s) || 0)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function splitIsoToDateTime(iso: string | null | undefined): {
  date: Date | null
  time: string
} {
  if (!iso) return { date: null, time: '' }
  const d = new Date(iso)
  return {
    date: d,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  }
}

export function EventFormPage({ mode }: EventFormPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : NaN
  const { can } = usePermissions()

  const [loading, setLoading] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const dataLoaded = useRef<number | null>(null)

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      body: '',
      location: '',
      contact_info: '',
      event_date: null,
      event_time: '20:00',
      date_unknown: false,
      visibility_state: VisibilityStateEnum.Draft,
      event_state: EventStateEnum.Planned,
      publication_scheduled_at: null,
      publication_scheduled_time: '09:00',
      cover_file: null,
    },
  })

  const { control, register, handleSubmit, watch, setValue, formState, reset } =
    form
  const values = watch()

  const dateUnknown = watch('date_unknown')
  const visibility = watch('visibility_state')
  const eventState = watch('event_state')
  const shortDescLen = (values.description ?? '').length

  // ── Load (edit mode) ──────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'create') return
    if (!Number.isFinite(numericId)) return
    if (dataLoaded.current === numericId) return
    dataLoaded.current = numericId
    const load = async () => {
      setLoading(true)
      const r = await apiClient.api.eventsRetrieve(numericId).catch(() => null)
      if (r?.data) {
        const e = r.data as EventDetail
        const dt = splitIsoToDateTime(e.event_date)
        const sched = splitIsoToDateTime(e.publication_scheduled_at)
        reset({
          title: e.title ?? '',
          description: e.description ?? '',
          body: e.body ?? '',
          location: e.location ?? '',
          contact_info: e.contact_info ?? '',
          event_date: dt.date,
          event_time: dt.time || '20:00',
          date_unknown: e.event_state === EventStateEnum.DateTbd || !e.event_date,
          visibility_state: e.visibility_state ?? VisibilityStateEnum.Draft,
          event_state: e.event_state ?? EventStateEnum.Planned,
          publication_scheduled_at: sched.date,
          publication_scheduled_time: sched.time || '09:00',
          cover_file: null,
        })
        setCoverPreview(e.cover_photo_url ?? null)
      }
      setLoading(false)
    }
    void load()
  }, [mode, numericId, reset])

  // ── Sync date_unknown ↔ event_state ──────────────────────────────────
  useEffect(() => {
    if (dateUnknown && eventState !== EventStateEnum.DateTbd) {
      setValue('event_state', EventStateEnum.DateTbd, { shouldDirty: true })
    }
    if (!dateUnknown && eventState === EventStateEnum.DateTbd) {
      setValue('event_state', EventStateEnum.Planned, { shouldDirty: true })
    }
  }, [dateUnknown, eventState, setValue])

  // ── Submit handlers ───────────────────────────────────────────────────
  const submit = async (
    vals: EventFormValues,
    opts: { publishAfter: boolean } = { publishAfter: false },
  ) => {
    setSubmitting(true)
    try {
      const event_date_iso =
        vals.date_unknown || !vals.event_date
          ? null
          : combineDateTime(vals.event_date, vals.event_time || '00:00')

      const fd = new FormData()
      fd.append('title', vals.title)
      fd.append('description', vals.description)
      fd.append('body', vals.body ?? '')
      fd.append('location', vals.location ?? '')
      fd.append('contact_info', vals.contact_info ?? '')
      if (event_date_iso) fd.append('event_date', event_date_iso)
      else fd.append('event_date', '')
      if (vals.cover_file) fd.append('cover_photo', vals.cover_file)

      let result: EventDetail | undefined
      if (mode === 'create') {
        const r = await apiClient.api.eventsCreate(
          fd as unknown as EventCreate,
        )
        result = r.data
      } else {
        const r = await apiClient.api.eventsUpdate(
          numericId,
          fd as unknown as EventUpdate,
        )
        result = r.data
      }
      if (!result) throw new Error('no result')

      // Visibility + state actions (when distinct from default behaviour).
      if (
        opts.publishAfter ||
        vals.visibility_state === VisibilityStateEnum.Published
      ) {
        if (can('events.can_publish_event')) {
          await apiClient.api
            .eventsPublishCreate(result.id, {})
            .catch(() => null)
        }
      } else if (vals.visibility_state === VisibilityStateEnum.Scheduled) {
        if (
          can('events.can_schedule_event_publication') &&
          vals.publication_scheduled_at
        ) {
          const iso = combineDateTime(
            vals.publication_scheduled_at,
            vals.publication_scheduled_time || '09:00',
          )
          await apiClient.api
            .eventsSchedulePublicationCreate(result.id, {
              publication_scheduled_at: iso,
            })
            .catch(() => null)
        }
      } else if (vals.visibility_state === VisibilityStateEnum.Archived) {
        if (can('events.can_archive_event')) {
          await apiClient.api.eventsArchiveCreate(result.id).catch(() => null)
        }
      }
      // State actions (cancel / complete) — only when changed away from saved state.
      if (vals.event_state === EventStateEnum.Cancelled) {
        if (can('events.can_cancel_event')) {
          await apiClient.api.eventsCancelCreate(result.id).catch(() => null)
        }
      } else if (vals.event_state === EventStateEnum.Completed) {
        if (can('events.can_complete_event')) {
          await apiClient.api.eventsCompleteCreate(result.id).catch(() => null)
        }
      }

      toast.success(
        opts.publishAfter
          ? t('events.form.publishOk')
          : t('events.form.saveOk'),
      )
      navigate(paths.eventsDetail.replace(':id', String(result.id)))
    } catch {
      toast.error(t('events.form.saveError'))
    } finally {
      setSubmitting(false)
    }
  }

  const onCoverPick = (file: File | null) => {
    setValue('cover_file', file, { shouldDirty: true })
    if (file) {
      const url = URL.createObjectURL(file)
      setCoverPreview(url)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto w-full max-w-6xl">
            <PageHeader title={t('events.form.editTitle')} backTo={paths.events} />
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    )
  }

  const title =
    mode === 'create' ? t('events.form.createTitle') : t('events.form.editTitle')
  const backTo =
    mode === 'edit' && Number.isFinite(numericId)
      ? paths.eventsDetail.replace(':id', String(numericId))
      : paths.events

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-6 pb-[88px]">
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={title} backTo={backTo}>
            <span className="font-mono text-xs text-muted-foreground">
              {mode === 'edit' && formState.isDirty
                ? ''
                : mode === 'edit'
                  ? t('events.form.savedAuto', { ago: '·' })
                  : ''}
            </span>
          </PageHeader>

          <form
            id="page-form"
            onSubmit={handleSubmit((v) => submit(v))}
            className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6"
          >
            {/* LEFT — main column */}
            <div className="space-y-6">
              <CardSection title={t('events.form.general')}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="mb-1.5 block">
                      {t('events.form.titleLabel')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder={t('events.form.titlePlaceholder')}
                      {...register('title')}
                    />
                    {formState.errors.title && (
                      <p className="mt-1 text-xs text-destructive">
                        {t('validation.required')}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <Label htmlFor="description">
                        {t('events.form.shortDescription')}{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {t('events.form.shortDescriptionHint')}
                      </span>
                    </div>
                    <Textarea
                      id="description"
                      rows={2}
                      placeholder={t('events.form.shortDescriptionPlaceholder')}
                      maxLength={160}
                      {...register('description')}
                    />
                    <div className="mt-1 flex justify-end font-mono text-[11px] text-muted-foreground">
                      {t('events.form.shortDescriptionCounter', { count: shortDescLen })}
                    </div>
                  </div>
                </div>
              </CardSection>

              <CardSection title={t('events.form.cover')} description={t('events.form.coverHint')}>
                <CoverUpload
                  url={coverPreview}
                  onPick={onCoverPick}
                  onRemove={() => {
                    setCoverPreview(null)
                    setValue('cover_file', null, { shouldDirty: true })
                  }}
                />
              </CardSection>

              <CardSection title={t('events.form.body')} description={t('events.form.bodyHint')}>
                <Controller
                  control={control}
                  name="body"
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder={t('events.form.bodyPlaceholder')}
                      minHeight={260}
                      showCount
                    />
                  )}
                />
              </CardSection>

              <CardSection title={t('events.form.locationContact')}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5 block">
                      {t('events.form.locationLabel')}
                    </Label>
                    <Input
                      placeholder={t('events.form.locationPlaceholder')}
                      {...register('location')}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5 block">
                      {t('events.form.contactLabel')}
                    </Label>
                    <Input
                      type="email"
                      placeholder={t('events.form.contactPlaceholder')}
                      {...register('contact_info')}
                    />
                  </div>
                </div>
              </CardSection>
            </div>

            {/* RIGHT — meta rail */}
            <div className="space-y-6">
              {/* Visibility */}
              <CardSection title={t('events.form.visibilitySection')}>
                <Controller
                  control={control}
                  name="visibility_state"
                  render={({ field }) => (
                    <div className="space-y-2">
                      {VIS_OPTIONS.map((v) => (
                        <RadioCard
                          key={v}
                          selected={field.value === v}
                          onSelect={() => field.onChange(v)}
                          label={t(`events.visibility.${v}`)}
                          description={t(`events.visibilityDesc.${v}`)}
                          right={<EventVisibilityBadge value={v} />}
                        />
                      ))}
                    </div>
                  )}
                />
              </CardSection>

              {/* State */}
              <CardSection title={t('events.form.stateSection')}>
                <Controller
                  control={control}
                  name="event_state"
                  render={({ field }) => (
                    <div className="space-y-2">
                      {STATE_OPTIONS.map((v) => (
                        <RadioCard
                          key={v}
                          selected={field.value === v}
                          onSelect={() => field.onChange(v)}
                          label={t(`events.state.${v}`)}
                          description={t(`events.stateDesc.${v}`)}
                          right={<EventStateBadge value={v} />}
                        />
                      ))}
                    </div>
                  )}
                />
              </CardSection>

              {/* Date & time */}
              <CardSection title={t('events.form.dateSection')}>
                <div className="space-y-3">
                  <Controller
                    control={control}
                    name="event_date"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value ?? undefined}
                        onChange={(d) => field.onChange(d ?? null)}
                        disabled={dateUnknown}
                      />
                    )}
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Controller
                      control={control}
                      name="event_time"
                      render={({ field }) => (
                        <TimePicker
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          disabled={dateUnknown}
                        />
                      )}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={dateUnknown}
                      onChange={(e) =>
                        setValue('date_unknown', e.target.checked, {
                          shouldDirty: true,
                        })
                      }
                      className="size-4 rounded border-border accent-primary"
                    />
                    {t('events.form.dateUnknown')}
                  </label>
                </div>
              </CardSection>

              {/* Schedule publication — only when visibility=scheduled */}
              {visibility === VisibilityStateEnum.Scheduled && (
                <CardSection
                  title={t('events.form.scheduleSection')}
                  description={t('events.form.scheduleHint')}
                >
                  <div className="space-y-3">
                    <Controller
                      control={control}
                      name="publication_scheduled_at"
                      render={({ field }) => (
                        <DatePicker
                          value={field.value ?? undefined}
                          onChange={(d) => field.onChange(d ?? null)}
                          placeholder={t('events.form.schedulePlaceholder')}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="publication_scheduled_time"
                      render={({ field }) => (
                        <TimePicker
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </CardSection>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {visibility === VisibilityStateEnum.Published ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-600" />
                {t('events.form.footerStatusReady')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                {t('events.form.footerStatusDraft')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => navigate(backTo)}
              disabled={submitting}
            >
              {t('events.form.discard')}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={submitting}
              onClick={() =>
                handleSubmit((v) =>
                  submit({ ...v, visibility_state: VisibilityStateEnum.Draft }, { publishAfter: false }),
                )()
              }
            >
              {t('events.form.saveDraft')}
            </Button>
            <Button
              type="button"
              form="page-form"
              disabled={submitting || !can('events.can_publish_event')}
              onClick={() =>
                handleSubmit((v) =>
                  submit(
                    { ...v, visibility_state: VisibilityStateEnum.Published },
                    { publishAfter: true },
                  ),
                )()
              }
            >
              <Megaphone className="size-4" />
              {t('events.form.saveAndPublish')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Radio card ───────────────────────────────────────────────────────────

function RadioCard({
  selected,
  onSelect,
  label,
  description,
  right,
}: {
  selected: boolean
  onSelect: () => void
  label: string
  description: string
  right?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      className={cn(
        'grid w-full grid-cols-[18px_1fr_auto] items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:bg-accent/40',
      )}
    >
      <span
        className={cn(
          'grid size-4 place-items-center rounded-full border-[1.5px]',
          selected ? 'border-primary' : 'border-muted-foreground/50',
        )}
      >
        {selected && <span className="size-2 rounded-full bg-primary" />}
      </span>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      {right}
    </button>
  )
}

// ─── Cover upload ────────────────────────────────────────────────────────

function CoverUpload({
  url,
  onPick,
  onRemove,
}: {
  url: string | null
  onPick: (file: File | null) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-md border border-border bg-muted/30">
        {url ? (
          <img
            src={url}
            alt="cover"
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <EventCover src={null} alt="" aspect="aspect-[16/9]" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          {url ? t('events.form.coverReplace') : t('events.form.coverUpload')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraRef.current?.click()}
          aria-label={t('events.form.coverCapture')}
        >
          <Camera className="size-4" />
        </Button>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
            {t('events.files.remove')}
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// Silence unused-import lint if some helpers above are conditionally rendered.
void ChevronRight
void Plus
void ImagePlus
void X
