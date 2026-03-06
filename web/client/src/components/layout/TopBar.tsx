import { useTranslation } from 'react-i18next'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'

export function TopBar() {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full shrink-0 items-center gap-2 border-b border-border bg-card px-4">
      <SidebarTrigger />
      <span className="text-lg font-semibold text-foreground">
        {t('nav.brand')}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
