import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Authorized } from '@/auth/permissions'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { PAGE_CONTENT } from '@/lib/layout'
import { cn } from '@/lib/utils'
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

/**
 * Per-tab metadata for the shared "Create" affordance in the page header.
 * Lifting this up keeps the tabs row compact (no extra row for a single
 * button) and ensures consistent labeling/permissions per tab.
 */
const CREATE_META: Record<
  TabKey,
  { permission: string; labelKey: string; shortLabelKey: string }
> = {
  categories: {
    permission: 'inventory.add_category',
    labelKey: 'inventorySettings.categories.create',
    shortLabelKey: 'inventorySettings.createShort',
  },
  colors: {
    permission: 'inventory.add_color',
    labelKey: 'inventorySettings.colors.create',
    shortLabelKey: 'inventorySettings.createShort',
  },
  sizes: {
    permission: 'inventory.add_size',
    labelKey: 'inventorySettings.sizes.create',
    shortLabelKey: 'inventorySettings.createShort',
  },
  'size-systems': {
    permission: 'inventory.add_sizesystem',
    labelKey: 'inventorySettings.sizeSystems.create',
    shortLabelKey: 'inventorySettings.createShort',
  },
}

export function InventorySettingsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useSearchParams()
  const current: TabKey = isTabKey(search.get('tab'))
    ? (search.get('tab') as TabKey)
    : 'categories'

  const [createOpen, setCreateOpen] = useState(false)

  // Switching tabs cancels any in-flight create dialog from a sibling tab.
  useEffect(() => {
    setCreateOpen(false)
  }, [current])

  const handleChange = (value: string) => {
    if (isTabKey(value)) {
      const next = new URLSearchParams(search)
      next.set('tab', value)
      setSearch(next, { replace: true })
    }
  }

  const meta = CREATE_META[current]

  return (
    <PageLayout fullHeight>
      <div className={cn(PAGE_CONTENT, 'flex flex-col flex-1 min-h-0')}>
        <PageHeader title={t('inventorySettings.title')} backTo={paths.home}>
          <Authorized permission={meta.permission}>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              {/* Long label fits on md+ screens; short "Create" reads fine on mobile */}
              <span className="hidden sm:inline">{t(meta.labelKey)}</span>
              <span className="sm:hidden">{t(meta.shortLabelKey)}</span>
            </Button>
          </Authorized>
        </PageHeader>

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
            <CategoriesTab
              createOpen={current === 'categories' && createOpen}
              onCloseCreate={() => setCreateOpen(false)}
            />
          </TabsContent>
          <TabsContent
            value="colors"
            className="flex flex-col flex-1 min-h-0 m-0"
          >
            <ColorsTab
              createOpen={current === 'colors' && createOpen}
              onCloseCreate={() => setCreateOpen(false)}
            />
          </TabsContent>
          <TabsContent
            value="sizes"
            className="flex flex-col flex-1 min-h-0 m-0"
          >
            <SizesTab
              createOpen={current === 'sizes' && createOpen}
              onCloseCreate={() => setCreateOpen(false)}
            />
          </TabsContent>
          <TabsContent
            value="size-systems"
            className="flex flex-col flex-1 min-h-0 m-0"
          >
            <SizeSystemsTab
              createOpen={current === 'size-systems' && createOpen}
              onCloseCreate={() => setCreateOpen(false)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}
