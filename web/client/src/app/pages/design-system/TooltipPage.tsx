import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const sides = ['top', 'right', 'bottom', 'left'] as const

export function TooltipPage() {
  const { t } = useTranslation()

  return (
    <TooltipProvider>
      <div className="space-y-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground">
            {t('designSystem.tooltip')}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t('designSystem.tooltipSubtitle')}
          </p>
        </header>

        <section className="space-y-8">
          {/* Side variations */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t('designSystem.tooltipSides')}
            </h2>
            <div className="flex flex-wrap gap-8 items-center justify-center min-h-[200px]">
              {sides.map((side) => (
                <Tooltip key={side}>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      {side}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side={side as 'top' | 'right' | 'bottom' | 'left'}
                  >
                    {t('designSystem.tooltipContent', { side })}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* With delay */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t('designSystem.tooltipDefault')}
            </h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>{t('designSystem.tooltipHover')}</TooltipContent>
            </Tooltip>
          </div>
        </section>
      </div>
    </TooltipProvider>
  )
}
