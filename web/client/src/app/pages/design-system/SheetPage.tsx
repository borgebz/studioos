import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const sides = ['top', 'right', 'bottom', 'left'] as const

export function SheetPage() {
  const { t } = useTranslation()
  const [openTop, setOpenTop] = useState(false)
  const [openRight, setOpenRight] = useState(false)
  const [openBottom, setOpenBottom] = useState(false)
  const [openLeft, setOpenLeft] = useState(false)
  const [openNoClose, setOpenNoClose] = useState(false)

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">
          {t('designSystem.sheet')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('designSystem.sheetSubtitle')}
        </p>
      </header>

      <section className="space-y-8">
        {/* Side variations */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t('designSystem.sheetSides')}
          </h2>
          <div className="flex flex-wrap gap-4">
            {sides.map((side) => {
              const setter =
                side === 'top'
                  ? setOpenTop
                  : side === 'right'
                    ? setOpenRight
                    : side === 'bottom'
                      ? setOpenBottom
                      : setOpenLeft
              return (
                <Sheet
                  key={side}
                  open={
                    side === 'top'
                      ? openTop
                      : side === 'right'
                        ? openRight
                        : side === 'bottom'
                          ? openBottom
                          : openLeft
                  }
                  onOpenChange={setter}
                >
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      {t('designSystem.sheetOpen', { side })}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side={side}>
                    <SheetHeader>
                      <SheetTitle>{t('designSystem.sheetTitle')}</SheetTitle>
                      <SheetDescription>
                        {t('designSystem.sheetDescription')}
                      </SheetDescription>
                    </SheetHeader>
                    <p className="py-4 text-sm text-muted-foreground">
                      {t('designSystem.sheetBody')}
                    </p>
                    <SheetFooter>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setter(false)}
                      >
                        {t('designSystem.close')}
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              )
            })}
          </div>
        </div>

        {/* Without close button */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            showCloseButton=false
          </h2>
          <Sheet open={openNoClose} onOpenChange={setOpenNoClose}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                {t('designSystem.sheetNoClose')}
              </Button>
            </SheetTrigger>
            <SheetContent showCloseButton={false}>
              <SheetHeader>
                <SheetTitle>{t('designSystem.sheetTitle')}</SheetTitle>
                <SheetDescription>
                  {t('designSystem.sheetNoCloseDesc')}
                </SheetDescription>
              </SheetHeader>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setOpenNoClose(false)}
              >
                {t('designSystem.close')}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </section>
    </div>
  )
}
