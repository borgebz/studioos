import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Sun, Moon, Monitor } from 'lucide-react'

const fruits = [
  { value: 'apple', labelKey: 'playground.apple' },
  { value: 'banana', labelKey: 'playground.banana' },
  { value: 'orange', labelKey: 'playground.orange' },
] as const

const themes = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
  { value: 'system', labelKey: 'theme.system', icon: Monitor },
] as const

export function PlaygroundPage() {
  const { t } = useTranslation()
  const [selectValue, setSelectValue] = useState<string>('')

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.playground')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.playgroundSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Select */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Select
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('playground.selectDesc')}
          </p>
          <div className="flex flex-wrap gap-4">
            <Select value={selectValue} onValueChange={setSelectValue}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('playground.chooseFruit')} />
              </SelectTrigger>
              <SelectContent>
                {fruits.map(({ value, labelKey }) => (
                  <SelectItem key={value} value={value}>
                    {t(labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dropdown Menu */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Dropdown Menu
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('playground.dropdownDesc')}
          </p>
          <div className="flex flex-wrap gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="size-4" />
                  {t('playground.openMenu')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {themes.map(({ value, labelKey, icon: Icon }) => (
                  <DropdownMenuItem key={value}>
                    <Icon className="size-4" />
                    {t(labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </section>
    </div>
  )
}
