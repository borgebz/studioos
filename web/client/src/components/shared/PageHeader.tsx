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

  // On mobile the title and actions stack vertically so a long title
  // ("Os Meus Pedidos") doesn't wrap when paired with a wide button
  // ("Pedir Coaching"). From sm+ they sit on the same row.
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 items-center gap-4">
        {backTo && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('nav.back')}
            onClick={() => navigate(backTo)}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {title}
        </h1>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:flex-nowrap">
          {children}
        </div>
      )}
    </div>
  )
}
