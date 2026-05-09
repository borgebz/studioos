import { Routes, Route } from 'react-router-dom'
import { paths } from '@/app/paths'
import { LoginPage } from '@/app/pages/LoginPage/LoginPage'
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
import { CalendarPage as DSCalendarPage } from '@/app/pages/design-system/CalendarPage'
import { PopoverPage } from '@/app/pages/design-system/PopoverPage'
import { ScrollAreaPage } from '@/app/pages/design-system/ScrollAreaPage'
import { SwitchPage } from '@/app/pages/design-system/SwitchPage'
import { AvatarPage } from '@/app/pages/design-system/AvatarPage'
import { BadgePage } from '@/app/pages/design-system/BadgePage'
import { CheckboxPage } from '@/app/pages/design-system/CheckboxPage'
import { RadioGroupPage } from '@/app/pages/design-system/RadioGroupPage'
import { TextareaPage } from '@/app/pages/design-system/TextareaPage'
import { AlertDialogPage } from '@/app/pages/design-system/AlertDialogPage'
import { DialogPage } from '@/app/pages/design-system/DialogPage'
import { LogoLoaderPage } from '@/app/pages/design-system/LogoLoaderPage'
import { ScheduleCalendarPage } from '@/app/pages/design-system/ScheduleCalendarPage'
import { ToastPage } from '@/app/pages/design-system/ToastPage'
import { HomePage } from '@/app/pages/HomePage'
import { LandingPage } from '@/app/pages/LandingPage'
import { CalendarPage } from '@/app/pages/calendar/CalendarPage'
import { CreateCoachingPage } from '@/app/pages/coachings/CreateCoachingPage'
import { EnrollmentPage } from '@/app/pages/enrollments/EnrollmentPage'
import { CreateListingPage } from '@/app/pages/marketplace/CreateListingPage'
import { InviteUsersPage } from '@/app/pages/invites/InviteUsersPage'
import { OnboardingPage } from '@/app/pages/onboarding/OnboardingPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.landing} element={<LandingPage />} />
      <Route path={paths.login} element={<LoginPage />} />
      <Route path={paths.home} element={<HomePage />} />
      <Route path={paths.calendar} element={<CalendarPage />} />
      <Route path={paths.coachingsCreate} element={<CreateCoachingPage />} />
      <Route path={paths.enrollment} element={<EnrollmentPage />} />
      <Route path={paths.marketplaceCreate} element={<CreateListingPage />} />
      <Route path={paths.invites} element={<InviteUsersPage />} />
      <Route path={paths.onboarding} element={<OnboardingPage />} />
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
      <Route
        path={paths.designSystemCalendar}
        element={
          <DesignSystemLayout>
            <DSCalendarPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemPopover}
        element={
          <DesignSystemLayout>
            <PopoverPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemScrollArea}
        element={
          <DesignSystemLayout>
            <ScrollAreaPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemSwitch}
        element={
          <DesignSystemLayout>
            <SwitchPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemAvatar}
        element={
          <DesignSystemLayout>
            <AvatarPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemBadge}
        element={
          <DesignSystemLayout>
            <BadgePage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemCheckbox}
        element={
          <DesignSystemLayout>
            <CheckboxPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemRadioGroup}
        element={
          <DesignSystemLayout>
            <RadioGroupPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemTextarea}
        element={
          <DesignSystemLayout>
            <TextareaPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemAlertDialog}
        element={
          <DesignSystemLayout>
            <AlertDialogPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemDialog}
        element={
          <DesignSystemLayout>
            <DialogPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemLogoLoader}
        element={
          <DesignSystemLayout>
            <LogoLoaderPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemScheduleCalendar}
        element={
          <DesignSystemLayout>
            <ScheduleCalendarPage />
          </DesignSystemLayout>
        }
      />
      <Route
        path={paths.designSystemToast}
        element={
          <DesignSystemLayout>
            <ToastPage />
          </DesignSystemLayout>
        }
      />
    </Routes>
  )
}
