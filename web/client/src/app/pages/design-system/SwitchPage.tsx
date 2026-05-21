import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function SwitchPage() {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(true)

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.switch')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.switchSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* States */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.switchStates')}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={true} />
              <span className="text-sm text-muted-foreground">{t('designSystem.switchOn')}</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={false} />
              <span className="text-sm text-muted-foreground">{t('designSystem.switchOff')}</span>
            </div>
          </div>
        </div>

        {/* Disabled */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.disabled')}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={true} disabled />
              <span className="text-sm text-muted-foreground">
                {t('designSystem.switchOn')} ({t('designSystem.disabled')})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={false} disabled />
              <span className="text-sm text-muted-foreground">
                {t('designSystem.switchOff')} ({t('designSystem.disabled')})
              </span>
            </div>
          </div>
        </div>

        {/* With label */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.switchWithLabel')}
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-border p-4 max-w-md">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">{t('designSystem.switchNotifications')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('designSystem.switchNotificationsDesc')}
                </p>
              </div>
              <Switch
                id="notifications"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4 max-w-md">
              <div className="space-y-0.5">
                <Label htmlFor="marketing">{t('designSystem.switchMarketing')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('designSystem.switchMarketingDesc')}
                </p>
              </div>
              <Switch id="marketing" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
