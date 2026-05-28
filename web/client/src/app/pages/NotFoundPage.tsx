import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { paths } from '@/app/paths'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/shared/PageLayout'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <PageLayout>
      <div className="mx-auto flex h-full w-full max-w-md flex-col items-center justify-center text-center">
        <p className="text-6xl font-semibold tracking-tight text-muted-foreground/60">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          {t('notFound.title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('notFound.description')}
        </p>
        <p className="mt-1 text-xs italic text-muted-foreground/80">
          {t('notFound.tagline')}
        </p>
        <Button asChild className="mt-6">
          <Link to={paths.home}>
            <Home className="size-4" />
            {t('notFound.backToHome')}
          </Link>
        </Button>
      </div>
    </PageLayout>
  )
}
