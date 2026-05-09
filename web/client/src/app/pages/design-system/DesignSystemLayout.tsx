import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { paths } from '@/app/paths'
import { PageLayout } from '@/components/shared/PageLayout'

const designSystemLinks: Array<{
  to: string
  labelKey: string
  end?: boolean
}> = [
  { to: paths.designSystem, labelKey: 'designSystem.overview', end: true },
  { to: paths.designSystemButtons, labelKey: 'designSystem.button' },
  { to: paths.designSystemInput, labelKey: 'designSystem.input' },
  { to: paths.designSystemSelect, labelKey: 'designSystem.select' },
  { to: paths.designSystemDropdown, labelKey: 'designSystem.dropdown' },
  { to: paths.designSystemSkeleton, labelKey: 'designSystem.skeleton' },
  { to: paths.designSystemTooltip, labelKey: 'designSystem.tooltip' },
  { to: paths.designSystemSheet, labelKey: 'designSystem.sheet' },
  { to: paths.designSystemSeparator, labelKey: 'designSystem.separator' },
  { to: paths.designSystemPlayground, labelKey: 'designSystem.playground' },
  { to: paths.designSystemCalendar, labelKey: 'designSystem.calendar' },
  { to: paths.designSystemPopover, labelKey: 'designSystem.popover' },
  { to: paths.designSystemScrollArea, labelKey: 'designSystem.scrollArea' },
  { to: paths.designSystemSwitch, labelKey: 'designSystem.switch' },
  { to: paths.designSystemAvatar, labelKey: 'designSystem.avatar' },
  { to: paths.designSystemBadge, labelKey: 'designSystem.badge' },
  { to: paths.designSystemCheckbox, labelKey: 'designSystem.checkbox' },
  { to: paths.designSystemRadioGroup, labelKey: 'designSystem.radioGroup' },
  { to: paths.designSystemTextarea, labelKey: 'designSystem.textarea' },
  { to: paths.designSystemAlertDialog, labelKey: 'designSystem.alertDialog' },
  { to: paths.designSystemDialog, labelKey: 'designSystem.dialog' },
  { to: paths.designSystemLogoLoader, labelKey: 'designSystem.logoLoader' },
  { to: paths.designSystemScheduleCalendar, labelKey: 'designSystem.scheduleCalendar' },
  { to: paths.designSystemToast, labelKey: 'designSystem.toast' },
]

export function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <PageLayout>
      <div className="space-y-8">
        <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
          {designSystemLinks.map(({ to, labelKey, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`
              }
            >
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        {children}
      </div>
    </PageLayout>
  )
}
