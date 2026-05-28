import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { paths } from '@/app/paths'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useUnreadMessages } from '@/app/pages/messages/useUnreadMessages'
import { cn } from '@/lib/utils'

export function MobileTopBar() {
  const { t } = useTranslation()
  const { total: unread } = useUnreadMessages()
  const badgeLabel = unread > 99 ? '+99' : String(unread)

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
      <div className="flex w-9 items-center justify-end">
        {unread > 0 && (
          <NavLink
            to={paths.messages}
            aria-label={`${t('nav.messages')} · ${badgeLabel}`}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10.5px] font-semibold text-primary-foreground"
          >
            {badgeLabel}
          </NavLink>
        )}
      </div>
    </header>
  )
}
