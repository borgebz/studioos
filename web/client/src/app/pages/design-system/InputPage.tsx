import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'

const inputTypes = ['text', 'email', 'password', 'number'] as const

export function InputPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.input')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.inputSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Input types */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.types')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {inputTypes.map((type) => (
              <div key={type} className="space-y-2">
                <span className="text-xs text-muted-foreground capitalize">
                  type=&quot;{type}&quot;
                </span>
                <Input
                  type={type}
                  placeholder={t('designSystem.inputPlaceholder')}
                  className="w-full max-w-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Disabled */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.disabled')}
          </h2>
          <div className="flex flex-wrap gap-4">
            <Input
              disabled
              placeholder={t('designSystem.inputPlaceholder')}
              className="w-64"
            />
          </div>
        </div>

        {/* With value */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.withValue')}
          </h2>
          <Input
            defaultValue="Pre-filled text"
            className="w-64"
            readOnly
            aria-readonly
          />
        </div>
      </section>
    </div>
  )
}
