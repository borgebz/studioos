import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Moon, Phone, Mail, Sun } from 'lucide-react'
import { paths } from '@/app/paths'
import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import { useTheme } from '@/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { FullPageLoader } from '@/components/shared/LogoLoader'
import {
  activateAccountSchema,
  type ActivateAccountFormValues,
} from './activate-schema'

type Step = 'form' | 'submitting' | 'success' | 'invalid'

export function ActivateAccountPage() {
  const { t, i18n } = useTranslation()
  const { uid, token } = useParams<{ uid: string; token: string }>()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const toggleLang = () => {
    const next = currentLang === 'pt' ? 'en' : 'pt'
    i18n.changeLanguage(next)
    localStorage.setItem('i18nextLng', next)
  }

  const [step, setStep] = useState<Step>('form')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivateAccountFormValues>({
    resolver: zodResolver(activateAccountSchema),
    defaultValues: { password: '' },
  })

  const onSubmit = async (data: ActivateAccountFormValues) => {
    if (!uid || !token) return

    setSubmitError(null)
    setStep('submitting')
    try {
      await apiClient.api.accountsActivateCreate({
        uid,
        token,
        password: data.password,
      })
      setStep('success')
    } catch (err) {
      setSubmitError(
        parseApiError(err, t, 'auth.activate.error') ?? t('auth.activate.error')
      )
      setStep('form')
    }
  }

  if (step === 'submitting') return <FullPageLoader />

  const renderContent = () => {
    if (step === 'success') {
      return (
        <>
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-primary">
              <span className="auth-wordmark text-[17px] lowercase tracking-normal">
                02.
              </span>
              <span>{t('auth.activate.successTitle')}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <h1 className="auth-heading auth-heading-sm mb-3.5">
              {t('auth.activate.successTitle')}
            </h1>
            <p className="max-w-[50ch] text-[14.5px] leading-relaxed text-muted-foreground">
              {t('auth.activate.successBody')}
            </p>
          </div>

          <Button onClick={() => navigate(paths.login)}>
            {t('auth.activate.goToLogin')}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </>
      )
    }

    if (step === 'invalid') {
      return (
        <>
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-primary">
              <span className="auth-wordmark text-[17px] lowercase tracking-normal">
                —
              </span>
              <span>{t('auth.activate.invalidTitle')}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <h1 className="auth-heading auth-heading-sm mb-3.5">
              {t('auth.activate.invalidTitle')}
            </h1>
            <p className="max-w-[50ch] text-[14.5px] leading-relaxed text-muted-foreground">
              {t('auth.activate.invalidBody')}
            </p>
          </div>

          <Button onClick={() => navigate(paths.login)}>
            {t('auth.activate.goToLogin')}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </>
      )
    }

    return (
      <>
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-primary">
            <span className="auth-wordmark text-[17px] lowercase tracking-normal">
              01.
            </span>
            <span>{t('auth.activate.overline')}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h1 className="auth-heading auth-heading-sm mb-3.5">
            {t('auth.activate.heroTitle')}
          </h1>
          <p className="max-w-[50ch] text-[14.5px] leading-relaxed text-muted-foreground">
            {t('auth.activate.heroBody')}
          </p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="password">
              {t('auth.activate.passwordLabel')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <div className="mt-1.5">
              <PasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className="bg-background dark:bg-background"
                {...register('password')}
              />
            </div>
            {errors.password ? (
              <p className="text-sm text-destructive mt-1">
                {t(errors.password.message ?? '')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {t('auth.onboarding.passwordHelper')}
              </p>
            )}
          </div>

          {submitError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex items-center justify-end">
            <Button type="submit">
              {t('auth.activate.submit')}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </form>
      </>
    )
  }

  return (
    <main className="grain flex min-h-svh flex-col bg-background text-foreground">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="auth-wordmark text-primary text-3xl">
              StudioOS
            </span>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden sm:flex items-center gap-4 text-[10.5px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                +351 900 000 000
              </span>
              <span className="flex items-center gap-1">
                <Mail className="size-3" />
                geral@studioos.dev
              </span>
            </div>
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
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-10">
        {renderContent()}
      </div>

      {/* Copyright */}
      <div className="px-6 py-4 text-center text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        &copy; {new Date().getFullYear()} StudioOS &middot; Braga
      </div>
    </main>
  )
}
