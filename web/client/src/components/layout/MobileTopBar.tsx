import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { paths } from '@/app/paths'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export function MobileTopBar() {
  const { t } = useTranslation()

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3',
        'md:hidden'
      )}
    >
      <SidebarTrigger
        aria-label={t('nav.openMenu')}
        className="size-9 [&_svg]:size-5"
      />
      <NavLink
        to={paths.home}
        className="flex flex-1 items-center justify-center"
      >
        <span className="auth-wordmark text-xl font-bold leading-none">
          StudioOS
        </span>
      </NavLink>
      {/* The unread badge used to render here, but it duplicated the badge
       *  inside the sidebar drawer. The drawer's own count is canonical. */}
      <div className="w-9" aria-hidden="true" />
    </header>
  )
}
