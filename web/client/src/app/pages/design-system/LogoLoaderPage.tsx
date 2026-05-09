import { useTranslation } from 'react-i18next'
import { LogoLoader, FullPageLoader } from '@/components/shared/LogoLoader'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function LogoLoaderPage() {
  const { t } = useTranslation()
  const [showFullPage, setShowFullPage] = useState(false)

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.logoLoader')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.logoLoaderSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Sizes */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.sizes')}
          </h2>
          <div className="flex items-end gap-8">
            <div className="flex flex-col items-center gap-3">
              <LogoLoader size={32} />
              <span className="text-xs text-muted-foreground">32px</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <LogoLoader size={48} />
              <span className="text-xs text-muted-foreground">48px</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <LogoLoader size={64} />
              <span className="text-xs text-muted-foreground">64px</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <LogoLoader size={96} />
              <span className="text-xs text-muted-foreground">96px</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <LogoLoader size={128} />
              <span className="text-xs text-muted-foreground">128px</span>
            </div>
          </div>
        </div>

        {/* In context - card loading state */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.logoLoaderInContext')}
          </h2>
          <div className="flex gap-4">
            <div className="flex h-48 w-64 flex-col items-center justify-center rounded-lg border border-border bg-card">
              <LogoLoader size={56} />
              <span className="mt-3 text-sm text-muted-foreground">
                {t('designSystem.logoLoaderLoading')}
              </span>
            </div>
            <div className="flex h-48 w-64 flex-col items-center justify-center rounded-lg border border-border bg-muted/30">
              <LogoLoader size={40} />
            </div>
          </div>
        </div>

        {/* Full page loader */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.logoLoaderFullPage')}
          </h2>
          <Button variant="outline" onClick={() => setShowFullPage(true)}>
            {t('designSystem.logoLoaderShowFullPage')}
          </Button>
          {showFullPage && (
            <div
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowFullPage(false)}
            >
              <FullPageLoader />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
