import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

const variants = [
  'default',
  'destructive',
  'outline',
  'secondary',
  'ghost',
  'link',
] as const
const sizes = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
] as const

export function ButtonsPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.button')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.buttonSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Sizes */}
        <div className="space-y-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.sizes')}
          </h2>
          <div className="flex flex-wrap items-end gap-4">
            {sizes.map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <Button size={size}>
                  {size.startsWith('icon') ? (
                    <Plus />
                  ) : (
                    t(`designSystem.sizes_labels.${size}`)
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t(`designSystem.sizes_labels.${size}`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Variants × Sizes matrix */}
        <div className="space-y-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.matrixTitle')}
          </h2>
          <div className="space-y-4">
            {variants.map((variant) => (
              <div key={variant} className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium w-24 text-muted-foreground">
                  {t(`designSystem.variants.${variant}`)}
                </span>
                <Button variant={variant}>{t('designSystem.button')}</Button>
                <Button variant={variant} size="sm">
                  {t('designSystem.small')}
                </Button>
                <Button variant={variant} size="lg">
                  {t('designSystem.large')}
                </Button>
                <Button variant={variant} size="icon">
                  <Plus />
                </Button>
                <Button variant={variant} disabled>
                  {t('designSystem.disabledVariant', {
                    variant: t(`designSystem.variants.${variant}`),
                  })}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
