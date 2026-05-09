import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export function CheckboxPage() {
  const { t } = useTranslation()
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    terms: false,
    newsletter: true,
    updates: false,
  })

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.checkbox')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.checkboxSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* States */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.checkboxStates')}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox checked={false} />
              <span className="text-sm text-muted-foreground">{t('designSystem.checkboxUnchecked')}</span>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={true} />
              <span className="text-sm text-muted-foreground">{t('designSystem.checkboxChecked')}</span>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked="indeterminate" />
              <span className="text-sm text-muted-foreground">{t('designSystem.checkboxIndeterminate')}</span>
            </div>
          </div>
        </div>

        {/* Disabled */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.disabled')}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox checked={false} disabled />
              <span className="text-sm text-muted-foreground">
                {t('designSystem.checkboxUnchecked')} ({t('designSystem.disabled')})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={true} disabled />
              <span className="text-sm text-muted-foreground">
                {t('designSystem.checkboxChecked')} ({t('designSystem.disabled')})
              </span>
            </div>
          </div>
        </div>

        {/* With labels */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.checkboxWithLabels')}
          </h2>
          <div className="space-y-4 max-w-md">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={checkedItems.terms}
                onCheckedChange={(v) =>
                  setCheckedItems((prev) => ({ ...prev, terms: v === true }))
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="terms">{t('designSystem.checkboxTerms')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('designSystem.checkboxTermsDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="newsletter"
                checked={checkedItems.newsletter}
                onCheckedChange={(v) =>
                  setCheckedItems((prev) => ({ ...prev, newsletter: v === true }))
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="newsletter">{t('designSystem.checkboxNewsletter')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('designSystem.checkboxNewsletterDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="updates"
                checked={checkedItems.updates}
                onCheckedChange={(v) =>
                  setCheckedItems((prev) => ({ ...prev, updates: v === true }))
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="updates">{t('designSystem.checkboxUpdates')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('designSystem.checkboxUpdatesDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
