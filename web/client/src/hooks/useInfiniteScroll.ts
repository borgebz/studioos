import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  /** Whether more pages exist */
  hasNextPage: boolean
  /** Whether a page is currently loading */
  isFetchingNextPage: boolean
  /** Callback to load the next page */
  fetchNextPage: () => void
  /** IntersectionObserver rootMargin (default: "200px") */
  rootMargin?: string
}

/**
 * Attaches an IntersectionObserver to a sentinel element inside a scroll
 * container. When the sentinel becomes visible, `fetchNextPage` fires.
 *
 * Usage:
 * ```tsx
 * const { sentinelRef, scrollContainerRef } = useInfiniteScroll({ ... })
 * <div ref={scrollContainerRef} className="overflow-auto">
 *   {rows}
 *   <div ref={sentinelRef} />
 * </div>
 * ```
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '200px',
}: UseInfiniteScrollOptions) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sentinelNodeRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Stable refs so the observer callback always reads fresh values
  const fetchRef = useRef(fetchNextPage)
  fetchRef.current = fetchNextPage

  const hasNextRef = useRef(hasNextPage)
  hasNextRef.current = hasNextPage

  const isFetchingRef = useRef(isFetchingNextPage)
  isFetchingRef.current = isFetchingNextPage

  // Set up / tear down observer whenever root element changes
  useEffect(() => {
    const root = scrollContainerRef.current
    if (!root) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasNextRef.current &&
          !isFetchingRef.current
        ) {
          fetchRef.current()
        }
      },
      { root, rootMargin }
    )

    if (sentinelNodeRef.current) {
      observerRef.current.observe(sentinelNodeRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [rootMargin])

  // After a fetch completes, re-observe the sentinel so the observer
  // re-evaluates. Without this, if the sentinel is still in view after
  // new rows are appended, the observer won't fire again (it only
  // triggers on enter/leave transitions).
  useEffect(() => {
    if (isFetchingNextPage) return
    const node = sentinelNodeRef.current
    const observer = observerRef.current
    if (!node || !observer) return

    observer.unobserve(node)
    observer.observe(node)
  }, [isFetchingNextPage])

  // Callback ref so sentinel can be attached / re-attached declaratively
  const sentinelRef = useCallback((node: HTMLElement | null) => {
    if (sentinelNodeRef.current && observerRef.current) {
      observerRef.current.unobserve(sentinelNodeRef.current)
    }
    sentinelNodeRef.current = node
    if (node && observerRef.current) {
      observerRef.current.observe(node)
    }
  }, [])

  return { sentinelRef, scrollContainerRef } as const
}
