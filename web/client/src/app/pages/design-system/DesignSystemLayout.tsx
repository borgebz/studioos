import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { paths } from '@/app/paths'
import { PageLayout } from '@/components/shared/PageLayout'

interface DSLink {
  to: string
  labelKey: string
  end?: boolean
}

interface DSGroup {
  labelKey: string
  links: DSLink[]
}

const overviewLink: DSLink = {
  to: paths.designSystem,
  labelKey: 'designSystem.overview',
  end: true,
}

const designSystemGroups: DSGroup[] = [
  {
    labelKey: 'designSystem.groups.actions',
    links: [
      { to: paths.designSystemButtons, labelKey: 'designSystem.button' },
      { to: paths.designSystemDropdown, labelKey: 'designSystem.dropdown' },
    ],
  },
  {
    labelKey: 'designSystem.groups.inputs',
    links: [
      { to: paths.designSystemInput, labelKey: 'designSystem.input' },
      { to: paths.designSystemTextarea, labelKey: 'designSystem.textarea' },
      { to: paths.designSystemSelect, labelKey: 'designSystem.select' },
      { to: paths.designSystemCheckbox, labelKey: 'designSystem.checkbox' },
      { to: paths.designSystemRadioGroup, labelKey: 'designSystem.radioGroup' },
      { to: paths.designSystemSwitch, labelKey: 'designSystem.switch' },
    ],
  },
  {
    labelKey: 'designSystem.groups.display',
    links: [
      { to: paths.designSystemBadge, labelKey: 'designSystem.badge' },
      { to: paths.designSystemAvatar, labelKey: 'designSystem.avatar' },
      { to: paths.designSystemSeparator, labelKey: 'designSystem.separator' },
      { to: paths.designSystemSkeleton, labelKey: 'designSystem.skeleton' },
    ],
  },
  {
    labelKey: 'designSystem.groups.overlays',
    links: [
      { to: paths.designSystemDialog, labelKey: 'designSystem.dialog' },
      { to: paths.designSystemAlertDialog, labelKey: 'designSystem.alertDialog' },
      { to: paths.designSystemSheet, labelKey: 'designSystem.sheet' },
      { to: paths.designSystemPopover, labelKey: 'designSystem.popover' },
      { to: paths.designSystemTooltip, labelKey: 'designSystem.tooltip' },
      { to: paths.designSystemToast, labelKey: 'designSystem.toast' },
    ],
  },
  {
    labelKey: 'designSystem.groups.dateTime',
    links: [
      { to: paths.designSystemCalendar, labelKey: 'designSystem.calendar' },
      {
        to: paths.designSystemScheduleCalendar,
        labelKey: 'designSystem.scheduleCalendar',
      },
    ],
  },
  {
    labelKey: 'designSystem.groups.layout',
    links: [
      { to: paths.designSystemScrollArea, labelKey: 'designSystem.scrollArea' },
    ],
  },
  {
    labelKey: 'designSystem.groups.feedback',
    links: [
      { to: paths.designSystemLogoLoader, labelKey: 'designSystem.logoLoader' },
    ],
  },
  {
    labelKey: 'designSystem.groups.playground',
    links: [
      { to: paths.designSystemPlayground, labelKey: 'designSystem.playground' },
    ],
  },
]

export function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = useTranslation()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-1.5 text-sm transition-colors ${
      isActive
        ? 'bg-accent font-medium text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
    }`

  return (
    <PageLayout>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav className="space-y-6">
            <div>
              <NavLink to={overviewLink.to} end className={linkClass}>
                {t(overviewLink.labelKey)}
              </NavLink>
            </div>
            {designSystemGroups.map((group) => (
              <div key={group.labelKey}>
                <h3 className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
                  {t(group.labelKey)}
                </h3>
                <ul className="space-y-0.5">
                  {group.links.map(({ to, labelKey }) => (
                    <li key={to}>
                      <NavLink to={to} className={linkClass}>
                        {t(labelKey)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </PageLayout>
  )
}
