import { useTranslation } from 'react-i18next'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  CalendarDays,
  Palette,
  GraduationCap,
  ShoppingBag,
  UserPlus,
  ChevronsUpDown,
  Sun,
  Moon,
  Monitor,
  LogOut,
} from 'lucide-react'
import { paths } from '@/app/paths'
import { useAuth } from '@/auth/useAuth'
import { useTheme, type Theme } from '@/theme/ThemeProvider'
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
  SidebarRail,
} from '@/components/ui/sidebar'

const navItems = [
  { to: paths.home, labelKey: 'nav.home', icon: Home },
  { to: paths.calendar, labelKey: 'nav.calendar', icon: CalendarDays },
  { to: paths.coachingsCreate, labelKey: 'nav.coachings', icon: GraduationCap },
  { to: paths.marketplaceCreate, labelKey: 'nav.marketplace', icon: ShoppingBag },
  { to: paths.invites, labelKey: 'nav.invites', icon: UserPlus },
  { to: paths.designSystem, labelKey: 'nav.designSystem', icon: Palette },
] as const

const themes: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
  { value: 'system', labelKey: 'theme.system', icon: Monitor },
]

const languages = [
  { code: 'pt' as const, labelKey: 'lang.pt' },
  { code: 'en' as const, labelKey: 'lang.en' },
] as const

export function AppSidebar() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  const handleLangChange = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('i18nextLng', code)
  }

  const displayName = user?.full_name || user?.email || ''
  const photoUrl = user?.profile?.photo_url
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 pt-4 pb-3">
        <NavLink
          to={paths.home}
          className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
        >
          <span className="text-foreground text-3xl font-bold">
            StudioOS
          </span>
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ to, labelKey, icon: Icon }) => {
                const isActive =
                  to === paths.home
                    ? location.pathname === '/'
                    : location.pathname.startsWith(to)
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={t(labelKey)}
                    >
                      <NavLink to={to}>
                        <Icon />
                        <span>{t(labelKey)}</span>
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
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                await logout()
                navigate(paths.login, { replace: true })
              }}
            >
              <LogOut className="size-4" />
              {t('designSystem.dropdownLogout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
