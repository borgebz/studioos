import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Moon, Sun } from 'lucide-react'
import { paths } from '@/app/paths'
import { SubmitArrow } from '@/components/shared/SubmitArrow'
import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import { useAuth } from '@/auth/useAuth'
import { useTheme } from '@/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/shared/DatePicker'
import { FullPageLoader } from '@/components/shared/LogoLoader'
import {
  onboardingSchema,
  type OnboardingFormValues,
} from './onboarding-schema'
import '../LoginPage/LoginPage.css'

type OnboardingStep = 'loading' | 'invalid' | 'form' | 'submitting' | 'success'

export function OnboardingPage() {
  const { t, i18n } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()

  const isPreview = new URLSearchParams(location.search).has('preview')

  const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const toggleLang = () => {
    const next = currentLang === 'pt' ? 'en' : 'pt'
    i18n.changeLanguage(next)
    localStorage.setItem('i18nextLng', next)
  }

  const [step, setStep] = useState<OnboardingStep>('loading')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone_country_code: '+351',
      phone: '',
      password: '',
    },
  })

  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current || !token) return
    loaded.current = true
    if (isPreview) {
      setEmail('ana.silva.maria@studioos.dev')
      setRole('teacher')
      setStep('form')
      return
    }
    apiClient.api
      .accountsOnboardRetrieve(token)
      .then((res) => {
        setEmail(res.data.data.email)
        setRole(res.data.data.role)
        setStep('form')
      })
      .catch(() => setStep('invalid'))
  }, [token, isPreview])

  const onSubmit = async (data: OnboardingFormValues) => {
    if (!token) return

    setSubmitError(null)
    setStep('submitting')

    try {
      await apiClient.api.accountsOnboardCreate(token, {
        first_name: data.first_name,
        last_name: data.last_name,
        password: data.password,
        phone: data.phone,
        phone_country_code: data.phone_country_code,
        date_of_birth: format(data.date_of_birth, 'yyyy-MM-dd'),
      })
      await refreshUser()
      setStep('success')
    } catch (err) {
      setSubmitError(
        parseApiError(err, t, 'auth.onboarding.error') ??
          t('auth.onboarding.error')
      )
      setStep('form')
    }
  }

  if (step === 'loading' || step === 'submitting') {
    return <FullPageLoader />
  }

  if (step === 'invalid') {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md text-center">
          <h1 className="auth-heading auth-heading-sm mb-4">
            {t('auth.onboarding.invalidTitle')}
          </h1>
          <p className="mb-6 text-muted-foreground">
            {t('auth.onboarding.invalidBody')}
          </p>
          <Button onClick={() => navigate(paths.login)}>
            {t('auth.onboarding.goToLogin')}
          </Button>
        </div>
      </main>
    )
  }

  if (step === 'success') {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md text-center">
          <h1 className="auth-heading auth-heading-sm mb-4">
            {t('auth.onboarding.successTitle')}
          </h1>
          <p className="mb-6 text-muted-foreground">
            {t('auth.onboarding.successBody')}
          </p>
          <Button onClick={() => navigate(paths.home)}>
            {t('auth.onboarding.goToHome')}
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div
        className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]"
        style={{ columnGap: 0 }}
      >
        {/* ─── Marquee (left) ─── */}
        <aside
          className="relative hidden min-h-svh lg:block"
          style={{
            background: 'var(--login-brand-surface)',
            borderRight: '1px solid var(--login-rule)',
          }}
        >
          <div
            className="relative mx-7 mt-7 flex h-[calc(100%-56px)] flex-col border p-6"
            style={{ borderColor: 'var(--login-rule)' }}
          >
            <div className="login-corner login-corner-tl" />
            <div className="login-corner login-corner-tr" />
            <div className="login-corner login-corner-bl" />
            <div className="login-corner login-corner-br" />

            <div
              className="flex justify-between text-[11px]"
              style={{ color: 'var(--login-panel-text)' }}
            >
              <span className="uppercase tracking-[0.18em]">◐ EST. MMXIV</span>
              <span>{t('auth.onboarding.marqueeWelcome')}</span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <div
                className="text-center"
                style={{ color: 'var(--login-panel-text)', opacity: 0.8 }}
              >
                <p className="mb-2 text-[12px]">
                  {t('auth.onboarding.invitedAs')}
                </p>
                <Badge variant="outline" className="text-sm capitalize">
                  {t(`roles.${role}`)}
                </Badge>
              </div>

              <h1
                className="auth-heading auth-heading-xl"
                style={{
                  lineHeight: 0.95,
                  letterSpacing: '-0.01em',
                  margin: 0,
                  color: 'var(--primary)',
                  fontStyle: 'italic',
                }}
              >
                StudioOS
              </h1>

              <div
                className="flex items-center gap-2 text-[12px]"
                style={{ color: 'var(--login-panel-text)', opacity: 0.7 }}
              >
                <span>Braga</span>
                <span className="inline-block h-1 w-1 rounded-full bg-current" />
                <span>Portugal</span>
              </div>
            </div>

            <div
              className="flex justify-center text-[12px]"
              style={{ color: 'var(--login-panel-text)' }}
            >
              <span>{email}</span>
            </div>
          </div>
        </aside>

        {/* ─── Form (right) ─── */}
        <div
          className="grain relative flex min-h-svh flex-col p-7"
          style={{ borderLeft: '1px solid var(--login-rule)' }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <span className="login-ticket">{t('auth.onboarding.ticket')}</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="min-h-11 min-w-11 md:min-h-0 md:min-w-0"
                onClick={toggleLang}
                aria-label={t('nav.toggleLanguage')}
              >
                <span className="text-[10px] font-medium uppercase">
                  {currentLang}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="min-h-11 min-w-11 md:min-h-0 md:min-w-0"
                onClick={toggleTheme}
                aria-label={t('nav.toggleTheme')}
              >
                {theme === 'dark' ? (
                  <Sun className="size-3.5" />
                ) : (
                  <Moon className="size-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Form area */}
          <div className="mx-auto flex w-full max-w-[480px] flex-1 items-center py-9">
            <div className="w-full">
              {/* Header */}
              <div className="mb-7">
                <div className="mb-4 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-primary">
                  <span className="auth-wordmark text-[17px] lowercase tracking-normal">
                    01.
                  </span>
                  <span>{t('auth.onboarding.overline')}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <h2
                  className="auth-heading auth-heading-md mb-3.5"
                  style={{ margin: 0 }}
                >
                  {t('auth.onboarding.heroTitle_1')}
                  <em className="text-primary">
                    {t('auth.onboarding.heroTitle_em')}
                  </em>
                  {t('auth.onboarding.heroTitle_2')}
                </h2>
                <p className="max-w-[38ch] text-[14.5px] leading-relaxed text-muted-foreground">
                  {t('auth.onboarding.heroBody')}
                </p>
              </div>

              {/* Mobile invitee stub */}
              <div
                className="mb-6 rounded-md px-4 py-3 lg:hidden"
                style={{
                  background: 'var(--login-brand-surface)',
                  border: '1px solid var(--login-rule)',
                  color: 'var(--login-panel-text)',
                }}
              >
                <p className="text-sm">
                  {t('auth.onboarding.invitedAs')}{' '}
                  <span className="font-medium capitalize">
                    {t(`roles.${role}`)}
                  </span>
                </p>
                <p
                  className="mt-0.5 truncate text-xs opacity-65"
                  title={email}
                >
                  {email}
                </p>
              </div>

              {/* Form */}
              <form
                className="flex flex-col gap-5"
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">
                      {t('auth.onboarding.firstName')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      autoComplete="given-name"
                      placeholder={t('auth.onboarding.firstNamePlaceholder')}
                      {...register('first_name')}
                    />
                    {errors.first_name && (
                      <p className="text-sm text-destructive">
                        {t(errors.first_name.message ?? '')}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">
                      {t('auth.onboarding.lastName')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      autoComplete="family-name"
                      placeholder={t('auth.onboarding.lastNamePlaceholder')}
                      {...register('last_name')}
                    />
                    {errors.last_name && (
                      <p className="text-sm text-destructive">
                        {t(errors.last_name.message ?? '')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[100px_1fr] gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_country_code">
                      {t('auth.onboarding.phoneCode')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone_country_code"
                      autoComplete="tel-country-code"
                      placeholder="+351"
                      {...register('phone_country_code')}
                    />
                    {errors.phone_country_code && (
                      <p className="text-sm text-destructive">
                        {t(errors.phone_country_code.message ?? '')}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      {t('auth.onboarding.phone')}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel-national"
                      placeholder={t('auth.onboarding.phonePlaceholder')}
                      {...register('phone')}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">
                        {t(errors.phone.message ?? '')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">
                    {t('auth.onboarding.dateOfBirth')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="date_of_birth"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t(
                          'auth.onboarding.dateOfBirthPlaceholder'
                        )}
                      />
                    )}
                  />
                  {errors.date_of_birth && (
                    <p className="text-sm text-destructive">
                      {t(errors.date_of_birth.message ?? '')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {t('auth.onboarding.password')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  {errors.password ? (
                    <p className="text-sm text-destructive">
                      {t(errors.password.message ?? '')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('auth.onboarding.passwordHelper')}
                    </p>
                  )}
                </div>

                {submitError && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {submitError}
                  </p>
                )}

                <Button type="submit" size="lg">
                  {t('auth.onboarding.submit')}
                  <SubmitArrow />
                </Button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>{t('auth.login.copyright')}</span>
            <span
              className="auth-wordmark hidden sm:inline"
              style={{
                textTransform: 'none',
                letterSpacing: 0,
                fontSize: '13px',
              }}
            >
              — a small school for the moving body —
            </span>
            <span className="normal-case tracking-normal">
              {t('auth.login.support')}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
