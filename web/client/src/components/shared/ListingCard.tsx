import { useTranslation } from 'react-i18next'
import {
  Gift,
  HeartHandshake,
  MoreHorizontal,
  Pencil,
  Repeat,
  ShoppingBag,
  Tag,
  Trash2,
} from 'lucide-react'

import type { ListingList } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/app/pages/marketplace/marketplace-helpers'

const TYPE_ICONS = {
  sell: ShoppingBag,
  rent: Repeat,
  lend: HeartHandshake,
  donate: Gift,
} as const

const TYPE_LABEL_KEYS: Record<string, string> = {
  sell: 'marketplace.typeSell',
  rent: 'marketplace.typeRent',
  lend: 'marketplace.typeLend',
  donate: 'marketplace.typeDonate',
}

interface ListingCardProps {
  item: ListingList
  variant?: 'browse' | 'owner'
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function ListingCard({
  item,
  variant = 'browse',
  onOpen,
  onEdit,
  onDelete,
}: ListingCardProps) {
  const { t } = useTranslation()
  const TypeIcon = TYPE_ICONS[item.listing_type] ?? Tag
  const isOwner = variant === 'owner'
  const isFreeListing =
    item.listing_type === 'lend' || item.listing_type === 'donate'

  const priceDisplay = (() => {
    if (item.asking_price && item.asking_price !== '') {
      const n = Number(item.asking_price)
      if (!Number.isNaN(n)) {
        return {
          mode: 'num' as const,
          text: `${t('common.currencySymbol')} ${n.toFixed(2)}`,
        }
      }
      return { mode: 'num' as const, text: item.asking_price }
    }
    return isFreeListing
      ? { mode: 'free' as const, text: t('marketplace.priceFree') }
      : { mode: 'neg' as const, text: t('marketplace.priceNegotiable') }
  })()

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={item.title}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.()
        }
      }}
      className={cn(
        'group flex cursor-pointer flex-col overflow-hidden text-left',
        'rounded-xl border border-border bg-card shadow-sm',
        'outline-none transition-shadow duration-150',
        'hover:shadow-md',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      {/* Image / solid placeholder */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {item.primary_media_url ? (
          <img
            src={item.primary_media_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Tag className="size-7 text-muted-foreground/50" />
          </div>
        )}

        {/* Top-right: status badge (only when not active) + action menu */}
        <div className="absolute right-2.5 top-2.5 z-[2] flex items-center gap-1.5">
          {item.status && item.status !== 'active' && (
            <StatusBadge status={item.status} t={t} />
          )}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8 rounded-full backdrop-blur',
                    'bg-card/85 text-foreground hover:bg-card',
                    'border border-border/40 shadow-sm'
                  )}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={t('marketplace.actions')}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="size-4" />
                    {t('marketplace.edit')}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="size-4" />
                    {t('marketplace.delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Bottom-left: monochrome type pill */}
        <div className="absolute bottom-2.5 left-2.5 z-[2]">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
              'text-[11px] font-semibold tracking-wide',
              'bg-foreground/90 text-background backdrop-blur'
            )}
          >
            <TypeIcon className="size-3" />
            {t(TYPE_LABEL_KEYS[item.listing_type] ?? '', {
              defaultValue: item.listing_type,
            })}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1 p-3">
        <h3 className="line-clamp-1 text-sm font-medium text-foreground">
          {item.title}
        </h3>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              'tabular-nums',
              priceDisplay.mode === 'num' &&
                'text-sm font-semibold text-foreground',
              priceDisplay.mode === 'free' &&
                'text-sm font-medium text-primary',
              priceDisplay.mode === 'neg' &&
                'text-xs font-medium italic text-muted-foreground'
            )}
          >
            {priceDisplay.text}
          </span>
          {item.size_summary && (
            <span className="text-xs text-muted-foreground">
              {t('marketplace.sizeShort')} {item.size_summary}
            </span>
          )}
          {typeof item.available_count === 'number' &&
            item.available_count > 0 && (
              <>
                <span className="text-xs text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">
                  {t('marketplace.availableCount', {
                    count: item.available_count,
                  })}
                </span>
              </>
            )}
        </div>

        {item.product_category && (
          <p className="line-clamp-1 text-xs text-muted-foreground/70">
            {item.product_category}
          </p>
        )}
      </div>
    </div>
  )
}
