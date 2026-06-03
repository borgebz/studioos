import { useTranslation } from 'react-i18next'
import { RefreshCcw, Loader2 } from 'lucide-react'
import {
  flexRender,
  type ColumnDef,
  type Header,
  type Table as TanstackTable,
} from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { ColumnHeaderFilter } from '@/components/ui/data-table-filters'

// ---------------------------------------------------------------------------
// Selection column helper
// ---------------------------------------------------------------------------

/**
 * Pre-built selection column with header "select-all" and per-row checkboxes.
 * Add as the first entry in your `columns` array.
 *
 * ```ts
 * const columns = [getSelectionColumn<MyRow>(), ...otherColumns]
 * ```
 */
export function getSelectionColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: 'select',
    size: 40,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

const TH_BASE =
  'text-muted-foreground h-10 px-3 align-middle text-xs font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]'

/**
 * Resolve a column's horizontal alignment. Columns can opt into right or
 * centre alignment via `meta.align`. As a small ergonomic default, the
 * built-in actions column (id `actions`) right-aligns automatically — that
 * matches the Saleor pattern of row actions hugging the table's right edge.
 */
function resolveAlign<TData>(
  column: Header<TData, unknown>['column']
): 'left' | 'right' | 'center' {
  const meta = column.columnDef.meta
  if (meta?.align) return meta.align
  if (column.id === 'actions') return 'right'
  return 'left'
}

function alignClass(align: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

/**
 * Renders a header cell's label alongside its filter icon (when
 * `meta.filter` is declared). The filter icon flips side for right-aligned
 * columns so it stays visible against the column edge.
 */
function HeaderCellContent<TData>({
  header,
}: {
  header: Header<TData, unknown>
}) {
  if (header.isPlaceholder) return null
  const content = flexRender(
    header.column.columnDef.header,
    header.getContext()
  )
  const meta = header.column.columnDef.meta
  const align = resolveAlign(header.column)
  if (!meta?.filter) {
    if (align === 'left') return <>{content}</>
    return (
      <div
        className={cn(
          'flex items-center',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center'
        )}
      >
        <span className="min-w-0 truncate">{content}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group/header flex items-center gap-1.5',
        align === 'right' && 'flex-row-reverse justify-end',
        align === 'center' && 'justify-center'
      )}
    >
      <span className="min-w-0 truncate">{content}</span>
      <ColumnHeaderFilter column={header.column} align={align} />
    </div>
  )
}

/** Build a <colgroup> from TanStack column sizes. */
function ColGroup<TData>({ table }: { table: TanstackTable<TData> }) {
  return (
    <colgroup>
      {table.getAllLeafColumns().map((col) => {
        const size = col.getSize()
        return (
          <col
            key={col.id}
            style={size !== 150 ? { width: size } : undefined}
          />
        )
      })}
    </colgroup>
  )
}

const STICKY_TH_CLASS = cn(
  TH_BASE,
  // The header must be fully opaque so scrolled rows don't bleed through —
  // sticky positioning keeps the th painted, but a translucent background
  // would still let the underlying rows show. We use `bg-card` (same as the
  // wrapper) so adjacent header cells visually merge into one continuous bar:
  // a contrasting background (e.g. `bg-muted`) creates faint vertical seams
  // between cells at the antialiased edges, which read as column dividers.
  // Inset shadow (not border) keeps the divider clipped to the cell — a
  // sticky element's border isn't clipped by the scroll container.
  'sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]'
)

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

interface DataTableProps<TData> {
  table: TanstackTable<TData>
  emptyMessage?: React.ReactNode
  loading?: boolean
  loadingRows?: number
  className?: string

  // -- Infinite scroll --
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void

  // -- Footer --
  totalCount?: number
  onRefresh?: () => void

  // -- Layout --
  /** Fill remaining parent height; header pins, body scrolls internally. */
  fillHeight?: boolean

  /** Navigate when a data row is clicked (ignored for skeleton/empty rows). */
  onRowClick?: (row: TData) => void
}

