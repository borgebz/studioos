import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/paths'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
function LandingNav() {
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
            Modalidades
          </a>
          <a href="#distincoes" className="hover:text-foreground">
            Distinções
          </a>
          <a href="#equipa" className="hover:text-foreground">
            Equipa
          </a>
          <a href="#projetos" className="hover:text-foreground">
            Projetos
          </a>
          <a
            href="#plataforma"
            className="italic hover:text-foreground"
          >
            StudioOS
          </a>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" asChild>
            <a href="#enrol">Inscrever</a>
          </Button>
          <Button size="sm" asChild>
            <Link to={paths.login}>Entrar →</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero() {
  const stats = [
    ['14+', 'Anos de excelência'],
    ['900+', 'Distinções internacionais'],
    ['RAD®', 'Certificação n.º 24116'],
    ['2.5+', 'Idades · a partir de'],
  ] as const

  return (
    <section id="top" className="relative min-h-[112vh] pt-[88px]">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        {/* Top labels */}
        <div className="flex justify-between pb-3 pt-2">
          <span className="landing-mono text-muted-foreground">
            Escola de Dança · Braga
          </span>
          <span className="landing-mono hidden text-muted-foreground sm:block">
            41.55°N 8.42°W · Portugal
          </span>
        </div>
        <Separator />

        {/* Main stage */}
        <div className="relative mt-6 h-[min(78vh,760px)]">
          <TreatmentDraw />

          {/* Overlaid editorial type */}
          <div className="pointer-events-none absolute inset-0 grid grid-rows-[auto_1fr_auto] p-6">
            <div className="flex justify-between">
              <span className="landing-eyebrow text-muted-foreground">
                Escola de Dança · Desde 2011
              </span>
              <span className="landing-eyebrow hidden text-muted-foreground sm:block">
                RAD® Registered · N.º 24116
              </span>
            </div>
            <div className="flex items-center justify-center text-center">
              <div className="px-[4%]">
                <h1 className="landing-display text-[clamp(56px,11vw,168px)]">
                  Studio
                  <span className="text-primary">OS</span>
                </h1>
                <p className="landing-display mt-2 text-[clamp(18px,2.4vw,30px)] font-normal tracking-normal text-muted-foreground">
                  Escola de Dança · Braga, Portugal
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="max-w-[280px] text-[13.5px] leading-relaxed text-muted-foreground">
                Catorze anos a formar bailarinos em Braga. Mais de novecentas
                distinções internacionais. Uma escola, em movimento contínuo.
              </p>
              <div className="hidden text-right sm:block">
                <div className="landing-mono mb-1.5 text-muted-foreground">
                  ↓ Continue
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <Separator className="mt-6" />
        <div className="grid grid-cols-2 gap-6 py-5 md:grid-cols-4">
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
// Modalidades – verified from studioos.dev Modalidades section
// ---------------------------------------------------------------------------
function Modalidades() {
  const list = [
    {
      n: '01',
      name: 'Ballet Clássico',
      desc: 'Royal Academy of Dance · do Pre-Primary ao Advanced 2',
    },
    {
      n: '02',
      name: 'Contemporânea',
      desc: 'Release, floor work, improvisação guiada.',
    },
    { n: '03', name: 'Jazz', desc: 'Lyrical, Broadway, Commercial.' },
    { n: '04', name: 'Hip-Hop', desc: 'New School, House, Street.' },
    {
      n: '05',
      name: 'Teatro Musical',
      desc: 'Canto, representação e dança num formato integrado.',
    },
    {
      n: '06',
      name: 'Acrodance',
      desc: 'Fusão de dança e acrobacia.',
    },
    {
      n: '07',
      name: 'Body Balance',
      desc: 'Pilates, força, mobilidade para bailarinos.',
    },
    {
      n: '08',
      name: 'Comercial & Fusion',
      desc: 'Estilos urbanos e comerciais de dança contemporânea.',
    },
  ] as const

  return (
    <section id="modalidades" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-10">
          <div>
            <span className="landing-eyebrow mb-4 block text-muted-foreground">
              Capítulo I · O Repertório
            </span>
            <h2 className="landing-display text-[clamp(44px,6vw,92px)]">
              Oito formas
              <br />
              de{' '}
              <span className="text-primary">dizer</span> o
              mesmo.
            </h2>
          </div>
          <p className="max-w-[360px] text-[15px] leading-relaxed text-muted-foreground">
            Programas certificados pela Royal Academy of Dance e
            estruturados por níveis de progressão. A partir dos 2 anos e
            meio.
          </p>
        </div>

        <div className="grid grid-cols-1 border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {list.map((item) => (
            <article
              key={item.name}
              className="min-h-[180px] border-b border-border px-6 py-7 lg:border-r lg:last:border-r-0 [&:nth-child(4n)]:lg:border-r-0"
            >
              <span className="landing-mono text-primary">
                {item.n}
              </span>
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
function Awards() {
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
    'École de Danse de l\'Ópera de Paris',
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
              Capítulo II · O Palmarés
            </span>
            <h2 className="landing-display text-[clamp(56px,8vw,132px)] text-background">
              <span className="block">Novecentas</span>
              <span className="text-primary">
                distinções.
              </span>
            </h2>
            <p className="mt-8 max-w-[460px] text-base leading-relaxed text-background/70">
              Em catorze anos, mais de 900 prémios em concursos nacionais
              e internacionais. Bolsas de estudo conquistadas para
              algumas das mais prestigiadas escolas de dança do mundo.
            </p>
          </div>
          <div>
            <div className="mb-8">
              <h3 className="landing-mono mb-4 text-primary">
                Competições
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
                Bolsas de Estudo
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

        {/* Marquee */}
        <div className="mt-20 overflow-hidden border-t border-background/18 pt-6 whitespace-nowrap">
          <div className="landing-display landing-marquee-track text-[56px] text-background/40">
            {Array(2)
              .fill(
                'Youth America Grand Prix · TanzOlymp · European Grand Prix · Dance World Cup · All Dance · Global Dance Open · '
              )
              .map((s, i) => (
                <span key={i}>{s}</span>
              ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Team – confirmed from studioos.dev "Corpo Docente" / "A nossa história"
// ---------------------------------------------------------------------------
function Team() {
  const team = [
    {
      name: 'Ana Ribeiro',
      role: 'Direção',
      cred: 'Professora de Ballet · RAD® Registered Teacher — TC',
      initials: 'DC',
    },
    {
      name: 'Rui Martins',
      role: 'Direção',
      cred: 'Pianista acompanhador · Professor de música',
      initials: 'PA',
    },
    {
      name: 'Sofia Costa',
      role: 'Coordenação',
      cred: 'Coordenação interdisciplinar',
      initials: 'MB',
    },
  ] as const

  const support = [
    { name: 'Teresa Lopes', role: 'Assistente administrativa', initials: 'CD' },
    { name: 'Inês Ferreira', role: 'Comunicação · Redes sociais', initials: 'JG' },
    { name: 'Marta Sousa', role: 'MD MsC · Saúde Mental', initials: 'FC' },
  ] as const

  return (
    <section id="equipa" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-14">
          <span className="landing-eyebrow mb-4 block text-muted-foreground">
            Capítulo III · Quem está na sala
          </span>
          <h2 className="landing-display text-[clamp(44px,6vw,92px)]">
            A escola é
            <br />
            <span className="text-primary">quem ensina.</span>
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((p) => (
            <Card key={p.name} className="gap-4 py-0 overflow-hidden">
              <div className="flex h-48 items-center justify-center bg-muted">
                <Avatar className="size-20">
                  <AvatarFallback className="text-2xl">
                    {p.initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardContent className="pb-6">
                <Badge variant="secondary" className="mb-2">
                  {p.role}
                </Badge>
                <h3 className="landing-display text-[26px]">
                  {p.name}
                </h3>
                <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">
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
              <Avatar>
                <AvatarFallback>{s.initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Projetos – confirmed from studioos.dev
// ---------------------------------------------------------------------------
function Projetos() {
  const projects = [
    {
      tag: 'Companhia',
      title: 'Motus Dance Project',
      desc: 'Companhia juvenil de criação coreográfica.',
    },
    {
      tag: 'Bolsas',
      title: 'Plataforma Ent\'Artes',
      desc: 'Programa de apoio a alunos com mérito artístico.',
    },
    {
      tag: 'Festival',
      title: 'Soma das Artes',
      desc: 'Festival anual interdisciplinar — dança, música, vídeo, palavra.',
    },
    {
      tag: 'Treino',
      title: 'Studio Training',
      desc: 'Aulas técnicas para bailarinos profissionais e ex-alunos em formação contínua.',
    },
  ] as const

  return (
    <section
      id="projetos"
      className="border-y border-border bg-card py-20 md:py-28"
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-14">
          <span className="landing-eyebrow mb-4 block text-muted-foreground">
            Capítulo IV · O que se faz fora da aula
          </span>
          <h2 className="landing-display text-[clamp(40px,5vw,76px)]">
            Quatro{' '}
            <span className="text-primary">extensões</span>{' '}
            da escola.
          </h2>
        </div>

        <div className="grid border-t border-border sm:grid-cols-2">
          {projects.map((p, i) => (
            <article
              key={p.title}
              className="grid grid-cols-[auto_1fr] items-start gap-8 border-b border-border px-8 py-10 sm:odd:border-r"
            >
              <Badge variant="outline" className="mt-1">
                {p.tag}
              </Badge>
              <div>
                <h3 className="landing-display text-[28px]">
                  {p.title}
                </h3>
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
// StudioOS Features – Bento grid
// ---------------------------------------------------------------------------
function BentoCard({
  tag,
  en,
  className,
  children,
}: {
  tag: string
  en: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card
      className={`gap-0 overflow-hidden rounded-none border-border py-0 shadow-none ${className ?? ''}`}
    >
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <span className="landing-mono text-primary">{tag}</span>
        <span className="landing-mono text-muted-foreground/60">
          {en}
        </span>
      </div>
      <CardContent className="flex-1 pb-4">{children}</CardContent>
    </Card>
  )
}

function EnrollmentMock() {
  const rows = [
    ['Maria T.', 'Ballet · Grade 5', 'Pago', '✓'],
    ['Ana M.', 'Contemporânea · I', 'Pago', '✓'],
    ['Beatriz F.', 'Ballet · Pre-Prim', 'Pendente', '·'],
    ['Sofia R.', 'Jazz · II', 'Pago', '✓'],
    ['Carolina S.', 'Sapateado · I', 'Pago', '✓'],
  ] as const

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="landing-display text-[26px] leading-tight">
        Período de{' '}
        <span className="text-primary">matrículas</span> aberto.
      </div>
      <div className="text-xs text-muted-foreground">
        187 candidaturas · 142 confirmadas
      </div>
      <div className="mt-1.5 flex flex-1 flex-col overflow-hidden border border-border bg-muted/30">
        <div className="landing-mono grid grid-cols-[1.4fr_1.6fr_.9fr_24px] border-b border-border px-3 py-2 text-[9.5px] text-muted-foreground">
          <span>Aluno</span>
          <span>Modalidade</span>
          <span>Estado</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[1.4fr_1.6fr_.9fr_24px] items-center border-b border-border px-3 py-2 text-[12.5px] last:border-b-0"
          >
            <span className="font-medium">{r[0]}</span>
            <span className="text-muted-foreground">{r[1]}</span>
            <span
              className={
                r[2] === 'Pendente'
                  ? 'text-muted-foreground'
                  : ''
              }
            >
              {r[2]}
            </span>
            <span className="landing-mono text-right text-muted-foreground">
              {r[3]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarMock() {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const
  const events: Record<number, [string, string, 'ink' | 'soft' | 'accent'][]> = {
    0: [['18:00', 'Ballet · Grade 3', 'ink']],
    1: [
      ['17:30', 'Pré-dança', 'soft'],
      ['19:00', 'Contemporânea', 'accent'],
    ],
    2: [['18:00', 'Contemp. I', 'ink']],
    3: [
      ['17:00', 'Sapateado', 'soft'],
      ['19:30', 'Studio Training', 'ink'],
    ],
    4: [['18:00', 'Jazz · II', 'ink']],
    5: [['10:00', 'Aulas abertas', 'accent']],
  }
  return (
    <div className="grid h-full grid-cols-6 gap-1 pt-1.5">
      {days.map((d, i) => (
        <div key={d} className="flex flex-col gap-1">
          <div className="landing-mono mb-0.5 text-[9.5px] text-muted-foreground">
            {d}
          </div>
          {(events[i] || []).map((e, j) => (
            <div
              key={j}
              className={`border border-border p-1.5 text-[9.5px] leading-tight ${
                e[2] === 'accent'
                  ? 'bg-primary text-primary-foreground'
                  : e[2] === 'soft'
                    ? 'bg-muted'
                    : 'bg-foreground text-background'
              }`}
            >
              <div className="landing-mono text-[8.5px] opacity-80">
                {e[0]}
              </div>
              <div className="font-medium">{e[1]}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function CoachingMock() {
  const slots = [
    ['Diana S. C.', 'Qua · 16:00', true],
    ['Pedro A.', 'Qui · 18:30', true],
    ['Rita N.', 'Sex · 17:00', false],
  ] as const

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="landing-display text-[22px] leading-tight">
        Reservar uma{' '}
        <span className="text-primary">privada</span>.
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {slots.map(([n, t, free]) => (
          <div
            key={n}
            className={`flex items-center justify-between border border-border px-2.5 py-2 ${free ? 'bg-muted/30' : 'opacity-55'}`}
          >
            <span className="text-xs font-medium">{n}</span>
            <span className="landing-mono text-muted-foreground">
              {t}
            </span>
            <Badge
              variant={free ? 'default' : 'secondary'}
              className="text-[10px]"
            >
              {free ? 'livre' : 'ocupado'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

function EventsMock() {
  return (
    <div className="flex h-full flex-col gap-1.5">
      <div className="border-l-2 border-primary pl-2.5">
        <div className="landing-mono text-[9.5px] text-primary">
          14 JUN · Braga
        </div>
        <div className="landing-display text-lg">
          Soma das Artes 2026
        </div>
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">
        Espetáculo de fim de ano.
        <br />
        <span className="text-foreground">32 comentários</span> · 3
        publicações
      </div>
      <div className="mt-auto flex items-center gap-1">
        <AvatarGroup>
          {['AT', 'MC', 'RS'].map((i) => (
            <Avatar key={i} size="sm">
              <AvatarFallback className="text-[8px]">
                {i}
              </AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
        <AvatarGroupCount className="size-6 text-xs">
          +47
        </AvatarGroupCount>
      </div>
    </div>
  )
}

function BillingMock() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="landing-display text-[32px] leading-none">
          €18.420
        </div>
        <div className="landing-mono mt-1 text-muted-foreground">
          Recebido · Maio 2026
        </div>
      </div>
      <div className="flex h-14 items-end gap-0.5">
        {[42, 58, 70, 64, 82, 76, 88, 94, 100].map((h, i) => (
          <div
            key={i}
            className={`flex-1 ${i === 8 ? 'bg-primary' : 'bg-foreground'}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>3 multas em aberto</span>
        <span>97% em dia</span>
      </div>
    </div>
  )
}

function ClassesMock() {
  return (
    <div className="flex h-full flex-col gap-1.5">
      <div className="landing-display text-[22px] leading-tight">
        Turma ·{' '}
        <span className="text-primary">Grade 5</span>
      </div>
      <div className="landing-mono text-muted-foreground">
        14 alunas · Estúdio I · Diana S.C.
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className={`aspect-square border border-border ${i === 4 || i === 11 ? 'bg-muted' : 'bg-foreground'}`}
          />
        ))}
      </div>
      <div className="mt-auto text-[11px] text-muted-foreground">
        2 ausentes · 12 presentes
      </div>
    </div>
  )
}

function InventoryMock() {
  const sizes = ['35', '36', '37', '38', '39', '40'] as const
  const stock = [4, 7, 2, 5, 3, 1] as const

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="landing-display text-[22px]">
        Sapatilhas ·{' '}
        <span className="text-primary">pontas</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {sizes.map((s, i) => (
          <TooltipProvider key={s}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`border border-border px-2 py-1 text-[11px] font-medium ${i === 2 ? 'bg-foreground text-background' : ''}`}
                >
                  {s}{' '}
                  <span className="opacity-55">· {stock[i]}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {stock[i]} em stock
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      <div className="mt-auto text-[11px] text-muted-foreground">
        22 em stock · 4 reservadas
      </div>
    </div>
  )
}

function MessagingMock() {
  const messages = [
    ['Diana S.C.', 'Trouxe a partitura nova para amanhã', 'DC'],
    ['M. Tavares', 'Obrigada pela aula extra!', 'MT'],
    ['Pedro A.', 'Vamos ensaiar a variação às 17h', 'PA'],
  ] as const

  return (
    <div className="flex h-full flex-col gap-1.5">
      {messages.map(([n, m, initials], i) => (
        <div key={i} className="flex items-start gap-2">
          <Avatar size="sm">
            <AvatarFallback className="text-[8px]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="landing-mono text-[9px] text-primary">
              {n}
            </div>
            <div className="truncate text-xs">{m}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ModalitiesMock() {
  const tags = [
    'Ballet',
    'Contemp.',
    'Jazz',
    'Hip-Hop',
    'Teatro Musical',
    'Acrodance',
  ] as const

  return (
    <div className="flex flex-wrap gap-1.5 pt-3">
      {tags.map((t, i) => (
        <Badge
          key={t}
          variant={i === 0 ? 'default' : 'outline'}
        >
          {t}
        </Badge>
      ))}
    </div>
  )
}

function AttendanceMock() {
  return (
    <div className="flex h-full items-center justify-between">
      <div>
        <div className="landing-display text-[38px] leading-none">
          96<span className="text-primary">%</span>
        </div>
        <div className="landing-mono text-muted-foreground">
          Assiduidade média · maio
        </div>
      </div>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r="34"
          className="stroke-border"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="40"
          cy="40"
          r="34"
          className="stroke-foreground"
          strokeWidth="6"
          fill="none"
          strokeDasharray={`${2 * Math.PI * 34 * 0.96} 999`}
          transform="rotate(-90 40 40)"
        />
      </svg>
    </div>
  )
}

function PlatformBento() {
  return (
    <section id="plataforma" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-10">
          <div>
            <span className="landing-eyebrow mb-4 block text-muted-foreground">
              Intermezzo · O que move a casa
            </span>
            <h2 className="landing-display text-[clamp(44px,6.5vw,100px)]">
              <span className="font-normal italic">Powered by</span>
              <br />
              StudioOS<span className="text-primary">.</span>
            </h2>
            <p className="mt-6 max-w-[520px] text-base leading-relaxed text-muted-foreground">
              Por trás de cada inscrição, cada aula privada, cada
              espetáculo, há uma plataforma que organiza o quotidiano da
              escola.
            </p>
          </div>
          <div className="min-w-[240px]">
            <span className="landing-mono text-muted-foreground">
              10 módulos · uma única base de dados · acesso por papel
              (aluno, professor, encarregado, direção)
            </span>
          </div>
        </div>

        {/* Bento grid */}
        <div className="grid auto-rows-[120px] grid-cols-6 gap-4 lg:grid-cols-12">
          <BentoCard
            tag="Inscrições"
            en="Enrollments"
            className="col-span-6 row-span-4"
          >
            <EnrollmentMock />
          </BentoCard>

          <BentoCard
            tag="Calendário"
            en="Calendar"
            className="col-span-6 row-span-4"
          >
            <CalendarMock />
          </BentoCard>

          <BentoCard
            tag="Aulas Privadas"
            en="Coachings"
            className="col-span-6 row-span-3 lg:col-span-4"
          >
            <CoachingMock />
          </BentoCard>

          <BentoCard
            tag="Eventos"
            en="Events"
            className="col-span-6 row-span-3 lg:col-span-4"
          >
            <EventsMock />
          </BentoCard>

          <BentoCard
            tag="Faturação"
            en="Billing"
            className="col-span-6 row-span-3 lg:col-span-4"
          >
            <BillingMock />
          </BentoCard>

          <BentoCard
            tag="Turmas"
            en="Classes"
            className="col-span-6 row-span-3 lg:col-span-4"
          >
            <ClassesMock />
          </BentoCard>

          <BentoCard
            tag="Inventário"
            en="Inventory"
            className="col-span-6 row-span-3 lg:col-span-4"
          >
            <InventoryMock />
          </BentoCard>

          <BentoCard
            tag="Mensagens"
            en="Messaging"
            className="col-span-6 row-span-3 lg:col-span-4"
          >
            <MessagingMock />
          </BentoCard>

          <BentoCard
            tag="Modalidades"
            en="Modalities"
            className="col-span-6 row-span-2"
          >
            <ModalitiesMock />
          </BentoCard>

          <BentoCard
            tag="Assiduidade"
            en="Attendance"
            className="col-span-6 row-span-2"
          >
            <AttendanceMock />
          </BentoCard>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------
function CTA() {
  return (
    <section
      id="enrol"
      className="bg-foreground py-32 text-center text-background md:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <span className="landing-eyebrow mb-6 block text-background/55">
          Próxima época · Setembro 2026
        </span>
        <h2 className="landing-display text-[clamp(64px,11vw,180px)] leading-[0.92]">
          <span className="block">Venha</span>
          <span className="block text-primary">
            dançar.
          </span>
        </h2>
        <p className="mx-auto mt-8 mb-12 max-w-[520px] text-[17px] leading-relaxed text-background/72">
          Inscrições abertas. Aulas experimentais sem compromisso.
          Atendimento direto no estúdio em Braga, ou através da
          plataforma StudioOS.
        </p>
        <div className="inline-flex flex-wrap justify-center gap-3.5">
          <Button
            size="lg"
            variant="outline"
            className="border-background bg-background text-foreground hover:bg-background/90 hover:text-foreground"
          >
            Inscrever aluno →
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="border border-background/50 text-background hover:bg-background/10 hover:text-background"
            asChild
          >
            <Link to={paths.login}>Entrar na plataforma</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function FooterCol({
  title,
  links,
}: {
  title: string
  links: string[]
}) {
  return (
    <div>
      <div className="landing-mono mb-4 text-muted-foreground">
        {title}
      </div>
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
  return (
    <footer className="border-t border-border py-16 pb-10">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <DancerSvg fill="currentColor" className="h-9 w-auto" />
              <span className="landing-display text-[22px]">
                StudioOS
              </span>
            </div>
            <p className="max-w-[320px] text-[13px] leading-relaxed text-muted-foreground">
              Escola de Dança · Braga, Portugal.
              <br />
              Royal Academy of Dance Registered.
              <br />
              Apoio da Câmara Municipal de Braga.
            </p>
          </div>
          <FooterCol
            title="Escola"
            links={[
              'Modalidades',
              'Equipa',
              'Projetos',
              'Inscrições',
            ]}
          />
          <FooterCol
            title="Plataforma"
            links={[
              'Entrar',
              'Inscrição online',
              'Calendário',
              'Mensagens',
            ]}
          />
          <FooterCol
            title="Contacto"
            links={[
              'Rua Dr. Manuel de Oliveira Machado, 21-23',
              '4700-054 Braga',
              '(+351) 964 693 247',
              'geral@studioos.dev',
            ]}
          />
        </div>

        <Separator />
        <div className="flex flex-wrap justify-between gap-3 pt-6 text-[11.5px] text-muted-foreground">
          <span className="landing-mono">
            © 2011–2026 StudioOS · RAD® N.º 24116
          </span>
          <span className="landing-mono">
            Powered by StudioOS
          </span>
        </div>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function LandingPage() {
  return (
    <div className="landing-body min-h-screen overflow-x-hidden bg-background text-foreground">
      <LandingNav />
      <Hero />
      <Separator className="mx-auto max-w-[1440px]" />
      <Modalidades />
      <Awards />
      <Team />
      <Projetos />
      <PlatformBento />
      <CTA />
      <Footer />
    </div>
  )
}
