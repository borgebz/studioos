import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { paths } from '@/app/paths'
import { PageLayout } from '@/components/shared/PageLayout'

export function HomePage() {
  const { t } = useTranslation()
  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('home.title')}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('home.welcomeBefore')}
          <Link to={paths.designSystem} className="text-primary hover:underline">
            {t('home.welcomeLink')}
          </Link>
          {t('home.welcomeAfter')}
        </p>
      </div>
    </PageLayout>
  )
}
