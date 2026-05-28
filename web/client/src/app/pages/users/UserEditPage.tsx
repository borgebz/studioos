import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { enUS, pt } from 'date-fns/locale'
import { Mail, UserX } from 'lucide-react'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { Authorized, usePermissions } from '@/auth/permissions'
import {
  LanguageEnum,
  type PatchedUserCoreUpdate,
  type UserResponse,
} from '@/api/studioos-api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CardSection } from '@/components/shared/CardSection'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'
import { parseApiError, parseApiFieldErrors } from '@/lib/api-errors'
import { paths } from '@/app/paths'

import { DeactivateUserDialog } from './DeactivateUserDialog'
import { RolePermissionPicker } from './RolePermissionPicker'
import { userEditSchema, type UserEditFormValues } from './user-edit-schema'

const LANGUAGE_OPTIONS: { value: LanguageEnum; labelKey: string }[] = [
  { value: LanguageEnum.Pt, labelKey: 'lang.pt' },
  { value: LanguageEnum.En, labelKey: 'lang.en' },
]

function userName(user: UserResponse): string {
  const full = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return user.display_name || full || user.email
}

export function UserEditPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { can } = usePermissions()
  const dateLocale = i18n.language.startsWith('pt') ? pt : enUS

  const userId = id ? Number(id) : NaN
  const canDeactivate = can('accounts.can_deactivate_user')
  const canResendInvite = can('accounts.can_invite_user')

  const [user, setUser] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [resending, setResending] = useState(false)
  const dataLoaded = useRef(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_country_code: '',
      phone: '',
      address: '',
      postal_code: '',
      language: LanguageEnum.Pt,
      role_codes: [],
      permission_ids: [],
    },
  })

  useEffect(() => {
    if (dataLoaded.current) return
    if (Number.isNaN(userId)) {
      setLoading(false)
      return
    }
    dataLoaded.current = true
    apiClient.api
      .getUser(userId)
      .then((res) => {
        const found = res.data
        if (found) {
          setUser(found)
          reset({
            first_name: found.first_name ?? '',
            last_name: found.last_name ?? '',
            email: found.email,
            phone_country_code: found.phone_country_code ?? '',
            phone: found.phone ?? '',
            address: found.address ?? '',
            postal_code: found.postal_code ?? '',
            language: found.language ?? LanguageEnum.Pt,
            role_codes: (found.role ?? []).map((r) => r.code),
            permission_ids: found.user_permission_ids ?? [],
          })
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [userId, reset])

  const onSubmit = async (values: UserEditFormValues) => {
    if (!user) return
    setSaving(true)
    try {
      const payload: PatchedUserCoreUpdate = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone,
        phone_country_code: values.phone_country_code,
        language: values.language as LanguageEnum,
        address: values.address,
        postal_code: values.postal_code,
        role_codes: values.role_codes,
        permission_ids: values.permission_ids,
      }
      const res = await apiClient.api.updateUser(user.id, payload)
      if (res.data) setUser(res.data)
      toast.success(t('users.edit.saveSuccess'))
    } catch (err) {
      const fieldErrors = parseApiFieldErrors(err, t)
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof UserEditFormValues, { message })
        }
        return
      }
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSaving(false)
    }
  }

  const handleResendInvite = async () => {
    if (!user) return
    setResending(true)
    try {
      await apiClient.api.accountsUsersResendInviteCreate(user.id)
      toast.success(t('users.resendInviteSuccess'))
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setResending(false)
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={t('users.edit.title')} backTo={paths.users} />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
            <div className="flex flex-col gap-6">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
            <div className="flex flex-col gap-6">
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!user) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={t('users.edit.title')} backTo={paths.users} />
          <p className="text-sm text-muted-foreground">
            {t('users.edit.userNotFound')}
          </p>
        </div>
      </PageLayout>
    )
  }

  const displayName = userName(user)
  const isActive = user.is_active !== false

  const footer = (
    <>
      <Button variant="outline" onClick={() => navigate(paths.users)}>
        {t('common.back')}
      </Button>
      <Button onClick={handleSubmit(onSubmit)} disabled={saving}>
        {saving ? t('users.edit.saving') : t('users.edit.save')}
      </Button>
    </>
  )

  return (
    <PageLayout footer={footer}>
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-6">
        <PageHeader title={displayName} backTo={paths.users} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          <form
            id="user-edit-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            <CardSection
              title={t('users.edit.identityCard')}
              description={t('users.edit.identityDesc')}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">
                      {t('users.edit.firstName')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      className="mt-1.5"
                      {...register('first_name')}
                    />
                    {errors.first_name?.message && (
                      <p className="text-sm text-destructive mt-1">
                        {t(errors.first_name.message)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="last_name">
                      {t('users.edit.lastName')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      className="mt-1.5"
                      {...register('last_name')}
                    />
                    {errors.last_name?.message && (
                      <p className="text-sm text-destructive mt-1">
                        {t(errors.last_name.message)}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">
                    {t('users.edit.email')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    className="mt-1.5"
                    {...register('email')}
                  />
                  {errors.email?.message && (
                    <p className="text-sm text-destructive mt-1">
                      {t(errors.email.message)}
                    </p>
                  )}
                </div>
              </div>
            </CardSection>

            <CardSection
              title={t('users.edit.contactCard')}
              description={t('users.edit.contactDesc')}
            >
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div>
                  <Label htmlFor="phone_country_code">
                    {t('users.edit.phoneCountryCode')}
                  </Label>
                  <Input
                    id="phone_country_code"
                    className="mt-1.5"
                    placeholder={t('users.edit.phoneCountryCodePlaceholder')}
                    {...register('phone_country_code')}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t('users.edit.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    className="mt-1.5"
                    {...register('phone')}
                  />
                </div>
              </div>
            </CardSection>

            <CardSection
              title={t('users.edit.addressCard')}
              description={t('users.edit.addressDesc')}
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">{t('users.edit.address')}</Label>
                  <Input
                    id="address"
                    className="mt-1.5"
                    {...register('address')}
                  />
                </div>
                <div className="max-w-[200px]">
                  <Label htmlFor="postal_code">
                    {t('users.edit.postalCode')}
                  </Label>
                  <Input
                    id="postal_code"
                    className="mt-1.5"
                    {...register('postal_code')}
                  />
                </div>
              </div>
            </CardSection>

            <CardSection
              title={t('users.edit.preferencesCard')}
              description={t('users.edit.preferencesDesc')}
            >
              <div className="max-w-[300px]">
                <Label htmlFor="language">{t('users.edit.language')}</Label>
                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as LanguageEnum)}
                    >
                      <SelectTrigger id="language" className="mt-1.5">
                        <SelectValue
                          placeholder={t('users.edit.selectLanguage')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardSection>
          </form>

          <div className="flex flex-col gap-6">
            <CardSection
              title={t('users.edit.statusCard')}
              description={t('users.edit.statusDesc')}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {user.photo_url && (
                      <AvatarImage src={user.photo_url} alt={displayName} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge
                    className={cn(
                      'font-normal',
                      isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isActive
                      ? t('users.status.active')
                      : t('users.status.inactive')}
                  </Badge>
                </div>
                <Separator />
                <div className="flex flex-col gap-2">
                  {!isActive && canResendInvite && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResendInvite}
                      disabled={resending}
                      className="justify-start"
                    >
                      <Mail className="h-4 w-4" />
                      {t('users.rowActions.resendInvite')}
                    </Button>
                  )}
                  {isActive && canDeactivate && (
                    <Authorized permission="accounts.can_deactivate_user">
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeactivateOpen(true)}
                      >
                        <UserX className="h-4 w-4" />
                        {t('users.rowActions.deactivate')}
                      </Button>
                    </Authorized>
                  )}
                </div>
              </div>
            </CardSection>

            <CardSection title={t('users.edit.metadataCard')}>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t('users.edit.joined')}
                  </dt>
                  <dd className="text-foreground">
                    {format(new Date(user.created_at), 'd MMM yyyy', {
                      locale: dateLocale,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t('users.edit.userId')}
                  </dt>
                  <dd className="font-mono text-foreground">{user.id}</dd>
                </div>
              </dl>
            </CardSection>
          </div>
        </div>

        {/* Roles + custom permissions — full width below the two-column grid */}
        <Controller
          name="role_codes"
          control={control}
          render={({ field: roleField }) => (
            <Controller
              name="permission_ids"
              control={control}
              render={({ field: permField }) => (
                <RolePermissionPicker
                  selectedRoles={roleField.value}
                  selectedPerms={permField.value}
                  onRolesChange={roleField.onChange}
                  onPermsChange={permField.onChange}
                />
              )}
            />
          )}
        />
      </div>

      <DeactivateUserDialog
        user={deactivateOpen ? user : null}
        onClose={() => setDeactivateOpen(false)}
        onDeactivated={(updated) => setUser(updated)}
      />
    </PageLayout>
  )
}
