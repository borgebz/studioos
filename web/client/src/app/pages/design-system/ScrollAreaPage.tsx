import { useTranslation } from 'react-i18next'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const tags = Array.from({ length: 50 }, (_, i) => `Tag ${i + 1}`)
const items = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`)

export function ScrollAreaPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.scrollArea')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.scrollAreaSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Vertical */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.scrollAreaVertical')}
          </h2>
          <ScrollArea className="h-72 w-48 rounded-md border border-border">
            <div className="p-4">
              <h4 className="mb-4 text-sm font-medium">{t('designSystem.scrollAreaTags')}</h4>
              {tags.map((tag, i) => (
                <div key={tag}>
                  <div className="text-sm">{tag}</div>
                  {i < tags.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Horizontal */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.scrollAreaHorizontal')}
          </h2>
          <ScrollArea className="w-96 whitespace-nowrap rounded-md border border-border">
            <div className="flex w-max space-x-4 p-4">
              {items.map((item) => (
                <div
                  key={item}
                  className="flex h-20 w-32 shrink-0 items-center justify-center rounded-md border border-border bg-card"
                >
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Both directions */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('designSystem.scrollAreaBoth')}
          </h2>
          <ScrollArea className="h-48 w-72 rounded-md border border-border">
            <div className="w-[600px] p-4">
              {Array.from({ length: 30 }, (_, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-2">
                  {t('designSystem.scrollAreaLine', { n: i + 1 })}
                </p>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </section>
    </div>
  )
}
