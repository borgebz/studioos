import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Camera, User } from 'lucide-react'
import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { Profile } from '@/api/studioos-api'
import { ImageCropDialog } from '@/components/shared/ImageCropDialog'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { CardSection } from '@/components/shared/CardSection'
import { Skeleton } from '@/components/ui/skeleton'
import { paths } from '@/app/paths'
import { toast } from 'sonner'
import {
  accountSettingsSchema,
  type AccountSettingsFormValues,
} from './account-settings-schema'

export function AccountSettingsPage() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()

  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const dataLoaded = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
  } = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      display_name: '',
      bio: '',
      is_public: true,
    },
  })

  const displayName = watch('display_name')

  // Derive account info from user — no need to copy into state
  const firstName = user?.full_name.split(' ')[0] ?? ''
  const lastName = user?.full_name.split(' ').slice(1).join(' ') ?? ''

  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true

    const load = async () => {
      try {
        const res = await apiClient.api.accountsProfileMeRetrieve()
        const profile = res.data
        reset({
          display_name: profile.display_name || '',
          bio: profile.bio || '',
          is_public: (profile as { is_public?: boolean }).is_public ?? true,
        })
        setPhotoUrl(profile.photo_url || null)
        setHasProfile(true)
      } catch {
        setHasProfile(false)
        reset({
          display_name: user?.full_name || '',
          bio: '',
          is_public: true,
        })
      }

      setIsLoading(false)
    }
    void load()
  }, [user, reset])

  const handlePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        toast.warning(t('account.photoTooLarge'))
        return
      }

      const allowed = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowed.includes(file.type)) {
        toast.warning(t('account.photoInvalidType'))
        return
      }

      // Open the crop dialog with the selected image
      setCropSrc(URL.createObjectURL(file))
    },
    [t],
  )

  const handleCropComplete = useCallback((croppedFile: File) => {
    setCropSrc(null)
    setPhotoFile(croppedFile)
    setPhotoUrl(URL.createObjectURL(croppedFile))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleCropCancel = useCallback(() => {
    setCropSrc(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const onSubmit = async (data: AccountSettingsFormValues) => {
    setIsSaving(true)

    try {
      const payload = photoFile
        ? (() => {
            const fd = new FormData()
            fd.append('display_name', data.display_name)
            fd.append('bio', data.bio)
            fd.append('is_public', String(data.is_public))
            fd.append('photo', photoFile)
            return fd as unknown as Profile
          })()
        : { display_name: data.display_name, bio: data.bio, is_public: data.is_public } as unknown as Profile

      if (hasProfile) {
        await apiClient.api.accountsProfileMePartialUpdate(payload)
      } else {
        await apiClient.api.accountsProfileMeCreate(payload)
      }

      setHasProfile(true)
      setPhotoFile(null)
      await refreshUser()
      toast.success(t('account.saved'))
    } catch (err) {
      toast.error(parseApiError(err, t, 'account.saveError') ?? t('account.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const initials = (displayName || user?.full_name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  if (isLoading) {
    return (
      <PageLayout>
        <PageHeader title={t('account.title')} backTo={paths.home} />
        <div className="max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
            <div className="flex flex-col gap-6">
              <Skeleton className="h-[200px] rounded-lg" />
              <Skeleton className="h-[280px] rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-[200px] rounded-lg" />
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  const footerContent = (
    <>
      <div />
      <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
        {isSaving ? t('account.saving') : t('account.saveChanges')}
      </Button>
    </>
  )

  return (
    <PageLayout footer={footerContent}>
      <PageHeader title={t('account.title')} backTo={paths.home} />

      <div className="max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Main Column */}
          <div className="flex flex-col gap-6">
            {/* Profile Section */}
            <CardSection
              title={t('account.profileSection')}
              description={t('account.profileDesc')}
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="display_name">{t('account.displayName')}</Label>
                  <Input
                    id="display_name"
                    placeholder={t('account.displayNamePlaceholder')}
                    className="mt-1.5"
                    {...register('display_name')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('account.displayNameHelper')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="bio">{t('account.bio')}</Label>
                  <Textarea
                    id="bio"
                    placeholder={t('account.bioPlaceholder')}
                    rows={3}
                    className="mt-1.5"
                    {...register('bio')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="public-profile" className="text-sm font-medium">
                      {t('account.publicProfile')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('account.publicProfileDesc')}
                    </p>
                  </div>
                  <Controller
                    name="is_public"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="public-profile"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            </CardSection>

            {/* Account Info Section */}
            <CardSection
              title={t('account.accountSection')}
              description={t('account.accountDesc')}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t('account.firstName')}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      className="mt-1.5"
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('account.lastName')}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      className="mt-1.5"
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">{t('account.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email ?? ''}
                    className="mt-1.5"
                    disabled
                    readOnly
                  />
                </div>

                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <div>
                    <Label htmlFor="phoneCode">{t('account.phoneCode')}</Label>
                    <Input
                      id="phoneCode"
                      defaultValue="+351"
                      className="mt-1.5"
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">{t('account.phone')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      defaultValue=""
                      className="mt-1.5"
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t('account.accountFieldsNote')}
                </p>
              </div>
            </CardSection>
          </div>

          {/* Side Column */}
          <div className="flex flex-col gap-6">
            {/* Photo */}
            <CardSection title={t('account.photo')}>
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-28 w-28">
                    {photoUrl && (
                      <AvatarImage src={photoUrl} alt={displayName} />
                    )}
                    <AvatarFallback className="text-2xl">
                      {initials || <User className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    aria-label={t('account.changePhoto')}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t('account.photoHelper')}
                </p>
              </div>
            </CardSection>

            {/* Role Info */}
            {user?.role && user.role.length > 0 && (
              <CardSection title={t('account.roleSection')}>
                <div className="space-y-2">
                  {user.role.map((r) => (
                    <div
                      key={r}
                      className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-medium capitalize"
                    >
                      {t(`account.role.${r}`)}
                    </div>
                  ))}
                </div>
              </CardSection>
            )}
          </div>
        </div>
      </div>

      <ImageCropDialog
        imageSrc={cropSrc}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
        outputSize={512}
        cropShape="round"
      />
    </PageLayout>
  )
}
