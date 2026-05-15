import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  /** When true the content area does not scroll — children fill the
   *  remaining height and manage their own overflow (e.g. DataTable). */
  fullHeight?: boolean
}

export function PageLayout({
  children,
  footer,
  className,
  fullHeight,
}: PageLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex-1 p-6',
          fullHeight
            ? 'overflow-hidden flex flex-col min-h-0'
            : 'overflow-auto',
          className,
        )}
      >
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
