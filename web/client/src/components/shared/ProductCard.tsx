import { useTranslation } from 'react-i18next'
import { MoreHorizontal, Package, Pencil, Trash2 } from 'lucide-react'

import type { ProductDetail } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProductStatusBadge } from '@/components/shared/ProductStatusBadge'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  item: ProductDetail
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
  showMenu?: boolean
}

export function ProductCard({
  item,
  onOpen,
  onEdit,
  onDelete,
  showMenu = false,
}: ProductCardProps) {
  const { t } = useTranslation()

  const primaryMedia =
    item.media?.find((m) => m.is_primary) ?? item.media?.[0] ?? null

  const metaBits = [item.brand, item.material].filter(Boolean) as string[]

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={item.name}
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
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {primaryMedia?.image ? (
          <img
            src={primaryMedia.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="size-7 text-muted-foreground/50" />
          </div>
        )}

        <div className="absolute right-2.5 top-2.5 z-[2] flex items-center gap-1.5">
          <ProductStatusBadge status={item.status} hideActive />
          {showMenu && (
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
      </div>

      <div className="flex flex-col gap-1 p-3">
        <h3 className="line-clamp-1 text-sm font-medium text-foreground">
          {item.name}
        </h3>
        {metaBits.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {metaBits.join(' · ')}
          </p>
        )}
        {item.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground/70">
            {item.description}
          </p>
        )}
      </div>
    </div>
  )
}
