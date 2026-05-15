import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Repeat,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type {
  Modality as ApiModality,
  Studio as ApiStudio,
  ExpandedSlot,
  TeacherSummary,
  UserResponse,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { CardSection } from '@/components/shared/CardSection'
import { DatePicker } from '@/components/shared/DatePicker'
import { TimePicker } from '@/components/shared/TimePicker'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { paths } from '@/app/paths'
import {
  createCoachingSchema,
  defaultCoachingValues,
  type CreateCoachingFormValues,
} from './create-coaching-schema'

type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly'

interface StudentOption {
  id: number
  name: string
  email: string
}

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

function userToStudent(u: UserResponse): StudentOption {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email
  return { id: u.id, name, email: u.email }
}

export function CreateCoachingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Reference data (loaded from API, not form fields)
  const [modalities, setModalities] = useState<ApiModality[]>([])
  const [studios, setStudios] = useState<ApiStudio[]>([])
  const [teachers, setTeachers] = useState<TeacherSummary[]>([])
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [classes, setClasses] = useState<ClasseOption[]>([])

  // UI state
  const [classeId, setClasseId] = useState<string>('')
  const [participants, setParticipants] = useState<StudentOption[]>([])
  const [addParticipantOpen, setAddParticipantOpen] = useState(false)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form
  const { control, handleSubmit, watch, setValue } =
    useForm<CreateCoachingFormValues>({
      resolver: zodResolver(createCoachingSchema),
      defaultValues: defaultCoachingValues,
    })

  const modalityId = watch('modality_id')
  const teacherId = watch('teacher_id')
  const studioId = watch('studio_id')
  const date = watch('date')
  const startTime = watch('start_time')
  const endTime = watch('end_time')
  const totalPrice = watch('total_price')
  const notes = watch('notes')
  const isBillable = watch('is_billable')
  const schedule = watch('schedule')
  const autoConfirmParticipants = watch('auto_confirm_participants')
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
      const [modalitiesRes, studiosRes, teachersRes, classesRes, usersRes] =
        await Promise.all([
          apiClient.api.modalitiesList().catch(() => null),
          apiClient.api.studiosList().catch(() => null),
          apiClient.api.accountsTeachersList().catch(() => null),
          apiClient.api.classesList().catch(() => null),
          apiClient.api.listUsers().catch(() => null),
        ])
      if (modalitiesRes?.data) setModalities(modalitiesRes.data)
      if (studiosRes?.data) setStudios(studiosRes.data)
      if (teachersRes?.data) setTeachers(teachersRes.data)
      if (classesRes?.data) {
        setClasses(
          classesRes.data.map((c) => ({
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
      if (usersRes?.data) {
        setAllStudents(usersRes.data.results.map(userToStudent))
      }
    }
    void load()
  }, [])

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
    const participantIds = new Set(participants.map((p) => p.id))
    return allStudents.filter((s) => !participantIds.has(s.id))
  }, [participants, allStudents])

  const toggleDay = (day: string) => {
    const current = selectedDays
    setValue(
      'recurrence.selected_days',
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day],
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

  const onSubmit = async (data: CreateCoachingFormValues) => {
    setIsSaving(true)

    try {
      const dateStr = format(data.date, 'yyyy-MM-dd')
      const startDatetime = `${dateStr}T${data.start_time}:00`
      const endDatetime = `${dateStr}T${data.end_time}:00`

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
              recurrence_type: data.recurrence.recurrence_type,
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
    navigate(paths.coachings)
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
        <Button variant="outline" onClick={() => navigate(paths.coachings)}>
          {t('coachings.back')}
        </Button>
        <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
          {isRecurring
            ? t('coachings.createSeries')
            : t('coachings.createSession')}
        </Button>
      </div>
    </>
  )

  return (
    <PageLayout footer={footerContent}>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          title={t('coachings.scheduleTitle')}
          backTo={paths.coachings}
        />

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
                          setValue('teacher_id', '')
                          setValue('studio_id', '')
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
                          <Select value={field.value} onValueChange={field.onChange}>
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
                        title={t('coachings.viewAvailability')}
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
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="studio" className="mt-1.5">
                            <SelectValue
                              placeholder={t('coachings.selectStudio')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredStudios.map((studio) => (
                              <SelectItem key={studio.id} value={String(studio.id)}>
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
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </div>
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
                          <TimePicker value={field.value} onChange={field.onChange} />
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
                          <TimePicker value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </div>
                  </div>
                </div>

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
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger id="frequency" className="mt-1.5">
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
                                onChange={(e) => field.onChange(Number(e.target.value))}
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
                          <RadioGroupItem value="count" id="end-count" />
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
                                  onChange={(e) => field.onChange(Number(e.target.value))}
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
                                  placeholder={t('coachings.selectDate')}
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
              </div>
            </CardSection>

            {/* Participants */}
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
                      disabled={!classeId || selectedClasseMembers.length === 0}
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
                  {participants.length > 1 && totalPrice && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {t('coachings.pricePerParticipant', {
                        price: (
                          Number(totalPrice) / participants.length
                        ).toFixed(2),
                      })}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {t('coachings.billable')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('coachings.billableDesc')}
                    </p>
                  </div>
                  <Controller
                    name="is_billable"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </div>
            </CardSection>

            {/* Summary */}
            <CardSection title={t('coachings.summary')}>
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
                {isRecurring && (
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
                  value={String(participants.length)}
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

      {/* Add Participant Dialog */}
      <AddParticipantDialog
        open={addParticipantOpen}
        onClose={() => setAddParticipantOpen(false)}
        onAdd={addParticipants}
        availableStudents={availableStudents}
      />

      {/* Teacher Availability */}
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
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
        {value || <span className="text-muted-foreground/50">—</span>}
      </span>
    </div>
  )
}

function AddParticipantDialog({
  open,
  onClose,
  onAdd,
  availableStudents,
}: {
  open: boolean
  onClose: () => void
  onAdd: (students: StudentOption[]) => void
  availableStudents: StudentOption[]
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return availableStudents
    const q = search.toLowerCase()
    return availableStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    )
  }, [availableStudents, search])

  const toggleStudent = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = () => {
    const students = availableStudents.filter((s) => selected.has(s.id))
    onAdd(students)
    setSelected(new Set())
    setSearch('')
  }

  const handleClose = () => {
    setSelected(new Set())
    setSearch('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('coachings.addParticipant')}</DialogTitle>
          <DialogDescription>
            {t('coachings.addParticipantDesc')}
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder={t('coachings.searchStudents')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.length > 0 ? (
            filtered.map((student) => (
              <label
                key={student.id}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(student.id)}
                  onCheckedChange={() => toggleStudent(student.id)}
                />
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(student.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {student.email}
                  </p>
                </div>
              </label>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('coachings.noStudentsFound')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('coachings.cancel')}
          </Button>
          <Button onClick={handleAdd} disabled={selected.size === 0}>
            {t('coachings.addSelected', { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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
                            {slot.notes && (
                              <p className="text-[11px] text-muted-foreground truncate italic mt-0.5">
                                {slot.notes}
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
                                <TooltipContent side="top" className="max-w-xs">
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
