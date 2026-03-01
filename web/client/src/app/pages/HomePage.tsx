import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { paths } from '@/app/paths'

export function HomePage() {
  const { t } = useTranslation()
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-foreground">
        {t('home.title')}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t('home.welcomeBefore')}
        <Link to={paths.designSystem} className="text-primary hover:underline">
          {t('home.welcomeLink')}
        </Link>
        {t('home.welcomeAfter')}
      </p>
    </div>
  )
}
