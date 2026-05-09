import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ToastPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">{t('designSystem.toast')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('toasts.description')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Variants */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('toasts.variants')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => toast(t('toasts.defaultToast'), { description: t('toasts.defaultDesc') })}
            >
              {t('toasts.default')}
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.success(t('toasts.success'), { description: t('toasts.successDesc') })}
            >
              {t('toasts.success')}
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.error(t('toasts.error'), { description: t('toasts.errorDesc') })}
            >
              {t('toasts.error')}
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.warning(t('toasts.warning'), { description: t('toasts.warningDesc') })}
            >
              {t('toasts.warning')}
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info(t('toasts.info'), { description: t('toasts.infoDesc') })}
            >
              {t('toasts.info')}
            </Button>
          </div>
        </div>

        {/* With action */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('toasts.withAction')}
          </h2>
          <Button
            variant="outline"
            onClick={() =>
              toast(t('toasts.sessionDeleted'), {
                description: t('toasts.sessionDeletedDesc'),
                action: {
                  label: t('toasts.undo'),
                  onClick: () => toast.success(t('toasts.restored')),
                },
              })
            }
          >
            {t('toasts.withUndoAction')}
          </Button>
        </div>

        {/* Promise */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('toasts.promise')}
          </h2>
          <Button
            variant="outline"
            onClick={() =>
              toast.promise(
                new Promise<string>((resolve) => setTimeout(() => resolve('Done'), 2000)),
                {
                  loading: t('toasts.savingSession'),
                  success: t('toasts.sessionSaved'),
                  error: t('toasts.failedToSave'),
                },
              )
            }
          >
            {t('toasts.asyncOperation')}
          </Button>
        </div>

        {/* Duration */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('toasts.customDuration')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => toast.info(t('toasts.quickToast'), { duration: 1500 })}
            >
              {t('toasts.short')}
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info(t('toasts.persistentToast'), { duration: 10000 })}
            >
              {t('toasts.long')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
