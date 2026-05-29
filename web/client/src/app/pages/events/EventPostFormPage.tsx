import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { CalendarClock, ChevronDown, Megaphone } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { Event as EventDetail, EventPost } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { paths } from '@/app/paths'
import { parseApiError } from '@/lib/api-errors'
import { EventCover, EventStateBadge, useDateFormatter, eventDateLine } from './events-helpers'

const postFormSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  scheduled_at: z.date().nullable(),
  scheduled_time: z.string(),
  notify_email: z.boolean(),
  notify_in_app: z.boolean(),
})
type PostFormValues = z.infer<typeof postFormSchema>

type PostStatus = 'draft' | 'scheduled' | 'published'
type SubmitAction = 'save' | 'publish' | 'schedule'

interface EventPostFormPageProps {
  mode: 'create' | 'edit'
}

function combineDateTime(date: Date, hhmm: string): string {
  const [h, m] = hhmm.split(':').map((s) => Number(s) || 0)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function splitIsoToDateTime(iso: string | null | undefined) {
  if (!iso) return { date: null as Date | null, time: '' }
  const d = new Date(iso)
  return {
    date: d,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`,
  }
}

function deriveStatus(p: EventPost | null): PostStatus | undefined {
  if (!p) return undefined
  if (p.published_at) return 'published'
  if (p.publication_scheduled_at) return 'scheduled'
  return 'draft'
}

export function EventPostFormPage({ mode }: EventPostFormPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id, postId } = useParams<{ id: string; postId?: string }>()
  const eventId = id ? Number(id) : NaN
  const numericPostId = postId ? Number(postId) : NaN
  const fmt = useDateFormatter()

  const [parent, setParent] = useState<EventDetail | null>(null)
  const [currentStatus, setCurrentStatus] = useState<PostStatus | undefined>(
    undefined
  )
  const [loading, setLoading] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [scheduleMode, setScheduleMode] = useState(false)
  const dataLoaded = useRef<string | null>(null)

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: '',
      body: '',
      scheduled_at: null,
      scheduled_time: '09:00',
      notify_email: true,
      notify_in_app: false,
    },
  })
  const { control, register, handleSubmit, watch, formState, reset, setValue } =
    form

  useEffect(() => {
    if (!Number.isFinite(eventId)) return
    const cacheKey = `${eventId}:${numericPostId}`
    if (dataLoaded.current === cacheKey) return
    dataLoaded.current = cacheKey

    const load = async () => {
      setLoading(true)
      const tasks: Array<Promise<unknown>> = [
        apiClient.api.eventsRetrieve(eventId).catch(() => null),
      ]
      if (mode === 'edit' && Number.isFinite(numericPostId)) {
        tasks.push(
          apiClient.api
            .eventsPostsRetrieve(eventId, numericPostId)
            .catch(() => null)
        )
      }
      const [parentRes, postRes] = (await Promise.all(tasks)) as [
        { data?: EventDetail } | null,
        { data?: EventPost } | null | undefined,
      ]
      if (parentRes?.data) setParent(parentRes.data)
      if (postRes?.data) {
        const p = postRes.data
        const sched = splitIsoToDateTime(p.publication_scheduled_at)
        reset({
          title: p.title ?? '',
          body: p.body ?? '',
          scheduled_at: sched.date,
          scheduled_time: sched.time || '09:00',
          notify_email: true,
          notify_in_app: false,
        })
        const status = deriveStatus(p)
        setCurrentStatus(status)
        if (status === 'scheduled') setScheduleMode(true)
      }
      setLoading(false)
    }
    void load()
  }, [eventId, mode, numericPostId, reset])

  const submit = async (vals: PostFormValues, action: SubmitAction) => {
    if (!Number.isFinite(eventId)) return
    setSubmitting(true)
    try {
      let result: EventPost | undefined
      if (mode === 'create') {
        const r = await apiClient.api.eventsPostsCreate(eventId, {
          title: vals.title,
          body: vals.body,
        })
        result = r.data
      } else {
        const r = await apiClient.api.eventsPostsUpdate(
          eventId,
          numericPostId,
          {
            title: vals.title,
            body: vals.body,
          }
        )
        result = r.data
      }
      if (!result) throw new Error('no result')

      if (action === 'publish') {
        await apiClient.api.eventsPostsPublishCreate(eventId, result.id, {})
        toast.success(t('events.post.published'))
      } else if (action === 'schedule' && vals.scheduled_at) {
        const iso = combineDateTime(
          vals.scheduled_at,
          vals.scheduled_time || '09:00'
        )
        await apiClient.api.eventsPostsSchedulePublicationCreate(
          eventId,
          result.id,
          { publication_scheduled_at: iso }
        )
        toast.success(t('events.post.saved'))
      } else {
        toast.success(t('events.post.saved'))
      }
      navigate(paths.eventsDetail.replace(':id', String(eventId)))
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('events.post.saveError'))
    } finally {
      setSubmitting(false)
    }
  }

  const backTo = paths.eventsDetail.replace(':id', String(eventId))
  const pageTitle =
    mode === 'create'
      ? t('events.post.createTitle')
      : t('events.post.editTitle')

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={pageTitle} backTo={backTo} />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </PageLayout>
    )
  }

  const dl = parent ? eventDateLine(parent.event_date, fmt) : null
  const status = currentStatus

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
        status={status}
        scheduleMode={scheduleMode}
        submitting={submitting}
        titleReady={Boolean(watch('title'))}
        bodyReady={Boolean(watch('body'))}
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
        <PageHeader title={pageTitle} backTo={backTo} />

        {/* Parent banner */}
        {parent && (
          <div className="mb-6 flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
            <div className="size-12 shrink-0 overflow-hidden rounded-md">
              <EventCover
                src={parent.cover_photo_url}
                alt={parent.title}
                aspect="aspect-square"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-muted-foreground">
                {t('events.post.parentLabel')}
              </div>
              <div className="truncate text-sm font-semibold">
                {parent.title}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {dl
                  ? `${dl.date} · ${parent.location ?? ''}`
                  : (parent.location ?? '')}
              </div>
            </div>
            {parent.event_state && (
              <EventStateBadge value={parent.event_state} />
            )}
          </div>
        )}

        <form
          id="page-form"
          onSubmit={handleSubmit((v) => submit(v, 'save'))}
          className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6"
        >
          {/* LEFT */}
          <div className="space-y-6">
            <CardSection title={t('events.post.titleLabel')}>
              <Input
                id="post-title"
                placeholder={t('events.post.titlePlaceholder')}
                {...register('title')}
              />
              {formState.errors.title && (
                <p className="mt-1 text-xs text-destructive">
                  {t('validation.required')}
                </p>
              )}
            </CardSection>

            <CardSection
              title={t('events.post.bodyLabel')}
              description={t('events.post.bodyHint')}
            >
              <Controller
                control={control}
                name="body"
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder={t('events.form.bodyPlaceholder')}
                    minHeight={220}
                    showCount
                  />
                )}
              />
            </CardSection>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* Current status (edit mode only) */}
            {mode === 'edit' && status && (
              <CardSection title={t('events.form.currentStatus')}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {t('events.post.publication')}
                  </span>
                  <span className="text-sm font-medium">
                    {t(
                      status === 'published'
                        ? 'events.post.publicationPublished'
                        : status === 'scheduled'
                          ? 'events.post.publicationScheduled'
                          : 'events.post.publicationDraft'
                    )}
                  </span>
                </div>
              </CardSection>
            )}

            {/* Schedule publication */}
            {scheduleMode && (
              <CardSection
                title={t('events.post.scheduleSection')}
                description={t('events.post.scheduleHint')}
              >
                <div className="space-y-3">
                  <Controller
                    control={control}
                    name="scheduled_at"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value ?? undefined}
                        onChange={(d) => field.onChange(d ?? null)}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="scheduled_time"
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

            {/* Notify */}
            <CardSection
              title={t('events.post.notifySection')}
              description={t('events.post.notifyHint', { count: 0 })}
            >
              <div className="space-y-2.5">
                <Controller
                  control={control}
                  name="notify_email"
                  render={({ field }) => (
                    <label
                      htmlFor="notify_email"
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id="notify_email"
                        checked={field.value}
                        onCheckedChange={(v) =>
                          setValue('notify_email', v === true, {
                            shouldDirty: true,
                          })
                        }
                      />
                      {t('events.post.notifyEmail')}
                    </label>
                  )}
                />
                <Controller
                  control={control}
                  name="notify_in_app"
                  render={({ field }) => (
                    <label
                      htmlFor="notify_in_app"
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id="notify_in_app"
                        checked={field.value}
                        onCheckedChange={(v) =>
                          setValue('notify_in_app', v === true, {
                            shouldDirty: true,
                          })
                        }
                      />
                      {t('events.post.notifyApp')}
                    </label>
                  )}
                />
              </div>
            </CardSection>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}

// ─── Footer actions ────────────────────────────────────────────────────────

function FooterActions({
  status,
  scheduleMode,
  submitting,
  titleReady,
  bodyReady,
  onSave,
  onPublish,
  onSchedule,
  onChooseSchedule,
  onChoosePublishNow,
}: {
  status?: PostStatus
  scheduleMode: boolean
  submitting: boolean
  titleReady: boolean
  bodyReady: boolean
  onSave: () => void
  onPublish: () => void
  onSchedule: () => void
  onChooseSchedule: () => void
  onChoosePublishNow: () => void
}) {
  const { t } = useTranslation()
  const ready = titleReady && bodyReady

  // Already-published posts: content edit only.
  if (status === 'published') {
    return (
      <Button type="button" onClick={onSave} disabled={submitting}>
        {t('events.form.saveChanges')}
      </Button>
    )
  }

  // Schedule mode: Save & schedule with publish-now in dropdown.
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
          {t('events.post.publishLater')}
        </Button>
        <div className="inline-flex">
          <Button
            type="button"
            className="rounded-r-none"
            onClick={onSchedule}
            disabled={submitting || !ready}
          >
            <CalendarClock className="size-4" />
            {t('events.form.saveAndSchedule')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                className="rounded-l-none border-l border-primary-foreground/20 px-2"
                disabled={submitting || !ready}
                aria-label={t('events.form.publishNow')}
              >
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                disabled={!ready}
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

  // Draft (new or editing draft): Save draft + split Publish ▼.
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        type="button"
        onClick={onSave}
        disabled={submitting}
      >
        {status === 'scheduled' || status === 'draft'
          ? t('events.form.saveChanges')
          : t('events.post.publishLater')}
      </Button>
      <div className="inline-flex">
        <Button
          type="button"
          className="rounded-r-none"
          onClick={onPublish}
          disabled={submitting || !ready}
        >
          <Megaphone className="size-4" />
          {t('events.form.publishNow')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              className="rounded-l-none border-l border-primary-foreground/20 px-2"
              disabled={submitting || !ready}
              aria-label={t('events.form.scheduleForLater')}
            >
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem disabled={!ready} onClick={onPublish}>
              <Megaphone className="size-4" />
              {t('events.form.publishNow')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onChooseSchedule}>
              <CalendarClock className="size-4" />
              {t('events.form.scheduleForLater')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
