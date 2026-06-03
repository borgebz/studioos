import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'

export function CalendarPage() {
  const { t } = useTranslation()
  const [single, setSingle] = useState<Date | undefined>(new Date())
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(Date.now() + 5 * 86400000),
  })

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.calendar')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.calendarSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Single date */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.calendarSingle')}
          </h2>
          <Calendar
            mode="single"
            selected={single}
            onSelect={setSingle}
            className="rounded-md border border-border w-fit"
          />
        </div>

        {/* Range */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.calendarRange')}
          </h2>
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            className="rounded-md border border-border w-fit"
          />
        </div>

        {/* Disabled */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.disabled')}
          </h2>
          <Calendar
            mode="single"
            selected={new Date()}
            disabled
            className="rounded-md border border-border w-fit"
          />
        </div>

        {/* Disabled dates */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.calendarDisabledDates')}
          </h2>
          <Calendar
            mode="single"
            selected={single}
            onSelect={setSingle}
            disabled={(date) => date < new Date()}
            className="rounded-md border border-border w-fit"
          />
        </div>
      </section>
    </div>
  )
}
