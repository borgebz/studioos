import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { toast } from 'sonner'
import { Plus, Trash2, UserMinus } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  Classe,
  ClasseDetail,
  ClasseMember,
  ClasseSubmit,
  PatchedClasseUpdate,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CardSection } from '@/components/shared/CardSection'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { usePermissions } from '@/auth/permissions'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'
import { getInitials } from '@/lib/user-utils'

import { DeleteClassDialog } from './DeleteClassDialog'
import { AddClassMemberDialog } from './AddClassMemberDialog'

const formSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().default(''),
})

type FormValues = z.input<typeof formSchema>

interface ClassFormPageProps {
  mode: 'create' | 'edit'
}

function memberName(m: ClasseMember): string {
  const s = m.student
  const full = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
  return s.display_name || full || s.email
}

export function ClassFormPage({ mode }: ClassFormPageProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS
  const longDatePattern = i18n.language.startsWith('pt')
    ? "d 'de' MMMM 'de' yyyy"
    : 'MMMM d, yyyy'
  const { id } = useParams<{ id: string }>()
  const numericId = id ? Number(id) : NaN
  const { can } = usePermissions()

  const canManage = can('classes.can_manage_classes')
  const canViewMembers = can('classes.view_classemember')

  const [loading, setLoading] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [classe, setClasse] = useState<ClasseDetail | null>(null)
  const [members, setMembers] = useState<ClasseMember[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Classe | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const dataLoaded = useRef<number | null>(null)

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      description: '',
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
        .classesRetrieve(numericId)
        .catch(() => null)
      if (res?.data) {
        setClasse(res.data)
        setMembers(res.data.members ?? [])
        reset({
          name: res.data.name,
          description: res.data.description ?? '',
        })
      }
      setLoading(false)
    }
    void load()
  }, [mode, numericId, reset])

  const existingStudentIds = useMemo(
    () => members.map((m) => m.student.id),
    [members]
  )

  const handleRemoveMember = async (member: ClasseMember) => {
    setRemovingId(member.id)
    try {
      await apiClient.api.classesMembersDestroy(numericId, member.id)
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      toast.success(t('classes.members.removeSuccess'))
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setRemovingId(null)
    }
  }

  const onSubmit = async (vals: FormValues) => {
    setSubmitting(true)
    try {
      const parsed = formSchema.parse(vals)
      if (mode === 'create') {
        const payload: ClasseSubmit = {
          name: parsed.name,
          description: parsed.description ?? '',
        }
        const res = await apiClient.api.classesCreate(payload)
        toast.success(t('classes.saveSuccess'))
        if (res.data?.id) {
          navigate(paths.classEdit.replace(':id', String(res.data.id)))
        } else {
          navigate(paths.classes)
        }
      } else {
        const patch: PatchedClasseUpdate = {
          name: parsed.name,
          description: parsed.description ?? '',
        }
        const res = await apiClient.api.classesPartialUpdate(numericId, patch)
        if (res.data) setClasse(res.data)
        toast.success(t('classes.saveSuccess'))
      }
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    mode === 'create'
      ? t('classes.form.createTitle')
      : t('classes.form.editTitle')

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={title} backTo={paths.classes} />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageLayout>
    )
  }

  const canDeleteClass = mode === 'edit' && canManage && classe

  const footer = (
    <>
      {canDeleteClass ? (
        <Button
          variant="destructive"
          size="sm"
          type="button"
          onClick={() =>
            setDeleteTarget({
              id: classe.id,
              name: classe.name,
              description: classe.description,
              created_at: classe.created_at,
              updated_at: classe.updated_at,
            })
          }
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
          onClick={() => navigate(paths.classes)}
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
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={title} backTo={paths.classes} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
            <div className="space-y-6">
              <form
                id="page-form"
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <CardSection title={t('classes.form.general')}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="mb-1.5 block">
                        {t('classes.form.nameLabel')}{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder={t('classes.form.namePlaceholder')}
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
                        {t('classes.form.descriptionLabel')}
                      </Label>
                      <Textarea
                        id="description"
                        rows={4}
                        placeholder={t(
                          'classes.form.descriptionPlaceholder'
                        )}
                        {...register('description')}
                      />
                    </div>
                  </div>
                </CardSection>
              </form>

              {mode === 'edit' && canViewMembers && (
                <CardSection
                  title={t('classes.form.membersSection')}
                  description={t('classes.form.membersHint')}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-muted-foreground">
                      {t('classes.form.memberCount', { count: members.length })}
                    </span>
                    {canManage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAddOpen(true)}
                      >
                        <Plus className="size-4" />
                        {t('classes.form.addMember')}
                      </Button>
                    )}
                  </div>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('classes.form.noMembers')}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border rounded-md border border-border">
                      {members.map((m) => {
                        const name = memberName(m)
                        return (
                          <li
                            key={m.id}
                            className="flex items-center gap-3 px-3 py-2"
                          >
                            <Avatar className="h-8 w-8 shrink-0">
                              {m.student.photo_url && (
                                <AvatarImage
                                  src={m.student.photo_url}
                                  alt={name}
                                />
                              )}
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {getInitials(name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">
                                {name}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {m.student.email}
                              </div>
                            </div>
                            {canManage && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={removingId === m.id}
                                aria-label={t('classes.form.removeMember')}
                                onClick={() => handleRemoveMember(m)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardSection>
              )}
            </div>

            <div className="space-y-6">
              <CardSection title={t('classes.form.summary')}>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {t('classes.form.members')}
                    </dt>
                    <dd className="font-medium">
                      {mode === 'create' ? '—' : members.length}
                    </dd>
                  </div>
                  {classe?.created_at && (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t('classes.form.createdAt')}
                      </dt>
                      <dd className="font-medium">
                        {format(
                          new Date(classe.created_at),
                          longDatePattern,
                          { locale: dateLocale }
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardSection>
            </div>
          </div>
        </div>

      <DeleteClassDialog
        classe={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => navigate(paths.classes)}
      />

      {mode === 'edit' && (
        <AddClassMemberDialog
          open={addOpen}
          classeId={numericId}
          existingStudentIds={existingStudentIds}
          onClose={() => setAddOpen(false)}
          onAdded={(m) => setMembers((prev) => [...prev, m])}
        />
      )}
    </PageLayout>
  )
}
