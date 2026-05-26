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

const TH_CLASS =
  'text-muted-foreground h-10 px-3 text-left align-middle text-xs font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]'

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
    header.getContext(),
  )
  const meta = header.column.columnDef.meta
  if (!meta?.filter) return <>{content}</>

  const align = meta.align ?? 'left'
  return (
    <div
      className={cn(
        'group/header flex items-center gap-1.5',
        align === 'right' && 'flex-row-reverse justify-end',
        align === 'center' && 'justify-center',
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
  const bodyContent =
    loading ? (
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
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
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
  // fillHeight → split header / scrolling body / footer
  // The header lives OUTSIDE the scroll container so it never bounces.
  // Both tables share `table-layout: fixed` + identical <colgroup> for
  // column alignment.
  // -----------------------------------------------------------------------
  if (fillHeight) {
    return (
      <div
        className={cn(
          'flex flex-col flex-1 min-h-0 rounded-lg border border-border bg-card',
          className,
        )}
      >
        {/* Pinned header */}
        <div className="shrink-0 border-b border-border bg-muted/40">
          <table className="w-full table-fixed text-sm">
            <ColGroup table={table} />
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id} colSpan={header.colSpan} className={TH_CLASS}>
                      <HeaderCellContent header={header} />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
          </table>
        </div>

        {/* Scrolling body */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        >
          <table className="w-full table-fixed text-sm">
            <ColGroup table={table} />
            <tbody className="[&_tr:last-child]:border-0">
              {bodyContent}
            </tbody>
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
        className,
      )}
    >
      <Table>
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  style={{
                    width:
                      header.getSize() !== 150 ? header.getSize() : undefined,
                  }}
                >
                  <HeaderCellContent header={header} />
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {bodyContent}
        </TableBody>
      </Table>
      {footer}
    </div>
  )
}
