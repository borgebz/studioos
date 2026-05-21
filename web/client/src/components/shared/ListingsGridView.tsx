import { useEffect, useRef } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ListingsGridViewProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  getKey: (item: T) => string | number
  loading?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  empty?: React.ReactNode
  /** Minimum card width in px on `md+` (mobile is always 2 cols). */
  minCardWidth?: number
  className?: string
}

function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  )
}

/** Walks up the DOM to find the nearest scrollable ancestor — used as the
 *  IntersectionObserver root so the sentinel fires when the user scrolls
 *  toward the bottom of the page-level scroll container (PageLayout's
 *  overflow-auto inner div), not the visual viewport. */
function getScrollParent(node: HTMLElement | null): Element | null {
  let el: HTMLElement | null = node?.parentElement ?? null
  while (el && el !== document.body) {
    const style = getComputedStyle(el)
    if (
      /(auto|scroll|overlay)/.test(style.overflowY) &&
      el.scrollHeight > el.clientHeight
    ) {
      return el
    }
    el = el.parentElement
  }
  return null
}

export function ListingsGridView<T>({
  items,
  renderItem,
  getKey,
  loading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  empty,
  minCardWidth = 220,
  className,
}: ListingsGridViewProps<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !onLoadMore) return
    const root = getScrollParent(node)
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          onLoadMore()
        }
      },
      { root, rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  const showEmpty = !loading && items.length === 0 && empty != null

  if (showEmpty) return <>{empty}</>

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div
        className="grid grid-cols-2 gap-4 md:gap-6 md:[grid-template-columns:repeat(auto-fill,minmax(var(--card-min,220px),1fr))]"
        style={
          {
            ['--card-min' as string]: `${minCardWidth}px`,
          } as React.CSSProperties
        }
      >
        {loading && items.length === 0
          ? Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={`skeleton-${i}`} />
            ))
          : items.map((item) => (
              <div key={getKey(item)}>{renderItem(item)}</div>
            ))}
        {isFetchingNextPage &&
          Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={`next-skeleton-${i}`} />
          ))}
      </div>

      {hasNextPage && !loading && (
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
      )}
    </div>
  )
}
