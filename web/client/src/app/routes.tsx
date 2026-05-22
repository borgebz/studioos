import { Routes, Route, Outlet } from 'react-router-dom'
import { paths } from '@/app/paths'
import { ProtectedRoute } from '@/auth/permissions'
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
import { CalendarPage } from '@/app/pages/coachings/CalendarPage'
import { CreateCoachingPage } from '@/app/pages/coachings/CreateCoachingPage'
import { EditCoachingPage } from '@/app/pages/coachings/EditCoachingPage'
import { MyCoachingRequestsPage } from '@/app/pages/coachings/MyCoachingRequestsPage'
import { RequestCoachingPage } from '@/app/pages/coachings/RequestCoachingPage'
import { CoachingRequestsPage } from '@/app/pages/coachings/CoachingRequestsPage'
import { EnrollmentPage } from '@/app/pages/enrollments/EnrollmentPage'
import { EnrollmentRequestsPage } from '@/app/pages/enrollments/EnrollmentRequestsPage'
import { EnrollmentReviewPage } from '@/app/pages/enrollments/EnrollmentReviewPage'
import { MarketplaceListPage } from '@/app/pages/marketplace/MarketplaceListPage'
import { CreateListingPage } from '@/app/pages/marketplace/CreateListingPage'
import { EditListingPage } from '@/app/pages/marketplace/EditListingPage'
import { MyListingsPage } from '@/app/pages/marketplace/MyListingsPage'
import { SchoolListingsPage } from '@/app/pages/marketplace/SchoolListingsPage'
import { MyInventoryPage } from '@/app/pages/inventory/MyInventoryPage'
import { SchoolInventoryPage } from '@/app/pages/inventory/SchoolInventoryPage'
import { CreateProductPage } from '@/app/pages/inventory/CreateProductPage'
import { InviteUsersPage } from '@/app/pages/invites/InviteUsersPage'
import { UsersListPage } from '@/app/pages/users/UsersListPage'
import { UserDetailPage } from '@/app/pages/users/UserDetailPage'
import { UserEditPage } from '@/app/pages/users/UserEditPage'
import { BillingEntriesPage } from '@/app/pages/billing/BillingEntriesPage'
import { BillingFinesPage } from '@/app/pages/billing/BillingFinesPage'
import { ActivateAccountPage } from '@/app/pages/activate/ActivateAccountPage'
import { OnboardingPage } from '@/app/pages/onboarding/OnboardingPage'
import { ForgotPasswordPage } from '@/app/pages/password-reset/ForgotPasswordPage'
import { ResetPasswordPage } from '@/app/pages/password-reset/ResetPasswordPage'
import { AccountSettingsPage } from '@/app/pages/account/AccountSettingsPage'
import { MessagesPage } from '@/app/pages/messages/MessagesPage'
import { EventsListPage } from '@/app/pages/events/EventsListPage'
import { EventDetailPage } from '@/app/pages/events/EventDetailPage'
import { EventFormPage } from '@/app/pages/events/EventFormPage'
import { EventPostFormPage } from '@/app/pages/events/EventPostFormPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.landing} element={<LandingPage />} />
      <Route path={paths.login} element={<LoginPage />} />
      <Route path={paths.home} element={<HomePage />} />
      <Route path={paths.calendar} element={<ProtectedRoute permission="coachings.view_coachingclass"><CalendarPage /></ProtectedRoute>} />
      <Route path={paths.coachingsCreate} element={<ProtectedRoute permission="coachings.can_schedule_coaching"><CreateCoachingPage /></ProtectedRoute>} />
      <Route path={paths.coachingsEdit} element={<ProtectedRoute permission="coachings.change_coachingclass"><EditCoachingPage /></ProtectedRoute>} />
      <Route path={paths.coachingsMyRequests} element={<ProtectedRoute permission={['accounts.can_participate_in_coaching', 'accounts.can_teach']}><MyCoachingRequestsPage /></ProtectedRoute>} />
      <Route path={paths.coachingsRequest} element={<ProtectedRoute permission="accounts.can_participate_in_coaching"><RequestCoachingPage /></ProtectedRoute>} />
      <Route path={paths.coachingsRequests} element={<ProtectedRoute permission="coachings.change_coachingclass"><CoachingRequestsPage /></ProtectedRoute>} />
      <Route path={paths.enrollment} element={<ProtectedRoute permission="enrollments.can_review_enrollment"><EnrollmentPage /></ProtectedRoute>} />
      <Route path={paths.enrollmentRequests} element={<ProtectedRoute permission="enrollments.can_review_enrollment"><EnrollmentRequestsPage /></ProtectedRoute>} />
      <Route path={paths.enrollmentReview} element={<ProtectedRoute permission="enrollments.can_review_enrollment"><EnrollmentReviewPage /></ProtectedRoute>} />
      <Route path={paths.marketplace} element={<ProtectedRoute permission="marketplace.view_productlisting"><MarketplaceListPage /></ProtectedRoute>} />
      <Route path={paths.marketplaceCreate} element={<ProtectedRoute permission="marketplace.manage_school_listings"><CreateListingPage /></ProtectedRoute>} />
      <Route path={paths.marketplaceEdit} element={<ProtectedRoute permission="marketplace.manage_school_listings"><EditListingPage /></ProtectedRoute>} />
      <Route path={paths.myListings} element={<ProtectedRoute permission="marketplace.view_own_listings"><MyListingsPage /></ProtectedRoute>} />
      <Route path={paths.myInventory} element={<ProtectedRoute permission="marketplace.view_own_listings"><MyInventoryPage /></ProtectedRoute>} />
      <Route path={paths.myInventoryCreate} element={<ProtectedRoute permission="inventory.add_product"><CreateProductPage context="personal" /></ProtectedRoute>} />
      <Route path={paths.schoolInventory} element={<ProtectedRoute permission="inventory.view_school_product"><SchoolInventoryPage /></ProtectedRoute>} />
      <Route path={paths.schoolInventoryCreate} element={<ProtectedRoute permission="inventory.add_school_product"><CreateProductPage context="school" /></ProtectedRoute>} />
      <Route path={paths.schoolListings} element={<ProtectedRoute permission="marketplace.manage_school_listings"><SchoolListingsPage /></ProtectedRoute>} />
      <Route path={paths.invites} element={<ProtectedRoute permission="accounts.can_invite_user"><InviteUsersPage /></ProtectedRoute>} />
      <Route path={paths.users} element={<ProtectedRoute permission="accounts.can_list_users"><UsersListPage /></ProtectedRoute>} />
      <Route path={paths.userEdit} element={<ProtectedRoute permission="accounts.change_user"><UserEditPage /></ProtectedRoute>} />
      <Route path={paths.userDetail} element={<ProtectedRoute permission="accounts.view_user"><UserDetailPage /></ProtectedRoute>} />
      <Route path={paths.billingEntries} element={<ProtectedRoute permission="billing.view_billingentry"><BillingEntriesPage /></ProtectedRoute>} />
      <Route path={paths.billingFines} element={<ProtectedRoute permission="billing.view_fine"><BillingFinesPage /></ProtectedRoute>} />
      <Route path={paths.activate} element={<ActivateAccountPage />} />
      <Route path={paths.onboarding} element={<OnboardingPage />} />
      <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={paths.resetPassword} element={<ResetPasswordPage />} />
      <Route path={paths.accountSettings} element={<AccountSettingsPage />} />
      <Route path={paths.messages} element={<ProtectedRoute permission="messaging.can_list_conversations"><MessagesPage /></ProtectedRoute>} />
      <Route path={paths.events} element={<ProtectedRoute permission="events.view_event"><EventsListPage /></ProtectedRoute>} />
      <Route path={paths.eventsCreate} element={<ProtectedRoute permission="events.add_event"><EventFormPage mode="create" /></ProtectedRoute>} />
      <Route path={paths.eventsDetail} element={<ProtectedRoute permission="events.view_event"><EventDetailPage /></ProtectedRoute>} />
      <Route path={paths.eventsEdit} element={<ProtectedRoute permission="events.change_event"><EventFormPage mode="edit" /></ProtectedRoute>} />
      <Route path={paths.eventsPostCreate} element={<ProtectedRoute permission="events.add_eventpost"><EventPostFormPage mode="create" /></ProtectedRoute>} />
      <Route path={paths.eventsPostEdit} element={<ProtectedRoute permission="events.change_eventpost"><EventPostFormPage mode="edit" /></ProtectedRoute>} />
      <Route
        element={
          <DesignSystemLayout>
            <Outlet />
          </DesignSystemLayout>
        }
      >
        <Route path={paths.designSystem} element={<DesignSystemIndexPage />} />
        <Route path={paths.designSystemButtons} element={<ButtonsPage />} />
        <Route path={paths.designSystemInput} element={<InputPage />} />
        <Route path={paths.designSystemSelect} element={<SelectPage />} />
        <Route path={paths.designSystemDropdown} element={<DropdownPage />} />
        <Route path={paths.designSystemSkeleton} element={<SkeletonPage />} />
        <Route path={paths.designSystemTooltip} element={<TooltipPage />} />
        <Route path={paths.designSystemSheet} element={<SheetPage />} />
        <Route path={paths.designSystemSeparator} element={<SeparatorPage />} />
        <Route path={paths.designSystemPlayground} element={<PlaygroundPage />} />
        <Route path={paths.designSystemCalendar} element={<DSCalendarPage />} />
        <Route path={paths.designSystemPopover} element={<PopoverPage />} />
        <Route path={paths.designSystemScrollArea} element={<ScrollAreaPage />} />
        <Route path={paths.designSystemSwitch} element={<SwitchPage />} />
        <Route path={paths.designSystemAvatar} element={<AvatarPage />} />
        <Route path={paths.designSystemBadge} element={<BadgePage />} />
        <Route path={paths.designSystemCheckbox} element={<CheckboxPage />} />
        <Route path={paths.designSystemRadioGroup} element={<RadioGroupPage />} />
        <Route path={paths.designSystemTextarea} element={<TextareaPage />} />
        <Route path={paths.designSystemAlertDialog} element={<AlertDialogPage />} />
        <Route path={paths.designSystemDialog} element={<DialogPage />} />
        <Route path={paths.designSystemLogoLoader} element={<LogoLoaderPage />} />
        <Route path={paths.designSystemScheduleCalendar} element={<ScheduleCalendarPage />} />
        <Route path={paths.designSystemToast} element={<ToastPage />} />
      </Route>
    </Routes>
  )
}
