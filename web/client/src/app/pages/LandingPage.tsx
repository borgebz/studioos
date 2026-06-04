import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, ExternalLink } from 'lucide-react'
import { paths } from '@/app/paths'
import { useTheme } from '@/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// ---------------------------------------------------------------------------
// Dancer SVG paths from logo-dancer.svg
// ---------------------------------------------------------------------------
const DANCER_PATHS = [
  'M26 21429 c-21 -24 -26 -41 -26 -82 1 -29 6 -62 13 -74 7 -12 89 -73 182 -135 622 -414 1027 -829 1134 -1163 52 -161 62 -260 71 -735 5 -239 14 -475 19 -525 58 -501 265 -1107 577 -1687 48 -89 209 -363 357 -608 263 -435 548 -914 581 -977 21 -43 20 -119 -4 -245 -19 -97 -39 -168 -153 -529 -80 -255 -92 -324 -91 -559 0 -175 3 -221 23 -310 87 -407 308 -797 689 -1220 184 -203 636 -650 669 -661 92 -30 152 74 102 178 -16 35 -103 130 -319 348 -163 165 -325 334 -362 375 -327 374 -538 757 -594 1082 -12 69 -15 132 -11 243 6 193 18 248 145 652 95 301 116 402 116 568 1 130 -1 144 -25 195 -14 30 -135 228 -269 440 -636 1007 -886 1484 -1070 2041 -129 392 -144 500 -170 1299 -17 536 -71 771 -232 1017 -192 293 -531 611 -995 937 -251 175 -306 196 -357 135z',
  'M4250 19156 c-182 -65 -364 -157 -472 -239 -131 -99 -167 -145 -422 -557 -56 -91 -145 -224 -197 -296 -221 -305 -259 -471 -138 -609 l31 -35 -12 -134 c-19 -196 -11 -300 29 -381 57 -115 124 -150 361 -185 179 -27 199 -31 205 -40 3 -5 10 -165 16 -357 12 -371 16 -397 64 -429 22 -14 32 -15 64 -6 72 22 76 32 79 231 5 221 -14 570 -33 645 -19 71 -36 97 -84 129 -55 36 -128 55 -266 67 -148 13 -185 23 -216 56 -22 23 -24 34 -24 117 0 51 4 142 9 204 11 132 0 183 -51 250 -18 24 -33 51 -33 62 0 21 81 153 168 274 78 108 189 279 291 450 46 76 109 171 141 211 98 124 247 219 485 311 149 57 175 81 175 158 0 62 -17 91 -67 112 -19 8 -36 15 -37 15 0 -1 -30 -11 -66 -24z',
  'M10768 17669 c-267 -28 -586 -111 -926 -240 -174 -66 -384 -157 -782 -337 -939 -424 -1251 -534 -1765 -619 -99 -16 -183 -18 -830 -18 -889 0 -861 2 -1195 -114 -211 -74 -296 -72 -329 7 -16 39 -94 95 -121 87 -10 -3 -31 -20 -45 -36 -55 -67 -22 -206 69 -286 110 -97 216 -97 600 2 366 94 441 99 1256 81 443 -9 572 -4 761 35 211 42 571 173 1249 454 1045 434 1433 579 1802 675 199 51 318 70 452 70 126 0 200 -16 301 -67 94 -47 160 -97 286 -220 58 -56 121 -109 140 -117 75 -31 139 17 139 105 0 48 -22 109 -38 109 -4 0 -77 61 -162 136 -85 74 -186 156 -224 181 -81 55 -188 98 -277 112 -73 12 -247 12 -361 0z',
  'M10758 16507 c-381 -256 -1725 -1231 -4528 -3287 -1131 -829 -1698 -1246 -4790 -3519 -712 -523 -1308 -967 -1324 -986 -22 -26 -30 -48 -34 -87 -4 -52 -3 -54 38 -87 41 -33 45 -34 85 -23 151 40 1146 550 2685 1375 1230 659 1932 1046 1978 1090 45 42 62 78 62 126 0 37 -3 41 -56 71 -37 21 -62 29 -76 24 -11 -3 -73 -38 -137 -76 -531 -322 -1243 -716 -1996 -1107 -395 -205 -1233 -627 -1222 -615 4 5 2153 1577 4775 3494 5130 3751 4812 3513 4812 3605 -1 35 -6 44 -44 73 -24 17 -50 32 -59 32 -9 0 -85 -46 -169 -103z',
  'M16910 14613 c-540 -31 -1011 -160 -1081 -295 -17 -34 -17 -39 -3 -73 26 -62 116 -84 184 -45 231 135 479 190 1013 225 l99 7 -18 -34 c-51 -99 -157 -199 -271 -257 -23 -12 -142 -55 -263 -96 -263 -89 -334 -119 -675 -280 -287 -137 -367 -167 -506 -191 -134 -23 -500 -29 -839 -14 -382 16 -518 4 -859 -81 -371 -92 -693 -223 -1478 -602 -522 -253 -719 -336 -1163 -490 -532 -185 -1069 -346 -2215 -666 l-320 -89 -32 -41 c-27 -37 -30 -46 -22 -70 16 -45 44 -64 102 -69 44 -3 119 15 482 117 832 233 1396 402 1930 578 505 166 640 221 1325 541 933 435 1314 584 1666 652 159 30 265 34 674 21 783 -25 998 14 1485 269 187 99 293 143 530 222 116 38 242 85 281 103 146 67 269 170 353 294 54 78 120 218 122 257 4 43 -25 90 -62 103 -29 10 -291 13 -439 4z',
  'M5329 6501 c-25 -26 -29 -37 -29 -86 0 -32 14 -117 31 -189 30 -124 31 -138 26 -276 -4 -84 -17 -209 -32 -296 -24 -142 -46 -233 -189 -789 -57 -221 -97 -417 -117 -575 -5 -47 -14 -353 -19 -680 -5 -327 -14 -635 -20 -685 -17 -145 -44 -240 -119 -421 -224 -542 -301 -936 -288 -1459 12 -466 68 -842 144 -973 47 -82 137 -95 188 -27 15 18 76 159 136 312 61 153 147 370 191 483 157 396 187 440 361 524 50 24 149 71 219 105 196 94 279 187 315 355 17 81 12 211 -12 328 -36 170 -100 237 -184 193 -58 -29 -65 -117 -20 -241 31 -83 31 -203 1 -260 -30 -58 -92 -108 -192 -156 -316 -151 -327 -157 -405 -230 -69 -65 -82 -83 -135 -192 -51 -106 -190 -447 -306 -753 -22 -57 -42 -103 -45 -103 -16 0 -59 504 -59 700 0 429 72 771 265 1250 89 222 115 310 139 465 31 201 39 407 32 820 -10 628 -11 621 227 1555 89 347 117 519 124 745 6 201 -7 310 -52 450 -24 73 -30 83 -69 108 -55 34 -71 34 -107 -2z',
]

