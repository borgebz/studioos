import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { Classe, ClasseList } from '@/api/studioos-api'
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

import { DeleteClassDialog } from './DeleteClassDialog'

export function ClassesListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()

  const canManage = can('classes.can_manage_classes')

  const [items, setItems] = useState<ClasseList[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 200)
  const [deleteTarget, setDeleteTarget] = useState<Classe | null>(null)

  const dataLoaded = useRef(false)
  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    const load = async () => {
      setLoading(true)
      const res = await apiClient.api.classesList().catch((err) => {
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
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  const handleDeleted = useCallback((id: number) => {
    setItems((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const columnHelper = useMemo(() => createColumnHelper<ClasseList>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: () => t('classes.col.name'),
        cell: (info) => {
          const c = info.row.original
          if (!canManage) {
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
                navigate(paths.classEdit.replace(':id', String(c.id)))
              }
            >
              {info.getValue()}
            </button>
          )
        },
      }),
      columnHelper.accessor('description', {
        id: 'description',
        header: () => t('classes.col.description'),
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
      columnHelper.accessor((row) => row.members?.length ?? 0, {
        id: 'members',
        header: () => t('classes.col.members'),
        meta: { align: 'right' },
        cell: (info) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        size: 96,
        header: () => (
          <span className="sr-only">{t('classes.col.actions')}</span>
        ),
        cell: (info) => {
          const c = info.row.original
          if (!canManage) return null
          return (
            <TooltipProvider delayDuration={200}>
              <div className="flex justify-end gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.edit')}
                      onClick={() =>
                        navigate(paths.classEdit.replace(':id', String(c.id)))
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('common.edit')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t('common.delete')}
                      onClick={() =>
                        setDeleteTarget({
                          id: c.id,
                          name: c.name,
                          description: c.description,
                          created_at: c.created_at,
                          updated_at: c.updated_at,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('common.delete')}</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )
        },
      }),
    ],
    [columnHelper, t, canManage, navigate]
  )

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <PageLayout fullHeight>
      <div className={cn(PAGE_CONTENT, 'flex flex-col flex-1 min-h-0')}>
        <PageHeader title={t('classes.title')} backTo={paths.home}>
          <Authorized permission="classes.can_manage_classes">
            <Button onClick={() => navigate(paths.classCreate)}>
              <Plus className="h-4 w-4" />
              {t('classes.create')}
            </Button>
          </Authorized>
        </PageHeader>

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('classes.subtitle')}
        </p>

        <div className="mb-4 shrink-0">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('classes.searchPlaceholder')}
            className="sm:max-w-xs"
            aria-label={t('classes.searchPlaceholder')}
          />
        </div>

        <DataTable
          table={table}
          fillHeight
          loading={loading}
          totalCount={filtered.length}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-4">
              <GraduationCap className="h-6 w-6 text-muted-foreground/60" />
              <span>{t('classes.empty')}</span>
            </div>
          }
        />
      </div>

      <DeleteClassDialog
        classe={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </PageLayout>
  )
}
