/**
 * RequestCoachingPage — student/teacher/guardian flow for requesting a coaching.
 *
 * Mirrors the admin CoachingForm layout (two-column shell, session card,
 * schedule card with inline availability hint, participants card, sticky
 * footer) but stays request-mode-only:
 *
 *   - no billing / recurrence / direct-scheduling toggles
 *   - submits to `apiClient.api.coachingsRequestCreate(...)` → REQUESTED status
 *   - participants accept the invite themselves (PENDING / INVITED)
 *
 * Class picker is server-scoped: students/guardians see their own classes,
 * teachers see all. Invitable user list comes from a dedicated endpoint that's
 * open to anyone with `coachings.add_coachingclass`.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  CalendarClock,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import { useAuth } from '@/auth/useAuth'
import type {
  ClasseList as ApiClasseList,
  InvitableUserSummary,
  MeDependent,
  Modality as ApiModality,
  Studio as ApiStudio,
  TeacherSummary,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { PAGE_CONTENT } from '@/lib/layout'
import { CardSection } from '@/components/shared/CardSection'
import { DatePicker } from '@/components/shared/DatePicker'
import { TimePicker } from '@/components/shared/TimePicker'
import {
  AddParticipantDialog,
  type ParticipantOption,
} from '@/components/shared/AddParticipantDialog'
import {
  AvailabilityHint,
  buildCurrentSlot,
} from '@/components/shared/AvailabilityHint'
import { TeacherStudioAvailabilityDialog } from './TeacherStudioAvailabilityDialog'
import { paths } from '@/app/paths'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function teacherName(t: TeacherSummary) {
  return [t.first_name, t.last_name].filter(Boolean).join(' ') || t.email
}

function userToOption(u: {
  id: number
  first_name?: string | null
  last_name?: string | null
  email: string
}): ParticipantOption {
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  return { id: u.id, name: full || u.email, email: u.email }
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'
  )
}

interface ClasseOption {
  id: number
  name: string
  members: ParticipantOption[]
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

function dependentName(d: MeDependent): string {
  const full = [d.first_name, d.last_name].filter(Boolean).join(' ').trim()
  return full || d.email
}

export function RequestCoachingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const dateLocale =
    i18n.language === 'pt' || i18n.language === 'pt-PT' ? pt : enUS

  // -- Guardian setup --
  // Anyone with at least one dependent is treated as a guardian. They MUST
  // pick which child the request is for so the participant + billing flow
  // target the right person (see resolve_acting_student in the API).
  const dependents = useMemo(() => user?.dependents ?? [], [user])
  const isGuardian = dependents.length > 0

  // -- Reference data --
  const [modalities, setModalities] = useState<ApiModality[]>([])
  const [studios, setStudios] = useState<ApiStudio[]>([])
  const [teachers, setTeachers] = useState<TeacherSummary[]>([])
  const [classes, setClasses] = useState<ClasseOption[]>([])
  const [invitableUsers, setInvitableUsers] = useState<ParticipantOption[]>([])

  // -- Form state --
  const [modalityId, setModalityId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [studioId, setStudioId] = useState('')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [classeId, setClasseId] = useState('')
  const [participants, setParticipants] = useState<ParticipantOption[]>([])
  // When the requester is a guardian, this is the child they're acting for.
  // We pre-select the only child for single-child guardians to save a click.
  const [onBehalfOf, setOnBehalfOf] = useState<string>(() =>
    dependents.length === 1 ? String(dependents[0].id) : ''
  )

  // Keep onBehalfOf in sync if the auth user finishes loading after first render.
  useEffect(() => {
    if (dependents.length === 1 && !onBehalfOf) {
      setOnBehalfOf(String(dependents[0].id))
    }
  }, [dependents, onBehalfOf])

  const selectedDependent = useMemo(
    () =>
      onBehalfOf
        ? dependents.find((d) => d.id === Number(onBehalfOf))
        : undefined,
    [onBehalfOf, dependents]
  )

  // -- UI state --
  const [isSaving, setIsSaving] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [addParticipantOpen, setAddParticipantOpen] = useState(false)

  // -- Load reference data --
  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      const [
        modalitiesRes,
        studiosRes,
        teachersRes,
        classesRes,
        invitableRes,
      ] = await Promise.all([
        apiClient.api.modalitiesList().catch(() => null),
        apiClient.api.studiosList().catch(() => null),
        apiClient.api.accountsTeachersList().catch(() => null),
        apiClient.api.classesList().catch(() => null),
        apiClient.api.accountsInvitableList().catch(() => null),
      ])
      if (modalitiesRes?.data) setModalities(modalitiesRes.data)
      if (studiosRes?.data) setStudios(studiosRes.data)
      if (teachersRes?.data) setTeachers(teachersRes.data)
      if (classesRes?.data) {
        const items = classesRes.data as ApiClasseList[]
        setClasses(
          items.map((c) => ({
            id: c.id,
            name: c.name,
            members: c.members.map((m) => userToOption(m.student)),
          }))
        )
      }
      if (invitableRes?.data) {
        const items = invitableRes.data as InvitableUserSummary[]
        setInvitableUsers(items.map(userToOption))
      }
    }
    void load()
  }, [])

  // Filter studios by selected modality (admin form does the same).
  const filteredStudios = useMemo(() => {
    if (!modalityId) return studios
    return studios.filter((s) =>
      s.modalities.some((m) => m.id === Number(modalityId))
    )
  }, [modalityId, studios])

  const selectedClasse = useMemo(
    () =>
      classeId ? classes.find((c) => c.id === Number(classeId)) : undefined,
    [classeId, classes]
  )

  // Candidate pool for the "Add participant" dialog: every invitable user plus
  // members of the picked class (the class roster may contain users without
  // an active participation permission, which the API will validate on submit).
  // Excludes anyone already on the participants list.
  const availableInvitees = useMemo(() => {
    const existing = new Set(participants.map((p) => p.id))
    const pool = new Map<number, ParticipantOption>()
    for (const u of invitableUsers) {
      if (!existing.has(u.id)) pool.set(u.id, u)
    }
    if (selectedClasse) {
      for (const m of selectedClasse.members) {
        if (!existing.has(m.id) && !pool.has(m.id)) pool.set(m.id, m)
      }
    }
    return Array.from(pool.values())
  }, [invitableUsers, participants, selectedClasse])

  const addParticipants = (students: ParticipantOption[]) => {
    setParticipants((prev) => {
      const existing = new Set(prev.map((p) => p.id))
      const additions = students.filter((s) => !existing.has(s.id))
      return [...prev, ...additions]
    })
    setAddParticipantOpen(false)
  }

  // Picking a class auto-fills the participants list with every current member.
  // This makes the roster visible (and editable — the user can prune people
  // they don't want to invite). We deliberately track classeId only for the
  // summary breadcrumb; the submit forwards `participant_ids` instead of
  // `classe_id` so individual removals actually take effect.
  const handleClasseChange = (nextClasseId: string) => {
    setClasseId(nextClasseId)
    if (!nextClasseId) return
    const next = classes.find((c) => c.id === Number(nextClasseId))
    if (!next) return
    setParticipants((prev) => {
      const existing = new Set(prev.map((p) => p.id))
      const additions = next.members.filter((m) => !existing.has(m.id))
      return [...prev, ...additions]
    })
  }

  const removeParticipant = (id: number) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id))
  }

  // -- Validation --
  // Guardians must pick a dependent — without it, the API can't resolve
  // the actual student to roster + bill for.
  const isValid = Boolean(
    modalityId &&
      teacherId &&
      date &&
      startTime &&
      endTime &&
      (!isGuardian || onBehalfOf)
  )

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
        // Send participant_ids only — the local list is the source of truth.
        // We intentionally don't forward classe_id even when one was picked,
        // because the backend rosters every class member from classe_id and
        // would re-add anyone the user pruned from the visible list.
        participant_ids:
          participants.length > 0
            ? participants.map((p) => p.id)
            : undefined,
        on_behalf_of: onBehalfOf ? Number(onBehalfOf) : null,
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

  const currentSlot = buildCurrentSlot(date, startTime, endTime)
  const teacherIdNum = teacherId ? Number(teacherId) : null
  const studioIdNum = studioId ? Number(studioId) : null

  return (
    <PageLayout footer={footerContent}>
      <div className={PAGE_CONTENT}>
        <PageHeader
          title={t('requestCoaching.title')}
          backTo={paths.coachingsMyRequests}
        />
        <p className="-mt-4 mb-6 text-sm text-muted-foreground">
          {t('requestCoaching.subtitle')}
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
          {/* Main Column */}
          <div className="flex flex-col gap-6">
            {/* Guardian: pick which child the request is for. Hidden for
             * regular students/teachers (they're always acting for themselves).
             * Required when shown — the form's "Send request" button stays
             * disabled until a dependent is picked. */}
            {isGuardian && (
              <CardSection
                title={t('requestCoaching.onBehalfTitle')}
                description={t('requestCoaching.onBehalfDesc')}
              >
                <div>
                  <Label htmlFor="request-on-behalf">
                    {t('requestCoaching.onBehalfLabel')}
                    <span className="ml-1 text-destructive">*</span>
                  </Label>
                  <Select
                    value={onBehalfOf}
                    onValueChange={(v) => {
                      setOnBehalfOf(v)
                      // Switching dependents resets the participants/class —
                      // the previous picks belonged to a different child's
                      // context (different scope, different classes).
                      setClasseId('')
                      setParticipants([])
                    }}
                  >
                    <SelectTrigger
                      id="request-on-behalf"
                      className="mt-1.5"
                    >
                      <SelectValue
                        placeholder={t('requestCoaching.selectDependent')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {dependents.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {dependentName(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardSection>
            )}

            {/* Session info */}
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="teacher">{t('coachings.teacher')}</Label>
                    <div className="mt-1.5 flex gap-1.5">
                      <Select value={teacherId} onValueChange={setTeacherId}>
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
                        aria-label={t('coachings.viewAvailability')}
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
                          <SelectItem key={studio.id} value={String(studio.id)}>
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
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

                <AvailabilityHint
                  teacherId={teacherIdNum}
                  studioId={studioIdNum}
                  startDatetime={
                    currentSlot ? currentSlot.start.toISOString() : null
                  }
                  endDatetime={
                    currentSlot ? currentSlot.end.toISOString() : null
                  }
                  excludeCoachingId={null}
                  onOpenDrawer={() => setAvailabilityOpen(true)}
                />
              </div>
            </CardSection>

            {/* Participants */}
            <CardSection
              title={t('coachings.participants')}
              description={t('requestCoaching.participantsDesc')}
            >
              <div className="space-y-4">
                {/*
                 * Class quick-fill — picking a class invites every current
                 * member via classe_id. We omit the admin form's "Load roster"
                 * button on purpose: the API rosters the whole class on submit
                 * regardless of whether the rows are mirrored locally, so the
                 * button was a redundant duplicate. For finer control, clear
                 * the class and use "Adicionar participante" (the dialog's
                 * candidate pool already includes class members).
                 */}
                {classes.length > 0 && (
                  <div>
                    <Label htmlFor="request-classe">
                      {t('coachings.fromClasse')}
                    </Label>
                    <Select
                      value={classeId}
                      onValueChange={handleClasseChange}
                    >
                      <SelectTrigger id="request-classe" className="mt-1.5">
                        <SelectValue
                          placeholder={t('coachings.selectClasse')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                            <span className="ml-2 text-muted-foreground">
                              ({c.members.length})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {classes.length > 0 && <Separator />}

                {/* Participant list */}
                {participants.length > 0 ? (
                  <div className="space-y-2">
                    {participants.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {getInitials(student.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {student.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {student.email}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('coachings.removeParticipant')}
                          onClick={() => removeParticipant(student.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <UserPlus className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t('coachings.noParticipants')}
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddParticipantOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('coachings.addParticipant')}
                </Button>
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
                {isGuardian && (
                  <>
                    <SummaryRow
                      label={t('requestCoaching.summaryFor')}
                      value={
                        selectedDependent
                          ? dependentName(selectedDependent)
                          : undefined
                      }
                    />
                    <Separator />
                  </>
                )}
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
                      ? teachers.find((te) => te.id === Number(teacherId))
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
                <Separator />
                <SummaryRow
                  label={t('requestCoaching.summaryClasse')}
                  value={selectedClasse?.name}
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('coachings.participants')}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {participants.length}
                  </span>
                </div>
              </div>
            </CardSection>
          </div>
        </div>
      </div>

      {/* Teacher availability dialog (full week-strip view) */}
      {teacherIdNum !== null && (
        <TeacherStudioAvailabilityDialog
          open={availabilityOpen}
          onClose={() => setAvailabilityOpen(false)}
          teacherId={teacherIdNum}
          teacherLabel={(() => {
            const teacher = teachers.find((te) => te.id === teacherIdNum)
            return teacher ? teacherName(teacher) : ''
          })()}
          studioId={studioIdNum}
          studioLabel={(() => {
            if (studioIdNum === null) return undefined
            const studio = studios.find((s) => s.id === studioIdNum)
            return studio?.name
          })()}
          currentSlot={currentSlot}
          excludeCoachingId={null}
        />
      )}

      <AddParticipantDialog
        open={addParticipantOpen}
        onClose={() => setAddParticipantOpen(false)}
        onAdd={addParticipants}
        availableStudents={availableInvitees}
      />

      {/* Discard confirmation */}
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
