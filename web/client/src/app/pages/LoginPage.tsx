import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { paths } from '@/app/paths'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginLocationState = {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const { t } = useTranslation()
  const emailId = useId()
  const passwordId = useId()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const locationState = location.state as LoginLocationState | null
  const redirectTo = locationState?.from?.pathname ?? paths.home

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      await login({ email, password })
      navigate(redirectTo, { replace: true })
    } catch {
      setError(t('auth.login.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="grid min-h-svh lg:grid-cols-2">
        <section className="hidden min-h-svh items-center justify-center bg-[var(--login-brand-surface)] px-8 lg:flex">
          <div className="text-center">
            <p className="font-serif text-7xl italic leading-none text-[var(--login-brand)]">
              {t('nav.brand')}
            </p>
            <p className="mt-8 text-sm font-medium uppercase tracking-[0.28em] text-[var(--login-brand)]">
              {t('auth.login.brandSubtitle')}
            </p>
          </div>
        </section>

        <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-8">
          <Card className="w-full max-w-[38rem] border-0 bg-transparent py-0 shadow-none">
            <CardHeader className="px-0 text-center">
              <CardTitle className="font-serif text-4xl font-semibold text-[var(--login-heading)]">
                {t('auth.login.welcome')}
              </CardTitle>
              <CardDescription className="mt-4 text-lg font-medium text-muted-foreground">
                {t('auth.login.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-8">
              <form className="grid gap-7" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <Label
                    htmlFor={emailId}
                    className="text-base font-semibold text-[var(--login-heading)]"
                  >
                    {t('auth.login.email')}
                  </Label>
                  <Input
                    id={emailId}
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="h-16 rounded-xl border-border px-5 text-lg font-medium shadow-none"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      htmlFor={passwordId}
                      className="text-base font-semibold text-[var(--login-heading)]"
                    >
                      {t('auth.login.password')}
                    </Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto px-0 text-base font-semibold text-[var(--login-brand)]"
                    >
                      {t('auth.login.forgotPassword')}
                    </Button>
                  </div>
                  <Input
                    id={passwordId}
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="h-16 rounded-xl border-border px-5 text-lg font-medium shadow-none"
                    required
                  />
                </div>

                {error ? (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked === true)
                    }
                    className="size-5 rounded-[5px] border-[var(--login-brand)] data-[state=checked]:border-[var(--login-brand)] data-[state=checked]:bg-[var(--login-brand)]"
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-base font-semibold text-muted-foreground"
                  >
                    {t('auth.login.rememberMe')}
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="h-16 w-full rounded-xl bg-[var(--login-action)] text-lg font-semibold text-[var(--login-action-foreground)] hover:bg-[var(--login-action)]/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? t('auth.login.submitting')
                    : t('auth.login.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
