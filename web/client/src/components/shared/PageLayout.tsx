import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function PageLayout({ children, footer, className }: PageLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex-1 overflow-auto p-6', className)}>
        {children}
      </div>
      {footer && (
        <div className="flex items-center justify-between border-t border-border bg-background px-6 py-4">
          {footer}
        </div>
      )}
    </div>
  )
}
