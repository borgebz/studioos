import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  useForm,
  Controller,
  useWatch,
  type Resolver,
  type FieldErrors,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { SubmitArrow } from '@/components/shared/SubmitArrow'
import { format, differenceInCalendarDays } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Upload, X, CheckCircle2, Sun, Moon, Phone, Mail } from 'lucide-react'
import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type {
  EnrollmentPeriod,
  Modality as ApiModality,
  EnrollmentRead,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/shared/DatePicker'
import { CardSection } from '@/components/shared/CardSection'
import { LogoLoader, FullPageLoader } from '@/components/shared/LogoLoader'
import { toast } from 'sonner'
import { paths } from '@/app/paths'
import { useTheme } from '@/theme/ThemeProvider'
import {
  enrollmentSchema,
  enrollmentDefaults,
  type EnrollmentFormValues,
} from './enrollment-schema'

const COUNTRY_CODES = [
  { code: '+351', label: 'PT +351' },
  { code: '+34', label: 'ES +34' },
  { code: '+33', label: 'FR +33' },
  { code: '+44', label: 'GB +44' },
  { code: '+1', label: 'US +1' },
  { code: '+55', label: 'BR +55' },
  { code: '+49', label: 'DE +49' },
  { code: '+39', label: 'IT +39' },
]

const NATIONALITY_KEYS = [
  { value: 'Portuguesa', key: 'portuguese' },
  { value: 'Brasileira', key: 'brazilian' },
  { value: 'Espanhola', key: 'spanish' },
  { value: 'Francesa', key: 'french' },
  { value: 'Britânica', key: 'british' },
  { value: 'Outra', key: 'other' },
] as const

const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png|webp)$/i
const MAX_FILE_SIZE = 10 * 1024 * 1024

function formatBytes(n: number) {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
}

function periodTypeLabel(t: (key: string) => string, periodType?: string) {
  switch (periodType) {
    case 'both':
      return t('enrollments.periodNewAndRenewals')
    case 'new':
      return t('enrollments.periodNewOnly')
    case 'renewal':
      return t('enrollments.periodRenewalsOnly')
    default:
      return t('enrollments.periodNewAndRenewals')
  }
}