export function DataTable<TData>({
  table,
  emptyMessage,
  loading,
  loadingRows = 6,
  className,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  totalCount,
  onRefresh,
  fillHeight,
  onRowClick,
}: DataTableProps<TData>) {
  const { t } = useTranslation()
  const columnCount = table.getAllLeafColumns().length

  const { sentinelRef, scrollContainerRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: onLoadMore ?? (() => {}),
  })

  const showFooter = totalCount !== undefined || onRefresh

  // -- Skeleton rows (initial load) --
  const skeletonRows = Array.from({ length: loadingRows }).map((_, i) => (
    <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
      {Array.from({ length: columnCount }).map((__, j) => (
        <TableCell key={j}>
          <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  ))

  // -- "Loading more" skeletons (appended while fetching next page) --
  const loadingMoreRows = isFetchingNextPage
    ? Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`more-${i}`} className="hover:bg-transparent">
          {Array.from({ length: columnCount }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))
    : null

  // -- Body rows --
  const bodyContent = loading ? (
    skeletonRows
  ) : table.getRowModel().rows.length === 0 ? (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={columnCount}
        className="h-32 text-center text-sm text-muted-foreground whitespace-normal"
      >
        {emptyMessage}
      </TableCell>
    </TableRow>
  ) : (
    <>
      {table.getRowModel().rows.map((row) => (
        <TableRow
          key={row.id}
          data-state={row.getIsSelected() ? 'selected' : undefined}
          className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
          onClick={
            onRowClick
              ? () => onRowClick(row.original)
              : undefined
          }
        >
          {row.getVisibleCells().map((cell) => {
            const align = resolveAlign(cell.column)
            return (
              <TableCell key={cell.id} className={alignClass(align)}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            )
          })}
        </TableRow>
      ))}
      {loadingMoreRows}
      {onLoadMore && (
        <tr aria-hidden className="h-px border-0">
          <td colSpan={columnCount} className="p-0">
            <div ref={sentinelRef} />
          </td>
        </tr>
      )}
    </>
  )

  // -- Footer markup --
  const footer = showFooter ? (
    <div className="flex shrink-0 items-center justify-between border-t border-border px-3 py-2 bg-muted/20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {totalCount !== undefined && (
          <span>{t('common.resultCount', { count: totalCount })}</span>
        )}
        {isFetchingNextPage && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
      {onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRefresh}
          disabled={loading}
          aria-label={t('common.refresh')}
        >
          <RefreshCcw
            className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
          />
        </Button>
      )}
    </div>
  ) : null

  // -----------------------------------------------------------------------
  // fillHeight → single table with sticky thead in a scroll container.
  // The container scrolls on both axes: vertical for rows, horizontal when
  // the natural column widths exceed the viewport (typical on mobile).
  // -----------------------------------------------------------------------
  if (fillHeight) {
    return (
      <div
        className={cn(
          // `overflow-hidden` clips the inner scroll container's content to
          // the rounded-lg corners — without it the sticky thead and bottom
          // rows paint past the rounding and the table looks square-cornered.
          'flex flex-col flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-card',
          className
        )}
      >
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-auto overscroll-contain"
        >
          <table className="w-full text-sm">
            <ColGroup table={table} />
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const align = resolveAlign(header.column)
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(STICKY_TH_CLASS, alignClass(align))}
                      >
                        <HeaderCellContent header={header} />
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="[&_tr:last-child]:border-0">{bodyContent}</tbody>
          </table>
        </div>

        {footer}
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Default: single-table, no fixed height
  // -----------------------------------------------------------------------
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card',
        className
      )}
    >
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const align = resolveAlign(header.column)
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={alignClass(align)}
                    style={{
                      width:
                        header.getSize() !== 150
                          ? header.getSize()
                          : undefined,
                    }}
                  >
                    <HeaderCellContent header={header} />
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>{bodyContent}</TableBody>
      </Table>
      {footer}
    </div>
  )
}
