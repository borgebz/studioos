import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { paths } from '@/app/paths'

import { CategoriesTab } from './CategoriesTab'
import { ColorsTab } from './ColorsTab'
import { SizesTab } from './SizesTab'
import { SizeSystemsTab } from './SizeSystemsTab'

type TabKey = 'categories' | 'colors' | 'sizes' | 'size-systems'
const TAB_KEYS: TabKey[] = ['categories', 'colors', 'sizes', 'size-systems']

function isTabKey(v: string | null): v is TabKey {
  return TAB_KEYS.includes(v as TabKey)
}

export function InventorySettingsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useSearchParams()
  const current: TabKey = isTabKey(search.get('tab'))
    ? (search.get('tab') as TabKey)
    : 'categories'

  const handleChange = (value: string) => {
    if (isTabKey(value)) {
      const next = new URLSearchParams(search)
      next.set('tab', value)
      setSearch(next, { replace: true })
    }
  }

  return (
    <PageLayout fullHeight>
      <div className="mx-auto w-full max-w-6xl flex flex-col flex-1 min-h-0">
        <PageHeader title={t('inventorySettings.title')} backTo={paths.home} />

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('inventorySettings.subtitle')}
        </p>

        <Tabs
          value={current}
          onValueChange={handleChange}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="self-start mb-4 shrink-0">
            <TabsTrigger value="categories">
              {t('inventorySettings.tab.categories')}
            </TabsTrigger>
            <TabsTrigger value="colors">
              {t('inventorySettings.tab.colors')}
            </TabsTrigger>
            <TabsTrigger value="sizes">
              {t('inventorySettings.tab.sizes')}
            </TabsTrigger>
            <TabsTrigger value="size-systems">
              {t('inventorySettings.tab.sizeSystems')}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="categories"
            className="flex flex-col flex-1 min-h-0 m-0"
          >
            <CategoriesTab />
          </TabsContent>
          <TabsContent
            value="colors"
            className="flex flex-col flex-1 min-h-0 m-0"
          >
            <ColorsTab />
          </TabsContent>
          <TabsContent
            value="sizes"
            className="flex flex-col flex-1 min-h-0 m-0"
          >
            <SizesTab />
          </TabsContent>
          <TabsContent
            value="size-systems"
            className="flex flex-col flex-1 min-h-0 m-0"
          >
            <SizeSystemsTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}
