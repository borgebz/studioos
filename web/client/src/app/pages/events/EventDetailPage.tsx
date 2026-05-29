import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Archive,
  Ban,
  Bell,
  Calendar,
  CalendarClock,
  Check,
  Clock,
  CornerDownRight,
  Download,
  FileText,
  Image as ImageIcon,
  Inbox,
  MapPin,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UserCircle2,
  X,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  Event as EventDetail,
  EventComment,
  EventFile,
  EventPost,
} from '@/api/studioos-api'
import { VisibilityStateEnum } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { SanitizedHtml } from '@/components/shared/RichTextEditor'
import { usePermissions } from '@/auth/permissions'
import { useAuth } from '@/auth/useAuth'
import { paths } from '@/app/paths'
import { cn } from '@/lib/utils'
import {
  EventCover,
  EventStateBadge,
  EventVisibilityBadge,
  InterestButton,
  isCancelled,
  isCompleted,
  isDraft,
  isPublished,
  useDateFormatter,
  eventDateLine,
} from './events-helpers'
import { toast } from 'sonner'
import { parseApiError } from '@/lib/api-errors'

interface EventDetailAug extends EventDetail {
  cancel_reason?: string
  cancelled_at?: string | null
  cancelled_by_name?: string | null
}

export function EventDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : NaN
  const { can } = usePermissions()
  const { user } = useAuth()
  const hasProfile = Boolean(user?.has_profile)
  const fmt = useDateFormatter()

  const [event, setEvent] = useState<EventDetailAug | null>(null)
  const [posts, setPosts] = useState<EventPost[]>([])
  const [files, setFiles] = useState<EventFile[]>([])
  const [comments, setComments] = useState<EventComment[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<
    null | 'cancel' | 'archive' | 'complete' | 'delete' | 'publish'
  >(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [reschedAlert, setReschedAlert] = useState(false)
  const [replyTo, setReplyTo] = useState<EventComment | null>(null)

  const canEdit = can('events.change_event')
  const canPublish = can('events.can_publish_event')
  const canSchedule = can('events.can_schedule_event_publication')
  const canCancel = can('events.can_cancel_event')
  const canArchive = can('events.can_archive_event')
  const canComplete = can('events.can_complete_event')
  const canDelete = can('events.delete_event')
  const canAddPost = can('events.add_eventpost')
  const canComment = can('events.add_eventcomment')
  const isStaff =
    canEdit || canPublish || canCancel || canArchive || canComplete

  const dataLoaded = useRef<number | null>(null)
  useEffect(() => {
    if (!Number.isFinite(numericId)) return
    if (dataLoaded.current === numericId) return
    dataLoaded.current = numericId

    const load = async () => {
      setLoading(true)
      const [evRes, postsRes, filesRes, commentsRes] = await Promise.all([
        apiClient.api.eventsRetrieve(numericId).catch(() => null),
        apiClient.api.eventsPostsList(numericId).catch(() => null),
        apiClient.api.eventsFilesList(numericId).catch(() => null),
        apiClient.api.eventsCommentsList(numericId).catch(() => null),
      ])
      if (evRes?.data) setEvent(evRes.data as EventDetailAug)
      if (postsRes?.data) setPosts(arrayOf(postsRes.data))
      if (filesRes?.data) setFiles(arrayOf(filesRes.data))
      if (commentsRes?.data) setComments(arrayOf(commentsRes.data))
      setLoading(false)
    }
    void load()
  }, [numericId])

  const toggleInterest = async () => {
    if (!event) return
    const next = !event.interested
    setEvent((prev) =>
      prev
        ? {
            ...prev,
            interested: next,
            interest_count: Math.max(
              0,
              (prev.interest_count ?? 0) + (next ? 1 : -1)
            ),
          }
        : prev
    )
    try {
      if (next) await apiClient.api.eventsInterestsCreate(event.id)
      else await apiClient.api.eventsInterestsMeDestroy(event.id)
    } catch (err) {
      // rollback
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              interested: !next,
              interest_count: Math.max(
                0,
                (prev.interest_count ?? 0) + (next ? -1 : 1)
              ),
            }
          : prev
      )
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    }
  }

  const performAction = async () => {
    if (!event || !confirmAction) return
    setActionBusy(true)
    try {
      let updated: EventDetail | undefined
      if (confirmAction === 'cancel') {
        const r = await apiClient.api.eventsCancelCreate(event.id)
        updated = r.data
      } else if (confirmAction === 'archive') {
        const r = await apiClient.api.eventsArchiveCreate(event.id)
        updated = r.data
      } else if (confirmAction === 'complete') {
        const r = await apiClient.api.eventsCompleteCreate(event.id)
        updated = r.data
      } else if (confirmAction === 'publish') {
        const r = await apiClient.api.eventsPublishCreate(event.id, {})
        updated = r.data
      } else if (confirmAction === 'delete') {
        await apiClient.api.eventsDestroy(event.id)
        toast.success(t('events.form.deleted'))
        navigate(paths.events)
        return
      }
      if (updated) {
        setEvent((prev) => (prev ? { ...prev, ...updated } : prev))
        toast.success(t('events.form.saveOk'))
      }
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('events.form.saveError'))
    } finally {
      setActionBusy(false)
      setConfirmAction(null)
    }
  }

  if (loading || !event) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={t('events.title')} backTo={paths.events} />
          <DetailSkeleton />
        </div>
      </PageLayout>
    )
  }

  const cancelled = isCancelled(event)
  const completed = isCompleted(event)
  const draft = isDraft(event)
  const dl = eventDateLine(event.event_date, fmt)

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={t('events.title')} backTo={paths.events}>
          {isStaff && canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(paths.eventsEdit.replace(':id', String(event.id)))
              }
            >
              <Pencil className="size-4" />
              {t('events.edit')}
            </Button>
          )}
        </PageHeader>

        {/* HERO — inset cover + title block below */}
        <InsetHero
          event={event}
          interested={!!event.interested}
          onToggleInterest={toggleInterest}
          isStaff={isStaff}
          dl={dl}
        />

        {/* Cancelled callout — below hero, no overlay/gradient */}
        {cancelled && (
          <div className="mt-4 flex flex-col gap-3 rounded-md border border-red-200/60 bg-red-50 px-4 py-3 text-red-900 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <Ban className="mt-0.5 size-4 shrink-0" />
              <div>
                <div className="font-semibold leading-tight">
                  {t('events.cancelled.heading')}
                </div>
                {event.cancel_reason && (
                  <div className="mt-0.5 text-sm opacity-90">
                    {event.cancel_reason}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={reschedAlert}
              onClick={() => {
                setReschedAlert(true)
                toast.success(t('events.cancelled.notifyMe'))
              }}
              className="shrink-0 border-red-300/60 bg-background text-red-900 hover:bg-red-100 dark:border-red-700/50 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-900/30"
            >
              {reschedAlert ? (
                <Check className="size-4" />
              ) : (
                <Bell className="size-4" />
              )}
              {t('events.cancelled.notifyMe')}
            </Button>
          </div>
        )}

        {/* Completed callout */}
        {completed && !cancelled && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200/60 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-200">
            <Check className="size-4" />
            <span>
              <strong className="font-semibold">
                {t('events.completedBanner.label')}.
              </strong>{' '}
              {t('events.completedBanner.subtitle')}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* MAIN COLUMN */}
          <div className="min-w-0 space-y-6">
            {/* Body */}
            <section className="rounded-lg border border-border bg-card p-6">
              {event.body ? (
                <SanitizedHtml html={event.body} />
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  {t('events.noDescription')}
                </p>
              )}
            </section>

            {/* Files */}
            {files.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">
                  {t('events.sections.files')}
                </h2>
                <div className="space-y-2">
                  {files.map((f) => (
                    <FileRow key={f.id} file={f} />
                  ))}
                </div>
              </section>
            )}

            {/* Posts feed */}
            <section>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  {t('events.sections.posts')}
                </h2>
                {canAddPost && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(
                        paths.eventsPostCreate.replace(':id', String(event.id))
                      )
                    }
                  >
                    <Plus className="size-4" />
                    {t('events.actions.newPost')}
                  </Button>
                )}
              </div>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {posts.length === 0 ? (
                  <p className="px-5 py-6 text-sm italic text-muted-foreground">
                    {t('events.posts.empty')}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {posts.map((p) => (
                      <li key={p.id}>
                        <PostCard
                          post={p}
                          onEdit={
                            canAddPost
                              ? () =>
                                  navigate(
                                    paths.eventsPostEdit
                                      .replace(':id', String(event.id))
                                      .replace(':postId', String(p.id))
                                  )
                              : undefined
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Comments */}
            <section>
              <h2 className="mb-4 text-lg font-semibold">
                {t('events.sections.comments')}
              </h2>

              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {/* Composer / gate header */}
                {cancelled ? (
                  <div className="border-b border-border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
                    {t('events.cancelled.commentsDisabled')}
                  </div>
                ) : !canComment ? (
                  <div className="border-b border-border bg-muted/40 px-5 py-4 text-sm italic text-muted-foreground">
                    {t('events.comments.loginToComment')}
                  </div>
                ) : !hasProfile ? (
                  <NoProfileCommentGate />
                ) : !replyTo ? (
                  <CommentComposer
                    eventId={event.id}
                    embedded
                    authorName={
                      user?.profile?.display_name ||
                      user?.full_name ||
                      t('events.comments.anonymousAuthor')
                    }
                    authorPhotoUrl={user?.profile?.photo_url}
                    onPosted={(c) => setComments((p) => [c, ...p])}
                  />
                ) : (
                  <div className="border-b border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
                    {t('events.comments.replyingTo', {
                      name:
                        commentDisplayName(
                          replyTo,
                          t('events.comments.anonymousAuthor')
                        ),
                    })}
                  </div>
                )}

                {/* Thread list */}
                {comments.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm italic text-muted-foreground">
                    {t('events.comments.empty')}
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {comments
                      .filter((c) => !c.parent_comment)
                      .map((c) => (
                        <li key={c.id}>
                          <CommentThread
                            comment={c}
                            allComments={comments}
                            eventId={event.id}
                            canReply={
                              canComment && hasProfile && !cancelled
                            }
                            replyToId={replyTo?.id ?? null}
                            composerAuthorName={
                              user?.profile?.display_name ||
                              user?.full_name ||
                              t('events.comments.anonymousAuthor')
                            }
                            composerAuthorPhotoUrl={user?.profile?.photo_url}
                            onStartReply={setReplyTo}
                            onCancelReply={() => setReplyTo(null)}
                            onReplyPosted={(c) => {
                              setComments((prev) => [...prev, c])
                              setReplyTo(null)
                            }}
                          />
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT RAIL — combined: details + (staff manage) */}
          <aside className="space-y-6">
            {/* Details */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 text-sm font-semibold">
                {t('events.sections.details')}
              </div>
              <Field
                label={t('events.details.date')}
                icon={<Calendar className="size-3.5" />}
                value={dl ? `${dl.weekday}, ${dl.date}` : t('events.dateTbd')}
              />
              {dl && (
                <Field
                  label={t('events.details.time')}
                  icon={<Clock className="size-3.5" />}
                  value={dl.time}
                />
              )}
              {event.location && (
                <Field
                  label={t('events.details.location')}
                  icon={<MapPin className="size-3.5" />}
                  value={event.location}
                />
              )}
              {event.contact_info && (
                <Field
                  label={t('events.details.contact')}
                  icon={<Inbox className="size-3.5" />}
                  value={event.contact_info}
                  link
                />
              )}
            </div>

            {/* Staff manage rail */}
            {isStaff && (
              <ManagePanel
                event={event}
                canPublish={canPublish}
                canSchedule={canSchedule}
                canCancel={canCancel}
                canArchive={canArchive}
                canComplete={canComplete}
                canDelete={canDelete}
                completed={completed}
                cancelled={cancelled}
                draft={draft}
                onAction={setConfirmAction}
                onSchedule={() =>
                  navigate(paths.eventsEdit.replace(':id', String(event.id)))
                }
              />
            )}
          </aside>
        </div>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(o) => !o && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'cancel' &&
                t('events.form.cancelConfirmTitle')}
              {confirmAction === 'delete' &&
                t('events.form.deleteConfirmTitle')}
              {confirmAction === 'archive' && t('events.actions.archive')}
              {confirmAction === 'complete' &&
                t('events.actions.markCompleted')}
              {confirmAction === 'publish' && t('events.actions.publishNow')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'cancel' && t('events.form.cancelConfirmBody')}
              {confirmAction === 'delete' && t('events.form.deleteConfirmBody')}
              {(confirmAction === 'archive' ||
                confirmAction === 'complete' ||
                confirmAction === 'publish') &&
                ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={performAction}
              disabled={actionBusy}
              className={cn(
                (confirmAction === 'cancel' || confirmAction === 'delete') &&
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
            >
              {confirmAction === 'publish' && t('events.actions.publishNow')}
              {confirmAction === 'cancel' && t('events.actions.cancelEvent')}
              {confirmAction === 'archive' && t('events.actions.archive')}
              {confirmAction === 'complete' &&
                t('events.actions.markCompleted')}
              {confirmAction === 'delete' && t('events.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}

// ─── Hero (03A full-bleed) ────────────────────────────────────────────────

// ─── Inset hero ───────────────────────────────────────────────────────────
//
// Cover image sits as a normal block (theatre-icon placeholder when no cover).
// Title, badges, date, location and the primary interest CTA sit BELOW the
// cover as standard content — no dark gradient overlay, no full-bleed bleed.

function InsetHero({
  event,
  interested,
  onToggleInterest,
  isStaff,
  dl,
}: {
  event: EventDetailAug
  interested: boolean
  onToggleInterest: () => void
  isStaff: boolean
  dl: ReturnType<typeof eventDateLine>
}) {
  const { t } = useTranslation()
  const cancelled = isCancelled(event)
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <EventCover
          src={event.cover_photo_url}
          alt={event.title}
          cancelled={cancelled}
          aspect="aspect-[21/9] lg:aspect-[3/1]"
          iconSize="lg"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            {event.event_state && <EventStateBadge value={event.event_state} />}
            {isStaff && event.visibility_state && (
              <EventVisibilityBadge value={event.visibility_state} />
            )}
          </div>
          <h1
            className={cn(
              'font-serif text-3xl font-semibold italic leading-[1.08] tracking-tight text-foreground sm:text-4xl lg:text-5xl',
              cancelled && 'line-through decoration-muted-foreground/40'
            )}
          >
            {event.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" />
              {dl
                ? `${dl.weekday}, ${dl.date} · ${dl.time}`
                : t('events.dateTbd')}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {event.location}
              </span>
            )}
          </div>
        </div>
        {/* Interest CTA — shared InterestButton, disabled when cancelled */}
        <div className="shrink-0">
          <InterestButton
            count={event.interest_count ?? 0}
            active={interested}
            disabled={cancelled}
            onClick={onToggleInterest}
            size="default"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Right rail helpers ──────────────────────────────────────────────────

function Field({
  label,
  value,
  icon,
  link,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  link?: boolean
}) {
  return (
    <div className="mb-2.5 flex items-start justify-between gap-3 text-sm last:mb-0">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          'text-right font-medium',
          link && 'underline underline-offset-4 decoration-border'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function RailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {value}
    </div>
  )
}

// ─── Manage panel (staff) ─────────────────────────────────────────────────

type ConfirmAction = 'cancel' | 'archive' | 'complete' | 'delete' | 'publish'

function ManagePanel({
  event,
  canPublish,
  canSchedule,
  canCancel,
  canArchive,
  canComplete,
  canDelete,
  completed,
  cancelled,
  draft,
  onAction,
  onSchedule,
}: {
  event: EventDetailAug
  canPublish: boolean
  canSchedule: boolean
  canCancel: boolean
  canArchive: boolean
  canComplete: boolean
  canDelete: boolean
  completed: boolean
  cancelled: boolean
  draft: boolean
  onAction: (a: ConfirmAction) => void
  onSchedule: () => void
}) {
  const { t } = useTranslation()
  const fmt = useDateFormatter()
  const published = isPublished(event)
  const archived = event.visibility_state === VisibilityStateEnum.Archived
  const scheduled = event.visibility_state === VisibilityStateEnum.Scheduled

  const showPublish = canPublish && !published
  const showSchedule = canSchedule && (draft || scheduled)
  const showComplete = canComplete && !completed && !cancelled
  const showCancel = canCancel && !cancelled
  const showArchive = canArchive && !archived
  const showDelete = canDelete

  const hasOverflow = showCancel || showArchive || showDelete

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">
          {t('events.sections.manage')}
        </div>
        {hasOverflow && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('events.actions.moreActions')}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {showCancel && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onAction('cancel')}
                >
                  <Ban className="size-4" />
                  {t('events.actions.cancelEvent')}
                </DropdownMenuItem>
              )}
              {showArchive && (
                <DropdownMenuItem onClick={() => onAction('archive')}>
                  <Archive className="size-4" />
                  {t('events.actions.archive')}
                </DropdownMenuItem>
              )}
              {showDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onAction('delete')}
                >
                  <Trash2 className="size-4" />
                  {t('events.actions.delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-2.5">
        <RailRow
          label={t('events.details.visibility')}
          value={
            event.visibility_state ? (
              <EventVisibilityBadge value={event.visibility_state} />
            ) : null
          }
        />
        <RailRow
          label={t('events.details.state')}
          value={
            event.event_state ? (
              <EventStateBadge value={event.event_state} />
            ) : null
          }
        />
        {event.published_at && (
          <RailRow
            label={t('events.details.publishedAt')}
            value={
              <span className="font-mono text-xs text-muted-foreground">
                {fmt.formatRelative(event.published_at)}
              </span>
            }
          />
        )}
        <RailRow
          label={t('events.details.updatedAt')}
          value={
            <span className="font-mono text-xs text-muted-foreground">
              {fmt.formatRelative(event.updated_at)}
            </span>
          }
        />
      </div>

      {(showPublish || showSchedule || showComplete) && (
        <>
          <Separator className="my-4" />
          <div className="flex flex-col gap-2">
            {showPublish && (
              <Button onClick={() => onAction('publish')}>
                <Megaphone className="size-4" />
                {t('events.actions.publishNow')}
              </Button>
            )}
            {showSchedule && (
              <Button variant="outline" onClick={onSchedule}>
                <CalendarClock className="size-4" />
                {t('events.actions.schedulePublish')}
              </Button>
            )}
            {showComplete && (
              <Button variant="outline" onClick={() => onAction('complete')}>
                <Check className="size-4" />
                {t('events.actions.markCompleted')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Post card (cards variant) ────────────────────────────────────────────

function PostCard({ post, onEdit }: { post: EventPost; onEdit?: () => void }) {
  const { t } = useTranslation()
  const fmt = useDateFormatter()
  const when = post.published_at ?? post.created_at
  const isNew = isWithinDays(post.published_at ?? post.created_at, 7)
  return (
    <article className="flex flex-col gap-2 px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              D
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <div className="text-xs font-semibold">
              {t('events.files.uploadedBy')}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {fmt.formatRelative(when)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isNew && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
              <Sparkles className="size-3" />
              {t('events.posts.newBadge')}
            </span>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label={t('events.edit')}
            >
              <Pencil className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug">{post.title}</h3>
      {post.body && <SanitizedHtml html={post.body} className="text-[14px]" />}
    </article>
  )
}

// ─── File row ─────────────────────────────────────────────────────────────

function FileRow({ file }: { file: EventFile }) {
  const { t } = useTranslation()
  const ext = (file.file_name ?? '').split('.').pop()?.toLowerCase() ?? ''
  const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
  const tag = isImg ? 'IMG' : ext.toUpperCase().slice(0, 4) || 'FILE'
  return (
    <div className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
      <div
        className={cn(
          'grid size-10 place-items-center rounded-md',
          isImg
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        )}
      >
        {isImg ? (
          <ImageIcon className="size-4" />
        ) : (
          <FileText className="size-4" />
        )}
        <span className="sr-only">{tag}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {file.file_name || tag}
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">{tag}</div>
      </div>
      {file.file_url && (
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label={t('events.files.download')}
        >
          <a
            href={file.file_url}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            <Download className="size-4" />
          </a>
        </Button>
      )}
    </div>
  )
}

// ─── Comments ─────────────────────────────────────────────────────────────

function commentDisplayName(c: EventComment, fallback: string): string {
  return c.owner_name?.trim() || fallback
}

function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function CommentAvatar({
  name,
  photoUrl,
  size = 36,
  emphasis = 'parent',
}: {
  name: string
  photoUrl?: string | null
  size?: number
  emphasis?: 'parent' | 'reply' | 'composer'
}) {
  const initials = initialsOf(name)
  const sizeClass = size <= 28 ? 'size-7 text-[10px]' : 'size-9 text-xs'
  const fallbackClass =
    emphasis === 'composer'
      ? 'bg-primary text-primary-foreground font-semibold'
      : emphasis === 'reply'
        ? 'bg-muted text-muted-foreground font-semibold'
        : 'bg-primary/10 text-primary font-semibold'
  return (
    <Avatar className={cn(sizeClass.split(' ')[0])}>
      {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
      <AvatarFallback className={cn(fallbackClass, sizeClass.split(' ')[1])}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

function NoProfileCommentGate() {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-3 border-b border-border bg-muted/30 px-5 py-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-muted-foreground">
        <UserCircle2 className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {t('events.comments.noProfileTitle')}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('events.comments.noProfileDescription')}
        </p>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <NavLink to={paths.accountSettings}>
          {t('events.comments.noProfileCta')}
        </NavLink>
      </Button>
    </div>
  )
}

function CommentComposer({
  eventId,
  parentId,
  parentAuthor,
  placeholder,
  autoFocus,
  embedded,
  authorName,
  authorPhotoUrl,
  onPosted,
  onCancel,
}: {
  eventId: number
  parentId?: number | null
  parentAuthor?: string
  placeholder?: string
  autoFocus?: boolean
  embedded?: boolean
  authorName: string
  authorPhotoUrl?: string | null
  onPosted: (c: EventComment) => void
  onCancel?: () => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!value.trim()) return
    setBusy(true)
    try {
      const r = await apiClient.api.eventsCommentsCreate(eventId, {
        body: value.trim(),
        ...(parentId ? { parent_comment_id: parentId } : {}),
      })
      onPosted(r.data)
      setValue('')
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        embedded
          ? 'border-b border-border bg-muted/30'
          : 'rounded-md border border-border bg-card'
      )}
    >
      {parentAuthor && (
        <div className="flex items-center justify-between border-b border-border px-4 py-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CornerDownRight className="size-3.5" />
            {t('events.comments.replyingTo', { name: parentAuthor })}
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              {t('events.comments.cancelReply')}
            </button>
          )}
        </div>
      )}
      <div className="flex items-start gap-3 p-4">
        <CommentAvatar
          name={authorName}
          photoUrl={authorPhotoUrl}
          emphasis="composer"
        />
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={2}
            autoFocus={autoFocus}
            placeholder={
              placeholder ?? t('events.comments.composerPlaceholder')
            }
            className="w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={submit} disabled={busy || !value.trim()}>
              <Send className="size-4" />
              {t('events.actions.publishComment')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CommentBody({ comment }: { comment: EventComment }) {
  const { t } = useTranslation()
  const fmt = useDateFormatter()
  const name = commentDisplayName(
    comment,
    t('events.comments.anonymousAuthor')
  )
  return (
    <>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-sm font-semibold text-foreground">{name}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {fmt.formatRelative(comment.created_at)}
        </span>
      </div>
      <SanitizedHtml html={comment.body} className="text-sm leading-relaxed" />
    </>
  )
}

function CommentThread({
  comment,
  allComments,
  eventId,
  canReply,
  replyToId,
  composerAuthorName,
  composerAuthorPhotoUrl,
  onStartReply,
  onCancelReply,
  onReplyPosted,
}: {
  comment: EventComment
  allComments: EventComment[]
  eventId: number
  canReply: boolean
  replyToId: number | null
  composerAuthorName: string
  composerAuthorPhotoUrl?: string | null
  onStartReply: (c: EventComment) => void
  onCancelReply: () => void
  onReplyPosted: (c: EventComment) => void
}) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const replies =
    (comment.replies as EventComment[] | undefined) &&
    comment.replies.length > 0
      ? (comment.replies as EventComment[])
      : allComments.filter((c) => c.parent_comment === comment.id)

  const isReplying = replyToId === comment.id
  const anonName = t('events.comments.anonymousAuthor')
  const parentName = commentDisplayName(comment, anonName)

  return (
    <article className="px-5 py-4">
      <div className="grid grid-cols-[36px_1fr] gap-3">
        <CommentAvatar
          name={parentName}
          photoUrl={comment.owner_photo_url}
          emphasis="parent"
        />
        <div className="min-w-0">
          <CommentBody comment={comment} />
          {canReply && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() =>
                  isReplying ? onCancelReply() : onStartReply(comment)
                }
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <CornerDownRight className="size-3.5" />
                {isReplying
                  ? t('events.comments.cancelReply')
                  : t('events.actions.reply')}
              </button>
            </div>
          )}
        </div>
      </div>

      {(isReplying || replies.length > 0) && (
        <div className="mt-4 ml-4 space-y-4 border-l-2 border-border pl-5">
          {isReplying && canReply && (
            <CommentComposer
              eventId={eventId}
              parentId={comment.id}
              parentAuthor={parentName}
              placeholder={t('events.comments.replyPlaceholder')}
              autoFocus
              authorName={composerAuthorName}
              authorPhotoUrl={composerAuthorPhotoUrl}
              onPosted={onReplyPosted}
              onCancel={onCancelReply}
            />
          )}
          {replies.length > 0 && (
            <>
              {replies.length > 2 && (
                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {collapsed
                    ? t('events.comments.showReplies', {
                        count: replies.length,
                      })
                    : t('events.comments.hideReplies')}
                </button>
              )}
              {!collapsed &&
                replies.map((r) => {
                  const replyName = commentDisplayName(r, anonName)
                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-[28px_1fr] gap-3"
                    >
                      <CommentAvatar
                        name={replyName}
                        photoUrl={r.owner_photo_url}
                        size={28}
                        emphasis="reply"
                      />
                      <div className="min-w-0">
                        <CommentBody comment={r} />
                      </div>
                    </div>
                  )
                })}
            </>
          )}
        </div>
      )}
    </article>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="aspect-[21/9] w-full" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_350px]">
        <div className="space-y-4">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────

function arrayOf<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (
    data &&
    typeof data === 'object' &&
    'results' in (data as Record<string, unknown>)
  ) {
    const r = (data as { results?: unknown }).results
    return Array.isArray(r) ? (r as T[]) : []
  }
  return []
}

function isWithinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false
  const ts = new Date(iso).getTime()
  const now = Date.now()
  return now - ts < days * 24 * 60 * 60 * 1000
}
