import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'

const variants = ['default', 'secondary', 'destructive', 'outline'] as const

export function BadgePage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.badge')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.badgeSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Variants */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.badgeVariants')}
          </h2>
          <div className="flex flex-wrap gap-3">
            {variants.map((variant) => (
              <div key={variant} className="flex flex-col items-center gap-2">
                <Badge variant={variant}>
                  {t(`designSystem.variants.${variant === 'outline' ? 'outline' : variant}`)}
                </Badge>
                <span className="text-xs text-muted-foreground">{variant}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status examples */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.badgeStatus')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100">
              {t('designSystem.badgeActive')}
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100">
              {t('designSystem.badgePending')}
            </Badge>
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100">
              {t('designSystem.badgeCancelled')}
            </Badge>
            <Badge className="bg-muted text-muted-foreground hover:bg-muted">
              {t('designSystem.badgeArchived')}
            </Badge>
          </div>
        </div>

        {/* With count */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.badgeWithCount')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Badge>3</Badge>
            <Badge variant="secondary">12</Badge>
            <Badge variant="destructive">99+</Badge>
            <Badge variant="outline">0</Badge>
          </div>
        </div>

        {/* In context */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.badgeInContext')}
          </h2>
          <div className="space-y-3 max-w-md">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium">{t('designSystem.badgeCoaching')}</span>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100">
                {t('designSystem.badgeActive')}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium">{t('designSystem.badgeEnrollment')}</span>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100">
                {t('designSystem.badgePending')}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium">{t('designSystem.badgeEvent')}</span>
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100">
                {t('designSystem.badgeCancelled')}
              </Badge>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