function DancerSvg({
  fill = 'currentColor',
  className,
  stroke,
  strokeWidth,
  style,
}: {
  fill?: string
  className?: string
  stroke?: string
  strokeWidth?: number
  style?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 1742 2146"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <g
        transform="translate(0,2146) scale(0.1,-0.1)"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      >
        {DANCER_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Stroke draw-on treatment
// ---------------------------------------------------------------------------
function TreatmentDraw() {
  const [drawn, setDrawn] = useState(0)
  useEffect(() => {
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = (now - start) / 2400
      setDrawn(Math.min(1, elapsed))
      if (elapsed < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 1742 2146" className="h-[92%] w-auto">
        <g
          transform="translate(0,2146) scale(0.1,-0.1)"
          fill="none"
          stroke="currentColor"
          strokeWidth="40"
          strokeLinecap="round"
          className="text-foreground"
        >
          {DANCER_PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
              style={{
                strokeDasharray: 8000,
                strokeDashoffset: 8000 * (1 - drawn),
              }}
            />
          ))}
        </g>
        <g
          transform="translate(0,2146) scale(0.1,-0.1)"
          fill="currentColor"
          className="text-foreground"
          style={{
            opacity: drawn === 1 ? 1 : 0,
            transition: 'opacity .6s ease',
          }}
        >
          {DANCER_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------
function LandingNav({
  t,
  toggleTheme,
  toggleLang,
  currentLang,
  theme,
}: {
  t: (key: string) => string
  toggleTheme: () => void
  toggleLang: () => void
  currentLang: string
  theme: string
}) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/78 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-10">
        <a href="#top" className="flex items-center gap-3">
          <DancerSvg fill="currentColor" className="h-7 w-auto" />
          <span className="landing-display text-lg">
            Studio<span className="text-primary">OS</span>
          </span>
        </a>
        <div className="hidden items-center gap-7 text-[12.5px] tracking-wide text-muted-foreground md:flex">
          <a href="#modalidades" className="hover:text-foreground">
            {t('landing.navModalities')}
          </a>
          <a href="#distincoes" className="hover:text-foreground">
            {t('landing.navAwards')}
          </a>
          <a href="#equipa" className="hover:text-foreground">
            {t('landing.navTeam')}
          </a>
          <a href="#projetos" className="hover:text-foreground">
            {t('landing.navProjects')}
          </a>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={toggleLang}
            >
              <span className="text-[10px] font-medium uppercase">
                {currentLang}
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="size-3.5" />
              ) : (
                <Moon className="size-3.5" />
              )}
            </Button>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="#enrol">{t('landing.navEnroll')}</a>
          </Button>
          <Button size="sm" asChild>
            <Link to={paths.login}>{t('landing.navLogin')} →</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero({ t }: { t: (key: string) => string }) {
  const stats = [
    ['14+', t('landing.statYears')],
    ['900+', t('landing.statAwards')],
    ['RAD®', t('landing.statCertification')],
    ['2.5+', t('landing.statAges')],
  ]

  return (
    <section id="top" className="relative min-h-[112vh] pt-[88px]">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        {/* Top labels */}
        <div className="flex justify-between pb-3 pt-2">
          <span className="landing-mono text-muted-foreground">
            {t('landing.heroTopLabel')}
          </span>
          <a
            href="https://maps.app.goo.gl/6KBV6hgekbpXoQaA9"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-mono hidden items-center gap-1.5 text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            <ExternalLink className="size-3" />
            Braga, Portugal
          </a>
        </div>
        <Separator />

        {/* Main stage */}
        <div className="relative mt-6 h-[min(78vh,760px)]">
          <TreatmentDraw />

          {/* Overlaid editorial type */}
          <div className="pointer-events-none absolute inset-0 grid grid-rows-[1fr_auto] p-6">
            <div className="flex items-center justify-center text-center">
              <div className="px-[4%]">
                <h1 className="landing-display text-[clamp(56px,11vw,168px)]">
                  Studio
                  <span className="text-primary">OS</span>
                </h1>
                <p className="landing-display mt-2 text-[clamp(18px,2.4vw,30px)] font-normal tracking-normal text-muted-foreground">
                  {t('landing.heroSubtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="max-w-[280px] text-[13.5px] leading-relaxed text-muted-foreground">
                {t('landing.heroDescription')}
              </p>
              <div className="hidden text-right sm:block">
                <div className="landing-mono mb-1.5 text-muted-foreground">
                  ↓ {t('landing.heroContinue')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <Separator className="mt-6" />
        <div className="grid grid-cols-1 gap-6 py-5 sm:grid-cols-2 md:grid-cols-4">
          {stats.map(([n, l]) => (
            <div key={l}>
              <div className="landing-display text-4xl">{n}</div>
              <div className="landing-mono mt-1.5 text-muted-foreground">
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Modalidades
// ---------------------------------------------------------------------------
function Modalidades({ t }: { t: (key: string) => string }) {
  const list = [
    {
      n: '01',
      name: t('landing.modBallet'),
      desc: t('landing.modBalletDesc'),
    },
    {
      n: '02',
      name: t('landing.modContemporary'),
      desc: t('landing.modContemporaryDesc'),
    },
    { n: '03', name: 'Jazz', desc: 'Lyrical, Broadway, Commercial.' },
    { n: '04', name: 'Hip-Hop', desc: 'New School, House, Street.' },
    {
      n: '05',
      name: t('landing.modMusicalTheatre'),
      desc: t('landing.modMusicalTheatreDesc'),
    },
    {
      n: '06',
      name: 'Acrodance',
      desc: t('landing.modAcrodanceDesc'),
    },
    {
      n: '07',
      name: 'Body Balance',
      desc: t('landing.modBodyBalanceDesc'),
    },
    {
      n: '08',
      name: t('landing.modCommercial'),
      desc: t('landing.modCommercialDesc'),
    },
  ]

  return (
    <section id="modalidades" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-10">
          <div>
            <span className="landing-eyebrow mb-4 block text-muted-foreground">
              {t('landing.modChapter')}
            </span>
            <h2 className="landing-display text-[clamp(44px,6vw,92px)]">
              {t('landing.modHeadingLine1')}
              <br />
              {t('landing.modHeadingLine2Pre')}{' '}
              <span className="text-primary">
                {t('landing.modHeadingLine2Highlight')}
              </span>{' '}
              {t('landing.modHeadingLine2Post')}
            </h2>
          </div>
          <p className="max-w-[360px] text-[15px] leading-relaxed text-muted-foreground">
            {t('landing.modDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {list.map((item) => (
            <article
              key={item.name}
              className="min-h-[180px] border-b border-border px-6 py-7 lg:border-r lg:last:border-r-0 [&:nth-child(4n)]:lg:border-r-0"
            >
              <span className="landing-mono text-primary">{item.n}</span>
              <h3 className="landing-display mb-2.5 mt-3 text-[26px]">
                {item.name}
              </h3>
              <p className="text-[13px] leading-snug text-muted-foreground">
                {item.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Awards / Distinções – confirmed: 900+ distinções, competitions listed on site
// ---------------------------------------------------------------------------
function Awards({ t }: { t: (key: string) => string }) {
  const competitions = [
    'Youth America Grand Prix',
    'TanzOlymp',
    'European Grand Prix',
    'Prémio Internacional de Danza Roseta Mauri',
    'Dance World Cup',
    'All Dance',
    'Global Dance Open',
  ] as const

  const scholarships = [
    'Royal Ballet School',
    "École de Danse de l'Ópera de Paris",
    'Zurich Dance Academy',
    'English National Ballet School',
    'Staatliche Ballettschule Berlin',
    'Basel Theater Ballet Schule',
  ] as const

  return (
    <section
      id="distincoes"
      className="bg-foreground py-20 text-background md:py-28"
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-20">
          <div>
            <span className="landing-eyebrow mb-4 block text-background/60">
              {t('landing.awardsChapter')}
            </span>
            <h2 className="landing-display text-[clamp(56px,8vw,132px)] text-background">
              <span className="block">{t('landing.awardsHeadingLine1')}</span>
              <span className="text-primary">
                {t('landing.awardsHeadingLine2')}
              </span>
            </h2>
            <p className="mt-8 max-w-[460px] text-base leading-relaxed text-background/70">
              {t('landing.awardsDescription')}
            </p>
          </div>
          <div>
            <div className="mb-8">
              <h3 className="landing-mono mb-4 text-primary">
                {t('landing.awardsCompetitions')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {competitions.map((c) => (
                  <Badge
                    key={c}
                    variant="outline"
                    className="border-background/20 text-background/80"
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator className="bg-background/18" />
            <div className="mt-8">
              <h3 className="landing-mono mb-4 text-primary">
                {t('landing.awardsScholarships')}
              </h3>
              <ol className="list-none space-y-0">
                {scholarships.map((s, i) => (
                  <li
                    key={s}
                    className="border-t border-background/18 py-4 text-[15.5px] leading-snug last:border-b last:border-background/18"
                  >
                    <div className="grid grid-cols-[60px_1fr] gap-4">
                      <span className="landing-display text-lg text-primary">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{s}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Team – placeholder names; avatars render initials only
// ---------------------------------------------------------------------------
function Team({ t }: { t: (key: string) => string }) {
  const team = [
    {
      name: 'Ana Ribeiro',
      role: t('landing.teamRoleDirection'),
      cred: t('landing.teamCredDirectionBallet'),
      initials: 'AR',
    },
    {
      name: 'Rui Martins',
      role: t('landing.teamRoleDirection'),
      cred: t('landing.teamCredDirectionMusic'),
      initials: 'RM',
    },
    {
      name: 'Sofia Costa',
      role: t('landing.teamRoleCoordination'),
      cred: t('landing.teamCredCoordination'),
      initials: 'SC',
    },
  ]

  const support = [
    {
      name: 'Teresa Lopes',
      role: t('landing.teamRoleAdmin'),
      initials: 'TL',
    },
    {
      name: 'Inês Ferreira',
      role: t('landing.teamRoleComms'),
      initials: 'IF',
    },
    {
      name: 'Marta Sousa',
      role: t('landing.teamRoleWellbeing'),
      initials: 'MS',
    },
  ]

  return (
    <section id="equipa" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-14">
          <span className="landing-eyebrow mb-4 block text-muted-foreground">
            {t('landing.teamChapter')}
          </span>
          <h2 className="landing-display text-[clamp(44px,6vw,92px)]">
            {t('landing.teamHeadingLine1')}
            <br />
            <span className="text-primary">
              {t('landing.teamHeadingLine2')}
            </span>
          </h2>
        </div>

        <div className="mx-auto grid max-w-[920px] gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((p) => (
            <Card key={p.name} className="gap-3 py-0 overflow-hidden">
              <div className="landing-display flex aspect-square items-center justify-center bg-muted text-[72px] text-muted-foreground">
                {p.initials}
              </div>
              <CardContent className="pb-5">
                <h3 className="landing-display text-[20px]">{p.name}</h3>
                <p className="landing-mono mt-1.5 text-muted-foreground">
                  {p.cred}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="my-10" />

        <div className="grid gap-6 sm:grid-cols-3">
          {support.map((s) => (
            <div key={s.name} className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback>{s.initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Projetos
// ---------------------------------------------------------------------------
function Projetos({ t }: { t: (key: string) => string }) {
  const projects = [
    {
      tag: t('landing.projTagCompany'),
      title: 'Resident Company',
      desc: t('landing.projDescMotus'),
    },
    {
      tag: t('landing.projTagScholarships'),
      title: 'Plataforma StudioOS',
      desc: t('landing.projDescPlatform'),
    },
    {
      tag: 'Festival',
      title: 'Summer Arts Festival',
      desc: t('landing.projDescFestival'),
    },
    {
      tag: t('landing.projTagTraining'),
      title: 'Studio Training',
      desc: t('landing.projDescTraining'),
    },
  ]

  return (
    <section
      id="projetos"
      className="border-y border-border bg-card py-20 md:py-28"
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-14">
          <span className="landing-eyebrow mb-4 block text-muted-foreground">
            {t('landing.projChapter')}
          </span>
          <h2 className="landing-display text-[clamp(40px,5vw,76px)]">
            {t('landing.projHeadingPre')}{' '}
            <span className="text-primary">
              {t('landing.projHeadingHighlight')}
            </span>{' '}
            {t('landing.projHeadingPost')}
          </h2>
        </div>

        <div className="grid border-t border-border sm:grid-cols-2">
          {projects.map((p) => (
            <article
              key={p.title}
              className="grid grid-cols-[auto_1fr] items-start gap-8 border-b border-border px-8 py-10 sm:odd:border-r"
            >
              <Badge variant="outline" className="mt-1">
                {p.tag}
              </Badge>
              <div>
                <h3 className="landing-display text-[28px]">{p.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------
function CTA() {
  const { t } = useTranslation()
  return (
    <section
      id="enrol"
      className="bg-foreground py-32 text-center text-background md:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <span className="landing-eyebrow mb-6 block text-background/55">
          {t('landing.ctaEyebrow')}
        </span>
        <h2 className="landing-display text-[clamp(64px,11vw,180px)] leading-[0.92]">
          <span className="block">{t('landing.ctaHeadingLine1')}</span>
          <span className="block text-primary">
            {t('landing.ctaHeadingLine2')}
          </span>
        </h2>
        <p className="mx-auto mt-8 mb-12 max-w-[520px] text-[17px] leading-relaxed text-background/72">
          {t('landing.ctaDescription')}
        </p>
        <div className="inline-flex flex-wrap justify-center gap-3.5">
          <Button
            size="lg"
            variant="outline"
            className="border-background bg-background text-foreground hover:bg-background/90 hover:text-foreground dark:bg-background dark:hover:bg-background/90 dark:border-background"
            asChild
          >
            <Link to={paths.enrollment}>{t('landing.ctaEnroll')}</Link>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="border border-background/50 text-background hover:bg-background/10 hover:text-background"
            asChild
          >
            <Link to={paths.login}>{t('landing.ctaLogin')}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="landing-mono mb-4 text-muted-foreground">{title}</div>
      <ul className="flex list-none flex-col gap-2 p-0">
        {links.map((l) => (
          <li key={l} className="text-[13.5px]">
            {l}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="border-t border-border py-16 pb-10">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <DancerSvg fill="currentColor" className="h-9 w-auto" />
              <span className="landing-display text-[22px]">StudioOS</span>
            </div>
            <p className="max-w-[320px] text-[13px] leading-relaxed text-muted-foreground">
              {t('landing.footerDesc')}
            </p>
          </div>
          <FooterCol
            title={t('landing.footerSchool')}
            links={[
              t('landing.navModalities'),
              t('landing.navTeam'),
              t('landing.navProjects'),
              t('landing.navEnroll'),
            ]}
          />
          <FooterCol
            title={t('landing.footerPlatform')}
            links={[
              t('landing.navLogin'),
              t('landing.footerOnlineEnroll'),
              t('landing.footerCalendar'),
              t('landing.footerMessages'),
            ]}
          />
          <FooterCol
            title={t('landing.footerContact')}
            links={[
              'Rua Exemplo, 100',
              '4700-000 Braga',
              '(+351) 900 000 000',
              'geral@studioos.dev',
            ]}
          />
        </div>

        <Separator />
        <div className="flex flex-wrap justify-between gap-3 pt-6 text-[11.5px] text-muted-foreground">
          <span className="landing-mono">
            © 2026 StudioOS · Academic project
          </span>
          <span className="landing-mono">Powered by StudioOS</span>
        </div>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function LandingPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()

  const currentLang = i18n.language?.startsWith('pt') ? 'pt' : 'en'
  const toggleLang = () =>
    i18n.changeLanguage(i18n.language?.startsWith('pt') ? 'en-US' : 'pt-PT')
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <div className="landing-body min-h-screen overflow-x-hidden bg-background text-foreground">
      <LandingNav
        t={t}
        toggleTheme={toggleTheme}
        toggleLang={toggleLang}
        currentLang={currentLang}
        theme={theme}
      />
      <Hero t={t} />
      <Separator className="mx-auto max-w-[1440px]" />
      <Modalidades t={t} />
      <Awards t={t} />
      <Team t={t} />
      <Projetos t={t} />
      <CTA />
      <Footer />
    </div>
  )
}
