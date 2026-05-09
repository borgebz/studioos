import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { paths } from '@/app/paths'
import { apiClient } from '@/api/api-client'
import { useAuth } from '@/auth/useAuth'
import { useTheme } from '@/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/shared/DatePicker'
import { FullPageLoader } from '@/components/shared/LogoLoader'
import '../LoginPage/LoginPage.css'

type OnboardingStep = 'loading' | 'invalid' | 'form' | 'submitting' | 'success'

export function OnboardingPage() {
  const { t, i18n } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()

  const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const toggleLang = () => {
    const next = currentLang === 'pt' ? 'en' : 'pt'
    i18n.changeLanguage(next)
    localStorage.setItem('i18nextLng', next)
  }

  const firstNameId = useId()
  const lastNameId = useId()
  const phoneCountryId = useId()
  const phoneId = useId()
  const passwordId = useId()
  const dobId = useId()

  const [step, setStep] = useState<OnboardingStep>('loading')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current || !token) return
    loaded.current = true
    apiClient.api
      .apiAccountsOnboardRetrieve(token)
      .then((res) => {
        setEmail(res.data.data.email)
        setRole(res.data.data.role)
        setStep('form')
      })
      .catch(() => setStep('invalid'))
  }, [token])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!token) return

    setError(null)
    const fd = new FormData(e.currentTarget)
    const first_name = String(fd.get('first_name') ?? '').trim()
    const last_name = String(fd.get('last_name') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    const phone = String(fd.get('phone') ?? '').trim()
    const phone_country_code = String(fd.get('phone_country_code') ?? '').trim()

    if (!first_name || !last_name || !password || !phone || !phone_country_code || !dateOfBirth) {
      setError(t('auth.onboarding.missingFields'))
      return
    }

    if (password.length < 8) {
      setError(t('auth.onboarding.passwordTooShort'))
      return
    }

    setStep('submitting')

    try {
      await apiClient.api.apiAccountsOnboardCreate(token, {
        first_name,
        last_name,
        password,
        phone,
        phone_country_code,
        date_of_birth: format(dateOfBirth, 'yyyy-MM-dd'),
      })
      await refreshUser()
      setStep('success')
    } catch {
      setError(t('auth.onboarding.error'))
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
          <h1
            className="mb-4"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 500,
              fontSize: 'clamp(32px, 4vw, 48px)',
              lineHeight: 1.1,
            }}
          >
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
          <h1
            className="mb-4"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 500,
              fontSize: 'clamp(32px, 4vw, 48px)',
              lineHeight: 1.1,
            }}
          >
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
              className="flex justify-between text-[10.5px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--login-panel-text)' }}
            >
              <span>◐ EST. MMXIV</span>
              <span>{t('auth.onboarding.marqueeWelcome')}</span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <div
                className="text-center"
                style={{ color: 'var(--login-panel-text)', opacity: 0.8 }}
              >
                <p className="mb-2 text-[10.5px] uppercase tracking-[0.32em]">
                  {t('auth.onboarding.invitedAs')}
                </p>
                <Badge variant="outline" className="text-sm capitalize">
                  {role}
                </Badge>
              </div>

              <h1
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 'clamp(56px, 8vw, 96px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.01em',
                  margin: 0,
                  color: 'var(--primary)',
                }}
              >
                StudioOS
              </h1>

              <div
                className="flex items-center gap-3.5 text-[11px] uppercase tracking-[0.36em]"
                style={{ color: 'var(--login-panel-text)', opacity: 0.7 }}
              >
                <span>BRAGA</span>
                <span className="inline-block h-1 w-1 rounded-full bg-current" />
                <span>PORTUGAL</span>
              </div>
            </div>

            <div
              className="flex justify-center text-[10.5px] uppercase tracking-[0.18em]"
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
                onClick={toggleLang}
                aria-label="Toggle language"
              >
                <span className="text-[10px] font-medium uppercase">{currentLang}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </Button>
            </div>
          </div>

          {/* Form area */}
          <div className="mx-auto flex w-full max-w-[480px] flex-1 items-center py-9">
            <div className="w-full">
              {/* Header */}
              <div className="mb-7">
                <div className="mb-4 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-primary">
                  <span
                    className="text-[17px] lowercase tracking-normal"
                    style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
                  >
                    01.
                  </span>
                  <span>{t('auth.onboarding.overline')}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <h2
                  className="mb-3.5"
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontWeight: 500,
                    fontSize: 'clamp(36px, 4vw, 48px)',
                    lineHeight: 1.0,
                    letterSpacing: '-0.012em',
                    margin: 0,
                  }}
                >
                  {t('auth.onboarding.heroTitle_1')}
                  <em className="text-primary">{t('auth.onboarding.heroTitle_em')}</em>
                  {t('auth.onboarding.heroTitle_2')}
                </h2>
                <p className="max-w-[38ch] text-[14.5px] leading-relaxed text-muted-foreground">
                  {t('auth.onboarding.heroBody')}
                </p>
              </div>

              {/* Mobile role badge */}
              <div className="mb-5 flex items-center gap-2 lg:hidden">
                <span className="text-sm text-muted-foreground">{email}</span>
                <Badge variant="outline" className="capitalize">{role}</Badge>
              </div>

              {/* Form */}
              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={firstNameId}>
                      {t('auth.onboarding.firstName')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={firstNameId}
                      name="first_name"
                      autoComplete="given-name"
                      placeholder={t('auth.onboarding.firstNamePlaceholder')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={lastNameId}>
                      {t('auth.onboarding.lastName')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={lastNameId}
                      name="last_name"
                      autoComplete="family-name"
                      placeholder={t('auth.onboarding.lastNamePlaceholder')}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[100px_1fr] gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={phoneCountryId}>
                      {t('auth.onboarding.phoneCode')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={phoneCountryId}
                      name="phone_country_code"
                      defaultValue="+351"
                      autoComplete="tel-country-code"
                      placeholder="+351"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={phoneId}>
                      {t('auth.onboarding.phone')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={phoneId}
                      name="phone"
                      type="tel"
                      autoComplete="tel-national"
                      placeholder={t('auth.onboarding.phonePlaceholder')}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={dobId}>
                    {t('auth.onboarding.dateOfBirth')} <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    value={dateOfBirth}
                    onChange={setDateOfBirth}
                    placeholder={t('auth.onboarding.dateOfBirthPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={passwordId}>
                    {t('auth.onboarding.password')} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id={passwordId}
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={t('auth.onboarding.togglePassword')}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.onboarding.passwordHelper')}
                  </p>
                </div>

                {error && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg">
                  {t('auth.onboarding.submit')}
                  <svg
                    className="ml-2 h-3 w-6"
                    viewBox="0 0 24 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M0 6 H22 M16 1 L22 6 L16 11"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-dashed border-border pt-4 text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>{t('auth.login.copyright')}</span>
            <span
              className="hidden sm:inline"
              style={{
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                textTransform: 'none',
                letterSpacing: 0,
                fontSize: '13px',
              }}
            >
              — a small school for the moving body —
            </span>
            <span className="normal-case tracking-normal">{t('auth.login.support')}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
