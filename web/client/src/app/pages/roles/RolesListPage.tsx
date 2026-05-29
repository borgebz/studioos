import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { RoleList } from '@/api/studioos-api'
import { Authorized, usePermissions } from '@/auth/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { parseApiError } from '@/lib/api-errors'
import { translateApiValue } from '@/lib/translate-api-value'
import { paths } from '@/app/paths'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

import { DeleteRoleDialog } from './DeleteRoleDialog'

export function RolesListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { can } = usePermissions()

  const canEdit = can('accounts.change_role')
  const canDelete = can('accounts.delete_role')

  const [items, setItems] = useState<RoleList[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 200)
  const [deleteTarget, setDeleteTarget] = useState<RoleList | null>(null)

  const dataLoaded = useRef(false)
  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiClient.api.rolesList().catch((err) => {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
      return null
    })
    setItems(Array.isArray(res?.data) ? res!.data : [])
    setLoading(false)
  }, [t])

  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  const handleDeleted = useCallback((code: string) => {
    setItems((prev) => prev.filter((r) => r.code !== code))
  }, [])

  const columnHelper = useMemo(() => createColumnHelper<RoleList>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: () => t('rolesAdmin.col.name'),
        cell: (info) => {
          const r = info.row.original
          const label = translateApiValue('roleValues.name', r.name, t)
          if (!canEdit) {
            return (
              <span className="font-medium text-foreground">{label}</span>
            )
          }
          return (
            <button
              type="button"
              className="text-left font-medium text-foreground hover:text-primary"
              onClick={() =>
                navigate(paths.roleEdit.replace(':code', r.code))
              }
            >
              {label}
            </button>
          )
        },
      }),
      columnHelper.accessor('code', {
        id: 'code',
        header: () => t('rolesAdmin.col.code'),
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('description', {
        id: 'description',
        header: () => t('rolesAdmin.col.description'),
        cell: (info) => {
          const raw = (info.getValue() ?? '').trim()
          if (!raw) return <span className="text-muted-foreground">—</span>
          // Server descriptions ship as the role name in English; the
          // translation map keeps human-readable summaries per locale. Slug
          // off the raw value so user-supplied descriptions still appear.
          const label = translateApiValue('roleValues.description', raw, t)
          return (
            <span className="text-sm text-muted-foreground line-clamp-1">
              {label}
            </span>
          )
        },
      }),
      columnHelper.accessor('permission_count', {
        id: 'permission_count',
        header: () => t('rolesAdmin.col.permissionCount'),
        meta: { align: 'right' },
        cell: (info) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        size: 48,
        header: () => (
          <span className="sr-only">{t('rolesAdmin.col.actions')}</span>
        ),
        cell: (info) => {
          const r = info.row.original
          if (!canEdit && !canDelete) return null
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('rolesAdmin.col.actions')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canEdit && (
                  <DropdownMenuItem
                    onClick={() =>
                      navigate(paths.roleEdit.replace(':code', r.code))
                    }
                  >
                    <Pencil className="size-4" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Trash2 className="size-4" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
        <PageHeader title={t('rolesAdmin.title')} backTo={paths.home}>
          <Authorized permission="accounts.add_role">
            <Button onClick={() => navigate(paths.roleCreate)} size="sm">
              <Plus className="h-4 w-4" />
              {t('rolesAdmin.create')}
            </Button>
          </Authorized>
        </PageHeader>

        <p className="-mt-4 mb-6 text-sm text-muted-foreground shrink-0">
          {t('rolesAdmin.subtitle')}
        </p>

        <div className="mb-4 shrink-0">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('rolesAdmin.searchPlaceholder')}
            className="sm:max-w-xs"
            aria-label={t('rolesAdmin.searchPlaceholder')}
          />
        </div>

        <DataTable
          table={table}
          fillHeight
          loading={loading}
          totalCount={filtered.length}
          onRefresh={load}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-4">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
              ) : (
                <ShieldCheck className="h-6 w-6 text-muted-foreground/60" />
              )}
              <span>{t('rolesAdmin.empty')}</span>
            </div>
          }
        />
      </div>

      <DeleteRoleDialog
        role={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </PageLayout>
  )
}