export function EnrollmentPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  // All currently-open periods. With the new single-open-period invariant on
  // the API there is at most one — but we keep this as an array so the UI still
  // works correctly if the invariant ever loosens, and so we can match the
  // user's chosen enrollment_type against a period whose period_type is
  // `both` or matches the type.
  const [periods, setPeriods] = useState<EnrollmentPeriod[]>([])
  const [modalities, setModalities] = useState<ApiModality[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [submitted, setSubmitted] = useState<EnrollmentRead | null>(null)
  // Tracks whether the parent has explicitly picked the enrollment type.
  // The form's default value is `"new"`, but we don't want to reveal the rest
  // of the form (or the price banner) until the choice is intentional.
  const [hasChosenType, setHasChosenType] = useState(false)

  const dataLoaded = useRef(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EnrollmentFormValues>({
    resolver: zodResolver(
      enrollmentSchema
    ) as unknown as Resolver<EnrollmentFormValues>,
    defaultValues: enrollmentDefaults,
  })

  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      try {
        const [periodsRes, modalitiesRes] = await Promise.all([
          // Public endpoint returns open periods only — exactly what we need
          // here. Closed periods are not visible to anonymous callers.
          apiClient.api.enrollmentsPeriodsList().catch(() => null),
          apiClient.api.modalitiesList().catch(() => null),
        ])
        const open = (periodsRes?.data ?? []).filter((p) => p.is_open)
        setPeriods(open)
        if (modalitiesRes?.data) setModalities(modalitiesRes.data)
      } finally {
        setIsLoadingData(false)
      }
    }
    void load()
  }, [])

  // Watch the form's enrollment_type so we can derive the matching period.
  const enrollmentType = useWatch({
    control,
    name: 'enrollment_type',
  }) as 'new' | 'renewal' | undefined

  // With the single-open-period invariant there is at most one open period;
  // we still treat `periods` as an array defensively.
  const openPeriod = periods[0] ?? null
  // A `both`-type period accepts either enrollment_type, so we know the pricing
  // applies regardless of the parent's pick — show the banner immediately.
  const isBothPeriod = openPeriod?.period_type === 'both'

  // The open period that matches the user's chosen enrollment_type. This is
  // what we submit against and what the banner renders pricing from.
  const matchingPeriod = useMemo<EnrollmentPeriod | null>(() => {
    if (!openPeriod || !enrollmentType) return null
    if (
      openPeriod.period_type === 'both' ||
      openPeriod.period_type === enrollmentType
    ) {
      return openPeriod
    }
    return null
  }, [openPeriod, enrollmentType])

  // Banner visibility rule:
  // - `both` periods → show as soon as we know the period (no pick needed).
  // - typed periods (`new` / `renewal`) → keep hidden until the parent
  //   explicitly clicks a radio, so the prices feel like an answer to the
  //   pick, not a fact that was always there.
  const showBanner = matchingPeriod !== null && (isBothPeriod || hasChosenType)

  // Inline empty state: type picked but the open period doesn't cover it.
  const typeHasNoPeriod = hasChosenType && openPeriod !== null && !matchingPeriod
  // True when there are no open periods at all (and we've finished loading).
  const noOpenPeriodAtAll = !isLoadingData && periods.length === 0

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const toggleLang = () => {
    const next = currentLang === 'pt' ? 'en' : 'pt'
    i18n.changeLanguage(next)
    localStorage.setItem('i18nextLng', next)
  }

  const addFiles = useCallback(
    (newFiles: File[]) => {
      for (const f of newFiles) {
        if (!ALLOWED_EXTENSIONS.test(f.name)) {
          toast.error(t('enrollments.filesInvalidType', { name: f.name }))
          return
        }
        if (f.size > MAX_FILE_SIZE) {
          toast.error(t('enrollments.filesTooLarge', { name: f.name }))
          return
        }
      }
      setFiles((prev) => [...prev, ...newFiles])
    },
    [t]
  )

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: EnrollmentFormValues) => {
    if (!matchingPeriod) {
      // Guardrail: submit button is gated behind matchingPeriod, but be defensive.
      toast.error(t('enrollments.periodClosedTitle'))
      return
    }
    try {
      const res = await apiClient.api.enrollmentsCreate({
        ...data,
        period_id: matchingPeriod.id,
        consent_rgpd: true,
        consent_internal_regulation: true,
      } as Parameters<typeof apiClient.api.enrollmentsCreate>[0])
      setSubmitted(res.data)
      toast.success(t('enrollments.successTitle'))
    } catch (err) {
      toast.error(
        parseApiError(err, t, 'enrollments.submissionFailed') ??
          t('enrollments.submissionFailed')
      )
    }
  }

  // Without this, a failed zod validation makes the submit button look dead:
  // `handleSubmit` swallows the click, `onSubmit` never runs, and on this long
  // multi-section form the offending error renders off-screen. Give the parent
  // explicit feedback and jump them to the first field that needs fixing.
  const onInvalid = (formErrors: FieldErrors<EnrollmentFormValues>) => {
    const firstKey = Object.keys(formErrors)[0]
    if (firstKey) {
      const el =
        document.querySelector<HTMLElement>(`[name="${firstKey}"]`) ??
        document.getElementById(firstKey)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus?.({ preventScroll: true })
    }
    toast.error(t('enrollments.validationToast'))
  }

  const daysLeft = matchingPeriod
    ? differenceInCalendarDays(new Date(matchingPeriod.end_date), new Date())
    : 0

  if (isLoadingData) {
    return (
      <main className="grain min-h-svh bg-background text-foreground flex items-center justify-center">
        <LogoLoader size={64} />
      </main>
    )
  }

  if (submitted) {
    return (
      <main className="grain min-h-svh bg-background text-foreground">
        <div className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center px-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-primary mb-6" />
          <h1 className="auth-heading auth-heading-sm mb-3 text-primary">
            {t('enrollments.successTitle')}
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            {t('enrollments.successRef', { id: submitted.id })}
          </p>
          <p className="text-muted-foreground mb-8 max-w-md">
            {t('enrollments.successBody', {
              email: submitted.parent_email,
            })}
          </p>
          <Button onClick={() => navigate(paths.home)}>
            {t('enrollments.successBack')}
          </Button>
        </div>
      </main>
    )
  }

  if (noOpenPeriodAtAll) {
    return (
      <main className="grain min-h-svh bg-background text-foreground">
        <div className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center px-6 text-center">
          <h1 className="auth-heading auth-heading-xs mb-4">
            {t('enrollments.periodClosedTitle')}
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            {t('enrollments.periodClosedBody')}
          </p>
          <Button variant="outline" onClick={() => navigate(paths.home)}>
            {t('enrollments.successBack')}
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="grain min-h-svh bg-background text-foreground">
      {isSubmitting && <FullPageLoader />}
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-primary text-3xl font-bold">
              StudioOS
            </span>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden sm:flex items-center gap-4 text-[10.5px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                +351 964 693 247
              </span>
              <span className="flex items-center gap-1">
                <Mail className="size-3" />
                geral@studioos.dev
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={toggleLang}
              >
                <span className="text-[10px] font-medium uppercase">
                  {currentLang}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <Sun className="size-3.5" />
                ) : (
                  <Moon className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-primary">
            <span className="auth-wordmark text-[17px] lowercase tracking-normal">
              01.
            </span>
            <span>{t('enrollments.overline')}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h1 className="auth-heading auth-heading-lg mb-3.5">
            {t('enrollments.heroTitle')}
            <em className="text-primary">{t('enrollments.heroTitleEm')}</em>
            {t('enrollments.heroTitle2')}
          </h1>
          <p className="max-w-[50ch] text-[14.5px] leading-relaxed text-muted-foreground">
            {t('enrollments.heroBody')}
          </p>
        </div>

        {/* Form */}
        <form
          id="enrollment-form"
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="flex flex-col gap-6"
        >
          {/* 1. Enrollment Type */}
          <CardSection title={t('enrollments.enrollmentType')}>
            <Controller
              control={control}
              name="enrollment_type"
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      value: 'new' as const,
                      title: t('enrollments.newStudent'),
                      desc: t('enrollments.newStudentDesc'),
                    },
                    {
                      value: 'renewal' as const,
                      title: t('enrollments.renewal'),
                      desc: t('enrollments.renewalDesc'),
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                        hasChosenType && field.value === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={hasChosenType && field.value === opt.value}
                        onChange={() => {
                          field.onChange(opt.value)
                          setHasChosenType(true)
                        }}
                      />
                      <div
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                          hasChosenType && field.value === opt.value
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/40'
                        }`}
                      >
                        {hasChosenType && field.value === opt.value && (
                          <div className="flex h-full items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{opt.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {opt.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            />
          </CardSection>

          {/* Contextual price banner.
              - `both` periods: shown immediately (parents see the prices that
                apply regardless of which type they pick).
              - `new`/`renewal` periods: hidden until the parent explicitly
                picks a type, so the prices read as a response to the pick.
              All pricing data is already loaded from the periods endpoint —
              no extra fetch. */}
          {showBanner && matchingPeriod && (
            <div className="relative rounded-lg border border-primary/20 bg-background p-5 before:absolute before:inset-0 before:rounded-lg before:bg-primary/5">
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {t('enrollments.periodOpen')} ·{' '}
                      {format(new Date(matchingPeriod.start_date), 'dd MMM', {
                        locale: currentLang === 'pt' ? pt : undefined,
                      })}{' '}
                      →{' '}
                      {format(
                        new Date(matchingPeriod.end_date),
                        'dd MMM yyyy',
                        {
                          locale: currentLang === 'pt' ? pt : undefined,
                        }
                      )}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {periodTypeLabel(t, matchingPeriod.period_type)}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {matchingPeriod.enrollment_fee && (
                      <span>
                        {t('enrollments.enrollmentFee')} ·{' '}
                        <b className="text-foreground">
                          €{matchingPeriod.enrollment_fee}
                        </b>
                      </span>
                    )}
                    {matchingPeriod.insurance_general && (
                      <span>
                        {t('enrollments.insuranceGeneral')} ·{' '}
                        <b className="text-foreground">
                          €{matchingPeriod.insurance_general}
                        </b>
                      </span>
                    )}
                    {matchingPeriod.insurance_intensive && (
                      <span>
                        {t('enrollments.insuranceIntensive')} ·{' '}
                        <b className="text-foreground">
                          €{matchingPeriod.insurance_intensive}
                        </b>
                      </span>
                    )}
                  </div>
                </div>
                {daysLeft > 0 && (
                  <div className="text-right">
                    <span className="text-2xl font-semibold tabular-nums">
                      {daysLeft}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t('enrollments.daysLeft')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inline empty state — type picked but no open period covers it. */}
          {typeHasNoPeriod && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
              <p className="text-sm font-medium">
                {t('enrollments.noPeriodForTypeTitle')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('enrollments.noPeriodForTypeBody')}
              </p>
            </div>
          )}

          {/* Sections 2–7 stay visible whenever there is an open period at
              all — the parent can fill the form even before picking a type.
              Submit stays disabled until a matching period is resolved. */}
          {/* 2. Student Information */}
          <CardSection
            title={t('enrollments.studentInfo')}
            description={t('enrollments.studentInfoDesc')}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="student_name">
                  {t('enrollments.studentName')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="student_name"
                  className="mt-1.5"
                  placeholder={t('enrollments.studentNamePlaceholder')}
                  {...register('student_name')}
                />
                {errors.student_name && (
                  <p className="text-sm text-destructive mt-1">
                    {t(errors.student_name.message!)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student_email">
                    {t('enrollments.studentEmail')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="student_email"
                    type="email"
                    className="mt-1.5"
                    placeholder={t('enrollments.studentEmailPlaceholder')}
                    {...register('student_email')}
                  />
                  {errors.student_email ? (
                    <p className="text-sm text-destructive mt-1">
                      {t(errors.student_email.message!)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('enrollments.studentEmailHelper')}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="student_date_of_birth">
                    {t('enrollments.dateOfBirth')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="student_date_of_birth"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) =>
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                        }
                        className="mt-1.5"
                      />
                    )}
                  />
                  {errors.student_date_of_birth && (
                    <p className="text-sm text-destructive mt-1">
                      {t(errors.student_date_of_birth.message!)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student_nif">{t('enrollments.nif')}</Label>
                  <Input
                    id="student_nif"
                    className="mt-1.5"
                    placeholder={t('enrollments.nifPlaceholder')}
                    {...register('student_nif')}
                  />
                </div>
                <div>
                  <Label htmlFor="student_nationality">
                    {t('enrollments.nationality')}
                  </Label>
                  <Controller
                    control={control}
                    name="student_nationality"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="student_nationality"
                          className="mt-1.5"
                        >
                          <SelectValue
                            placeholder={t(
                              'enrollments.nationalityPlaceholder'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {NATIONALITY_KEYS.map((n) => (
                            <SelectItem key={n.value} value={n.value}>
                              {t(`nationalities.${n.key}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student_document_number">
                    {t('enrollments.documentNumber')}
                  </Label>
                  <Input
                    id="student_document_number"
                    className="mt-1.5"
                    placeholder={t('enrollments.documentNumberPlaceholder')}
                    {...register('student_document_number')}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('enrollments.documentNumberHelper')}
                  </p>
                </div>
                <div>
                  <Label htmlFor="student_document_expiry">
                    {t('enrollments.documentExpiry')}
                  </Label>
                  <Controller
                    control={control}
                    name="student_document_expiry"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date) =>
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                        }
                        className="mt-1.5"
                      />
                    )}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">{t('enrollments.address')}</Label>
                <Textarea
                  id="address"
                  className="mt-1.5"
                  rows={2}
                  placeholder={t('enrollments.addressPlaceholder')}
                  {...register('address')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postal_code">
                    {t('enrollments.postalCode')}
                  </Label>
                  <Input
                    id="postal_code"
                    className="mt-1.5"
                    placeholder={t('enrollments.postalCodePlaceholder')}
                    {...register('postal_code')}
                  />
                </div>
                <div />
              </div>
            </div>
          </CardSection>

          {/* 3. Guardian / Parent */}
          <CardSection
            title={t('enrollments.guardianInfo')}
            description={t('enrollments.guardianInfoDesc')}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="parent_name">
                  {t('enrollments.parentName')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="parent_name"
                  className="mt-1.5"
                  placeholder={t('enrollments.parentNamePlaceholder')}
                  {...register('parent_name')}
                />
                {errors.parent_name && (
                  <p className="text-sm text-destructive mt-1">
                    {t(errors.parent_name.message!)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="parent_email">
                    {t('enrollments.parentEmail')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="parent_email"
                    type="email"
                    className="mt-1.5"
                    placeholder={t('enrollments.parentEmailPlaceholder')}
                    {...register('parent_email')}
                  />
                  {errors.parent_email && (
                    <p className="text-sm text-destructive mt-1">
                      {t(errors.parent_email.message!)}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="parent_phone">
                    {t('enrollments.parentPhone')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <Controller
                      control={control}
                      name="parent_phone_country_code"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-[110px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_CODES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Input
                      id="parent_phone"
                      inputMode="tel"
                      placeholder={t('enrollments.parentPhonePlaceholder')}
                      {...register('parent_phone')}
                    />
                  </div>
                  {errors.parent_phone && (
                    <p className="text-sm text-destructive mt-1">
                      {t(errors.parent_phone.message!)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardSection>

          {/* 4. Modalities */}
          <CardSection
            title={t('enrollments.modalities')}
            description={t('enrollments.modalitiesDesc')}
          >
            <Controller
              control={control}
              name="modality_ids"
              render={({ field }) => (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {modalities.map((m) => {
                      const isSelected = field.value.includes(m.id)
                      return (
                        <label
                          key={m.id}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'border-border hover:bg-accent'
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, m.id])
                              } else {
                                field.onChange(
                                  field.value.filter((id) => id !== m.id)
                                )
                              }
                            }}
                          />
                          {m.name}
                        </label>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t('enrollments.modalitiesFooter')}</span>
                    <span>
                      {t('enrollments.selected')} ·{' '}
                      <b className="text-foreground">{field.value.length}</b>
                    </span>
                  </div>
                </div>
              )}
            />
            {errors.modality_ids && (
              <p className="text-sm text-destructive mt-2">
                {t(errors.modality_ids.message!)}
              </p>
            )}
          </CardSection>

          {/* 5. Dance History & Notes */}
          <CardSection
            title={t('enrollments.danceHistory')}
            description={t('enrollments.danceHistoryDesc')}
          >
            <div>
              <Textarea
                rows={4}
                placeholder={t('enrollments.danceHistoryPlaceholder')}
                {...register('historical_notes')}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t('enrollments.danceHistoryHelper')}
              </p>
            </div>
          </CardSection>

          {/* 6. File Attachments */}
          <CardSection
            title={t('enrollments.files')}
            description={t('enrollments.filesDesc')}
          >
            <div className="space-y-3">
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add(
                    'border-primary/40',
                    'bg-primary/5'
                  )
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove(
                    'border-primary/40',
                    'bg-primary/5'
                  )
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove(
                    'border-primary/40',
                    'bg-primary/5'
                  )
                  addFiles(Array.from(e.dataTransfer.files || []))
                }}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm">
                  {t('enrollments.filesDropzone')}{' '}
                  <label className="cursor-pointer font-medium text-primary hover:underline">
                    {t('enrollments.filesBrowse')}
                    <input
                      type="file"
                      className="sr-only"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) =>
                        addFiles(Array.from(e.target.files || []))
                      }
                    />
                  </label>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('enrollments.filesHelper')}
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                    >
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        {(f.name.split('.').pop() || 'FILE').slice(0, 4)}
                      </span>
                      <span className="flex-1 truncate text-sm">{f.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatBytes(f.size)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeFile(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardSection>

          {/* 7. Consents */}
          <CardSection
            title={t('enrollments.consents')}
            description={t('enrollments.consentsDesc')}
          >
            <div className="space-y-4">
              <Controller
                control={control}
                name="consent_rgpd"
                render={({ field }) => (
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm">
                          {t('enrollments.consentRgpd')}{' '}
                          <a
                            href="#gdpr"
                            className="font-medium text-primary hover:underline"
                          >
                            {t('enrollments.consentRgpdLink')}
                          </a>
                          .
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('enrollments.consentRgpdHelper')}
                        </p>
                      </div>
                    </label>
                    {errors.consent_rgpd && (
                      <p className="text-sm text-destructive mt-1 ml-7">
                        {t(errors.consent_rgpd.message!)}
                      </p>
                    )}
                  </div>
                )}
              />

              <Controller
                control={control}
                name="consent_internal_regulation"
                render={({ field }) => (
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm">
                          {t('enrollments.consentRegulation')}{' '}
                          <a
                            href="#regulation"
                            className="font-medium text-primary hover:underline"
                          >
                            {t('enrollments.consentRegulationLink')}
                          </a>
                          .
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('enrollments.consentRegulationHelper')}
                        </p>
                      </div>
                    </label>
                    {errors.consent_internal_regulation && (
                      <p className="text-sm text-destructive mt-1 ml-7">
                        {t(errors.consent_internal_regulation.message!)}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </CardSection>
        </form>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(paths.home)}
          >
            {t('enrollments.cancel')}
          </Button>
          <Button
            type="submit"
            form="enrollment-form"
            disabled={isSubmitting || !matchingPeriod}
          >
            {isSubmitting
              ? t('enrollments.submitting')
              : t('enrollments.submit')}
            {!isSubmitting && <SubmitArrow />}
          </Button>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border bg-background px-6 py-3 text-center text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        &copy; {new Date().getFullYear()} StudioOS &middot; Braga
      </div>
    </main>
  )
}
