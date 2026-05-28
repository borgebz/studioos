import { useState, useCallback, useRef, useEffect } from 'react'
import { authFetch } from '@/api/api-client'

/** Shape returned by DRF paginated list endpoints. */
export interface PaginatedResponse<T> {
  count: number
  next?: string | null
  previous?: string | null
  results: T[]
}

interface UsePaginatedListOptions<T> {
  /** Initial fetch function — must return the first page. */
  fetchPage: () => Promise<PaginatedResponse<T>>
  /**
   * When any value in this array changes the list is reset and page 1 is
   * refetched.  Treat it like a `useEffect` dependency array.
   */
  resetDeps?: unknown[]
}

export interface UsePaginatedListReturn<T> {
  items: T[]
  count: number
  loading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  refresh: () => void
  /** Replace items in-place (optimistic updates after mutations). */
  setItems: React.Dispatch<React.SetStateAction<T[]>>
}

/**
 * DRF returns fully-qualified `next` URLs (e.g.
 * `http://127.0.0.1:8000/api/coachings/?page=2`) but in dev the frontend
 * proxies `/api/*` through Vite.  Strip the origin so the request goes
 * through the proxy and avoids CORS issues.
 */
function toRelativeUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url // already relative
  }
}

/**
 * Generic hook for DRF-style paginated endpoints.
 *
 * Accumulates pages into a flat `items` array. When the user scrolls to
 * the bottom the consuming component calls `fetchNextPage()` which fetches
 * the `next` URL from the previous response.
 */
export function usePaginatedList<T>({
  fetchPage,
  resetDeps = [],
}: UsePaginatedListOptions<T>): UsePaginatedListReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
  const nextUrlRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleResponse = useCallback(
    (data: PaginatedResponse<T>, append: boolean) => {
      if (!mountedRef.current) return
      setItems((prev) => (append ? [...prev, ...data.results] : data.results))
      setCount(data.count)
      nextUrlRef.current = data.next ?? null
    },
    []
  )

  const inFlightRef = useRef(0)

  const loadFirstPage = useCallback(async () => {
    const requestId = ++inFlightRef.current
    setLoading(true)
    nextUrlRef.current = null
    try {
      const res = await fetchPage()
      // Discard if a newer request started while this one was in flight.
      if (requestId !== inFlightRef.current || !mountedRef.current) return
      if (Array.isArray(res)) {
        setItems(res as T[])
        setCount((res as T[]).length)
        nextUrlRef.current = null
      } else {
        handleResponse(res, false)
      }
    } catch {
      if (requestId !== inFlightRef.current || !mountedRef.current) return
      setItems([])
      setCount(0)
    } finally {
      if (requestId === inFlightRef.current && mountedRef.current) {
        setLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, handleResponse])

  // Load first page on mount + when resetDeps change.
  //
  // React StrictMode double-invokes effects in dev which would fire two
  // network requests on mount. We dedupe by signing each effect run with
  // the current resetDeps and skipping if we've already fired for that
  // exact signature.
  const lastFiredRef = useRef<string | null>(null)
  useEffect(() => {
    const sig = JSON.stringify(resetDeps)
    if (lastFiredRef.current === sig) return
    lastFiredRef.current = sig
    void loadFirstPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps)

  const fetchNextPage = useCallback(async () => {
    const nextUrl = nextUrlRef.current
    if (!nextUrl || isFetchingNextPage) return
    setIsFetchingNextPage(true)
    try {
      const res = await authFetch(toRelativeUrl(nextUrl), {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: PaginatedResponse<T> = await res.json()
      handleResponse(data, true)
    } catch {
      // keep existing data, stop trying
      nextUrlRef.current = null
    } finally {
      if (mountedRef.current) setIsFetchingNextPage(false)
    }
  }, [isFetchingNextPage, handleResponse])

  const hasNextPage = nextUrlRef.current !== null

  return {
    items,
    count,
    loading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refresh: loadFirstPage,
    setItems,
  }
}
