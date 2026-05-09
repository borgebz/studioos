import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { paths } from '@/app/paths'
import { Sun, Moon } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useTheme } from '@/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { FullPageLoader } from '@/components/shared/LogoLoader'
import './LoginPage.css'

type LoginLocationState = {
  from?: { pathname?: string }
}

function romanYear(n: number): string {
  const map: [string, number][] = [
    ['M', 1000],
    ['CM', 900],
    ['D', 500],
    ['CD', 400],
    ['C', 100],
    ['XC', 90],
    ['L', 50],
    ['XL', 40],
    ['X', 10],
    ['IX', 9],
    ['V', 5],
    ['IV', 4],
    ['I', 1],
  ]
  let s = ''
  for (const [r, v] of map) {
    while (n >= v) {
      s += r
      n -= v
    }
  }
  return s
}

function todayStamp() {
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ]
  const d = new Date()
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} · ${romanYear(d.getFullYear())}`
}

function Dancer({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 1742 2146"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      aria-hidden="true"
    >
      <g transform="translate(0,2146) scale(0.1,-0.1)">
        <path d="M26 21429 c-21 -24 -26 -41 -26 -82 1 -29 6 -62 13 -74 7 -12 89 -73 182 -135 622 -414 1027 -829 1134 -1163 52 -161 62 -260 71 -735 5 -239 14 -475 19 -525 58 -501 265 -1107 577 -1687 48 -89 209 -363 357 -608 263 -435 548 -914 581 -977 21 -43 20 -119 -4 -245 -19 -97 -39 -168 -153 -529 -80 -255 -92 -324 -91 -559 0 -175 3 -221 23 -310 87 -407 308 -797 689 -1220 184 -203 636 -650 669 -661 92 -30 152 74 102 178 -16 35 -103 130 -319 348 -163 165 -325 334 -362 375 -327 374 -538 757 -594 1082 -12 69 -15 132 -11 243 6 193 18 248 145 652 95 301 116 402 116 568 1 130 -1 144 -25 195 -14 30 -135 228 -269 440 -636 1007 -886 1484 -1070 2041 -129 392 -144 500 -170 1299 -17 536 -71 771 -232 1017 -192 293 -531 611 -995 937 -251 175 -306 196 -357 135z" />
        <path d="M4250 19156 c-182 -65 -364 -157 -472 -239 -131 -99 -167 -145 -422 -557 -56 -91 -145 -224 -197 -296 -221 -305 -259 -471 -138 -609 l31 -35 -12 -134 c-19 -196 -11 -300 29 -381 57 -115 124 -150 361 -185 179 -27 199 -31 205 -40 3 -5 10 -165 16 -357 12 -371 16 -397 64 -429 22 -14 32 -15 64 -6 72 22 76 32 79 231 5 221 -14 570 -33 645 -19 71 -36 97 -84 129 -55 36 -128 55 -266 67 -148 13 -185 23 -216 56 -22 23 -24 34 -24 117 0 51 4 142 9 204 11 132 0 183 -51 250 -18 24 -33 51 -33 62 0 21 81 153 168 274 78 108 189 279 291 450 46 76 109 171 141 211 98 124 247 219 485 311 149 57 175 81 175 158 0 62 -17 91 -67 112 -19 8 -36 15 -37 15 0 -1 -30 -11 -66 -24z" />
        <path d="M10768 17669 c-267 -28 -586 -111 -926 -240 -174 -66 -384 -157 -782 -337 -939 -424 -1251 -534 -1765 -619 -99 -16 -183 -18 -830 -18 -889 0 -861 2 -1195 -114 -211 -74 -296 -72 -329 7 -16 39 -94 95 -121 87 -10 -3 -31 -20 -45 -36 -55 -67 -22 -206 69 -286 110 -97 216 -97 600 2 366 94 441 99 1256 81 443 -9 572 -4 761 35 211 42 571 173 1249 454 1045 434 1433 579 1802 675 199 51 318 70 452 70 126 0 200 -16 301 -67 94 -47 160 -97 286 -220 58 -56 121 -109 140 -117 75 -31 139 17 139 105 0 48 -22 109 -38 109 -4 0 -77 61 -162 136 -85 74 -186 156 -224 181 -81 55 -188 98 -277 112 -73 12 -247 12 -361 0z" />
        <path d="M10758 16507 c-381 -256 -1725 -1231 -4528 -3287 -1131 -829 -1698 -1246 -4790 -3519 -712 -523 -1308 -967 -1324 -986 -22 -26 -30 -48 -34 -87 -4 -52 -3 -54 38 -87 41 -33 45 -34 85 -23 151 40 1146 550 2685 1375 1230 659 1932 1046 1978 1090 45 42 62 78 62 126 0 37 -3 41 -56 71 -37 21 -62 29 -76 24 -11 -3 -73 -38 -137 -76 -531 -322 -1243 -716 -1996 -1107 -395 -205 -1233 -627 -1222 -615 4 5 2153 1577 4775 3494 5130 3751 4812 3513 4812 3605 -1 35 -6 44 -44 73 -24 17 -50 32 -59 32 -9 0 -85 -46 -169 -103z" />
        <path d="M16910 14613 c-540 -31 -1011 -160 -1081 -295 -17 -34 -17 -39 -3 -73 26 -62 116 -84 184 -45 231 135 479 190 1013 225 l99 7 -18 -34 c-51 -99 -157 -199 -271 -257 -23 -12 -142 -55 -263 -96 -263 -89 -334 -119 -675 -280 -287 -137 -367 -167 -506 -191 -134 -23 -500 -29 -839 -14 -382 16 -518 4 -859 -81 -371 -92 -693 -223 -1478 -602 -522 -253 -719 -336 -1163 -490 -532 -185 -1069 -346 -2215 -666 l-320 -89 -32 -41 c-27 -37 -30 -46 -22 -70 16 -45 44 -64 102 -69 44 -3 119 15 482 117 832 233 1396 402 1930 578 505 166 640 221 1325 541 933 435 1314 584 1666 652 159 30 265 34 674 21 783 -25 998 14 1485 269 187 99 293 143 530 222 116 38 242 85 281 103 146 67 269 170 353 294 54 78 120 218 122 257 4 43 -25 90 -62 103 -29 10 -291 13 -439 4z" />
        <path d="M5329 6501 c-25 -26 -29 -37 -29 -86 0 -32 14 -117 31 -189 30 -124 31 -138 26 -276 -4 -84 -17 -209 -32 -296 -24 -142 -46 -233 -189 -789 -57 -221 -97 -417 -117 -575 -5 -47 -14 -353 -19 -680 -5 -327 -14 -635 -20 -685 -17 -145 -44 -240 -119 -421 -224 -542 -301 -936 -288 -1459 12 -466 68 -842 144 -973 47 -82 137 -95 188 -27 15 18 76 159 136 312 61 153 147 370 191 483 157 396 187 440 361 524 50 24 149 71 219 105 196 94 279 187 315 355 17 81 12 211 -12 328 -36 170 -100 237 -184 193 -58 -29 -65 -117 -20 -241 31 -83 31 -203 1 -260 -30 -58 -92 -108 -192 -156 -316 -151 -327 -157 -405 -230 -69 -65 -82 -83 -135 -192 -51 -106 -190 -447 -306 -753 -22 -57 -42 -103 -45 -103 -16 0 -59 504 -59 700 0 429 72 771 265 1250 89 222 115 310 139 465 31 201 39 407 32 820 -10 628 -11 621 227 1555 89 347 117 519 124 745 6 201 -7 310 -52 450 -24 73 -30 83 -69 108 -55 34 -71 34 -107 -2z" />
      </g>
    </svg>
  )
}

export function LoginPage() {
  const { t, i18n } = useTranslation()
  const emailId = useId()
  const passwordId = useId()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login } = useAuth()
  const { theme, setTheme } = useTheme()

  const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const toggleLang = () => {
    const next = currentLang === 'pt' ? 'en' : 'pt'
    i18n.changeLanguage(next)
    localStorage.setItem('i18nextLng', next)
  }

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const locationState = location.state as LoginLocationState | null
  const redirectTo = locationState?.from?.pathname ?? paths.home

  const isPreview = new URLSearchParams(location.search).has('preview')

  if (isAuthenticated && !isPreview) {
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
      {isSubmitting && <FullPageLoader />}
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
            {/* Corners */}
            <div className="login-corner login-corner-tl" />
            <div className="login-corner login-corner-tr" />
            <div className="login-corner login-corner-bl" />
            <div className="login-corner login-corner-br" />

            {/* Top meta */}
            <div
              className="flex justify-between text-[10.5px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--login-panel-text)' }}
            >
              <span>◐ EST. MMXIV</span>
              <span>{todayStamp()}</span>
            </div>

            {/* Side text */}
            <div className="login-side-text text-[10.5px] uppercase tracking-[0.32em]" style={{ color: 'var(--login-panel-text)', opacity: 0.5}}>
              SEASON&nbsp;&nbsp;XXIV — XXV
            </div>

            {/* Dancer area */}
            <div className="relative flex flex-1 items-center justify-center">
              <div className="login-dancer-sway relative z-[2] w-[26%] max-w-[200px] min-w-[120px]">
                <Dancer
                  className="h-auto w-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
                  style={{ color: 'var(--login-panel-text)', opacity: 0.6 }}
                />
              </div>
              <div className="login-dancer-shadow" />
              <svg
                className="login-trace"
                viewBox="0 0 400 500"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M 60 380 C 120 320, 180 360, 240 280" />
                <path d="M 80 420 Q 200 360 320 410" />
                <circle cx="60" cy="380" r="3.5" />
                <circle cx="240" cy="280" r="3.5" />
                <circle cx="320" cy="410" r="3.5" />
              </svg>
            </div>

            {/* Wordmark */}
            <div className="flex flex-col items-center gap-2.5 text-center">
              <span className="text-[10.5px] uppercase tracking-[0.42em]" style={{ color: 'var(--login-panel-text)', opacity: 0.65 }}>
                {t('auth.login.brandSubtitle')}
              </span>
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
              <div className="flex items-center gap-3.5 text-[11px] uppercase tracking-[0.36em]" style={{ color: 'var(--login-panel-text)', opacity: 0.7 }}>
                <span>BRAGA</span>
                <span className="inline-block h-1 w-1 rounded-full bg-current" />
                <span>PORTUGAL</span>
              </div>
            </div>

            {/* Bottom meta */}
            <div className="mt-8 flex justify-between text-[10.5px] uppercase tracking-[0.18em]" style={{ color: 'var(--login-panel-text)' }}>
              <span>{t('auth.login.marqueeHours')}</span>
              <span>{t('auth.login.marqueeAddress')}</span>
            </div>
          </div>
        </aside>

        {/* ─── Paper (right) ─── */}
        <div
          className="grain relative flex min-h-svh flex-col p-7"
          style={{ borderLeft: '1px solid var(--login-rule)' }}
        >
          {/* Top */}
          <div className="flex items-center justify-between">
            <span className="login-ticket">ADMIT ONE · STAGE DOOR</span>
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
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontStyle: 'italic',
                    }}
                  >
                    01.
                  </span>
                  <span>{t('auth.login.overline')}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <h2
                  className="mb-3.5"
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontWeight: 500,
                    fontSize: 'clamp(40px, 4.4vw, 56px)',
                    lineHeight: 1.0,
                    letterSpacing: '-0.012em',
                    margin: 0,
                  }}
                >
                  {t('auth.login.heroTitle_1')}
                  {t('auth.login.heroTitle_em') && (
                    <em className="text-primary">
                      {t('auth.login.heroTitle_em')}
                    </em>
                  )}
                  {t('auth.login.heroTitle_2')}
                  <br />
                  {t('auth.login.heroTitle_3')}
                </h2>
                <p className="max-w-[38ch] text-[14.5px] leading-relaxed text-muted-foreground">
                  {t('auth.login.heroBody')}
                </p>
              </div>

              {/* Form */}
              <form
                className="flex flex-col gap-5"
                method="post"
                action="/login"
                onSubmit={handleSubmit}
              >
                <input type="hidden" name="username" autoComplete="username" aria-hidden="true" />
                <div className="space-y-2">
                  <Label htmlFor={emailId}>Email</Label>
                  <Input
                    id={emailId}
                    name="email"
                    type="email"
                    placeholder="matilde@studioos.dev"
                    autoComplete="username email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={passwordId}>Password</Label>
                  <Input
                    id={passwordId}
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>

                {error && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div className="flex justify-end">
                  <Button type="button" variant="link">
                    {t('auth.login.forgotPassword')}
                  </Button>
                </div>

                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting
                    ? t('auth.login.submitting')
                    : t('auth.login.submit')}
                  {!isSubmitting && (
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
                  )}
                </Button>

                <Separator />

                <div className="text-[13.5px] text-muted-foreground">
                  <p>
                    {t('auth.login.newUser')}{' '}
                    <Button type="button" variant="link" className="px-0">
                      {t('auth.login.requestAccess')}
                    </Button>
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">
                    {t('auth.login.footNote')}
                  </p>
                </div>
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
