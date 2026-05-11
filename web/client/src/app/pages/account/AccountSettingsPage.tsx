import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, User } from 'lucide-react'
import { apiClient } from '@/api/api-client'
import type { Profile } from '@/api/studioos-api'
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
import { toast } from 'sonner'

export function AccountSettingsPage() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [hasProfile, setHasProfile] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+351')

  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const dataLoaded = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true

    const load = async () => {
      if (user) {
        const nameParts = user.full_name.split(' ')
        setFirstName(nameParts[0] || '')
        setLastName(nameParts.slice(1).join(' ') || '')
        setEmail(user.email)
      }

      try {
        const res = await apiClient.api.apiAccountsProfileMeRetrieve()
        const profile = res.data
        setDisplayName(profile.display_name || '')
        setBio(profile.bio || '')
        setIsPublic(profile.is_public ?? true)
        setPhotoUrl(profile.photo_url || null)
        setHasProfile(true)
      } catch {
        setHasProfile(false)
        if (user) {
          setDisplayName(user.full_name || '')
        }
      }

      setIsLoading(false)
    }
    void load()
  }, [user])

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

      setPhotoFile(file)
      setPhotoUrl(URL.createObjectURL(file))
    },
    [t],
  )

  const handleSave = async () => {
    setIsSaving(true)

    try {
      if (photoFile) {
        const formData = new FormData()
        formData.append('display_name', displayName)
        formData.append('bio', bio)
        formData.append('is_public', String(isPublic))
        formData.append('photo', photoFile)

        if (hasProfile) {
          await apiClient.api.apiAccountsProfileMePartialUpdate(
            formData as unknown as Profile,
            { headers: { 'Content-Type': 'multipart/form-data' } },
          )
        } else {
          await apiClient.api.apiAccountsProfileMeCreate(
            formData as unknown as Profile,
            { headers: { 'Content-Type': 'multipart/form-data' } },
          )
        }
      } else {
        const payload = { display_name: displayName, bio, is_public: isPublic }
        if (hasProfile) {
          await apiClient.api.apiAccountsProfileMePartialUpdate(payload)
        } else {
          await apiClient.api.apiAccountsProfileMeCreate(
            payload as unknown as Profile,
          )
        }
      }

      setHasProfile(true)
      setPhotoFile(null)
      await refreshUser()
      toast.success(t('account.saved'))
    } catch {
      toast.error(t('account.saveError'))
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
        <div className="mx-auto w-full max-w-4xl">
          <PageHeader title={t('account.title')} />
          <div className="flex items-center justify-center py-24">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </PageLayout>
    )
  }

  const footerContent = (
    <>
      <div />
      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? t('account.saving') : t('account.saveChanges')}
      </Button>
    </>
  )

  return (
    <PageLayout footer={footerContent}>
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader title={t('account.title')} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Main Column */}
          <div className="flex flex-col gap-6">
            {/* Profile Section */}
            <CardSection
              title={t('account.profileSection')}
              description={t('account.profileDesc')}
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="displayName">{t('account.displayName')}</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('account.displayNamePlaceholder')}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('account.displayNameHelper')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="bio">{t('account.bio')}</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t('account.bioPlaceholder')}
                    rows={3}
                    className="mt-1.5"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {t('account.publicProfile')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('account.publicProfileDesc')}
                    </p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
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
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1.5"
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('account.lastName')}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1.5"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">{t('account.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    className="mt-1.5"
                    disabled
                  />
                </div>

                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <div>
                    <Label htmlFor="phoneCode">{t('account.phoneCode')}</Label>
                    <Input
                      id="phoneCode"
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="mt-1.5"
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">{t('account.phone')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5"
                      disabled
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
                      {r}
                    </div>
                  ))}
                </div>
              </CardSection>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
