import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronsUpDown,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronRight,
  Settings,
} from 'lucide-react'
import { paths } from '@/app/paths'
import { useAuth } from '@/auth/useAuth'
import { usePermissions } from '@/auth/permissions'
import {
  navConfig,
  isNavGroup,
  type NavItemConfig,
  type NavGroupConfig,
  type NavEntryConfig,
} from '@/auth/nav-config'
import { useTheme, type Theme } from '@/theme/ThemeProvider'
import {
  triggerUnreadRefresh,
  useUnreadMessages,
} from '@/app/pages/messages/useUnreadMessages'
import { useUserChannelSocket } from '@/app/pages/messages/useUserChannelSocket'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/user-utils'

const themes: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
  { value: 'system', labelKey: 'theme.system', icon: Monitor },
]

const languages = [
  { code: 'pt' as const, labelKey: 'lang.pt' },
  { code: 'en' as const, labelKey: 'lang.en' },
] as const

/**
 * Check if a pathname matches a nav item path.
 *
 * Uses exact match first. Falls back to prefix match only when no sibling
 * has a longer, more-specific prefix match. This prevents `/marketplace`
 * from staying active when the user is on `/marketplace/my-listings`.
 */
function isChildActive(
  pathname: string,
  child: NavItemConfig,
  siblings: NavItemConfig[]
): boolean {
  if (pathname === child.to) return true
  if (!pathname.startsWith(child.to + '/') && pathname !== child.to)
    return false
  // This child is a prefix match — only highlight if no sibling is a
  // longer (more specific) prefix match.
  return !siblings.some(
    (s) =>
      s !== child &&
      s.to.length > child.to.length &&
      (pathname === s.to || pathname.startsWith(s.to + '/'))
  )
}

