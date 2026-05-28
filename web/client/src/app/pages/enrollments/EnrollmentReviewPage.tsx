import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import {
  Check,
  CheckCircle2,
  Download,
  FileText,
  Globe,
  Monitor,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import {
  EnrollmentPaymentReadStatusEnum,
  EnrollmentReadStatusEnum,
  PaymentTypeEnum,
  type EnrollmentPaymentCreate,
  type EnrollmentRead,
} from '@/api/studioos-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { CardSection } from '@/components/shared/CardSection'
import { cn } from '@/lib/utils'
import { paths } from '@/app/paths'

const TERMINAL_STATUSES: EnrollmentReadStatusEnum[] = [
  EnrollmentReadStatusEnum.Approved,
  EnrollmentReadStatusEnum.Rejected,
  EnrollmentReadStatusEnum.Cancelled,
]

function EnrollmentStatusPill({
  status,
}: {
  status?: EnrollmentReadStatusEnum
}) {
  const { t } = useTranslation()
  if (!status) return null

  const styles: Record<EnrollmentReadStatusEnum, string> = {
    submitted:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    under_review:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    approved:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-muted text-muted-foreground',
  }

  return (
    <Badge className={cn('font-normal', styles[status])}>
      {t(`enrollmentRequests.status.${status}`)}
    </Badge>
  )
}

function FieldRow({
  label,
  value,
}: {
  label: string
  value?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground break-words">
        {value === undefined || value === null || value === '' ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          value
        )}
      </span>
    </div>
  )
}

