import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  Modality,
  ModalitySubmit,
  PatchedModalityUpdate,
  Studio,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { CardSection } from '@/components/shared/CardSection'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { PAGE_CONTENT } from '@/lib/layout'
import { usePermissions } from '@/auth/permissions'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'

import { DeleteModalityDialog } from './DeleteModalityDialog'

const formSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().default(''),
  max_capacity: z
    .union([z.coerce.number().int().min(1), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v == null ? null : v)),
  min_age_months: z
    .union([z.coerce.number().int().min(0), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v == null ? null : v)),
  max_age_months: z
    .union([z.coerce.number().int().min(0), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v == null ? null : v)),
  allowed_studio_ids: z.array(z.number()).default([]),
})

type FormValues = z.input<typeof formSchema>

interface ModalityFormPageProps {
  mode: 'create' | 'edit'
}

export function ModalityFormPage({ mode }: ModalityFormPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : NaN
  const { can } = usePermissions()

  const canDelete = mode === 'edit' && can('modality.delete_modality')

  const [loading, setLoading] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [studios, setStudios] = useState<Studio[]>([])
  const [modality, setModality] = useState<Modality | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Modality | null>(null)
  const dataLoaded = useRef<number | null>(null)

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      max_capacity: '',
      min_age_months: '',
      max_age_months: '',
      allowed_studio_ids: [],
    },
  })
  const { register, handleSubmit, watch, setValue, reset, formState } = form

  useEffect(() => {
    const key = mode === 'edit' ? numericId : 0
    if (dataLoaded.current === key) return
    if (mode === 'edit' && !Number.isFinite(numericId)) return
    dataLoaded.current = key
    const load = async () => {
      setLoading(mode === 'edit')
      const [studiosRes, modalityRes] = await Promise.all([
        apiClient.api.studiosList().catch(() => null),
        mode === 'edit'
          ? apiClient.api.modalitiesRetrieve(numericId).catch(() => null)
          : Promise.resolve(null),
      ])
      const studiosArr = Array.isArray(studiosRes?.data) ? studiosRes!.data : []
      setStudios(studiosArr)
      if (mode === 'edit' && modalityRes?.data) {
        const m = modalityRes.data
        setModality(m)
        reset({
          name: m.name,
          description: m.description ?? '',
          max_capacity: m.max_capacity ?? '',
          min_age_months: m.min_age_months ?? '',
          max_age_months: m.max_age_months ?? '',
          allowed_studio_ids: (m.studios ?? []).map((s) => s.id),
        })
      }
      setLoading(false)
    }
    void load()
  }, [mode, numericId, reset])

  const selected = watch('allowed_studio_ids') ?? []

  const toggleStudio = (sid: number) => {
    const next = selected.includes(sid)
      ? selected.filter((x) => x !== sid)
      : [...selected, sid]
    setValue('allowed_studio_ids', next, { shouldDirty: true })
  }

  const onSubmit = async (vals: FormValues) => {
    setSubmitting(true)
    try {
      const parsed = formSchema.parse(vals)
      const payload: ModalitySubmit = {
        name: parsed.name,
        description: parsed.description ?? '',
        max_capacity: parsed.max_capacity,
        min_age_months: parsed.min_age_months,
        max_age_months: parsed.max_age_months,
        allowed_studio_ids: parsed.allowed_studio_ids,
      }
      if (mode === 'create') {
        const res = await apiClient.api.modalitiesCreate(payload)
        toast.success(t('modalities.saveSuccess'))
        navigate(
          paths.modalityEdit.replace(':id', String(res.data?.id ?? '')) ||
            paths.modalities
        )
      } else {
        const patch: PatchedModalityUpdate = payload
        await apiClient.api.modalitiesPartialUpdate(numericId, patch)
        toast.success(t('modalities.saveSuccess'))
      }
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    mode === 'create'
      ? t('modalities.form.createTitle')
      : t('modalities.form.editTitle')

  if (loading) {
    return (
      <PageLayout>
        <div className={PAGE_CONTENT}>
          <PageHeader title={title} backTo={paths.modalities} />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageLayout>
    )
  }

  const footer = (
    <>
      {canDelete && modality ? (
        <Button
          variant="destructive"
          size="sm"
          type="button"
          onClick={() => setDeleteTarget(modality)}
          disabled={submitting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('common.delete')}
        </Button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => navigate(paths.modalities)}
          disabled={submitting}
        >
          {t('common.back')}
        </Button>
        <Button type="submit" form="page-form" disabled={submitting}>
          {t('common.save')}
        </Button>
      </div>
    </>
  )

  return (
    <PageLayout footer={footer}>
      <div className={PAGE_CONTENT}>
        <PageHeader title={title} backTo={paths.modalities} />

        <form
          id="page-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6"
        >
          <div className="space-y-6">
            <CardSection title={t('modalities.form.general')}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="mb-1.5 block">
                    {t('modalities.form.nameLabel')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder={t('modalities.form.namePlaceholder')}
                    {...register('name')}
                  />
                  {formState.errors.name && (
                    <p className="mt-1 text-xs text-destructive">
                      {t('validation.required')}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description" className="mb-1.5 block">
                    {t('modalities.form.descriptionLabel')}
                  </Label>
                  <Textarea
                    id="description"
                    rows={4}
                    placeholder={t('modalities.form.descriptionPlaceholder')}
                    {...register('description')}
                  />
                </div>
              </div>
            </CardSection>

            <CardSection
              title={t('modalities.form.limitsSection')}
              description={t('modalities.form.limitsHint')}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="max_capacity" className="mb-1.5 block">
                    {t('modalities.form.maxCapacity')}
                  </Label>
                  <Input
                    id="max_capacity"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="—"
                    {...register('max_capacity')}
                  />
                </div>
                <div>
                  <Label htmlFor="min_age_months" className="mb-1.5 block">
                    {t('modalities.form.minAgeMonths')}
                  </Label>
                  <Input
                    id="min_age_months"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="—"
                    {...register('min_age_months')}
                  />
                </div>
                <div>
                  <Label htmlFor="max_age_months" className="mb-1.5 block">
                    {t('modalities.form.maxAgeMonths')}
                  </Label>
                  <Input
                    id="max_age_months"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="—"
                    {...register('max_age_months')}
                  />
                </div>
              </div>
            </CardSection>
          </div>

          <div className="space-y-6">
            <CardSection
              title={t('modalities.form.studiosSection')}
              description={t('modalities.form.studiosHint')}
            >
              {studios.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('modalities.form.noStudios')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {studios.map((s) => {
                    const checked = selected.includes(s.id)
                    return (
                      <li key={s.id}>
                        <label className="flex items-center gap-3 rounded-md border border-transparent px-2 py-1.5 hover:bg-accent/40 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleStudio(s.id)}
                            aria-label={s.name}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {s.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {t('modalities.form.studioCapacity', {
                                count: s.max_capacity,
                              })}
                            </div>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardSection>
          </div>
        </form>
      </div>

      <DeleteModalityDialog
        modality={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => navigate(paths.modalities)}
      />
    </PageLayout>
  )
}
