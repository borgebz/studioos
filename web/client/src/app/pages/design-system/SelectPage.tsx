import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Apple, Banana, Citrus, Cherry } from 'lucide-react'

const fruits = [
  { value: 'apple', labelKey: 'playground.apple', icon: Apple },
  { value: 'banana', labelKey: 'playground.banana', icon: Banana },
  { value: 'orange', labelKey: 'playground.orange', icon: Citrus },
  { value: 'cherry', labelKey: 'playground.cherry', icon: Cherry },
] as const

export function SelectPage() {
  const { t } = useTranslation()
  const [value, setValue] = useState<string>('')
  const [valueGrouped, setValueGrouped] = useState<string>('')
  const [valueWithIcons, setValueWithIcons] = useState<string>('')

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.select')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.selectSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Basic */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.selectBasic')}
          </h2>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-[180px]" size="default">
              <SelectValue placeholder={t('playground.chooseFruit')} />
            </SelectTrigger>
            <SelectContent>
              {fruits.map(({ value: v, labelKey }) => (
                <SelectItem key={v} value={v}>
                  {t(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size sm */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            size="sm"
          </h2>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-[180px]" size="sm">
              <SelectValue placeholder={t('playground.chooseFruit')} />
            </SelectTrigger>
            <SelectContent>
              {fruits.map(({ value: v, labelKey }) => (
                <SelectItem key={v} value={v}>
                  {t(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* With groups and labels */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.selectWithGroups')}
          </h2>
          <Select value={valueGrouped} onValueChange={setValueGrouped}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={t('designSystem.selectChoose')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t('designSystem.selectFruits')}</SelectLabel>
                <SelectItem value="apple">{t('playground.apple')}</SelectItem>
                <SelectItem value="banana">{t('playground.banana')}</SelectItem>
                <SelectItem value="orange">{t('playground.orange')}</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>{t('designSystem.selectVegetables')}</SelectLabel>
                <SelectItem value="carrot">{t('playground.carrot')}</SelectItem>
                <SelectItem value="potato">{t('playground.potato')}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* With icons */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.selectWithIcons')}
          </h2>
          <Select value={valueWithIcons} onValueChange={setValueWithIcons}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={t('playground.chooseFruit')} />
            </SelectTrigger>
            <SelectContent>
              {fruits.map(({ value: v, labelKey, icon: Icon }) => (
                <SelectItem key={v} value={v}>
                  <Icon className="size-4" />
                  {t(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Disabled item */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.selectDisabledItem')}
          </h2>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('playground.chooseFruit')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apple">{t('playground.apple')}</SelectItem>
              <SelectItem value="banana" disabled>
                {t('playground.banana')} ({t('designSystem.disabled')})
              </SelectItem>
              <SelectItem value="orange">{t('playground.orange')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content position */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.selectPosition')}
          </h2>
          <div className="flex gap-8">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">
                position="item-aligned" (default)
              </span>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('playground.chooseFruit')} />
                </SelectTrigger>
                <SelectContent position="item-aligned">
                  {fruits.map(({ value: v, labelKey }) => (
                    <SelectItem key={v} value={v}>
                      {t(labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">
                position="popper", align="start"
              </span>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('playground.chooseFruit')} />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  {fruits.map(({ value: v, labelKey }) => (
                    <SelectItem key={v} value={v}>
                      {t(labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
