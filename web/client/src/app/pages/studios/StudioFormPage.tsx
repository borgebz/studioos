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
  PatchedStudioUpdate,
  Studio,
  StudioSubmit,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { CardSection } from '@/components/shared/CardSection'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { usePermissions } from '@/auth/permissions'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'

import { DeleteStudioDialog } from './DeleteStudioDialog'

const formSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().default(''),
  max_capacity: z.coerce.number().int().min(1),
})

type FormValues = z.input<typeof formSchema>

interface StudioFormPageProps {
  mode: 'create' | 'edit'
}

export function StudioFormPage({ mode }: StudioFormPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : NaN
  const { can } = usePermissions()

  const canDelete = mode === 'edit' && can('studios.delete_studio')

  const [loading, setLoading] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Studio | null>(null)
  const dataLoaded = useRef<number | null>(null)

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      max_capacity: 1,
    },
  })
  const { register, handleSubmit, reset, formState } = form

  useEffect(() => {
    if (mode === 'create') return
    if (!Number.isFinite(numericId)) return
    if (dataLoaded.current === numericId) return
    dataLoaded.current = numericId
    const load = async () => {
      setLoading(true)
      const res = await apiClient.api
        .studiosRetrieve(numericId)
        .catch(() => null)
      if (res?.data) {
        setStudio(res.data)
        reset({
          name: res.data.name,
          description: res.data.description ?? '',
          max_capacity: res.data.max_capacity,
        })
      }
      setLoading(false)
    }
    void load()
  }, [mode, numericId, reset])

  const onSubmit = async (vals: FormValues) => {
    setSubmitting(true)
    try {
      const parsed = formSchema.parse(vals)
      const payload: StudioSubmit = {
        name: parsed.name,
        description: parsed.description ?? '',
        max_capacity: parsed.max_capacity,
      }
      if (mode === 'create') {
        const res = await apiClient.api.studiosCreate(payload)
        toast.success(t('studios.saveSuccess'))
        navigate(
          paths.studioEdit.replace(':id', String(res.data?.id ?? '')) ||
            paths.studios
        )
      } else {
        const patch: PatchedStudioUpdate = payload
        await apiClient.api.studiosPartialUpdate(numericId, patch)
        toast.success(t('studios.saveSuccess'))
      }
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    mode === 'create'
      ? t('studios.form.createTitle')
      : t('studios.form.editTitle')

  if (loading) {
    return (
      <PageLayout>
        <div className="w-full max-w-3xl">
          <PageHeader title={title} backTo={paths.studios} />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageLayout>
    )
  }

  const footer = (
    <>
      {canDelete && studio ? (
        <Button
          variant="destructive"
          size="sm"
          type="button"
          onClick={() => setDeleteTarget(studio)}
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
          onClick={() => navigate(paths.studios)}
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
      <div className="w-full max-w-3xl">
        <PageHeader title={title} backTo={paths.studios} />

        <form
          id="page-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <CardSection title={t('studios.form.general')}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="mb-1.5 block">
                  {t('studios.form.nameLabel')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={t('studios.form.namePlaceholder')}
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
                  {t('studios.form.descriptionLabel')}
                </Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder={t('studios.form.descriptionPlaceholder')}
                  {...register('description')}
                />
              </div>
              <div className="max-w-xs">
                <Label htmlFor="max_capacity" className="mb-1.5 block">
                  {t('studios.form.maxCapacityLabel')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="max_capacity"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  {...register('max_capacity')}
                />
                {formState.errors.max_capacity && (
                  <p className="mt-1 text-xs text-destructive">
                    {t('validation.required')}
                  </p>
                )}
              </div>
            </div>
          </CardSection>
        </form>
      </div>

      <DeleteStudioDialog
        studio={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => navigate(paths.studios)}
      />
    </PageLayout>
  )
}
