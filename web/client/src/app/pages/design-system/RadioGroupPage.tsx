import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export function RadioGroupPage() {
  const { t } = useTranslation()
  const [plan, setPlan] = useState('weekly')
  const [size, setSize] = useState('md')

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.radioGroup')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.radioGroupSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Basic */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.radioGroupBasic')}
          </h2>
          <RadioGroup value={plan} onValueChange={setPlan}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="daily" id="daily" />
              <Label htmlFor="daily">{t('designSystem.radioGroupDaily')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="weekly" id="weekly" />
              <Label htmlFor="weekly">
                {t('designSystem.radioGroupWeekly')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="monthly" id="monthly" />
              <Label htmlFor="monthly">
                {t('designSystem.radioGroupMonthly')}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Disabled */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.disabled')}
          </h2>
          <RadioGroup value="a" disabled>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="a" id="dis-a" />
              <Label htmlFor="dis-a">
                {t('designSystem.radioGroupOptionA')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="b" id="dis-b" />
              <Label htmlFor="dis-b">
                {t('designSystem.radioGroupOptionB')}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* With descriptions */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.radioGroupWithDesc')}
          </h2>
          <RadioGroup
            value={size}
            onValueChange={setSize}
            className="space-y-3"
          >
            {[
              {
                value: 'sm',
                labelKey: 'designSystem.radioGroupSmall',
                descKey: 'designSystem.radioGroupSmallDesc',
              },
              {
                value: 'md',
                labelKey: 'designSystem.radioGroupMedium',
                descKey: 'designSystem.radioGroupMediumDesc',
              },
              {
                value: 'lg',
                labelKey: 'designSystem.radioGroupLarge',
                descKey: 'designSystem.radioGroupLargeDesc',
              },
            ].map(({ value, labelKey, descKey }) => (
              <div
                key={value}
                className="flex items-start gap-3 rounded-lg border border-border p-4 max-w-md"
              >
                <RadioGroupItem
                  value={value}
                  id={`size-${value}`}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <Label htmlFor={`size-${value}`}>{t(labelKey)}</Label>
                  <p className="text-sm text-muted-foreground">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Horizontal */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.radioGroupHorizontal')}
          </h2>
          <RadioGroup
            value={plan}
            onValueChange={setPlan}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="daily" id="h-daily" />
              <Label htmlFor="h-daily">
                {t('designSystem.radioGroupDaily')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="weekly" id="h-weekly" />
              <Label htmlFor="h-weekly">
                {t('designSystem.radioGroupWeekly')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="monthly" id="h-monthly" />
              <Label htmlFor="h-monthly">
                {t('designSystem.radioGroupMonthly')}
              </Label>
            </div>
          </RadioGroup>
        </div>
      </section>
    </div>
  )
}
