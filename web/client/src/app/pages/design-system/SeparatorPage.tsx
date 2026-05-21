import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'

export function SeparatorPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.separator')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.separatorSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Horizontal */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            orientation=&quot;horizontal&quot; (default)
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('designSystem.separatorAbove')}
            </p>
            <Separator orientation="horizontal" decorative />
            <p className="text-sm text-muted-foreground">
              {t('designSystem.separatorBelow')}
            </p>
          </div>
        </div>

        {/* Vertical */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            orientation=&quot;vertical&quot;
          </h2>
          <div className="flex items-center gap-4 h-24">
            <span className="text-sm">Item 1</span>
            <Separator orientation="vertical" decorative />
            <span className="text-sm">Item 2</span>
            <Separator orientation="vertical" decorative />
            <span className="text-sm">Item 3</span>
          </div>
        </div>

        {/* In content */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.separatorInContent')}
          </h2>
          <div className="rounded-lg border border-border p-4 w-full max-w-md">
            <h3 className="font-semibold">
              {t('designSystem.separatorTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('designSystem.separatorBody')}
            </p>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground">
              {t('designSystem.separatorBody2')}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
