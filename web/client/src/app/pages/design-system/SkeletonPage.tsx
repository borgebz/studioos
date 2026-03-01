import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.skeleton')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.skeletonSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Basic shapes */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.skeletonShapes')}
          </h2>
          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Rectangle</span>
              <Skeleton className="h-12 w-48" />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Square</span>
              <Skeleton className="h-16 w-16 rounded-md" />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Circle</span>
              <Skeleton className="size-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Text line</span>
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>

        {/* Card skeleton */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.skeletonCard')}
          </h2>
          <div className="rounded-lg border border-border p-6 w-full max-w-sm">
            <Skeleton className="h-32 w-full rounded-md mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>

        {/* Avatar skeleton */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.skeletonAvatar')}
          </h2>
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
