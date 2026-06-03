import { cn } from '@/lib/utils'

interface CardSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function CardSection({
  title,
  description,
  children,
  className,
}: CardSectionProps) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card p-6', className)}
    >
      {title && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
