import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  EnrollmentPeriod,
  PatchedEnrollmentPeriod,
} from '@/api/studioos-api'
import { PeriodTypeEnum } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CardSection } from '@/components/shared/CardSection'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { DatePicker } from '@/components/shared/DatePicker'
import { usePermissions } from '@/auth/permissions'
import { parseApiError } from '@/lib/api-errors'
import { cn } from '@/lib/utils'
import { paths } from '@/app/paths'

const ACADEMIC_YEAR_RE = /^\d{4}\/\d{4}$/

const formSchema = z.object({
  academic_year: z
    .string()
    .trim()
    .regex(ACADEMIC_YEAR_RE, 'invalid'),
  period_type: z.nativeEnum(PeriodTypeEnum),
  start_date: z.date(),
  end_date: z.date(),
  enrollment_fee: z.string().trim().optional().default(''),
  insurance_general: z.string().trim().optional().default(''),
  insurance_intensive: z.string().trim().optional().default(''),
})

type FormValues = z.input<typeof formSchema>

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map((x) => Number(x))
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function decimalOrNull(s: string): string | null {
  const trimmed = s.trim()
  if (!trimmed) return null
  return trimmed
}

interface EnrollmentPeriodFormPageProps {
  mode: 'create' | 'edit'
}

export function EnrollmentPeriodFormPage({
  mode,
}: EnrollmentPeriodFormPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : NaN
  const { can } = usePermissions()

  const canManage = can('enrollments.can_manage_periods')

  const [loading, setLoading] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [period, setPeriod] = useState<EnrollmentPeriod | null>(null)
  const dataLoaded = useRef<number | null>(null)

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      academic_year: '',
      period_type: PeriodTypeEnum.New,
      start_date: undefined as unknown as Date,
      end_date: undefined as unknown as Date,
      enrollment_fee: '',
      insurance_general: '',
      insurance_intensive: '',
    },
  })
  const { register, handleSubmit, reset, control, formState } = form

  useEffect(() => {
    if (mode === 'create') return
    if (!Number.isFinite(numericId)) return
    if (dataLoaded.current === numericId) return
    dataLoaded.current = numericId
    const load = async () => {
      setLoading(true)
      const res = await apiClient.api
        .enrollmentsPeriodsRetrieve(numericId)
        .catch(() => null)
      if (res?.data) {
        const p = res.data
        setPeriod(p)
        reset({
          academic_year: p.academic_year,
          period_type: p.period_type ?? PeriodTypeEnum.New,
          start_date: parseIsoDate(p.start_date),
          end_date: parseIsoDate(p.end_date),
          enrollment_fee: p.enrollment_fee ?? '',
          insurance_general: p.insurance_general ?? '',
          insurance_intensive: p.insurance_intensive ?? '',
        })
      }
      setLoading(false)
    }
    void load()
  }, [mode, numericId, reset])

  const handleToggleOpen = async () => {
    if (!period) return
    try {
      const res = period.is_open
        ? await apiClient.api.enrollmentsPeriodsCloseCreate(period.id)
        : await apiClient.api.enrollmentsPeriodsOpenCreate(period.id)
      if (res.data) {
        setPeriod(res.data)
        toast.success(
          period.is_open
            ? t('enrollmentPeriods.closeSuccess')
            : t('enrollmentPeriods.openSuccess')
        )
      }
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    }
  }

  const onSubmit = async (vals: FormValues) => {
    setSubmitting(true)
    try {
      const parsed = formSchema.parse(vals)
      const basePayload = {
        academic_year: parsed.academic_year,
        period_type: parsed.period_type,
        start_date: toIsoDate(parsed.start_date),
        end_date: toIsoDate(parsed.end_date),
        enrollment_fee: decimalOrNull(parsed.enrollment_fee ?? ''),
        insurance_general: decimalOrNull(parsed.insurance_general ?? ''),
        insurance_intensive: decimalOrNull(parsed.insurance_intensive ?? ''),
      }

      if (mode === 'create') {
        const res = await apiClient.api.enrollmentsPeriodsCreateCreate(
          basePayload as unknown as EnrollmentPeriod
        )
        toast.success(t('enrollmentPeriods.saveSuccess'))
        if (res.data?.id) {
          navigate(
            paths.enrollmentPeriodEdit.replace(':id', String(res.data.id))
          )
        } else {
          navigate(paths.enrollmentPeriods)
        }
      } else {
        const patch: PatchedEnrollmentPeriod = basePayload
        const res = await apiClient.api.enrollmentsPeriodsPartialUpdate(
          numericId,
          patch
        )
        if (res.data) setPeriod(res.data)
        toast.success(t('enrollmentPeriods.saveSuccess'))
      }
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    mode === 'create'
      ? t('enrollmentPeriods.form.createTitle')
      : t('enrollmentPeriods.form.editTitle')

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={title} backTo={paths.enrollmentPeriods} />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageLayout>
    )
  }

  const isOpen = period?.is_open ?? false

  const footer = (
    <>
      <Button
        variant="outline"
        type="button"
        onClick={() => navigate(paths.enrollmentPeriods)}
        disabled={submitting}
      >
        {t('common.back')}
      </Button>
      <Button type="submit" form="page-form" disabled={submitting}>
        {t('common.save')}
      </Button>
    </>
  )

  return (
    <PageLayout footer={footer}>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={title} backTo={paths.enrollmentPeriods} />

          <form
            id="page-form"
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6"
          >
            <div className="space-y-6">
              <CardSection title={t('enrollmentPeriods.form.general')}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label
                        htmlFor="academic_year"
                        className="mb-1.5 block"
                      >
                        {t('enrollmentPeriods.form.academicYearLabel')}{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="academic_year"
                        placeholder="2026/2027"
                        {...register('academic_year')}
                      />
                      {formState.errors.academic_year && (
                        <p className="mt-1 text-xs text-destructive">
                          {t('enrollmentPeriods.form.academicYearHint')}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="mb-1.5 block">
                        {t('enrollmentPeriods.form.periodTypeLabel')}{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Controller
                        control={control}
                        name="period_type"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(v) =>
                              field.onChange(v as PeriodTypeEnum)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={PeriodTypeEnum.New}>
                                {t('enrollmentPeriods.type.new')}
                              </SelectItem>
                              <SelectItem value={PeriodTypeEnum.Renewal}>
                                {t('enrollmentPeriods.type.renewal')}
                              </SelectItem>
                              <SelectItem value={PeriodTypeEnum.Both}>
                                {t('enrollmentPeriods.type.both')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block">
                        {t('enrollmentPeriods.form.startDate')}{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Controller
                        control={control}
                        name="start_date"
                        render={({ field }) => (
                          <DatePicker
                            value={field.value ?? undefined}
                            onChange={(d) =>
                              field.onChange(d ?? (undefined as unknown as Date))
                            }
                          />
                        )}
                      />
                      {formState.errors.start_date && (
                        <p className="mt-1 text-xs text-destructive">
                          {t('validation.required')}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="mb-1.5 block">
                        {t('enrollmentPeriods.form.endDate')}{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Controller
                        control={control}
                        name="end_date"
                        render={({ field }) => (
                          <DatePicker
                            value={field.value ?? undefined}
                            onChange={(d) =>
                              field.onChange(d ?? (undefined as unknown as Date))
                            }
                          />
                        )}
                      />
                      {formState.errors.end_date && (
                        <p className="mt-1 text-xs text-destructive">
                          {t('validation.required')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardSection>

              <CardSection
                title={t('enrollmentPeriods.form.feesSection')}
                description={t('enrollmentPeriods.form.feesHint')}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="enrollment_fee" className="mb-1.5 block">
                      {t('enrollmentPeriods.form.enrollmentFee')}
                    </Label>
                    <Input
                      id="enrollment_fee"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...register('enrollment_fee')}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="insurance_general"
                      className="mb-1.5 block"
                    >
                      {t('enrollmentPeriods.form.insuranceGeneral')}
                    </Label>
                    <Input
                      id="insurance_general"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...register('insurance_general')}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="insurance_intensive"
                      className="mb-1.5 block"
                    >
                      {t('enrollmentPeriods.form.insuranceIntensive')}
                    </Label>
                    <Input
                      id="insurance_intensive"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...register('insurance_intensive')}
                    />
                  </div>
                </div>
              </CardSection>
            </div>

            <div className="space-y-6">
              {mode === 'edit' && period && (
                <CardSection title={t('enrollmentPeriods.form.statusSection')}>
                  <div className="flex flex-col gap-3">
                    <Badge
                      className={cn(
                        'self-start font-normal',
                        isOpen
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isOpen ? (
                        <>
                          <Check className="size-3" />
                          {t('enrollmentPeriods.statusOpen')}
                        </>
                      ) : (
                        <>
                          <X className="size-3" />
                          {t('enrollmentPeriods.statusClosed')}
                        </>
                      )}
                    </Badge>
                    {canManage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleToggleOpen}
                      >
                        {isOpen
                          ? t('enrollmentPeriods.close')
                          : t('enrollmentPeriods.open')}
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {isOpen
                        ? t('enrollmentPeriods.form.openHint')
                        : t('enrollmentPeriods.form.closedHint')}
                    </p>
                  </div>
                </CardSection>
              )}
            </div>
          </form>
      </div>
    </PageLayout>
  )
}