function NavGroupItem({
  group,
  t,
  location,
}: {
  group: NavGroupConfig
  t: (key: string) => string
  location: ReturnType<typeof useLocation>
}) {
  const hasActiveChild = group.children.some((child) =>
    isChildActive(location.pathname, child, group.children)
  )
  const [open, setOpen] = useState(hasActiveChild)
  const Icon = group.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setOpen((prev) => !prev)}
        isActive={hasActiveChild && !open}
        tooltip={t(group.labelKey)}
        className="cursor-pointer"
      >
        <Icon />
        <span className="flex-1">{t(group.labelKey)}</span>
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-90'
          )}
        />
      </SidebarMenuButton>

      {open && (
        <SidebarMenuSub>
          {group.children.map((child) => {
            const isActive = isChildActive(
              location.pathname,
              child,
              group.children
            )
            return (
              <SidebarMenuSubItem key={child.to}>
                <SidebarMenuSubButton asChild isActive={isActive}>
                  <NavLink to={child.to}>
                    <span>{t(child.labelKey)}</span>
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { can, canAny } = usePermissions()
  const { theme, setTheme } = useTheme()
  const { total: unreadMessages } = useUnreadMessages()
  const [shake, setShake] = useState(false)
  const shakeTimer = useRef<number | null>(null)

  useUserChannelSocket(Boolean(user), {
    onConversationAdded: () => {
      // Membership change — refresh every unread hook (this badge + any
      // per-conversation badges in MessagesPage).
      triggerUnreadRefresh()
    },
    onIncomingMessage: () => {
      // Refresh every unread hook from the server's source-of-truth
      // (handles reads from other tabs too).
      triggerUnreadRefresh()
      // Trigger a one-shot shake animation. Restart it if a fresh message
      // lands while we're still animating.
      setShake(false)
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current)
      // Force a reflow so the animation re-runs even if the class was just
      // toggled off.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setShake(true)
          shakeTimer.current = window.setTimeout(() => setShake(false), 700)
        })
      })
    },
  })

  useEffect(() => {
    return () => {
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current)
    }
  }, [])

  const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  // Filter nav entries based on user permissions.
  // Items without a `permission` field are always visible.
  // Groups with zero visible children are hidden entirely.
  // Groups with `hidePermission` are hidden when the user holds that permission
  // (used for role-specific variants, e.g. student "Payments" vs admin "Billing").
  const visibleNav = useMemo(() => {
    const isAllowed = (item: NavItemConfig) => {
      if (!item.permission) return true
      return Array.isArray(item.permission)
        ? canAny(...item.permission)
        : can(item.permission)
    }

    const isHidden = (entry: NavEntryConfig) => {
      if (!isNavGroup(entry) || !entry.hidePermission) return false
      return Array.isArray(entry.hidePermission)
        ? canAny(...entry.hidePermission)
        : can(entry.hidePermission)
    }

    return navConfig.reduce<(NavItemConfig | NavGroupConfig)[]>(
      (acc, entry) => {
        if (isHidden(entry)) return acc
        if (isNavGroup(entry)) {
          const children = entry.children.filter(isAllowed)
          if (children.length > 0) {
            acc.push({ ...entry, children })
          }
        } else if (isAllowed(entry)) {
          acc.push(entry)
        }
        return acc
      },
      []
    )
  }, [can, canAny])

  const handleLangChange = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('i18nextLng', code)
  }

  const displayName = user?.full_name || user?.email || ''
  const photoUrl = user?.profile?.photo_url
  const initials = getInitials(displayName)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 pt-4 pb-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-2">
        <NavLink
          to={paths.home}
          className="flex items-center group-data-[collapsible=icon]:justify-center"
        >
          <span className="text-foreground text-3xl font-bold auth-wordmark group-data-[collapsible=icon]:hidden">
            StudioOS
          </span>
          <span
            aria-hidden="true"
            className="hidden size-8 shrink-0 items-center justify-center rounded-md bg-primary group-data-[collapsible=icon]:flex"
          >
            <span
              className="size-5 bg-primary-foreground"
              style={{
                maskImage: 'url(/logo-dancer.svg)',
                WebkitMaskImage: 'url(/logo-dancer.svg)',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
              }}
            />
          </span>
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNav.map((entry) => {
                if (isNavGroup(entry)) {
                  return (
                    <NavGroupItem
                      key={entry.labelKey}
                      group={entry}
                      t={t}
                      location={location}
                    />
                  )
                }

                const isActive =
                  entry.to === paths.home
                    ? location.pathname === '/'
                    : location.pathname.startsWith(entry.to)
                const Icon = entry.icon

                const showUnread =
                  entry.to === paths.messages && unreadMessages > 0
                const badgeLabel =
                  unreadMessages > 99 ? '+99' : String(unreadMessages)

                return (
                  <SidebarMenuItem key={entry.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={
                        showUnread
                          ? `${t(entry.labelKey)} · ${badgeLabel}`
                          : t(entry.labelKey)
                      }
                    >
                      <NavLink to={entry.to}>
                        <Icon />
                        <span className="flex-1">{t(entry.labelKey)}</span>
                        {showUnread && (
                          <span
                            className={cn(
                              'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10.5px] font-semibold text-primary-foreground group-data-[collapsible=icon]:hidden',
                              shake && 'unread-shake'
                            )}
                            aria-label={`${badgeLabel} unread`}
                          >
                            {badgeLabel}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-card p-2 text-left transition-colors hover:bg-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
              <Avatar size="lg">
                {photoUrl && <AvatarImage src={photoUrl} alt={displayName} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-medium leading-tight">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sun className="size-4" />
                {t('theme.toggleLabel')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {themes.map(({ value, labelKey, icon: IconOption }) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setTheme(value)}
                    className={
                      theme === value ? 'bg-accent text-accent-foreground' : ''
                    }
                  >
                    <IconOption className="size-4" />
                    {t(labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span className="flex size-4 items-center justify-center text-xs font-medium">
                  {currentLang.toUpperCase()}
                </span>
                {t(`lang.${currentLang}`)}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {languages.map(({ code, labelKey }) => (
                  <DropdownMenuItem
                    key={code}
                    onClick={() => handleLangChange(code)}
                    className={
                      currentLang === code
                        ? 'bg-accent text-accent-foreground'
                        : ''
                    }
                  >
                    {t(labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(paths.accountSettings)}>
              <Settings className="size-4" />
              {t('account.title')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                await logout()
                navigate(paths.login, { replace: true })
              }}
            >
              <LogOut className="size-4" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
