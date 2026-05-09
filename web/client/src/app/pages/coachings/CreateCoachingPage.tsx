import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  Info,
  Repeat,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { apiClient } from '@/api/api-client'
import type {
  Modality as ApiModality,
  Studio as ApiStudio,
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
import { toast } from 'sonner'
import { paths } from '@/app/paths'

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
  { value: 'MO', label: 'Seg' },
  { value: 'TU', label: 'Ter' },
  { value: 'WE', label: 'Qua' },
  { value: 'TH', label: 'Qui' },
  { value: 'FR', label: 'Sex' },
  { value: 'SA', label: 'Sáb' },
  { value: 'SU', label: 'Dom' },
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

  const [modalities, setModalities] = useState<ApiModality[]>([])
  const [studios, setStudios] = useState<ApiStudio[]>([])
  const [teachers, setTeachers] = useState<TeacherSummary[]>([])
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [classes, setClasses] = useState<ClasseOption[]>([])

  const [modalityId, setModalityId] = useState<string>('')
  const [teacherId, setTeacherId] = useState<string>('')
  const [studioId, setStudioId] = useState<string>('')
  const [date, setDate] = useState<Date | undefined>()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [isBillable, setIsBillable] = useState(true)
  const [schedule, setSchedule] = useState(true)
  const [autoConfirmParticipants, setAutoConfirmParticipants] = useState(true)
  const [classeId, setClasseId] = useState<string>('')

  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [endType, setEndType] = useState<'count' | 'date'>('count')
  const [occurrencesCount, setOccurrencesCount] = useState(8)
  const [endDate, setEndDate] = useState<Date | undefined>()

  const [participants, setParticipants] = useState<StudentOption[]>([])
  const [addParticipantOpen, setAddParticipantOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      const [modalitiesRes, studiosRes, teachersRes, classesRes, usersRes] = await Promise.all([
        apiClient.api.apiModalitiesList().catch(() => null),
        apiClient.api.apiStudiosList().catch(() => null),
        apiClient.api.apiAccountsTeachersList().catch(() => null),
        apiClient.api.apiClassesList().catch(() => null),
        apiClient.api.apiAccountsUsersList().catch(() => null),
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
              const name = [m.student.first_name, m.student.last_name].filter(Boolean).join(' ') || m.student.email
              return { id: m.student.id, name, email: m.student.email }
            }),
          })),
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
      s.modalities.some((m) => m.id === Number(modalityId)),
    )
  }, [modalityId, studios])

  const availableStudents = useMemo(() => {
    const participantIds = new Set(participants.map((p) => p.id))
    return allStudents.filter((s) => !participantIds.has(s.id))
  }, [participants, allStudents])

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
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

  const handleSave = async () => {
    const missing: string[] = []
    if (!modalityId) missing.push(t('coachings.modality'))
    if (!teacherId) missing.push(t('coachings.teacher'))
    if (!studioId) missing.push(t('coachings.studio'))
    if (!date) missing.push(t('coachings.date'))
    if (!startTime) missing.push(t('coachings.startTime'))
    if (!endTime) missing.push(t('coachings.endTime'))
    if (missing.length > 0) {
      toast.warning(t('coachings.missingFields'), { description: missing.join(', ') })
      return
    }

    setIsSaving(true)

    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const startDatetime = `${dateStr}T${startTime}:00`
      const endDatetime = `${dateStr}T${endTime}:00`

      const payload = {
        modality_id: Number(modalityId),
        teacher_id: Number(teacherId),
        studio_id: Number(studioId),
        total_price: totalPrice || '0.00',
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        is_billable: isBillable,
        notes,
        schedule,
        classe_id: classeId ? Number(classeId) : null,
        recurring_coaching: isRecurring
          ? {
              recurrence_type: recurrenceType,
              recurrence_interval: recurrenceInterval,
              days_of_week: selectedDays.join(','),
              end_date: endType === 'date' && endDate ? format(endDate, 'yyyy-MM-dd') : null,
              occurrences_count: endType === 'count' ? occurrencesCount : null,
            }
          : null,
      }

      const res = await apiClient.api.apiCoachingsCreate(payload)
      const coachingId = res.data.id

      if (participants.length > 0) {
        await Promise.all(
          participants.map((p) =>
            apiClient.api.apiCoachingsParticipantsCreate(coachingId, { student_id: p.id }),
          ),
        )
      }

      toast.success(t('coachings.createSuccess'))
      navigate(paths.coachings)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.login.error')
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    navigate(paths.coachings)
  }

  const recurrenceSummary = useMemo(() => {
    if (!isRecurring) return null
    const periodLabel = t(`coachings.period.${recurrenceType}`, { count: recurrenceInterval })
    const intervalText = `${recurrenceInterval} ${periodLabel}`
    const endText =
      endType === 'count'
        ? `${occurrencesCount} ${t('coachings.sessions')}`
        : `${t('coachings.until')} ${endDate ? format(endDate, 'dd/MM/yyyy', { locale: pt }) : '...'}`

    if ((recurrenceType === 'weekly' || recurrenceType === 'biweekly') && selectedDays.length > 0) {
      const dayNames = selectedDays
        .map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label)
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
        <Button onClick={handleSave} disabled={isSaving}>
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
                <Label htmlFor="modality">
                  {t('coachings.modality')}
                </Label>
                <Select value={modalityId} onValueChange={(v) => {
                  setModalityId(v)
                  setTeacherId('')
                  setStudioId('')
                }}>
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
                  <Label htmlFor="teacher">
                    {t('coachings.teacher')}
                  </Label>
                  <Select value={teacherId} onValueChange={setTeacherId}>
                    <SelectTrigger id="teacher" className="mt-1.5">
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
                </div>

                <div>
                  <Label htmlFor="studio">
                    {t('coachings.studio')}
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
                          <span className="ml-2 text-muted-foreground">
                            ({studio.max_capacity} max)
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Switch
                    checked={schedule}
                    onCheckedChange={setSchedule}
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
                  <Switch
                    checked={autoConfirmParticipants}
                    onCheckedChange={setAutoConfirmParticipants}
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
                  <Label>{t('coachings.date')}</Label>
                  <div className="mt-1.5">
                    <DatePicker
                      value={date}
                      onChange={setDate}
                      placeholder={t('coachings.selectDate')}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('coachings.startTime')}</Label>
                  <div className="mt-1.5">
                    <TimePicker
                      value={startTime}
                      onChange={setStartTime}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('coachings.endTime')}</Label>
                  <div className="mt-1.5">
                    <TimePicker
                      value={endTime}
                      onChange={setEndTime}
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
                <Switch
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {/* Recurring options */}
              {isRecurring && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('coachings.frequency')}</Label>
                      <Select
                        value={recurrenceType}
                        onValueChange={(v) =>
                          setRecurrenceType(v as RecurrenceType)
                        }
                      >
                        <SelectTrigger className="mt-1.5">
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
                    </div>
                    <div>
                      <Label htmlFor="interval">
                        {t('coachings.repeatEvery')}
                      </Label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Input
                          id="interval"
                          type="number"
                          min={1}
                          max={8}
                          value={recurrenceInterval}
                          onChange={(e) =>
                            setRecurrenceInterval(Number(e.target.value))
                          }
                          className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-sm text-muted-foreground">
                          {t(`coachings.period.${recurrenceType}`, { count: recurrenceInterval })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Days of week — only for weekly/biweekly */}
                  {(recurrenceType === 'weekly' || recurrenceType === 'biweekly') && (
                  <div>
                    <Label>{t('coachings.daysOfWeek')}</Label>
                    <div className="flex gap-1.5 mt-1.5">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`h-9 w-9 rounded-md text-xs font-medium transition-colors ${
                            selectedDays.includes(day.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border bg-background text-foreground hover:bg-accent'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* End condition */}
                  <div>
                    <Label>{t('coachings.whenEnds')}</Label>
                    <RadioGroup
                      value={endType}
                      onValueChange={(v) =>
                        setEndType(v as 'count' | 'date')
                      }
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
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={occurrencesCount}
                            onChange={(e) =>
                              setOccurrencesCount(Number(e.target.value))
                            }
                            className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onClick={(e) => e.stopPropagation()}
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
                          <DatePicker
                            value={endDate}
                            onChange={setEndDate}
                            placeholder={t('coachings.selectDate')}
                          />
                        </div>
                      </div>
                    </RadioGroup>
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
                    <Label>{t('coachings.fromClasse')}</Label>
                    <Select
                      value={classeId}
                      onValueChange={(v) => {
                        setClasseId(v)
                      }}
                    >
                      <SelectTrigger className="mt-1.5">
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
            <Textarea
              placeholder={t('coachings.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
                    €
                  </span>
                  <Input
                    id="totalPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    className="pl-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                <Switch
                  checked={isBillable}
                  onCheckedChange={setIsBillable}
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
                    ? modalities.find((m) => m.id === Number(modalityId))?.name
                    : undefined
                }
              />
              <SummaryRow
                label={t('coachings.teacher')}
                value={
                  teacherId
                    ? teacherName(teachers.find((t) => t.id === Number(teacherId))!)
                    : undefined
                }
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
                value={date ? format(date, 'dd/MM/yyyy', { locale: pt }) : undefined}
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

    {/* Discard Confirmation */}
    <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('coachings.discardTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('coachings.discardDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('coachings.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDiscard}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {t('coachings.discardConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </PageLayout>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
        {value || (
          <span className="text-muted-foreground/50">—</span>
        )}
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
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
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
                  <p className="text-sm font-medium truncate">
                    {student.name}
                  </p>
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
