import { BrowserRouter } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppRoutes } from '@/app/routes'
import './App.css'

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App
