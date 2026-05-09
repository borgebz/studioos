import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Settings, Info } from 'lucide-react'

export function PopoverPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.popover')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.popoverSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Basic */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.popoverBasic')}
          </h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">{t('designSystem.popoverOpen')}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">{t('designSystem.popoverTitle')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('designSystem.popoverBody')}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* With form */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.popoverWithForm')}
          </h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">{t('designSystem.popoverSettings')}</h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('designSystem.popoverWidth')}</label>
                  <Input defaultValue="100%" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('designSystem.popoverHeight')}</label>
                  <Input defaultValue="auto" />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Placement */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.popoverPlacement')}
          </h2>
          <div className="flex flex-wrap gap-4">
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <Popover key={side}>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Info className="size-4 mr-2" />
                    {side}
                  </Button>
                </PopoverTrigger>
                <PopoverContent side={side} className="w-48">
                  <p className="text-sm text-muted-foreground">
                    {t('designSystem.popoverOnSide', { side })}
                  </p>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
