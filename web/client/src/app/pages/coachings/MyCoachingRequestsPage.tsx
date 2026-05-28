import { useTranslation } from 'react-i18next'
import { Inbox as InboxIcon } from 'lucide-react'

import { PageLayout } from '@/components/shared/PageLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { paths } from '@/app/paths'

export function MyCoachingRequestsPage() {
  const { t } = useTranslation()

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={t('myCoachingRequests.title')} backTo={paths.home} />
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <InboxIcon className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm">{t('myCoachingRequests.empty')}</p>
        </div>
      </div>
    </PageLayout>
  )
}
