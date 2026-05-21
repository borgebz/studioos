import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sun,
  Moon,
  Monitor,
  Plus,
  Trash2,
  LogOut,
  User,
  Settings,
  Keyboard,
} from 'lucide-react'

export function DropdownPage() {
  const { t } = useTranslation()
  const [checkboxValues, setCheckboxValues] = useState({
    showToolbar: true,
    showSidebar: false,
  })
  const [radioValue, setRadioValue] = useState('light')

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.dropdown')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.dropdownSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Items with icons */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.dropdownWithIcons')}
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t('playground.openMenu')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>
                <Sun className="size-4" />
                {t('theme.light')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Moon className="size-4" />
                {t('theme.dark')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Monitor className="size-4" />
                {t('theme.system')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Destructive variant */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            variant=&quot;destructive&quot;
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t('designSystem.dropdownDanger')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>
                <Plus className="size-4" />
                {t('designSystem.dropdownAdd')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 className="size-4" />
                {t('designSystem.dropdownDelete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Inset items (pl-8) */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            inset items
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t('designSystem.dropdownProfile')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel inset>
                {t('designSystem.dropdownMyAccount')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="size-4" />
                {t('designSystem.dropdownProfileItem')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="size-4" />
                {t('designSystem.dropdownSettings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="size-4" />
                {t('designSystem.dropdownLogout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Shortcuts */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.dropdownShortcuts')}
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t('designSystem.dropdownKeyboard')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>
                {t('designSystem.dropdownCut')}
                <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                {t('designSystem.dropdownCopy')}
                <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                {t('designSystem.dropdownPaste')}
                <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Checkbox items */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.dropdownCheckbox')}
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t('designSystem.dropdownViewOptions')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>
                {t('designSystem.dropdownAppearance')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={checkboxValues.showToolbar}
                onCheckedChange={(checked) =>
                  setCheckboxValues((p) => ({ ...p, showToolbar: !!checked }))
                }
              >
                {t('designSystem.dropdownShowToolbar')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={checkboxValues.showSidebar}
                onCheckedChange={(checked) =>
                  setCheckboxValues((p) => ({ ...p, showSidebar: !!checked }))
                }
              >
                {t('designSystem.dropdownShowSidebar')}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Radio items */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.dropdownRadio')}
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t('designSystem.dropdownTheme')}: {t(`theme.${radioValue}`)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>
                {t('designSystem.dropdownThemeLabel')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={radioValue}
                onValueChange={setRadioValue}
              >
                <DropdownMenuRadioItem value="light">
                  <Sun className="size-4 mr-2" />
                  {t('theme.light')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon className="size-4 mr-2" />
                  {t('theme.dark')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <Monitor className="size-4 mr-2" />
                  {t('theme.system')}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Submenu */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.dropdownSubmenu')}
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t('designSystem.dropdownMore')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>
                {t('designSystem.dropdownBack')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {t('designSystem.dropdownForward')}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Keyboard className="size-4" />
                  {t('designSystem.dropdownMoreTools')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>
                    {t('designSystem.dropdownSavePage')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    {t('designSystem.dropdownPrint')}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>
    </div>
  )
}
