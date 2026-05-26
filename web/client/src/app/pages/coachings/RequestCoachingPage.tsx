import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { CalendarClock, ChevronLeft, ChevronRight, Clock, Repeat, Trash2 } from 'lucide-react'
import { enUS, pt } from 'date-fns/locale'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type {
  Modality as ApiModality,
  Studio as ApiStudio,
  ExpandedSlot,
  TeacherSummary,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { CardSection } from '@/components/shared/CardSection'
import { DatePicker } from '@/components/shared/DatePicker'
import { TimePicker } from '@/components/shared/TimePicker'
import { paths } from '@/app/paths'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function teacherName(t: TeacherSummary) {
  return [t.first_name, t.last_name].filter(Boolean).join(' ') || t.email
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
        {value || <span className="text-muted-foreground/50">—</span>}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function RequestCoachingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const dateLocale =
    i18n.language === 'pt' || i18n.language === 'pt-PT' ? pt : enUS

  // -- Reference data --
  const [modalities, setModalities] = useState<ApiModality[]>([])
  const [studios, setStudios] = useState<ApiStudio[]>([])
  const [teachers, setTeachers] = useState<TeacherSummary[]>([])

  // -- Form state (simple, no react-hook-form needed) --
  const [modalityId, setModalityId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [studioId, setStudioId] = useState('')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')

  // -- UI state --
  const [isSaving, setIsSaving] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)

  // -- Load reference data --
  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      const [modalitiesRes, studiosRes, teachersRes] = await Promise.all([
        apiClient.api.modalitiesList().catch(() => null),
        apiClient.api.studiosList().catch(() => null),
        apiClient.api.accountsTeachersList().catch(() => null),
      ])
      if (modalitiesRes?.data) setModalities(modalitiesRes.data)
      if (studiosRes?.data) setStudios(studiosRes.data)
      if (teachersRes?.data) setTeachers(teachersRes.data)
    }
    void load()
  }, [])

  // Filter studios by selected modality
  const filteredStudios = useMemo(() => {
    if (!modalityId) return studios
    return studios.filter((s) =>
      s.modalities.some((m) => m.id === Number(modalityId)),
    )
  }, [modalityId, studios])

  // -- Validation --
  const isValid = modalityId && teacherId && date && startTime && endTime

  // -- Submit --
  const onSubmit = async () => {
    if (!isValid || !date) return
    setIsSaving(true)

    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const startDatetime = `${dateStr}T${startTime}:00`
      const endDatetime = `${dateStr}T${endTime}:00`

      await apiClient.api.coachingsRequestCreate({
        teacher_id: Number(teacherId),
        modality_id: Number(modalityId),
        studio_id: studioId ? Number(studioId) : null,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        notes: notes || undefined,
      })

      toast.success(t('requestCoaching.success'))
      navigate(paths.coachingsMyRequests)
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setIsSaving(false)
    }
  }

  const footerContent = (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDiscardOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {t('coachings.discard')}
      </Button>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => navigate(paths.coachingsMyRequests)}
        >
          {t('coachings.back')}
        </Button>
        <Button onClick={onSubmit} disabled={!isValid || isSaving}>
          {isSaving
            ? t('requestCoaching.submitting')
            : t('requestCoaching.submit')}
        </Button>
      </div>
    </>
  )

  return (
    <PageLayout footer={footerContent}>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          title={t('requestCoaching.title')}
          backTo={paths.coachingsMyRequests}
        />
        <p className="text-sm text-muted-foreground -mt-4 mb-6">
          {t('requestCoaching.subtitle')}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Main Column */}
          <div className="flex flex-col gap-6">
            {/* Session Info */}
            <CardSection title={t('requestCoaching.sessionInfo')}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="modality">{t('coachings.modality')}</Label>
                  <Select
                    value={modalityId}
                    onValueChange={(v) => {
                      setModalityId(v)
                      setTeacherId('')
                      setStudioId('')
                    }}
                  >
                    <SelectTrigger id="modality" className="mt-1.5">
                      <SelectValue
                        placeholder={t('coachings.selectModality')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {modalities.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="teacher">{t('coachings.teacher')}</Label>
                    <div className="flex gap-1.5 mt-1.5">
                      <Select
                        value={teacherId}
                        onValueChange={setTeacherId}
                      >
                        <SelectTrigger id="teacher">
                          <SelectValue
                            placeholder={t('coachings.selectTeacher')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map((teacher) => (
                            <SelectItem
                              key={teacher.id}
                              value={String(teacher.id)}
                            >
                              {teacherName(teacher)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!teacherId}
                        onClick={() => setAvailabilityOpen(true)}
                        title={t('coachings.viewAvailability')}
                      >
                        <CalendarClock className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="studio">
                      {t('requestCoaching.studioOptional')}
                    </Label>
                    <Select value={studioId} onValueChange={setStudioId}>
                      <SelectTrigger id="studio" className="mt-1.5">
                        <SelectValue
                          placeholder={t('coachings.selectStudio')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStudios.map((studio) => (
                          <SelectItem
                            key={studio.id}
                            value={String(studio.id)}
                          >
                            {studio.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardSection>

            {/* Schedule */}
            <CardSection title={t('requestCoaching.preferredTime')}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="request-date">{t('coachings.date')}</Label>
                  <div className="mt-1.5" id="request-date">
                    <DatePicker
                      value={date}
                      onChange={setDate}
                      placeholder={t('coachings.selectDate')}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="request-start-time">
                    {t('coachings.startTime')}
                  </Label>
                  <div className="mt-1.5" id="request-start-time">
                    <TimePicker value={startTime} onChange={setStartTime} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="request-end-time">
                    {t('coachings.endTime')}
                  </Label>
                  <div className="mt-1.5" id="request-end-time">
                    <TimePicker value={endTime} onChange={setEndTime} />
                  </div>
                </div>
              </div>
            </CardSection>

            {/* Notes */}
            <CardSection title={t('requestCoaching.additionalNotes')}>
              <Textarea
                placeholder={t('requestCoaching.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardSection>
          </div>

          {/* Side Column — Summary */}
          <div className="flex flex-col gap-6">
            <CardSection title={t('requestCoaching.summaryTitle')}>
              <div className="space-y-3">
                <SummaryRow
                  label={t('coachings.modality')}
                  value={
                    modalityId
                      ? modalities.find((m) => m.id === Number(modalityId))
                          ?.name
                      : undefined
                  }
                />
                <SummaryRow
                  label={t('coachings.teacher')}
                  value={(() => {
                    const teacher = teacherId
                      ? teachers.find((t) => t.id === Number(teacherId))
                      : undefined
                    return teacher ? teacherName(teacher) : undefined
                  })()}
                />
                <SummaryRow
                  label={t('coachings.studio')}
                  value={
                    studioId
                      ? studios.find((s) => s.id === Number(studioId))?.name
                      : undefined
                  }
                />
                <Separator />
                <SummaryRow
                  label={t('coachings.date')}
                  value={
                    date
                      ? format(date, 'dd/MM/yyyy', { locale: dateLocale })
                      : undefined
                  }
                />
                <SummaryRow
                  label={t('coachings.time')}
                  value={
                    startTime && endTime
                      ? `${startTime} – ${endTime}`
                      : undefined
                  }
                />
              </div>
            </CardSection>
          </div>
        </div>
      </div>

      {/* Teacher Availability Dialog */}
      {teacherId && (
        <TeacherAvailabilityDialog
          open={availabilityOpen}
          onClose={() => setAvailabilityOpen(false)}
          teacherId={Number(teacherId)}
          teacherLabel={(() => {
            const teacher = teachers.find((t) => t.id === Number(teacherId))
            return teacher ? teacherName(teacher) : ''
          })()}
        />
      )}

      {/* Discard Confirmation */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('coachings.discardTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('coachings.discardDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('coachings.cancel')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => navigate(paths.coachingsMyRequests)}
              >
                {t('coachings.discardConfirm')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}

// ---------------------------------------------------------------------------
// Teacher Availability Dialog (reused from CreateCoachingPage pattern)
// ---------------------------------------------------------------------------

function TeacherAvailabilityDialog({
  open,
  onClose,
  teacherId,
  teacherLabel,
}: {
  open: boolean
  onClose: () => void
  teacherId: number
  teacherLabel: string
}) {
  const { t, i18n } = useTranslation()
  const [slots, setSlots] = useState<ExpandedSlot[]>([])
  const [loading, setLoading] = useState(false)
  const hasLoaded = useRef(false)
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    return monday
  })

  const dateLocale =
    i18n.language === 'pt' || i18n.language === 'pt-PT' ? pt : enUS

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }, [weekStart])

  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      days.push(d)
    }
    return days
  }, [weekStart])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    apiClient.api
      .availabilityTeachersList(teacherId, {
        date_from: weekStart.toISOString(),
        date_to: weekEnd.toISOString(),
      })
      .then((res) => {
        setSlots(res.data)
        hasLoaded.current = true
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [open, teacherId, weekStart, weekEnd])

  const slotsByDay = useMemo(() => {
    const map = new Map<string, ExpandedSlot[]>()
    for (const day of weekDays) {
      map.set(format(day, 'yyyy-MM-dd'), [])
    }
    for (const slot of slots) {
      const key = slot.start_datetime.slice(0, 10)
      const arr = map.get(key)
      if (arr) arr.push(slot)
    }
    return map
  }, [slots, weekDays])

  const prevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  const nextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const hasSlots = slots.length > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            {t('coachings.teacherAvailability')}
          </DialogTitle>
          <DialogDescription>
            {teacherLabel} — {t('coachings.teacherAvailabilityDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={prevWeek}
            aria-label={t('coachings.previousWeek')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(weekStart, 'dd MMM', { locale: dateLocale })} —{' '}
            {format(weekEnd, 'dd MMM yyyy', { locale: dateLocale })}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={nextWeek}
            aria-label={t('coachings.nextWeek')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {loading && !hasLoaded.current ? (
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded" />
              ))}
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 rounded" />
                ))}
              </div>
            ))}
          </div>
        ) : !hasSlots && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t('coachings.noAvailability')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className={`grid grid-cols-7 gap-1.5 transition-opacity duration-200 ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
            >
              {weekDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const daySlots = slotsByDay.get(key) ?? []
                const isToday = format(new Date(), 'yyyy-MM-dd') === key
                return (
                  <div key={key} className="min-h-[140px]">
                    <div
                      className={`text-center text-xs font-medium py-1.5 rounded-t-md ${
                        isToday
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="capitalize">
                        {format(day, 'EEE', { locale: dateLocale })}
                      </div>
                      <div className="text-[11px]">{format(day, 'dd')}</div>
                    </div>
                    <div className="space-y-1 p-1">
                      {daySlots.map((slot) => {
                        const start = new Date(slot.start_datetime)
                        const end = new Date(slot.end_datetime)
                        const hasDetails = slot.modality || slot.notes
                        const slotContent = (
                          <div
                            key={slot.id}
                            className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-1 cursor-default"
                          >
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-primary shrink-0" />
                              <span className="text-xs font-medium text-primary">
                                {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
                              </span>
                              {slot.is_recurring && (
                                <Repeat className="h-2.5 w-2.5 text-muted-foreground shrink-0 ml-auto" />
                              )}
                            </div>
                            {slot.modality && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {slot.modality.name}
                              </p>
                            )}
                          </div>
                        )
                        if (hasDetails) {
                          return (
                            <TooltipProvider key={slot.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {slotContent}
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-xs"
                                >
                                  <div className="space-y-1">
                                    <p className="font-medium">
                                      {format(start, 'HH:mm')}–
                                      {format(end, 'HH:mm')}
                                    </p>
                                    {slot.modality && (
                                      <p>
                                        {t('coachings.modality')}:{' '}
                                        {slot.modality.name}
                                      </p>
                                    )}
                                    {slot.notes && (
                                      <p className="italic">
                                        {t('coachings.availabilityNotes')}:{' '}
                                        {slot.notes}
                                      </p>
                                    )}
                                    {slot.is_recurring && (
                                      <p className="flex items-center gap-1">
                                        <Repeat className="h-3 w-3" />
                                        {t('coachings.recurring')}
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        }
                        return slotContent
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
