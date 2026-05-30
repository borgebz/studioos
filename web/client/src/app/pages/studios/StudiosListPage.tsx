import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { Studio } from '@/api/studioos-api'
import { Authorized, usePermissions } from '@/auth/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { PAGE_CONTENT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

import { DeleteStudioDialog } from './DeleteStudioDialog'

export function StudiosListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()

  const canEdit = can('studios.change_studio')
  const canDelete = can('studios.delete_studio')

  const [items, setItems] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 200)
  const [deleteTarget, setDeleteTarget] = useState<Studio | null>(null)

  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      setLoading(true)
      const res = await apiClient.api.studiosList().catch((err) => {
        toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
        return null
      })
      const arr = Array.isArray(res?.data) ? res!.data : []
      setItems(arr)
      setLoading(false)
    }
    void load()
  }, [t])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  const handleDeleted = useCallback((id: number) => {
    setItems((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const columnHelper = useMemo(() => createColumnHelper<Studio>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: () => t('studios.col.name'),
        cell: (info) => {
          const s = info.row.original
          if (!canEdit) {
            return (
              <span className="font-medium text-foreground">
                {info.getValue()}
              </span>
            )
          }
          return (
            <button
              type="button"
              className="text-left font-medium text-foreground hover:text-primary"
              onClick={() =>
                navigate(paths.studioEdit.replace(':id', String(s.id)))
              }
            >
              {info.getValue()}
            </button>
          )
        },
      }),
      columnHelper.accessor('max_capacity', {
        id: 'capacity',
        header: () => t('studios.col.capacity'),
        meta: { align: 'right' },
        cell: (info) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.modalities?.length ?? 0, {
        id: 'modalities',
        header: () => t('studios.col.modalities'),
        meta: { align: 'right' },
        cell: (info) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('description', {
        id: 'description',
        header: () => t('studios.col.description'),
        cell: (info) => {
          const v = (info.getValue() ?? '').trim()
          if (!v) return <span className="text-muted-foreground">—</span>
          return (
            <span className="text-sm text-muted-foreground line-clamp-1">
              {v}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        size: 96,
        header: () => (
          <span className="sr-only">{t('studios.col.actions')}</span>
        ),
        cell: (info) => {
          const s = info.row.original
          return (
            <TooltipProvider delayDuration={200}>
              <div className="flex justify-end gap-1">
                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('common.edit')}
                        onClick={() =>
                          navigate(
                            paths.studioEdit.replace(':id', String(s.id))
                          )
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('common.edit')}</TooltipContent>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t('common.delete')}
                        onClick={() => setDeleteTarget(s)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('common.delete')}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )
        },
      }),
    ],
    [columnHelper, t, canEdit, canDelete, navigate]
  )

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <PageLayout fullHeight>
      <div className={cn(PAGE_CONTENT, 'flex flex-col flex-1 min-h-0')}>
        <PageHeader title={t('studios.title')} backTo={paths.home}>
          <Authorized permission="studios.add_studio">
            <Button onClick={() => navigate(paths.studioCreate)}>
              <Plus className="h-4 w-4" />
              {t('studios.create')}
            </Button>
          </Authorized>
        </PageHeader>

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('studios.subtitle')}
        </p>

        <div className="mb-4 shrink-0">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('studios.searchPlaceholder')}
            className="sm:max-w-xs"
            aria-label={t('studios.searchPlaceholder')}
          />
        </div>

        <DataTable
          table={table}
          fillHeight
          loading={loading}
          totalCount={filtered.length}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-4">
              <Building2 className="h-6 w-6 text-muted-foreground/60" />
              <span>{t('studios.empty')}</span>
            </div>
          }
        />
      </div>

      <DeleteStudioDialog
        studio={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </PageLayout>
  )
}
