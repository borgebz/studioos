import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { Megaphone, Sparkles } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { Event as EventDetail, EventPost } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { CardSection } from '@/components/shared/CardSection'
import { PageHeader } from '@/components/shared/PageHeader'
import { DatePicker } from '@/components/shared/DatePicker'
import { TimePicker } from '@/components/shared/TimePicker'
import {
  RichTextEditor,
  SanitizedHtml,
} from '@/components/shared/RichTextEditor'
import { paths } from '@/app/paths'
import { cn } from '@/lib/utils'
import {
  EventCover,
  EventStateBadge,
  useDateFormatter,
  eventDateLine,
} from './events-helpers'

const postFormSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  publication: z.enum(['draft', 'published', 'scheduled']),
  scheduled_at: z.date().nullable(),
  scheduled_time: z.string(),
  notify_email: z.boolean(),
  notify_in_app: z.boolean(),
})
type PostFormValues = z.infer<typeof postFormSchema>

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
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  }
}

export function EventPostFormPage({ mode }: EventPostFormPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id, postId } = useParams<{ id: string; postId?: string }>()
  const eventId = id ? Number(id) : NaN
  const numericPostId = postId ? Number(postId) : NaN
  const fmt = useDateFormatter()

  const [parent, setParent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const dataLoaded = useRef<string | null>(null)

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: '',
      body: '',
      publication: 'draft',
      scheduled_at: null,
      scheduled_time: '09:00',
      notify_email: true,
      notify_in_app: false,
    },
  })
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState,
    reset,
    getValues,
  } = form
  const publication = watch('publication')
  const body = watch('body')
  const title = watch('title')

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
          publication: p.publication_scheduled_at
            ? 'scheduled'
            : p.published_at
              ? 'published'
              : 'draft',
          scheduled_at: sched.date,
          scheduled_time: sched.time || '09:00',
          notify_email: true,
          notify_in_app: false,
        })
      }
      setLoading(false)
    }
    void load()
  }, [eventId, mode, numericPostId, reset])

  const submit = async (vals: PostFormValues) => {
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

      if (vals.publication === 'published') {
        await apiClient.api
          .eventsPostsPublishCreate(eventId, result.id, {})
          .catch(() => null)
        toast.success(t('events.post.published'))
      } else if (vals.publication === 'scheduled' && vals.scheduled_at) {
        const iso = combineDateTime(
          vals.scheduled_at,
          vals.scheduled_time || '09:00'
        )
        await apiClient.api
          .eventsPostsSchedulePublicationCreate(eventId, result.id, {
            publication_scheduled_at: iso,
          })
          .catch(() => null)
        toast.success(t('events.post.saved'))
      } else {
        toast.success(t('events.post.saved'))
      }
      navigate(paths.eventsDetail.replace(':id', String(eventId)))
    } catch {
      toast.error(t('events.post.saveError'))
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
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto w-full max-w-6xl">
            <PageHeader title={pageTitle} backTo={backTo} />
            <Skeleton className="h-[420px] w-full" />
          </div>
        </div>
      </div>
    )
  }

  const dl = parent ? eventDateLine(parent.event_date, fmt) : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-6 pb-[88px]">
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={pageTitle} backTo={backTo} />

          {/* Parent banner */}
          {parent && (
            <div className="mb-6 flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
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
                <div className="truncate text-base font-semibold">
                  {parent.title}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {dl
                    ? `${dl.date} · ${parent.location}`
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
            onSubmit={handleSubmit(submit)}
            className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6"
          >
            {/* LEFT */}
            <div className="space-y-6">
              <CardSection>
                <div>
                  <Label htmlFor="post-title" className="mb-1.5 block">
                    {t('events.post.titleLabel')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
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
                </div>
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

              {mode === 'edit' && (
                <CardSection
                  title={t('events.post.previewLabel')}
                  description={t('events.post.previewSub')}
                >
                  <article className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t('events.posts.newBadge')}
                    </div>
                    <h3 className="text-[15px] font-semibold leading-snug">
                      {title || t('events.noTitle')}
                    </h3>
                    {body && <SanitizedHtml html={body} className="text-sm" />}
                  </article>
                </CardSection>
              )}
            </div>

            {/* RIGHT */}
            <div className="space-y-6">
              <CardSection title={t('events.post.publication')}>
                <Controller
                  control={control}
                  name="publication"
                  render={({ field }) => (
                    <div className="space-y-2">
                      {(['draft', 'published', 'scheduled'] as const).map(
                        (v) => (
                          <PubRadio
                            key={v}
                            selected={field.value === v}
                            onSelect={() => field.onChange(v)}
                            label={t(
                              v === 'draft'
                                ? 'events.post.publicationDraft'
                                : v === 'published'
                                  ? 'events.post.publicationPublished'
                                  : 'events.post.publicationScheduled'
                            )}
                          />
                        )
                      )}
                    </div>
                  )}
                />
              </CardSection>

              {publication === 'scheduled' && (
                <CardSection
                  title={t('events.post.scheduleSection')}
                  description={t('events.post.scheduleHint')}
                >
                  <div className="space-y-2">
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

              <CardSection
                title={t('events.post.notifySection')}
                description={t('events.post.notifyHint', { count: 0 })}
              >
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border accent-primary"
                    {...register('notify_email')}
                  />
                  {t('events.post.notifyEmail')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border accent-primary"
                    {...register('notify_in_app')}
                  />
                  {t('events.post.notifyApp')}
                </label>
              </CardSection>
            </div>
          </form>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
          <div className="text-xs text-muted-foreground">
            {publication === 'published' ? (
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-emerald-600" />
                {t('events.form.footerStatusReady')}
              </span>
            ) : (
              <span>{t('events.form.footerStatusDraft')}</span>
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
                handleSubmit((v) => submit({ ...v, publication: 'draft' }))()
              }
            >
              {t('events.post.publishLater')}
            </Button>
            <Button
              type="button"
              disabled={submitting || !(getValues('title') && body)}
              onClick={() =>
                handleSubmit((v) =>
                  submit({ ...v, publication: 'published' })
                )()
              }
            >
              <Megaphone className="size-4" />
              {t('events.post.publishNow')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PubRadio({
  selected,
  onSelect,
  label,
}: {
  selected: boolean
  onSelect: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background hover:bg-accent/40'
      )}
    >
      <span
        className={cn(
          'grid size-4 place-items-center rounded-full border-[1.5px]',
          selected ? 'border-primary' : 'border-muted-foreground/50'
        )}
      >
        {selected && <span className="size-2 rounded-full bg-primary" />}
      </span>
      <span className="font-semibold">{label}</span>
    </button>
  )
}
