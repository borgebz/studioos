import { BrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppRoutes } from '@/app/routes'
import { paths } from '@/app/paths'
import { useAuth } from '@/auth/useAuth'
import { LogoLoader } from '@/components/shared/LogoLoader'
import { ProfileSetupPrompt } from '@/components/shared/ProfileSetupPrompt'
import { Toaster } from '@/components/ui/sonner'
import './App.css'

function AppShell() {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()
  const isAuthPage = location.pathname === paths.login
  const isLandingPage = location.pathname === paths.landing
  const isPublicPage = location.pathname === paths.enrollment || location.pathname.startsWith('/onboarding/')
  const isDesignSystem = location.pathname.startsWith(paths.designSystem)

  if (isAuthPage || isLandingPage || isPublicPage) {
    return <AppRoutes />
  }

  if (isLoading && !isDesignSystem) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <LogoLoader />
      </div>
    )
  }

  if (!isAuthenticated && !isDesignSystem) {
    return <Navigate to={paths.login} replace />
  }

  return (
    <SidebarProvider className="!h-svh !min-h-0 overflow-hidden">
      <AppSidebar />
      <SidebarInset className="grain overflow-hidden">
        <AppRoutes />
      </SidebarInset>
      <ProfileSetupPrompt />
    </SidebarProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
      <Toaster position="top-right" />
    </BrowserRouter>
  )
}

export default App
