/**
 * ProductTransactionsSection — owner-only history + revenue for a product.
 *
 * Renders the full transaction history across all of the product's variants in
 * one table (with a Variant column), plus a realized-revenue summary. A
 * transaction belongs to a single variant; product revenue is the sum across
 * them. Shown on both the inventory item page and the marketplace listing page
 * when the current user can manage the product.
 */
import { useMemo } from 'react'
import { format } from 'date-fns'
import { Receipt } from 'lucide-react'

import {
  TransactionStatusEnum,
  type TransactionDetail,
} from '@/api/studioos-api'
import { CardSection } from '@/components/shared/CardSection'
import { Badge } from '@/components/ui/badge'
import { formatMarketplacePrice } from '@/components/shared/CurrencyAmountInput'
import {
  counterpartyName,
  realizedRevenue,
  transactionStatusBadgeClass,
  transactionStatusLabel,
  transactionTypeLabel,
} from '@/components/shared/transaction-helpers'
import { cn } from '@/lib/utils'

type Translate = (key: string, opts?: Record<string, unknown>) => string

export function ProductTransactionsSection({
  transactions,
  currency,
  ownerUserId,
  t,
}: {
  transactions: TransactionDetail[]
  currency: string
  ownerUserId: number | null
  t: Translate
}) {
  const revenue = useMemo(
    () => realizedRevenue(transactions, ownerUserId),
    [transactions, ownerUserId]
  )
  const counts = useMemo(() => {
    let completed = 0
    let pending = 0
    for (const tx of transactions) {
      if (tx.status === TransactionStatusEnum.Completed) completed++
      else if (
        tx.status === TransactionStatusEnum.Pending ||
        tx.status === TransactionStatusEnum.Accepted
      )
        pending++
    }
    return { completed, pending }
  }, [transactions])

  const sorted = useMemo(
    () =>
      [...transactions].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [transactions]
  )

  return (
    <CardSection
      title={t('marketplace.transactions.title')}
      description={t('marketplace.transactions.description')}
    >
      {/* Revenue summary */}
      <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {t('marketplace.transactions.revenue')}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {formatMarketplacePrice(revenue, currency)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('marketplace.transactions.countsSummary', {
            completed: counts.completed,
            pending: counts.pending,
          })}
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Receipt className="mb-3 size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {t('marketplace.transactions.empty')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="py-2 pr-4 font-medium">
                  {t('marketplace.transactions.colVariant')}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {t('marketplace.transactions.colType')}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {t('marketplace.transactions.colStatus')}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {t('marketplace.transactions.colCounterparty')}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {t('marketplace.transactions.colDate')}
                </th>
                <th className="py-2 text-right font-medium">
                  {t('marketplace.transactions.colPrice')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="py-2.5 pr-4">
                    <span className="font-mono text-xs text-muted-foreground">
                      {tx.variant_sku || `#${tx.variant_id}`}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    {transactionTypeLabel(t, tx.transaction_type)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <Badge
                      className={cn(
                        'border-0 text-[10px] font-medium',
                        transactionStatusBadgeClass(tx.status)
                      )}
                    >
                      {transactionStatusLabel(t, tx.status)}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    {counterpartyName(tx)}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                    {format(new Date(tx.created_at), 'PP')}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatMarketplacePrice(tx.agreed_price, currency) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardSection>
  )
}
