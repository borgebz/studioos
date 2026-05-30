import { Badge } from '@/components/ui/badge'
import { OwnerTypeEnum } from '@/api/studioos-api'
import { paths } from '@/app/paths'

export function listingDetailPath(listingId: number): string {
  return paths.marketplaceDetail.replace(':id', String(listingId))
}

export function listingEditPath(listingId: number): string {
  return paths.marketplaceEdit.replace(':id', String(listingId))
}

export function productManagePath(
  productId: number,
  ownerType?: OwnerTypeEnum | string | null
): string {
  if (ownerType === OwnerTypeEnum.School || ownerType === 'school') {
    return paths.schoolInventoryDetail.replace(':id', String(productId))
  }
  return paths.myInventoryDetail.replace(':id', String(productId))
}

export function StatusBadge({
  status,
  t,
}: {
  status: string | undefined
  t: (k: string) => string
}) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          {t('marketplace.statusActive')}
        </Badge>
      )
    case 'closed':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          {t('marketplace.statusSold')}
        </Badge>
      )
    default:
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          {t('marketplace.statusDraft')}
        </Badge>
      )
  }
}

export function listingTypeLabel(type: string, t: (k: string) => string) {
  const map: Record<string, string> = {
    sell: t('marketplace.typeSell'),
    rent: t('marketplace.typeRent'),
    lend: t('marketplace.typeLend'),
    donate: t('marketplace.typeDonate'),
  }
  return map[type] || type
}
