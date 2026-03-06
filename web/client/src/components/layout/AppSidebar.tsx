import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Palette } from 'lucide-react'
import { paths } from '@/app/paths'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const navItems = [
  { to: paths.home, labelKey: 'nav.home', icon: Home },
  { to: paths.designSystem, labelKey: 'nav.designSystem', icon: Palette },
] as const

export function AppSidebar() {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <Sidebar collapsible="icon">
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
    </Sidebar>
  )
}
