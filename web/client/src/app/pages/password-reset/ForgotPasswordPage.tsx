import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Moon, Phone, Mail, Sun } from 'lucide-react'
import { paths } from '@/app/paths'
import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import { useTheme } from '@/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FullPageLoader } from '@/components/shared/LogoLoader'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from './reset-password-schema'

type Step = 'form' | 'submitting' | 'sent'

export function ForgotPasswordPage() {
  const { t, i18n } = useTranslation()
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
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setSubmitError(null)
    setStep('submitting')
    try {
      await apiClient.api.accountsAuthPasswordResetCreate({ email: data.email })
      setStep('sent')
    } catch (err) {
      setSubmitError(
        parseApiError(err, t, 'auth.forgotPassword.error') ??
          t('auth.forgotPassword.error')
      )
      setStep('form')
    }
  }

  if (step === 'submitting') return <FullPageLoader />

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
                +351 964 693 247
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
        {step === 'sent' ? (
          <>
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-primary">
                <span className="auth-wordmark text-[17px] lowercase tracking-normal">
                  02.
                </span>
                <span>{t('auth.forgotPassword.sentTitle')}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <h1 className="auth-heading auth-heading-sm mb-3.5">
                {t('auth.forgotPassword.sentTitle')}
              </h1>
              <p className="max-w-[50ch] text-[14.5px] leading-relaxed text-muted-foreground">
                {t('auth.forgotPassword.sentBody')}
              </p>
            </div>

            <Button onClick={() => navigate(paths.login)}>
              {t('auth.forgotPassword.backToLogin')}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-primary">
                <span className="auth-wordmark text-[17px] lowercase tracking-normal">
                  01.
                </span>
                <span>{t('auth.forgotPassword.overline')}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <h1 className="auth-heading auth-heading-sm mb-3.5">
                {t('auth.forgotPassword.heroTitle')}
              </h1>
              <p className="max-w-[50ch] text-[14.5px] leading-relaxed text-muted-foreground">
                {t('auth.forgotPassword.heroBody')}
              </p>
            </div>

            <form
              className="flex flex-col gap-5"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div>
                <Label htmlFor="email">{t('auth.login.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="matilde@studioos.dev"
                  autoComplete="email"
                  className="mt-1.5 bg-background dark:bg-background"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {t(errors.email.message ?? '')}
                  </p>
                )}
              </div>

              {submitError && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </p>
              )}

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-background dark:bg-background"
                  onClick={() => navigate(paths.login)}
                >
                  {t('auth.forgotPassword.backToLogin')}
                </Button>
                <Button type="submit">
                  {t('auth.forgotPassword.submit')}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Copyright */}
      <div className="px-6 py-4 text-center text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        &copy; {new Date().getFullYear()} StudioOS &middot; Braga
      </div>
    </main>
  )
}
