import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ScheduleCalendar,
  type CalendarResource,
  type CalendarEvent,
  type CalendarCategory,
} from '@/components/shared/ScheduleCalendar'

const CATEGORIES: CalendarCategory[] = [
  { id: 'ballet', label: 'Ballet', color: 'oklch(0.58 0.09 190)' },
  { id: 'contemporary', label: 'Contemporary', color: 'oklch(0.62 0.10 45)' },
  { id: 'jazz', label: 'Jazz', color: 'oklch(0.58 0.10 340)' },
  { id: 'hiphop', label: 'Hip-Hop', color: 'oklch(0.50 0.10 270)' },
  { id: 'modern', label: 'Modern', color: 'oklch(0.58 0.08 145)' },
  { id: 'tap', label: 'Tap', color: 'oklch(0.55 0.10 25)' },
]

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

const RESOURCES: CalendarResource[] = [
  { id: 1, name: 'Garnier', subtitle: 'Studio I', capacity: 24 },
  { id: 2, name: 'Diaghilev', subtitle: 'Studio II', capacity: 22 },
  { id: 3, name: 'Pavlova', subtitle: 'Studio III', capacity: 20 },
  { id: 4, name: 'Cunningham', subtitle: 'Studio IV', capacity: 18 },
  { id: 5, name: 'Béjart', subtitle: 'Studio V', capacity: 22 },
  { id: 6, name: 'Bausch', subtitle: 'Studio VI', capacity: 16 },
]

const TEACHERS = [
  'Mlle. A. Vasseur',
  'M. T. Renaud',
  'Mme. C. Lefèvre',
  'M. R. Okafor',
  'Mlle. S. Yamamoto',
  'M. J. Caruso',
]

interface SeedEvent {
  s: number
  t: number
  d: number
  dis: string
  n: string
  tea: number
}

const SEED: SeedEvent[] = [
  { s: 1, t: 0, d: 60, dis: 'ballet', n: 'Adagio · Advanced', tea: 0 },
  { s: 1, t: 75, d: 75, dis: 'contemporary', n: 'Contemporary Open', tea: 2 },
  { s: 1, t: 165, d: 90, dis: 'ballet', n: 'Ballet Pro · Class B', tea: 0 },
  { s: 2, t: 0, d: 45, dis: 'jazz', n: 'Jazz Lyrical', tea: 5 },
  { s: 2, t: 60, d: 90, dis: 'contemporary', n: 'Contemporary Tech.', tea: 2 },
  { s: 2, t: 165, d: 75, dis: 'hiphop', n: 'Hip-Hop · Intermediate', tea: 3 },
  { s: 3, t: 0, d: 60, dis: 'modern', n: 'Modern · Graham Tech.', tea: 4 },
  { s: 3, t: 75, d: 60, dis: 'tap', n: 'Tap Intermediate', tea: 5 },
  { s: 3, t: 150, d: 90, dis: 'jazz', n: 'Jazz Fusion', tea: 5 },
  { s: 4, t: 15, d: 75, dis: 'ballet', n: 'Barre · Intermediate', tea: 1 },
  { s: 4, t: 105, d: 60, dis: 'modern', n: 'Modern · Limón', tea: 4 },
  { s: 4, t: 180, d: 75, dis: 'contemporary', n: 'Improvisation Lab', tea: 2 },
  { s: 5, t: 0, d: 90, dis: 'ballet', n: 'Grand Allégro', tea: 0 },
  { s: 5, t: 105, d: 60, dis: 'hiphop', n: 'Hip-Hop · Advanced', tea: 3 },
  { s: 5, t: 180, d: 75, dis: 'contemporary', n: 'Tanztheater Workshop', tea: 2 },
  { s: 6, t: 0, d: 60, dis: 'jazz', n: 'Jazz · Ailey Tech.', tea: 5 },
  { s: 6, t: 75, d: 75, dis: 'modern', n: 'Modern · Dunham Tech.', tea: 4 },
  { s: 6, t: 165, d: 60, dis: 'ballet', n: 'Stretch & Cool-down', tea: 1 },
]

const EVENTS: CalendarEvent[] = SEED.map((e, i) => ({
  id: i + 1,
  resourceId: e.s,
  start: e.t,
  duration: e.d,
  title: e.n,
  category: e.dis,
  categoryColor: CATEGORY_MAP[e.dis]?.color ?? 'oklch(0.5 0.09 190)',
  subtitle: CATEGORY_MAP[e.dis]?.label,
  teacher: TEACHERS[e.tea],
  enrolled: 8 + ((i * 7) % 12),
}))

const FEW_RESOURCES: CalendarResource[] = RESOURCES.slice(0, 2)
const FEW_EVENTS: CalendarEvent[] = EVENTS.filter((e) => Number(e.resourceId) <= 2)

export function ScheduleCalendarPage() {
  const { t } = useTranslation()
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const nowMinutes = 120

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.scheduleCalendar')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.scheduleCalendarSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.scheduleCalendarFull')}
          </h2>
          <ScheduleCalendar
            resources={RESOURCES}
            events={EVENTS}
            categories={CATEGORIES}
            dayStartHour={15}
            dayEndHour={20}
            slotHeight={44}
            nowMinutes={nowMinutes}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.scheduleCalendarMinimal')}
          </h2>
          <ScheduleCalendar
            resources={FEW_RESOURCES}
            events={FEW_EVENTS}
            dayStartHour={15}
            dayEndHour={19}
            slotHeight={44}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.scheduleCalendarEmpty')}
          </h2>
          <ScheduleCalendar
            resources={RESOURCES}
            events={[]}
            categories={CATEGORIES}
            dayStartHour={8}
            dayEndHour={20}
            slotHeight={44}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>
      </section>
    </div>
  )
}
