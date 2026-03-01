import { Routes, Route } from 'react-router-dom'
import { paths } from '@/app/paths'
import { DesignSystemLayout } from '@/app/pages/design-system/DesignSystemLayout'
import { DesignSystemIndexPage } from '@/app/pages/design-system/DesignSystemIndexPage'
import { ButtonsPage } from '@/app/pages/design-system/ButtonsPage'
import { InputPage } from '@/app/pages/design-system/InputPage'
import { SelectPage } from '@/app/pages/design-system/SelectPage'
import { DropdownPage } from '@/app/pages/design-system/DropdownPage'
import { SkeletonPage } from '@/app/pages/design-system/SkeletonPage'
import { TooltipPage } from '@/app/pages/design-system/TooltipPage'
import { SheetPage } from '@/app/pages/design-system/SheetPage'
import { SeparatorPage } from '@/app/pages/design-system/SeparatorPage'
import { PlaygroundPage } from '@/app/pages/design-system/PlaygroundPage'
import { HomePage } from '@/app/pages/HomePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.home} element={<HomePage />} />
      <Route
        path={paths.designSystem}
        element={
          <DesignSystemLayout>
            <DesignSystemIndexPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemButtons}
        element={
          <DesignSystemLayout>
            <ButtonsPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemInput}
        element={
          <DesignSystemLayout>
            <InputPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemSelect}
        element={
          <DesignSystemLayout>
            <SelectPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemDropdown}
        element={
          <DesignSystemLayout>
            <DropdownPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemSkeleton}
        element={
          <DesignSystemLayout>
            <SkeletonPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemTooltip}
        element={
          <DesignSystemLayout>
            <TooltipPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemSheet}
        element={
          <DesignSystemLayout>
            <SheetPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemSeparator}
        element={
          <DesignSystemLayout>
            <SeparatorPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemPlayground}
        element={
          <DesignSystemLayout>
            <PlaygroundPage />
          </DesignSystemLayout>
        }
      />
    </Routes>
  )
}
