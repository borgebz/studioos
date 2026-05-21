import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

interface ProductStatusBadgeProps {
  status: string | undefined
  /** Hide the "active" pill — useful in card grids where every visible item is active. */
  hideActive?: boolean
}

export function ProductStatusBadge({
  status,
  hideActive,
}: ProductStatusBadgeProps) {
  const { t } = useTranslation()
  switch (status) {
    case 'active':
      if (hideActive) return null
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          {t('schoolInventory.statusActive')}
        </Badge>
      )
    case 'inactive':
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          {t('schoolInventory.statusInactive')}
        </Badge>
      )
    case 'archived':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          {t('schoolInventory.statusArchived')}
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
