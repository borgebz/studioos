import { useTranslation } from 'react-i18next'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function TextareaPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.textarea')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.textareaSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Default */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.default')}
          </h2>
          <Textarea
            placeholder={t('designSystem.textareaPlaceholder')}
            className="max-w-md"
          />
        </div>

        {/* With label */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.textareaWithLabel')}
          </h2>
          <div className="space-y-2 max-w-md">
            <Label htmlFor="bio">{t('designSystem.textareaBio')}</Label>
            <Textarea
              id="bio"
              placeholder={t('designSystem.textareaBioPlaceholder')}
            />
            <p className="text-sm text-muted-foreground">
              {t('designSystem.textareaBioHelper')}
            </p>
          </div>
        </div>

        {/* Disabled */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.disabled')}
          </h2>
          <Textarea
            disabled
            placeholder={t('designSystem.textareaPlaceholder')}
            className="max-w-md"
          />
        </div>

        {/* With value */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.withValue')}
          </h2>
          <Textarea
            defaultValue={t('designSystem.textareaSampleValue')}
            className="max-w-md"
            readOnly
          />
        </div>

        {/* Rows */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.textareaRows')}
          </h2>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">rows=2</span>
              <Textarea
                rows={2}
                placeholder={t('designSystem.textareaPlaceholder')}
                className="w-64"
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">rows=6</span>
              <Textarea
                rows={6}
                placeholder={t('designSystem.textareaPlaceholder')}
                className="w-64"
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">rows=10</span>
              <Textarea
                rows={10}
                placeholder={t('designSystem.textareaPlaceholder')}
                className="w-64"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
