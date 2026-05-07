import { BrowserRouter, useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppRoutes } from '@/app/routes'
import { paths } from '@/app/paths'
import './App.css'

function AppShell() {
  const location = useLocation()
  const isAuthPage = location.pathname === paths.login

  if (isAuthPage) {
    return <AppRoutes />
  }

  return (
    <SidebarProvider className="flex flex-col">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <AppSidebar />
        <SidebarInset>
          <div className="flex-1 overflow-auto p-6">
            <AppRoutes />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