export function EnrollmentReviewPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const enrollmentId = Number(id)
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const [enrollment, setEnrollment] = useState<EnrollmentRead | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionState, setActionState] = useState<
    'idle' | 'approving' | 'rejecting'
  >('idle')
  const [showApprove, setShowApprove] = useState(false)
  const [showReject, setShowReject] = useState(false)

  // payments form
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentType, setPaymentType] = useState<PaymentTypeEnum>(
    PaymentTypeEnum.EnrollmentFee
  )
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)

  const dataLoaded = useRef(false)

  useEffect(() => {
    if (!Number.isFinite(enrollmentId)) {
      setLoading(false)
      return
    }
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      try {
        const res = await apiClient.api.enrollmentsRetrieve(enrollmentId)
        setEnrollment(res.data ?? null)
      } catch (err) {
        toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [enrollmentId, t])

  const refreshEnrollment = async () => {
    try {
      const res = await apiClient.api.enrollmentsRetrieve(enrollmentId)
      setEnrollment(res.data ?? null)
    } catch {
      // ignore
    }
  }

  const handleApprove = async () => {
    if (!enrollment) return
    setActionState('approving')
    try {
      const res = await apiClient.api.enrollmentsApproveCreate(enrollment.id)
      if (res.data) setEnrollment(res.data)
      toast.success(t('enrollmentReview.approveSuccess'))
      setShowApprove(false)
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setActionState('idle')
    }
  }

  const handleReject = async () => {
    if (!enrollment) return
    setActionState('rejecting')
    try {
      const res = await apiClient.api.enrollmentsRejectCreate(enrollment.id)
      if (res.data) setEnrollment(res.data)
      toast.success(t('enrollmentReview.rejectSuccess'))
      setShowReject(false)
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setActionState('idle')
    }
  }

  const resetPaymentForm = () => {
    setPaymentType(PaymentTypeEnum.EnrollmentFee)
    setPaymentAmount('')
    setPaymentNotes('')
    setShowPaymentForm(false)
  }

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollment) return
    const amount = paymentAmount.trim().replace(',', '.')
    if (!amount || Number.isNaN(Number(amount))) {
      toast.warning(t('enrollmentReview.payments.invalidAmount'))
      return
    }
    setSavingPayment(true)
    try {
      const payload: EnrollmentPaymentCreate = {
        payment_type: paymentType,
        amount,
        notes: paymentNotes.trim() || undefined,
      }
      const created = await apiClient.api.enrollmentsPaymentsCreate(
        enrollment.id,
        payload
      )
      // Confirm immediately — direction records a snapshot of money already received.
      if (created.data?.id) {
        try {
          await apiClient.api.enrollmentsPaymentsConfirmCreate(
            enrollment.id,
            created.data.id
          )
        } catch {
          // confirm is best-effort; record exists either way
        }
      }
      await refreshEnrollment()
      toast.success(t('enrollmentReview.payments.savedSuccess'))
      resetPaymentForm()
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSavingPayment(false)
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader
            title={t('enrollmentReview.title')}
            backTo={paths.enrollmentRequests}
          />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
            <div className="space-y-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!enrollment) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader
            title={t('enrollmentReview.title')}
            backTo={paths.enrollmentRequests}
          />
          <CardSection>
            <p className="text-sm text-muted-foreground">
              {t('enrollmentReview.notFound')}
            </p>
          </CardSection>
        </div>
      </PageLayout>
    )
  }

  const isTerminal = TERMINAL_STATUSES.includes(enrollment.status)
  const canAct = !isTerminal && actionState === 'idle'

  const dob = enrollment.student_date_of_birth
    ? format(new Date(enrollment.student_date_of_birth), 'd MMM yyyy', {
        locale: dateLocale,
      })
    : null
  const docExpiry = enrollment.student_document_expiry
    ? format(new Date(enrollment.student_document_expiry), 'd MMM yyyy', {
        locale: dateLocale,
      })
    : null

  const rgpd = enrollment.consents?.find((c) => c.consent_type === 'rgpd')
  const regulation = enrollment.consents?.find(
    (c) => c.consent_type === 'internal_regulation'
  )

  const totalConfirmed = (enrollment.payments ?? [])
    .filter((p) => p.status === EnrollmentPaymentReadStatusEnum.Confirmed)
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0)

  return (
    <PageLayout
      footer={
        <>
          <Button
            variant="destructive"
            size="sm"
            disabled={!canAct}
            onClick={() => setShowReject(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('enrollmentReview.reject')}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(paths.enrollmentRequests)}
            >
              {t('common.back')}
            </Button>
            <Button disabled={!canAct} onClick={() => setShowApprove(true)}>
              <Check className="h-4 w-4" />
              {t('enrollmentReview.approve')}
            </Button>
          </div>
        </>
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          title={enrollment.student_name}
          backTo={paths.enrollmentRequests}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Main column */}
          <div className="flex flex-col gap-6 min-w-0">
            <CardSection title={t('enrollmentReview.studentInfo')}>
              <div className="space-y-3">
                <FieldRow
                  label={t('enrollments.studentName')}
                  value={enrollment.student_name}
                />
                <FieldRow
                  label={t('enrollments.studentEmail')}
                  value={enrollment.student_email}
                />
                <FieldRow label={t('enrollments.dateOfBirth')} value={dob} />
                <FieldRow
                  label={t('enrollments.nif')}
                  value={enrollment.student_nif}
                />
                <FieldRow
                  label={t('enrollments.nationality')}
                  value={enrollment.student_nationality}
                />
                <FieldRow
                  label={t('enrollments.documentNumber')}
                  value={enrollment.student_document_number}
                />
                <FieldRow
                  label={t('enrollments.documentExpiry')}
                  value={docExpiry}
                />
                <FieldRow
                  label={t('enrollments.address')}
                  value={enrollment.address}
                />
                <FieldRow
                  label={t('enrollments.postalCode')}
                  value={enrollment.postal_code}
                />
              </div>
            </CardSection>

            <CardSection title={t('enrollmentReview.parentInfo')}>
              <div className="space-y-3">
                <FieldRow
                  label={t('enrollments.parentName')}
                  value={enrollment.parent_name}
                />
                <FieldRow
                  label={t('enrollments.parentEmail')}
                  value={enrollment.parent_email}
                />
                <FieldRow
                  label={t('enrollments.parentPhone')}
                  value={
                    enrollment.parent_phone
                      ? `${enrollment.parent_phone_country_code ?? ''} ${enrollment.parent_phone}`.trim()
                      : ''
                  }
                />
              </div>
            </CardSection>

            <CardSection title={t('enrollmentReview.modalities')}>
              {enrollment.enrollment_modalities?.length ? (
                <div className="flex flex-wrap gap-2">
                  {enrollment.enrollment_modalities.map((m) => (
                    <div
                      key={m.id}
                      className="inline-flex items-center rounded-lg border border-border px-3.5 py-2 text-sm"
                    >
                      {m.modality_name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('enrollmentReview.noModalities')}
                </p>
              )}
            </CardSection>

            <CardSection title={t('enrollments.danceHistory')}>
              {enrollment.historical_notes ? (
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {enrollment.historical_notes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('enrollmentReview.noHistory')}
                </p>
              )}
            </CardSection>

            <CardSection title={t('enrollments.files')}>
              {enrollment.files?.length ? (
                <div className="space-y-2">
                  {enrollment.files.map((f) => (
                    <a
                      key={f.id}
                      href={f.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 hover:bg-accent transition-colors"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-sm">
                        {f.original_filename}
                      </span>
                      {f.mime_type && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          {f.mime_type.split('/').pop()?.slice(0, 4)}
                        </span>
                      )}
                      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('enrollmentReview.noFiles')}
                </p>
              )}
            </CardSection>

            <CardSection
              title={t('enrollmentReview.payments.title')}
              description={t('enrollmentReview.payments.description')}
            >
              <div className="space-y-3">
                {enrollment.payments?.length ? (
                  <div className="space-y-2">
                    {enrollment.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                      >
                        <span className="shrink-0 text-sm font-medium">
                          {t(
                            `enrollmentReview.payments.type.${p.payment_type}`
                          )}
                        </span>
                        <span className="flex-1 text-sm tabular-nums">
                          {t('common.currencySymbol')}
                          {Number(p.amount).toFixed(2)}
                        </span>
                        {p.notes && (
                          <span className="hidden sm:block flex-1 truncate text-xs text-muted-foreground">
                            {p.notes}
                          </span>
                        )}
                        <Badge
                          className={cn(
                            'font-normal shrink-0',
                            p.status ===
                              EnrollmentPaymentReadStatusEnum.Confirmed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          )}
                        >
                          {t(`enrollmentReview.payments.status.${p.status}`)}
                        </Badge>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('enrollmentReview.payments.totalConfirmed')}
                      </span>
                      <span className="font-medium tabular-nums">
                        {t('common.currencySymbol')}
                        {totalConfirmed.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('enrollmentReview.payments.empty')}
                  </p>
                )}

                {showPaymentForm ? (
                  <form
                    onSubmit={handleSavePayment}
                    className="rounded-lg border border-border p-4 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="payment-type">
                          {t('enrollmentReview.payments.typeLabel')}
                        </Label>
                        <Select
                          value={paymentType}
                          onValueChange={(v) =>
                            setPaymentType(v as PaymentTypeEnum)
                          }
                        >
                          <SelectTrigger id="payment-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PaymentTypeEnum.EnrollmentFee}>
                              {t(
                                'enrollmentReview.payments.type.enrollment_fee'
                              )}
                            </SelectItem>
                            <SelectItem value={PaymentTypeEnum.Insurance}>
                              {t('enrollmentReview.payments.type.insurance')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="payment-amount">
                          {t('enrollmentReview.payments.amountLabel')}
                        </Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            {t('common.currencySymbol')}
                          </span>
                          <Input
                            id="payment-amount"
                            inputMode="decimal"
                            placeholder="0.00"
                            className="pl-7"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="payment-notes">
                        {t('enrollmentReview.payments.notesLabel')}
                      </Label>
                      <Textarea
                        id="payment-notes"
                        rows={2}
                        placeholder={t(
                          'enrollmentReview.payments.notesPlaceholder'
                        )}
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetPaymentForm}
                        disabled={savingPayment}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingPayment || !paymentAmount}
                      >
                        {savingPayment
                          ? t('enrollmentReview.payments.saving')
                          : t('enrollmentReview.payments.save')}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPaymentForm(true)}
                  >
                    <Plus className="h-4 w-4" />
                    {t('enrollmentReview.payments.addButton')}
                  </Button>
                )}
              </div>
            </CardSection>

            <CardSection
              title={t('enrollments.consents')}
              description={t('enrollmentReview.consentsAuditDescription')}
            >
              <div className="space-y-3">
                {[
                  { consent: rgpd, label: t('enrollments.consentRgpdLink') },
                  {
                    consent: regulation,
                    label: t('enrollments.consentRegulationLink'),
                  },
                ].map(({ consent, label }, i) => (
                  <div key={i} className="rounded-lg border border-border p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full shrink-0',
                          consent?.accepted
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {consent?.accepted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{label}</p>
                        {consent?.accepted_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('enrollmentReview.acceptedAt', {
                              date: format(
                                new Date(consent.accepted_at),
                                'd MMM yyyy · HH:mm',
                                { locale: dateLocale }
                              ),
                            })}
                          </p>
                        )}
                        {(consent?.ip_address || consent?.user_agent) && (
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {consent?.ip_address && (
                              <div className="flex items-center gap-1.5">
                                <Globe className="h-3 w-3 shrink-0" />
                                <span className="font-mono">
                                  {consent.ip_address}
                                </span>
                              </div>
                            )}
                            {consent?.user_agent && (
                              <div className="flex items-start gap-1.5">
                                <Monitor className="h-3 w-3 shrink-0 mt-0.5" />
                                <span className="break-all">
                                  {consent.user_agent}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardSection>
          </div>

          {/* Side column */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
            <CardSection title={t('enrollmentReview.summary')}>
              <div className="space-y-3 text-sm">
                <FieldRow
                  label={t('enrollmentReview.status')}
                  value={<EnrollmentStatusPill status={enrollment.status} />}
                />
                <FieldRow
                  label={t('enrollmentReview.enrollmentType')}
                  value={t(
                    `enrollmentRequests.type.${enrollment.enrollment_type}`
                  )}
                />
                <FieldRow
                  label={t('enrollmentReview.submittedAt')}
                  value={
                    enrollment.created_at
                      ? format(
                          new Date(enrollment.created_at),
                          'd MMM yyyy · HH:mm',
                          { locale: dateLocale }
                        )
                      : null
                  }
                />
                <FieldRow
                  label={t('enrollmentReview.referenceId')}
                  value={`#${enrollment.id}`}
                />
              </div>
            </CardSection>

            <CardSection title={t('enrollmentReview.period')}>
              <div className="space-y-3 text-sm">
                <FieldRow
                  label={t('enrollmentReview.academicYear')}
                  value={enrollment.period?.academic_year}
                />
                <FieldRow
                  label={t('enrollmentReview.periodWindow')}
                  value={
                    enrollment.period
                      ? `${format(new Date(enrollment.period.start_date), 'd MMM', { locale: dateLocale })} → ${format(new Date(enrollment.period.end_date), 'd MMM yyyy', { locale: dateLocale })}`
                      : null
                  }
                />
                {enrollment.period?.enrollment_fee && (
                  <FieldRow
                    label={t('enrollments.enrollmentFee')}
                    value={`${t('common.currencySymbol')}${enrollment.period.enrollment_fee}`}
                  />
                )}
                {enrollment.period?.insurance_general && (
                  <FieldRow
                    label={t('enrollments.insuranceGeneral')}
                    value={`${t('common.currencySymbol')}${enrollment.period.insurance_general}`}
                  />
                )}
                {enrollment.period?.insurance_intensive && (
                  <FieldRow
                    label={t('enrollments.insuranceIntensive')}
                    value={`${t('common.currencySymbol')}${enrollment.period.insurance_intensive}`}
                  />
                )}
              </div>
            </CardSection>
          </div>
        </div>
      </div>

      <AlertDialog open={showApprove} onOpenChange={setShowApprove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t('enrollmentReview.approveTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('enrollmentReview.approveBody', {
                student: enrollment.student_name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionState === 'approving'}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleApprove}
                disabled={actionState === 'approving'}
              >
                {actionState === 'approving'
                  ? t('enrollmentReview.approving')
                  : t('enrollmentReview.approve')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReject} onOpenChange={setShowReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t('enrollmentReview.rejectTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('enrollmentReview.rejectBody', {
                student: enrollment.student_name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionState === 'rejecting'}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionState === 'rejecting'}
              >
                {actionState === 'rejecting'
                  ? t('enrollmentReview.rejecting')
                  : t('enrollmentReview.reject')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  )
}
