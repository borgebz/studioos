import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { Modality } from '@/api/studioos-api'
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
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

import { DeleteModalityDialog } from './DeleteModalityDialog'

export function ModalitiesListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()

  const canEdit = can('modality.change_modality')
  const canDelete = can('modality.delete_modality')

  const [items, setItems] = useState<Modality[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 200)
  const [deleteTarget, setDeleteTarget] = useState<Modality | null>(null)

  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      setLoading(true)
      const res = await apiClient.api.modalitiesList().catch((err) => {
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
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  const handleDeleted = useCallback((id: number) => {
    setItems((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const columnHelper = useMemo(() => createColumnHelper<Modality>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: () => t('modalities.col.name'),
        cell: (info) => {
          const m = info.row.original
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
                navigate(paths.modalityEdit.replace(':id', String(m.id)))
              }
            >
              {info.getValue()}
            </button>
          )
        },
      }),
      columnHelper.accessor('description', {
        id: 'description',
        header: () => t('modalities.col.description'),
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
      columnHelper.accessor((row) => row.studios?.length ?? 0, {
        id: 'studios',
        header: () => t('modalities.col.studios'),
        meta: { align: 'right' },
        cell: (info) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.max_capacity ?? null, {
        id: 'capacity',
        header: () => t('modalities.col.capacity'),
        meta: { align: 'right' },
        cell: (info) => {
          const v = info.getValue()
          return v == null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="text-sm text-muted-foreground tabular-nums">
              {v}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        size: 96,
        header: () => (
          <span className="sr-only">{t('modalities.col.actions')}</span>
        ),
        cell: (info) => {
          const m = info.row.original
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
                            paths.modalityEdit.replace(':id', String(m.id))
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
                        onClick={() => setDeleteTarget(m)}
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
      <div className="mx-auto w-full max-w-6xl flex flex-col flex-1 min-h-0">
        <PageHeader title={t('modalities.title')} backTo={paths.home}>
          <Authorized permission="modality.add_modality">
            <Button onClick={() => navigate(paths.modalityCreate)}>
              <Plus className="h-4 w-4" />
              {t('modalities.create')}
            </Button>
          </Authorized>
        </PageHeader>

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('modalities.subtitle')}
        </p>

        <div className="mb-4 shrink-0">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('modalities.searchPlaceholder')}
            className="sm:max-w-xs"
            aria-label={t('modalities.searchPlaceholder')}
          />
        </div>

        <DataTable
          table={table}
          fillHeight
          loading={loading}
          totalCount={filtered.length}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-4">
              <Sparkles className="h-6 w-6 text-muted-foreground/60" />
              <span>{t('modalities.empty')}</span>
            </div>
          }
        />
      </div>

      <DeleteModalityDialog
        modality={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </PageLayout>
  )
}
