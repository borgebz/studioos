import { useState, useMemo, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  CalendarClock,
  Info,
  Repeat,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import { usePermissions } from '@/auth/permissions'
import {
  CoachingClassStatusEnum,
  RecurrenceTypeEnum,
  type CoachingClass,
  type CoachingParticipant,
  type InvitableUserSummary,
  type Modality as ApiModality,
  type Studio as ApiStudio,
  type TeacherSummary,
  type UserResponse,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TeacherStudioAvailabilityDialog } from './TeacherStudioAvailabilityDialog'
import {
  PARTICIPANT_STATUS_STYLES,
  isCancellableParticipantStatus,
  isActiveParticipant,
} from './coaching-status'
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
import { cn } from '@/lib/utils'
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
import { toast } from 'sonner'
import { paths } from '@/app/paths'
import {
  coachingFormSchema,
  defaultCoachingValues,
  type CoachingFormValues,
} from './create-coaching-schema'

type CoachingFormMode = 'create' | 'edit'

export interface CoachingFormProps {
  mode: CoachingFormMode
  /** Existing coaching when editing. Required in edit mode. */
  coaching?: CoachingClass
}

type StudentOption = ParticipantOption

interface ClasseOption {
  id: number
  name: string
  members: StudentOption[]
}

const DAYS_OF_WEEK = [
  { value: 'MO', labelKey: 'coachings.dayMon' },
  { value: 'TU', labelKey: 'coachings.dayTue' },
  { value: 'WE', labelKey: 'coachings.dayWed' },
  { value: 'TH', labelKey: 'coachings.dayThu' },
  { value: 'FR', labelKey: 'coachings.dayFri' },
  { value: 'SA', labelKey: 'coachings.daySat' },
  { value: 'SU', labelKey: 'coachings.daySun' },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function teacherName(t: TeacherSummary) {
  return [t.first_name, t.last_name].filter(Boolean).join(' ') || t.email
}

function userToStudent(u: InvitableUserSummary): StudentOption {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email
  return { id: u.id, name, email: u.email }
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function buildEditDefaults(coaching: CoachingClass): CoachingFormValues {
  const start = new Date(coaching.start_datetime)
  const end = new Date(coaching.end_datetime)
  return {
    modality_id: String(coaching.modality.id),
    teacher_id: String(coaching.teacher.id),
    studio_id: String(coaching.studio.id),
    date: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
    start_time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    end_time: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    total_price: coaching.total_price ?? '',
    notes: coaching.notes ?? '',
    is_billable: coaching.is_billable ?? true,
    // Create-only flags — kept so the form values type stays consistent.
    schedule: true,
    auto_confirm_participants: true,
    is_recurring: false,
    recurrence: defaultCoachingValues.recurrence,
  }
}

export function CoachingForm({ mode, coaching }: CoachingFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const isEdit = mode === 'edit'
  const canChangeTeacher = can('coachings.change_coachingclass')
  // is_billable is only editable for coordination-scheduled coachings
  // (those with no requester) — backend rejects otherwise.
  const billableEditable = !isEdit || !coaching?.requested_by
  // In edit mode for student-requested coachings we still show the switch but disable it.
  const billableLockedReason =
    isEdit && coaching?.requested_by
      ? t('coachings.billableLockedRequested')
      : null

  // Reference data (loaded from API, not form fields)
  const [modalities, setModalities] = useState<ApiModality[]>([])
  const [studios, setStudios] = useState<ApiStudio[]>([])
  const [teachers, setTeachers] = useState<TeacherSummary[]>([])
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [classes, setClasses] = useState<ClasseOption[]>([])

  // UI state
  const [classeId, setClasseId] = useState<string>('')
  const [participants, setParticipants] = useState<StudentOption[]>([])
  // Edit mode manages real participant rows (with status) via dedicated
  // endpoints, since the coaching update payload doesn't carry participants.
  const [editParticipants, setEditParticipants] = useState<
    CoachingParticipant[]
  >(() => (isEdit && coaching ? (coaching.participants ?? []) : []))
  const [participantBusy, setParticipantBusy] = useState(false)
  const [addParticipantOpen, setAddParticipantOpen] = useState(false)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form — defaults depend on mode
  const initialValues = useMemo<CoachingFormValues>(() => {
    if (isEdit && coaching) return buildEditDefaults(coaching)
    return defaultCoachingValues
  }, [isEdit, coaching])

  const { control, handleSubmit, watch, setValue } =
    useForm<CoachingFormValues>({
      resolver: zodResolver(coachingFormSchema),
      defaultValues: initialValues,
    })

  const modalityId = watch('modality_id')
  const teacherId = watch('teacher_id')
  const studioId = watch('studio_id')
  const date = watch('date')
  const startTime = watch('start_time')
  const endTime = watch('end_time')
  const totalPrice = watch('total_price')
  const isRecurring = watch('is_recurring')
  const recurrenceType = watch('recurrence.recurrence_type')
  const recurrenceInterval = watch('recurrence.recurrence_interval')
  const selectedDays = watch('recurrence.selected_days')
  const endType = watch('recurrence.end_type')
  const occurrencesCount = watch('recurrence.occurrences_count')
  const endDate = watch('recurrence.end_date')

  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      // Edit mode skips the classe roster, but still needs the student list so
      // staff can add participants from the edit form.
      const promises = isEdit
        ? [
            apiClient.api.modalitiesList().catch(() => null),
            apiClient.api.studiosList().catch(() => null),
            apiClient.api.accountsTeachersList().catch(() => null),
            Promise.resolve(null),
            apiClient.api.accountsInvitableList().catch(() => null),
          ]
        : [
            apiClient.api.modalitiesList().catch(() => null),
            apiClient.api.studiosList().catch(() => null),
            apiClient.api.accountsTeachersList().catch(() => null),
            apiClient.api.classesList().catch(() => null),
            apiClient.api.accountsInvitableList().catch(() => null),
          ]

      const [modalitiesRes, studiosRes, teachersRes, classesRes, usersRes] =
        await Promise.all(promises as Promise<unknown>[])

      if (
        modalitiesRes &&
        typeof modalitiesRes === 'object' &&
        'data' in modalitiesRes
      ) {
        const d = (modalitiesRes as { data: ApiModality[] }).data
        if (d) setModalities(d)
      }
      if (
        studiosRes &&
        typeof studiosRes === 'object' &&
        'data' in studiosRes
      ) {
        const d = (studiosRes as { data: ApiStudio[] }).data
        if (d) setStudios(d)
      }
      if (
        teachersRes &&
        typeof teachersRes === 'object' &&
        'data' in teachersRes
      ) {
        const d = (teachersRes as { data: TeacherSummary[] }).data
        if (d) setTeachers(d)
      }
      if (
        classesRes &&
        typeof classesRes === 'object' &&
        'data' in classesRes
      ) {
        const d = (
          classesRes as {
            data: Array<{
              id: number
              name: string
              members: Array<{ student: UserResponse }>
            }>
          }
        ).data
        if (d) {
          setClasses(
            d.map((c) => ({
              id: c.id,
              name: c.name,
              members: c.members.map((m) => {
                const name =
                  [m.student.first_name, m.student.last_name]
                    .filter(Boolean)
                    .join(' ') || m.student.email
                return { id: m.student.id, name, email: m.student.email }
              }),
            }))
          )
        }
      }
      if (usersRes && typeof usersRes === 'object' && 'data' in usersRes) {
        // `accountsInvitableList` returns only users with
        // `accounts.can_participate_in_coaching`, as a plain array.
        const d = (usersRes as { data: InvitableUserSummary[] }).data
        if (d) setAllStudents(d.map(userToStudent))
      }
    }
    void load()
  }, [isEdit])

  const selectedClasseMembers = useMemo(() => {
    if (!classeId) return []
    const classe = classes.find((c) => c.id === Number(classeId))
    return classe?.members ?? []
  }, [classeId, classes])

  const filteredStudios = useMemo(() => {
    if (!modalityId) return studios
    return studios.filter((s) =>
      s.modalities.some((m) => m.id === Number(modalityId))
    )
  }, [modalityId, studios])

  const availableStudents = useMemo(() => {
    const takenIds = isEdit
      ? new Set(editParticipants.map((p) => p.student.id))
      : new Set(participants.map((p) => p.id))
    return allStudents.filter((s) => !takenIds.has(s.id))
  }, [isEdit, participants, editParticipants, allStudents])

  // Current roster excludes cancelled participants — drives both the list and
  // the live "Participantes" count in the summary.
  const currentParticipants = useMemo(
    () => editParticipants.filter((p) => isActiveParticipant(p.status)),
    [editParticipants]
  )

  const studentName = (s: UserResponse) =>
    [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email

  const reloadParticipants = async () => {
    if (!coaching) return
    const res = await apiClient.api
      .coachingsParticipantsList(coaching.id)
      .catch(() => null)
    if (res?.data) setEditParticipants(res.data)
  }

  const handleAddParticipantsEdit = async (students: StudentOption[]) => {
    setAddParticipantOpen(false)
    if (!coaching || students.length === 0) return
    setParticipantBusy(true)
    try {
      for (const s of students) {
        await apiClient.api.coachingsParticipantsCreate(coaching.id, {
          student_id: s.id,
        })
      }
      await reloadParticipants()
      toast.success(t('coachings.participantAdded'))
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setParticipantBusy(false)
    }
  }

  const handleRemoveParticipantEdit = async (
    participant: CoachingParticipant
  ) => {
    if (!coaching) return
    setParticipantBusy(true)
    try {
      await apiClient.api.coachingsParticipantsCancelCreate(
        coaching.id,
        participant.id,
        {}
      )
      await reloadParticipants()
      toast.success(t('coachings.participantRemoved'))
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setParticipantBusy(false)
    }
  }

  const toggleDay = (day: string) => {
    const current = selectedDays
    setValue(
      'recurrence.selected_days',
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day]
    )
  }

  const removeParticipant = (studentId: number) => {
    setParticipants((prev) => prev.filter((p) => p.id !== studentId))
  }

  const addParticipants = (students: StudentOption[]) => {
    setParticipants((prev) => {
      const existingIds = new Set(prev.map((p) => p.id))
      const newStudents = students.filter((s) => !existingIds.has(s.id))
      return [...prev, ...newStudents]
    })
    setAddParticipantOpen(false)
  }

  const loadClasseRoster = () => {
    if (selectedClasseMembers.length > 0) {
      addParticipants(selectedClasseMembers)
    }
  }

  const onSubmit = async (data: CoachingFormValues) => {
    setIsSaving(true)
    try {
      // Build a real local instant and send it as an ISO string with offset.
      // Sending a naive "YYYY-MM-DDTHH:mm" makes the UTC backend store the
      // wall-clock as UTC, which then renders an hour off in local time.
      const slot = buildCurrentSlot(data.date, data.start_time, data.end_time)
      if (!slot) {
        toast.error(t('coachings.invalidTimeRange'))
        setIsSaving(false)
        return
      }
      const startDatetime = slot.start.toISOString()
      const endDatetime = slot.end.toISOString()

      if (isEdit && coaching) {
        const payload: Record<string, unknown> = {
          modality_id: Number(data.modality_id),
          studio_id: Number(data.studio_id),
          total_price: data.total_price || '0.00',
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          notes: data.notes,
        }
        if (canChangeTeacher) {
          payload.teacher_id = Number(data.teacher_id)
        }
        if (billableEditable) {
          payload.is_billable = data.is_billable
        }
        await apiClient.api.coachingsPartialUpdate(coaching.id, payload)
        toast.success(t('coachings.updateSuccess'))
        navigate(paths.coachingsRequests)
        return
      }

      const payload = {
        modality_id: Number(data.modality_id),
        teacher_id: Number(data.teacher_id),
        studio_id: Number(data.studio_id),
        total_price: data.total_price || '0.00',
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        is_billable: data.is_billable,
        notes: data.notes,
        schedule: data.schedule,
        classe_id: classeId ? Number(classeId) : null,
        participant_ids: participants.map((p) => p.id),
        recurring_coaching: data.is_recurring
          ? {
              recurrence_type: data.recurrence
                .recurrence_type as RecurrenceTypeEnum,
              recurrence_interval: data.recurrence.recurrence_interval,
              days_of_week: data.recurrence.selected_days.join(','),
              end_date:
                data.recurrence.end_type === 'date' && data.recurrence.end_date
                  ? format(data.recurrence.end_date, 'yyyy-MM-dd')
                  : null,
              occurrences_count:
                data.recurrence.end_type === 'count'
                  ? data.recurrence.occurrences_count
                  : null,
            }
          : null,
      }

      await apiClient.api.coachingsCreate(payload)
      toast.success(t('coachings.createSuccess'))
      navigate(paths.coachings)
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    navigate(isEdit ? paths.coachingsRequests : paths.coachings)
  }

  const recurrenceSummary = useMemo(() => {
    if (!isRecurring) return null
    const periodLabel = t(`coachings.period.${recurrenceType}`, {
      count: recurrenceInterval,
    })
    const intervalText = `${recurrenceInterval} ${periodLabel}`
    const endText =
      endType === 'count'
        ? `${occurrencesCount} ${t('coachings.sessions')}`
        : `${t('coachings.until')} ${endDate ? format(endDate, 'dd/MM/yyyy', { locale: pt }) : '...'}`

    if (
      (recurrenceType === 'weekly' || recurrenceType === 'biweekly') &&
      selectedDays.length > 0
    ) {
      const dayNames = selectedDays
        .map((d) => {
          const key = DAYS_OF_WEEK.find((dw) => dw.value === d)?.labelKey
          return key ? t(key) : d
        })
        .join(', ')
      return `${t('coachings.every')} ${intervalText}, ${dayNames} — ${endText}`
    }
    return `${t('coachings.every')} ${intervalText} — ${endText}`
  }, [
    isRecurring,
    selectedDays,
    recurrenceType,
    recurrenceInterval,
    endType,
    occurrencesCount,
    endDate,
    t,
  ])

  const backTarget = isEdit ? paths.coachingsRequests : paths.coachings
  const headerTitle = isEdit
    ? t('coachings.editTitle')
    : t('coachings.scheduleTitle')

  const submitLabel = isEdit
    ? t('coachings.updateSession')
    : isRecurring
      ? t('coachings.createSeries')
      : t('coachings.createSession')

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
        <Button variant="outline" onClick={() => navigate(backTarget)}>
          {t('coachings.back')}
        </Button>
        <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
          {submitLabel}
        </Button>
      </div>
    </>
  )

  return (
    <PageLayout footer={footerContent}>
      <div className={PAGE_CONTENT}>
        <PageHeader title={headerTitle} backTo={backTarget} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Main Column */}
          <div className="flex flex-col gap-6">
            {/* Session Info */}
            <CardSection title={t('coachings.sessionInfo')}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="modality">{t('coachings.modality')}</Label>
                  <Controller
                    name="modality_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v)
                          if (!isEdit) {
                            setValue('teacher_id', '')
                            setValue('studio_id', '')
                          }
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
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="teacher">{t('coachings.teacher')}</Label>
                    <div className="flex gap-1.5 mt-1.5">
                      <Controller
                        name="teacher_id"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isEdit && !canChangeTeacher}
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
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!teacherId}
                        onClick={() => setAvailabilityOpen(true)}
                        title={t('coachings.availability.viewSchedule')}
                      >
                        <CalendarClock className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="studio">{t('coachings.studio')}</Label>
                    <Controller
                      name="studio_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
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
                                <span className="ml-2 text-muted-foreground">
                                  ({studio.max_capacity} max)
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                {!isEdit && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3">
                          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {t('coachings.scheduleDirectly')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('coachings.scheduleDirectlyDesc')}
                            </p>
                          </div>
                        </div>
                        <Controller
                          name="schedule"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {t('coachings.autoConfirm')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('coachings.autoConfirmDesc')}
                            </p>
                          </div>
                        </div>
                        <Controller
                          name="auto_confirm_participants"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardSection>

            {/* Schedule */}
            <CardSection title={t('coachings.schedule')}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="coaching-date">{t('coachings.date')}</Label>
                    <div className="mt-1.5" id="coaching-date">
                      <Controller
                        name="date"
                        control={control}
                        render={({ field }) => (
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('coachings.selectDate')}
                          />
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="coaching-start-time">
                      {t('coachings.startTime')}
                    </Label>
                    <div className="mt-1.5" id="coaching-start-time">
                      <Controller
                        name="start_time"
                        control={control}
                        render={({ field }) => (
                          <TimePicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="coaching-end-time">
                      {t('coachings.endTime')}
                    </Label>
                    <div className="mt-1.5" id="coaching-end-time">
                      <Controller
                        name="end_time"
                        control={control}
                        render={({ field }) => (
                          <TimePicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Inline availability hint */}
                <AvailabilityHint
                  teacherId={teacherId ? Number(teacherId) : null}
                  studioId={studioId ? Number(studioId) : null}
                  startDatetime={(() => {
                    const slot = buildCurrentSlot(date, startTime, endTime)
                    return slot ? slot.start.toISOString() : null
                  })()}
                  endDatetime={(() => {
                    const slot = buildCurrentSlot(date, startTime, endTime)
                    return slot ? slot.end.toISOString() : null
                  })()}
                  excludeCoachingId={isEdit && coaching ? coaching.id : null}
                  onOpenDrawer={() => setAvailabilityOpen(true)}
                />

                {!isEdit && (
                  <>
                    <Separator />

                    {/* Recurring toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <Repeat className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {t('coachings.recurringSession')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('coachings.recurringDesc')}
                          </p>
                        </div>
                      </div>
                      <Controller
                        name="is_recurring"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>

                    {/* Recurring options */}
                    {isRecurring && (
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="frequency">
                              {t('coachings.frequency')}
                            </Label>
                            <Controller
                              name="recurrence.recurrence_type"
                              control={control}
                              render={({ field }) => (
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger
                                    id="frequency"
                                    className="mt-1.5"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="daily">
                                      {t('coachings.daily')}
                                    </SelectItem>
                                    <SelectItem value="weekly">
                                      {t('coachings.weekly')}
                                    </SelectItem>
                                    <SelectItem value="biweekly">
                                      {t('coachings.biweekly')}
                                    </SelectItem>
                                    <SelectItem value="monthly">
                                      {t('coachings.monthly')}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div>
                            <Label htmlFor="interval">
                              {t('coachings.repeatEvery')}
                            </Label>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Controller
                                name="recurrence.recurrence_interval"
                                control={control}
                                render={({ field }) => (
                                  <Input
                                    id="interval"
                                    type="number"
                                    min={1}
                                    max={8}
                                    value={field.value}
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                    className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                )}
                              />
                              <span className="text-sm text-muted-foreground">
                                {t(`coachings.period.${recurrenceType}`, {
                                  count: recurrenceInterval,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Days of week — only for weekly/biweekly */}
                        {(recurrenceType === 'weekly' ||
                          recurrenceType === 'biweekly') && (
                          <div>
                            <Label htmlFor="coaching-days">
                              {t('coachings.daysOfWeek')}
                            </Label>
                            <div className="flex gap-1.5 mt-1.5">
                              {DAYS_OF_WEEK.map((day) => (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => toggleDay(day.value)}
                                  className={`h-11 w-11 rounded-md text-xs font-medium transition-colors ${
                                    selectedDays.includes(day.value)
                                      ? 'bg-primary text-primary-foreground'
                                      : 'border border-border bg-background text-foreground hover:bg-accent'
                                  }`}
                                >
                                  {t(day.labelKey)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* End condition */}
                        <div>
                          <Label htmlFor="when-ends">
                            {t('coachings.whenEnds')}
                          </Label>
                          <Controller
                            name="recurrence.end_type"
                            control={control}
                            render={({ field }) => (
                              <RadioGroup
                                id="when-ends"
                                value={field.value}
                                onValueChange={field.onChange}
                                className="mt-2 space-y-2"
                              >
                                <div
                                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                                    endType === 'count'
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border'
                                  }`}
                                >
                                  <RadioGroupItem
                                    value="count"
                                    id="end-count"
                                  />
                                  <div className="flex-1">
                                    <Label
                                      htmlFor="end-count"
                                      className="font-medium cursor-pointer"
                                    >
                                      {t('coachings.afterSessions')}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                      {t('coachings.afterSessionsDesc')}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Controller
                                      name="recurrence.occurrences_count"
                                      control={control}
                                      render={({ field }) => (
                                        <Input
                                          type="number"
                                          min={1}
                                          max={100}
                                          value={field.value}
                                          onChange={(e) =>
                                            field.onChange(
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      )}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {t('coachings.sessions')}
                                    </span>
                                  </div>
                                </div>

                                <div
                                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                                    endType === 'date'
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border'
                                  }`}
                                >
                                  <RadioGroupItem value="date" id="end-date" />
                                  <div className="flex-1">
                                    <Label
                                      htmlFor="end-date"
                                      className="font-medium cursor-pointer"
                                    >
                                      {t('coachings.onSpecificDate')}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                      {t('coachings.onSpecificDateDesc')}
                                    </p>
                                  </div>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Controller
                                      name="recurrence.end_date"
                                      control={control}
                                      render={({ field }) => (
                                        <DatePicker
                                          value={field.value}
                                          onChange={field.onChange}
                                          placeholder={t(
                                            'coachings.selectDate'
                                          )}
                                        />
                                      )}
                                    />
                                  </div>
                                </div>
                              </RadioGroup>
                            )}
                          />
                        </div>

                        {/* Summary */}
                        {recurrenceSummary && (
                          <div className="flex gap-3 rounded-lg border border-border bg-background p-3">
                            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium">
                                {t('coachings.pattern')}:
                              </p>
                              <p className="text-muted-foreground">
                                {recurrenceSummary}
                              </p>
                              <p className="text-muted-foreground mt-1">
                                {t('coachings.patternNote')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardSection>

            {/* Participants — create only */}
            {!isEdit && (
              <CardSection
                title={t('coachings.participants')}
                description={t('coachings.participantsDesc')}
              >
                <div className="space-y-4">
                  {/* Classe quick-fill */}
                  {classes.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label htmlFor="coaching-from-class">
                          {t('coachings.fromClasse')}
                        </Label>
                        <Select
                          value={classeId}
                          onValueChange={(v) => {
                            setClasseId(v)
                          }}
                        >
                          <SelectTrigger
                            id="coaching-from-class"
                            className="mt-1.5"
                          >
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-6"
                        disabled={
                          !classeId || selectedClasseMembers.length === 0
                        }
                        onClick={loadClasseRoster}
                      >
                        {t('coachings.loadRoster')}
                      </Button>
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
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(student.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {student.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
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
                      <UserPlus className="h-8 w-8 text-muted-foreground mb-2" />
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
            )}

            {/* Participants — edit mode (managed via dedicated endpoints) */}
            {isEdit && (
              <CardSection
                title={t('coachings.currentParticipants')}
                description={t('coachings.currentParticipantsDesc')}
              >
                <div className="space-y-4">
                  {currentParticipants.length > 0 ? (
                    <div className="space-y-2">
                      {currentParticipants.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 rounded-lg border border-border p-3"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(studentName(p.student))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {studentName(p.student)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {p.student.email}
                            </p>
                          </div>
                          {p.status && (
                            <Badge
                              className={cn(
                                'font-normal shrink-0',
                                PARTICIPANT_STATUS_STYLES[p.status]
                              )}
                            >
                              {t(`coachings.participantStatus.${p.status}`)}
                            </Badge>
                          )}
                          {isCancellableParticipantStatus(p.status) && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t('coachings.removeParticipant')}
                              disabled={participantBusy}
                              onClick={() => handleRemoveParticipantEdit(p)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <UserPlus className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t('coachings.noParticipants')}
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={participantBusy}
                    onClick={() => setAddParticipantOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('coachings.addParticipant')}
                  </Button>
                </div>
              </CardSection>
            )}

            {/* Notes */}
            <CardSection title={t('coachings.notes')}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    placeholder={t('coachings.notesPlaceholder')}
                    value={field.value}
                    onChange={field.onChange}
                    rows={3}
                  />
                )}
              />
            </CardSection>
          </div>

          {/* Side Column */}
          <div className="flex flex-col gap-6">
            {/* Billing */}
            <CardSection title={t('coachings.billing')}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="totalPrice">
                    {t('coachings.totalPrice')}
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {t('common.currencySymbol')}
                    </span>
                    <Controller
                      name="total_price"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="totalPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={field.value}
                          onChange={field.onChange}
                          className="pl-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      )}
                    />
                  </div>
                  {!isEdit && participants.length > 1 && totalPrice && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {t('coachings.pricePerParticipant', {
                        price: (
                          Number(totalPrice) / participants.length
                        ).toFixed(2),
                      })}
                    </p>
                  )}
                  {isEdit &&
                    coaching &&
                    coaching.participants.length > 1 &&
                    totalPrice && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {t('coachings.pricePerParticipant', {
                          price: (
                            Number(totalPrice) / coaching.participants.length
                          ).toFixed(2),
                        })}
                      </p>
                    )}
                </div>

                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {t('coachings.billable')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {billableLockedReason ?? t('coachings.billableDesc')}
                    </p>
                  </div>
                  <Controller
                    name="is_billable"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!billableEditable}
                      />
                    )}
                  />
                </div>
              </div>
            </CardSection>

            {/* Summary */}
            <CardSection title={t('coachings.summary')}>
              <div className="space-y-3">
                {isEdit && coaching?.status && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('coachingRequests.col.status')}
                      </span>
                      <StatusBadge status={coaching.status} />
                    </div>
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
                      ? teachers.find((tch) => tch.id === Number(teacherId))
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
                      ? format(date, 'dd/MM/yyyy', { locale: pt })
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
                {!isEdit && isRecurring && (
                  <div className="mt-1">
                    <Badge variant="secondary">
                      <Repeat className="h-3 w-3 mr-1" />
                      {t('coachings.recurring')}
                    </Badge>
                  </div>
                )}
                <Separator />
                <SummaryRow
                  label={t('coachings.participants')}
                  value={String(
                    isEdit ? currentParticipants.length : participants.length
                  )}
                />
                <SummaryRow
                  label={t('coachings.totalPrice')}
                  value={totalPrice ? `€${totalPrice}` : undefined}
                />
              </div>
            </CardSection>
          </div>
        </div>
      </div>

      {/* Add Participant Dialog — create adds to local state, edit persists via API */}
      <AddParticipantDialog
        open={addParticipantOpen}
        onClose={() => setAddParticipantOpen(false)}
        onAdd={isEdit ? handleAddParticipantsEdit : addParticipants}
        availableStudents={availableStudents}
      />

      {/* Teacher + Studio Availability */}
      {teacherId && (
        <TeacherStudioAvailabilityDialog
          open={availabilityOpen}
          onClose={() => setAvailabilityOpen(false)}
          teacherId={Number(teacherId)}
          teacherLabel={(() => {
            const teacher = teachers.find((tch) => tch.id === Number(teacherId))
            return teacher ? teacherName(teacher) : ''
          })()}
          studioId={studioId ? Number(studioId) : null}
          studioLabel={
            studioId
              ? studios.find((s) => s.id === Number(studioId))?.name
              : undefined
          }
          currentSlot={buildCurrentSlot(date, startTime, endTime)}
          excludeCoachingId={isEdit && coaching ? coaching.id : null}
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
              <Button variant="destructive" onClick={handleDiscard}>
                {t('coachings.discardConfirm')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span
        className="text-sm font-medium text-right min-w-0 break-words"
        title={value || undefined}
      >
        {value || <span className="text-muted-foreground/50">—</span>}
      </span>
    </div>
  )
}

const STATUS_STYLES: Record<string, string> = {
  requested:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  pending_approval:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  scheduled:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  waiting_confirmation:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  pending_completion_approval:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function StatusBadge({ status }: { status: CoachingClassStatusEnum }) {
  const { t } = useTranslation()
  return (
    <Badge className={cn('font-normal cursor-default', STATUS_STYLES[status])}>
      {t(`coachingRequests.status.${status}`)}
    </Badge>
  )
}
