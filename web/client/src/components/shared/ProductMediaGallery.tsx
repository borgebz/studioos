import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface ProductMediaItem {
  id: number
  image: string
  is_primary?: boolean
  sort_order?: number
}

export function sortProductMedia(
  media: ProductMediaItem[] | null | undefined
): ProductMediaItem[] {
  if (!media?.length) return []
  return [...media].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
}

interface ProductMediaFrameProps {
  src?: string | null
  alt: string
  className?: string
  placeholder?: ReactNode
}

/** Letterboxed product photo — object-contain on black, no cropping. */
export function ProductMediaFrame({
  src,
  alt,
  className,
  placeholder,
}: ProductMediaFrameProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center overflow-hidden bg-black',
        className
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      ) : (
        placeholder ?? (
          <ImageIcon className="size-10 text-muted-foreground/30" />
        )
      )}
    </div>
  )
}

interface ProductMediaGalleryProps {
  media: ProductMediaItem[] | null | undefined
  alt: string
  className?: string
  /** Overlay on the hero image (e.g. listing type badge). */
  heroOverlay?: ReactNode
}

export function ProductMediaGallery({
  media,
  alt,
  className,
  heroOverlay,
}: ProductMediaGalleryProps) {
  const { t } = useTranslation()
  const sortedMedia = useMemo(() => sortProductMedia(media), [media])
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    setActiveIdx(0)
  }, [sortedMedia])

  const activeMedia = sortedMedia[activeIdx]

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card',
        className
      )}
    >
      <div className="relative aspect-[4/3]">
        <ProductMediaFrame src={activeMedia?.image} alt={alt} />

        {sortedMedia.length > 1 && (
          <>
            <GalleryNav
              side="left"
              label={t('marketplace.gallery.previous', {
                defaultValue: 'Previous photo',
              })}
              onClick={() =>
                setActiveIdx(
                  (i) => (i - 1 + sortedMedia.length) % sortedMedia.length
                )
              }
            />
            <GalleryNav
              side="right"
              label={t('marketplace.gallery.next', {
                defaultValue: 'Next photo',
              })}
              onClick={() =>
                setActiveIdx((i) => (i + 1) % sortedMedia.length)
              }
            />
          </>
        )}

        {heroOverlay}
      </div>

      {sortedMedia.length > 1 && (
        <div className="flex gap-2 overflow-x-auto overflow-y-hidden bg-background p-3">
          {sortedMedia.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-md border transition-colors',
                i === activeIdx
                  ? 'border-primary'
                  : 'border-border hover:border-primary/40'
              )}
              aria-label={t('marketplace.gallery.photoN', {
                n: i + 1,
                defaultValue: `Photo ${i + 1}`,
              })}
              aria-current={i === activeIdx ? 'true' : undefined}
            >
              <ProductMediaFrame src={m.image} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function GalleryNav({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right'
  label: string
  onClick: () => void
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background',
        side === 'left' ? 'left-3' : 'right-3'
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}
