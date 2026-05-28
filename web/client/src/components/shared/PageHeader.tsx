import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  title: string
  backTo?: string
  children?: React.ReactNode
}

export function PageHeader({ title, backTo, children }: PageHeaderProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-4 mb-6">
      {backTo && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('nav.back')}
          onClick={() => navigate(backTo)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children && (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}
