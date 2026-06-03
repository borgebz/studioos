import { useTranslation } from 'react-i18next'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type Theme } from '@/theme/ThemeProvider'

const themes: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
  { value: 'system', labelKey: 'theme.system', icon: Monitor },
]

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme, resolvedTheme } = useTheme()

  const Icon =
    theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 min-h-11 min-w-11 md:min-h-0 md:min-w-0"
          aria-label={t('theme.toggleLabel')}
        >
          <Icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
