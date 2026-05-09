import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { paths } from '@/app/paths'
import {
  AlignLeft,
  Bell,
  Box,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Circle,
  CircleAlert,
  CircleUser,
  Layers,
  Loader,
  Menu,
  MessageCircle,
  Minus,
  MousePointerClick,
  PanelRight,
  Rows3,
  ShieldAlert,
  Sparkles,
  Table,
  ToggleLeft,
  Type,
  Users,
} from 'lucide-react'

const components = [
  {
    to: paths.designSystemButtons,
    labelKey: 'designSystem.button',
    descriptionKey: 'designSystem.buttonDesc',
    icon: MousePointerClick,
  },
  {
    to: paths.designSystemInput,
    labelKey: 'designSystem.input',
    descriptionKey: 'designSystem.inputDesc',
    icon: Type,
  },
  {
    to: paths.designSystemSelect,
    labelKey: 'designSystem.select',
    descriptionKey: 'designSystem.selectDesc',
    icon: ChevronDown,
  },
  {
    to: paths.designSystemDropdown,
    labelKey: 'designSystem.dropdown',
    descriptionKey: 'designSystem.dropdownDesc',
    icon: Menu,
  },
  {
    to: paths.designSystemSkeleton,
    labelKey: 'designSystem.skeleton',
    descriptionKey: 'designSystem.skeletonDesc',
    icon: Box,
  },
  {
    to: paths.designSystemTooltip,
    labelKey: 'designSystem.tooltip',
    descriptionKey: 'designSystem.tooltipDesc',
    icon: MessageCircle,
  },
  {
    to: paths.designSystemSheet,
    labelKey: 'designSystem.sheet',
    descriptionKey: 'designSystem.sheetDesc',
    icon: PanelRight,
  },
  {
    to: paths.designSystemSeparator,
    labelKey: 'designSystem.separator',
    descriptionKey: 'designSystem.separatorDesc',
    icon: Minus,
  },
  {
    to: paths.designSystemCalendar,
    labelKey: 'designSystem.calendar',
    descriptionKey: 'designSystem.calendarDesc',
    icon: CalendarDays,
  },
  {
    to: paths.designSystemPopover,
    labelKey: 'designSystem.popover',
    descriptionKey: 'designSystem.popoverDesc',
    icon: Layers,
  },
  {
    to: paths.designSystemScrollArea,
    labelKey: 'designSystem.scrollArea',
    descriptionKey: 'designSystem.scrollAreaDesc',
    icon: Rows3,
  },
  {
    to: paths.designSystemSwitch,
    labelKey: 'designSystem.switch',
    descriptionKey: 'designSystem.switchDesc',
    icon: ToggleLeft,
  },
  {
    to: paths.designSystemAvatar,
    labelKey: 'designSystem.avatar',
    descriptionKey: 'designSystem.avatarDesc',
    icon: CircleUser,
  },
  {
    to: paths.designSystemBadge,
    labelKey: 'designSystem.badge',
    descriptionKey: 'designSystem.badgeDesc',
    icon: Circle,
  },
  {
    to: paths.designSystemCheckbox,
    labelKey: 'designSystem.checkbox',
    descriptionKey: 'designSystem.checkboxDesc',
    icon: CheckSquare,
  },
  {
    to: paths.designSystemRadioGroup,
    labelKey: 'designSystem.radioGroup',
    descriptionKey: 'designSystem.radioGroupDesc',
    icon: Users,
  },
  {
    to: paths.designSystemTextarea,
    labelKey: 'designSystem.textarea',
    descriptionKey: 'designSystem.textareaDesc',
    icon: AlignLeft,
  },
  {
    to: paths.designSystemAlertDialog,
    labelKey: 'designSystem.alertDialog',
    descriptionKey: 'designSystem.alertDialogDesc',
    icon: ShieldAlert,
  },
  {
    to: paths.designSystemDialog,
    labelKey: 'designSystem.dialog',
    descriptionKey: 'designSystem.dialogDesc',
    icon: CircleAlert,
  },
  {
    to: paths.designSystemLogoLoader,
    labelKey: 'designSystem.logoLoader',
    descriptionKey: 'designSystem.logoLoaderDesc',
    icon: Loader,
  },
  {
    to: paths.designSystemScheduleCalendar,
    labelKey: 'designSystem.scheduleCalendar',
    descriptionKey: 'designSystem.scheduleCalendarDesc',
    icon: Table,
  },
  {
    to: paths.designSystemToast,
    labelKey: 'designSystem.toast',
    descriptionKey: 'designSystem.toastDesc',
    icon: Bell,
  },
  {
    to: paths.designSystemPlayground,
    labelKey: 'designSystem.playground',
    descriptionKey: 'designSystem.playgroundDesc',
    icon: Sparkles,
  },
] as const

export function DesignSystemIndexPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.title')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.subtitle')}
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t('designSystem.components')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {components.map(({ to, labelKey, descriptionKey, icon: Icon }) => (
            <Link key={to} to={to}>
              <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent/50">
                <Icon className="mb-3 size-8 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{t(labelKey)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(descriptionKey)}
                </p>
                <span className="mt-2 inline-block text-sm text-primary hover:underline">
                  {t('designSystem.viewComponent')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
