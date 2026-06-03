/**
 * CollapsibleSection — a tiny dependency-free disclosure.
 *
 * A button row (title + optional summary on the left, a rotating chevron on the
 * right) toggles a body that is only mounted while open. `onFirstOpen` fires
 * exactly once the first time the section is expanded — handy for lazily
 * fetching data that shouldn't load on page render.
 */
import { useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  onFirstOpen,
  className,
  triggerClassName,
  children,
}: {
  title: ReactNode
  /** Optional muted text shown next to the title (e.g. a count). */
  summary?: ReactNode
  defaultOpen?: boolean
  /** Fires once, the first time the section opens. */
  onFirstOpen?: () => void
  className?: string
  triggerClassName?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const opened = useRef(defaultOpen)

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (next && !opened.current) {
        opened.current = true
        onFirstOpen?.()
      }
      return next
    })
  }

  return (
    <div className={cn('rounded-lg border border-border', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40',
          triggerClassName
        )}
      >
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
        <span>{title}</span>
        {summary != null && (
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {summary}
          </span>
        )}
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  )
}
