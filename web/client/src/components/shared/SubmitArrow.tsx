import { cn } from '@/lib/utils'

export function SubmitArrow({ className }: { className?: string }) {
  return (
    <svg
      className={cn('ml-2 h-3 w-6', className)}
      viewBox="0 0 24 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 6 H22 M16 1 L22 6 L16 11"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
