/**
 * Shared UI helpers for marketplace transactions — labels, badge tones, and
 * the revenue calculation used by both the product-level transactions table
 * and the per-variant revenue line.
 */
import {
  TransactionStatusEnum,
  TransactionTypeEnum,
  type RequestParams,
  type TransactionDetail,
} from '@/api/studioos-api'

/** Loose translate signature — satisfied by i18next's `TFunction` and by the
 *  narrow `t` already threaded through the variant list. */
type Translate = (key: string, opts?: Record<string, unknown>) => string

export interface TxParty {
  id?: number
  display_name?: string | null
}

const TYPE_LABEL_KEY: Record<TransactionTypeEnum, string> = {
  [TransactionTypeEnum.Rent]: 'marketplace.transactions.type.rent',
  [TransactionTypeEnum.Sell]: 'marketplace.transactions.type.sell',
  [TransactionTypeEnum.Lend]: 'marketplace.transactions.type.lend',
  [TransactionTypeEnum.Donate]: 'marketplace.transactions.type.donate',
}

const STATUS_LABEL_KEY: Record<TransactionStatusEnum, string> = {
  [TransactionStatusEnum.Pending]: 'marketplace.transactions.status.pending',
  [TransactionStatusEnum.Accepted]: 'marketplace.transactions.status.accepted',
  [TransactionStatusEnum.Completed]: 'marketplace.transactions.status.completed',
  [TransactionStatusEnum.Rejected]: 'marketplace.transactions.status.rejected',
  [TransactionStatusEnum.Cancelled]: 'marketplace.transactions.status.cancelled',
  [TransactionStatusEnum.Blocked]: 'marketplace.transactions.status.blocked',
}

export function transactionTypeLabel(
  t: Translate,
  v: TransactionTypeEnum | string
): string {
  const key = TYPE_LABEL_KEY[v as TransactionTypeEnum]
  return key ? t(key) : String(v)
}

export function transactionStatusLabel(
  t: Translate,
  v: TransactionStatusEnum | string | undefined
): string {
  if (!v) return ''
  const key = STATUS_LABEL_KEY[v as TransactionStatusEnum]
  return key ? t(key) : String(v)
}

export function transactionStatusBadgeClass(
  v: TransactionStatusEnum | string | undefined
): string {
  switch (v) {
    case TransactionStatusEnum.Completed:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case TransactionStatusEnum.Accepted:
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
    case TransactionStatusEnum.Pending:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case TransactionStatusEnum.Rejected:
    case TransactionStatusEnum.Cancelled:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case TransactionStatusEnum.Blocked:
      return 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700/40 dark:text-zinc-300'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

/** A transaction counts as realized revenue when it is completed and (for
 *  personal inventory) the current user is the seller/owner. */
export function isOwnerSale(
  tx: TransactionDetail,
  ownerUserId: number | null
): boolean {
  if (tx.status !== TransactionStatusEnum.Completed) return false
  if (ownerUserId == null) return true
  const owner = (tx.owner_display ?? {}) as TxParty
  return owner.id === ownerUserId
}

/** Sum of agreed prices across realized (completed) owner sales. */
export function realizedRevenue(
  transactions: TransactionDetail[],
  ownerUserId: number | null
): number {
  return transactions.reduce((sum, tx) => {
    if (!isOwnerSale(tx, ownerUserId)) return sum
    const n = Number(tx.agreed_price)
    return Number.isNaN(n) ? sum : sum + n
  }, 0)
}

/** The other party from the owner's perspective — the requester (buyer). */
export function counterpartyName(tx: TransactionDetail): string {
  const requester = (tx.requester_display ?? {}) as TxParty
  return requester.display_name || '—'
}

interface TransactionPage {
  data?: { results?: TransactionDetail[]; next?: string | null } | null
}

/** Build pagination query params for the generated client. The typed
 *  `RequestParams` omits `query`, but the request layer forwards it at runtime,
 *  so we attach it through a cast. */
export function txPageQuery(page: number, pageSize: number): RequestParams {
  return { query: { page, page_size: pageSize } } as unknown as RequestParams
}

/** Fetch every page of a paginated transactions endpoint and return the flat
 *  list. These endpoints have no server-side product/variant filter, so the
 *  client pulls them all and filters locally — paging through is required, or
 *  products whose transactions fall on page 2+ would be silently missed. */
export async function fetchAllTransactions(
  fetchPage: (page: number, pageSize: number) => Promise<TransactionPage>,
  pageSize = 100
): Promise<TransactionDetail[]> {
  const all: TransactionDetail[] = []
  // Hard page cap as a runaway guard (pageSize 100 → up to 5000 rows).
  for (let page = 1; page <= 50; page++) {
    let res: TransactionPage
    try {
      res = await fetchPage(page, pageSize)
    } catch {
      break
    }
    const results = res.data?.results ?? []
    all.push(...results)
    if (!res.data?.next || results.length === 0) break
  }
  return all
}

/** Group a flat transaction list by `variant_id`, keeping only those whose
 *  variant is in `variantIds`. Returns a Map keyed by variant id. */
export function groupTransactionsByVariant(
  transactions: TransactionDetail[],
  variantIds: number[]
): Map<number, TransactionDetail[]> {
  const allowed = new Set(variantIds)
  const map = new Map<number, TransactionDetail[]>()
  for (const tx of transactions) {
    if (!allowed.has(tx.variant_id)) continue
    const list = map.get(tx.variant_id)
    if (list) list.push(tx)
    else map.set(tx.variant_id, [tx])
  }
  return map
}
