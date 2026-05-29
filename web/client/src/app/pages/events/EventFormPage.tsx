import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CalendarClock, ChevronDown, Megaphone } from 'lucide-react'

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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CardSection } from '@/components/shared/CardSection'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { DatePicker } from '@/components/shared/DatePicker'
import { TimePicker } from '@/components/shared/TimePicker'
import { RichTextEditor } from '@/components/shared/RichTextEditor'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { paths } from '@/app/paths'
import { parseApiError } from '@/lib/api-errors'
import {
  eventFormSchema,
  type EventFormValues,
} from './event-schema'
import { EventStateBadge, EventVisibilityBadge } from './events-helpers'
import { usePermissions } from '@/auth/permissions'

interface EventFormPageProps {
  mode: 'create' | 'edit'
}

type SubmitAction = 'save' | 'publish' | 'schedule'

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
  const [scheduleMode, setScheduleMode] = useState(false)
  const [currentVisibility, setCurrentVisibility] = useState<
    VisibilityStateEnum | undefined
  >(undefined)
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
          date_unknown:
            e.event_state === EventStateEnum.DateTbd || !e.event_date,
          visibility_state: e.visibility_state ?? VisibilityStateEnum.Draft,
          event_state: e.event_state ?? EventStateEnum.Planned,
          publication_scheduled_at: sched.date,
          publication_scheduled_time: sched.time || '09:00',
          cover_file: null,
        })
        setCoverPreview(e.cover_photo_url ?? null)
        setCurrentVisibility(e.visibility_state)
        // If we're editing a Scheduled event, surface the schedule card by default.
        if (e.visibility_state === VisibilityStateEnum.Scheduled) {
          setScheduleMode(true)
        }
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
  //
  // The form is for editing content (title, body, date, etc.). Visibility
  // transitions are explicit footer actions — we never expose the visibility
  // enum as a form field. Allowed `action` values:
  //
  //   'save'      → save content; keep current visibility (no transition).
  //   'publish'   → save content; then call publish endpoint.
  //   'schedule'  → save content; then call schedule-publication endpoint
  //                 with publication_scheduled_at + time from the form.
  //
  const submit = async (vals: EventFormValues, action: SubmitAction) => {
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
        const r = await apiClient.api.eventsCreate(fd as unknown as EventCreate)
        result = r.data
      } else {
        const r = await apiClient.api.eventsUpdate(
          numericId,
          fd as unknown as EventUpdate
        )
        result = r.data
      }
      if (!result) throw new Error('no result')

      if (action === 'publish' && can('events.can_publish_event')) {
        const r = await apiClient.api.eventsPublishCreate(result.id, {})
        result = r.data
      } else if (
        action === 'schedule' &&
        can('events.can_schedule_event_publication') &&
        vals.publication_scheduled_at
      ) {
        const iso = combineDateTime(
          vals.publication_scheduled_at,
          vals.publication_scheduled_time || '09:00'
        )
        const r = await apiClient.api.eventsSchedulePublicationCreate(
          result.id,
          { publication_scheduled_at: iso }
        )
        result = r.data
      }

      toast.success(
        action === 'publish'
          ? t('events.form.publishOk')
          : t('events.form.saveOk')
      )
      navigate(paths.eventsDetail.replace(':id', String(result.id)))
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('events.form.saveError'))
    } finally {
      setSubmitting(false)
    }
  }

  const onCoverPick = (file: File) => {
    setValue('cover_file', file, { shouldDirty: true })
    setCoverPreview(URL.createObjectURL(file))
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader
            title={t('events.form.editTitle')}
            backTo={paths.events}
          />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </PageLayout>
    )
  }

  const title =
    mode === 'create'
      ? t('events.form.createTitle')
      : t('events.form.editTitle')
  const backTo =
    mode === 'edit' && Number.isFinite(numericId)
      ? paths.eventsDetail.replace(':id', String(numericId))
      : paths.events

  const footer = (
    <>
      <Button
        variant="ghost"
        type="button"
        onClick={() => navigate(backTo)}
        disabled={submitting}
      >
        {t('common.cancel')}
      </Button>
      <FooterActions
        mode={mode}
        visibility={currentVisibility}
        scheduleMode={scheduleMode}
        submitting={submitting}
        canPublish={can('events.can_publish_event')}
        canSchedule={can('events.can_schedule_event_publication')}
        onSave={() => handleSubmit((v) => submit(v, 'save'))()}
        onPublish={() => handleSubmit((v) => submit(v, 'publish'))()}
        onSchedule={() => handleSubmit((v) => submit(v, 'schedule'))()}
        onChooseSchedule={() => setScheduleMode(true)}
        onChoosePublishNow={() => setScheduleMode(false)}
      />
    </>
  )

  return (
    <PageLayout footer={footer}>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={title} backTo={backTo} />

        <form
          id="page-form"
          onSubmit={handleSubmit((v) => submit(v, 'save'))}
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
                  <Label htmlFor="description" className="mb-1.5">
                    {t('events.form.shortDescription')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    rows={2}
                    placeholder={t('events.form.shortDescriptionPlaceholder')}
                    maxLength={160}
                    {...register('description')}
                  />
                  <div className="mt-1 flex justify-end font-mono text-[11px] text-muted-foreground">
                    {t('events.form.shortDescriptionCounter', {
                      count: shortDescLen,
                    })}
                  </div>
                </div>
              </div>
            </CardSection>

            <CardSection
              title={t('events.form.cover')}
              description={t('events.form.coverHint')}
            >
              <ImageUpload
                variant="cover"
                aspectRatio={16 / 9}
                value={coverPreview}
                onChange={(file) => onCoverPick(file)}
                onRemove={() => {
                  setCoverPreview(null)
                  setValue('cover_file', null, { shouldDirty: true })
                }}
              />
            </CardSection>

            <CardSection
              title={t('events.form.body')}
              description={t('events.form.bodyHint')}
            >
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
          </div>

          {/* RIGHT — meta rail */}
          <div className="space-y-6">
            {/* Current status (edit mode only — read-only) */}
            {mode === 'edit' && currentVisibility && (
              <CardSection title={t('events.form.currentStatus')}>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {t('events.details.visibility')}
                    </span>
                    <EventVisibilityBadge value={currentVisibility} />
                  </div>
                  {eventState && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        {t('events.details.state')}
                      </span>
                      <EventStateBadge value={eventState} />
                    </div>
                  )}
                </div>
              </CardSection>
            )}

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
                <label
                  htmlFor="date_unknown"
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Checkbox
                    id="date_unknown"
                    checked={dateUnknown}
                    onCheckedChange={(checked) =>
                      setValue('date_unknown', checked === true, {
                        shouldDirty: true,
                      })
                    }
                  />
                  {t('events.form.dateUnknown')}
                </label>
              </div>
            </CardSection>

            {/* Location & contact — in right rail for column balance */}
            <CardSection title={t('events.form.locationContact')}>
              <div className="space-y-3">
                <div>
                  <Label className="mb-1.5 block">
                    {t('events.form.locationLabel')}
                  </Label>
                  <Input
                    placeholder={t('events.form.locationPlaceholder')}
                    {...register('location')}
                  />
                </div>
                <div>
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

            {/* Schedule publication — only when user toggled "Schedule for later" */}
            {scheduleMode && (
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
    </PageLayout>
  )
}

// ─── Footer actions ────────────────────────────────────────────────────────

function FooterActions({
  mode,
  visibility,
  scheduleMode,
  submitting,
  canPublish,
  canSchedule,
  onSave,
  onPublish,
  onSchedule,
  onChooseSchedule,
  onChoosePublishNow,
}: {
  mode: 'create' | 'edit'
  visibility?: VisibilityStateEnum
  scheduleMode: boolean
  submitting: boolean
  canPublish: boolean
  canSchedule: boolean
  onSave: () => void
  onPublish: () => void
  onSchedule: () => void
  onChooseSchedule: () => void
  onChoosePublishNow: () => void
}) {
  const { t } = useTranslation()

  // Editing a Published or Archived event: only content-save is allowed.
  // Visibility transitions belong to the detail page (Manage panel).
  const draftLike =
    mode === 'create' ||
    !visibility ||
    visibility === VisibilityStateEnum.Draft ||
    visibility === VisibilityStateEnum.Scheduled

  if (!draftLike) {
    return (
      <Button type="button" onClick={onSave} disabled={submitting}>
        {t('events.form.saveChanges')}
      </Button>
    )
  }

  // Schedule mode is on: primary is "Save & schedule", but user can still
  // choose to publish now (turns schedule mode off and fires publish) or
  // save as a plain draft.
  if (scheduleMode) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            onChoosePublishNow()
            onSave()
          }}
          disabled={submitting}
        >
          {t('events.form.saveDraft')}
        </Button>
        <div className="inline-flex">
          <Button
            type="button"
            className="rounded-r-none"
            onClick={onSchedule}
            disabled={submitting || !canSchedule}
          >
            <CalendarClock className="size-4" />
            {t('events.form.saveAndSchedule')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                className="rounded-l-none border-l border-primary-foreground/20 px-2"
                disabled={submitting || (!canPublish && !canSchedule)}
                aria-label={t('events.form.publishNow')}
              >
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                disabled={!canPublish}
                onClick={() => {
                  onChoosePublishNow()
                  onPublish()
                }}
              >
                <Megaphone className="size-4" />
                {t('events.form.publishNow')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  // Draft / new event: Save draft + split Publish button (Now / Schedule).
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        type="button"
        onClick={onSave}
        disabled={submitting}
      >
        {mode === 'edit'
          ? t('events.form.saveChanges')
          : t('events.form.saveDraft')}
      </Button>
      <div className="inline-flex">
        <Button
          type="button"
          className="rounded-r-none"
          onClick={onPublish}
          disabled={submitting || !canPublish}
        >
          <Megaphone className="size-4" />
          {t('events.form.publishNow')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              className="rounded-l-none border-l border-primary-foreground/20 px-2"
              disabled={submitting || (!canPublish && !canSchedule)}
              aria-label={t('events.form.scheduleForLater')}
            >
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              disabled={!canPublish}
              onClick={onPublish}
            >
              <Megaphone className="size-4" />
              {t('events.form.publishNow')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canSchedule}
              onClick={onChooseSchedule}
            >
              <CalendarClock className="size-4" />
              {t('events.form.scheduleForLater')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
