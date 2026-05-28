import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  FolderTree,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  Category,
  CreateCategory,
  PatchedUpdateCategory,
  SizeSystem,
} from '@/api/studioos-api'
import { Authorized, usePermissions } from '@/auth/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'
import { parseApiError } from '@/lib/api-errors'

import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'

const NO_PARENT = '__none__'

interface CategoryRow {
  id: number
  name: string
  parent?: number | null
  is_active?: boolean
  size_system_ids: number[]
}

function toRow(c: Category): CategoryRow {
  const sizeSystems = (c.size_systems ?? []) as Array<{ id?: number }>
  return {
    id: c.id,
    name: c.name,
    parent: c.parent ?? null,
    is_active: c.is_active,
    size_system_ids: sizeSystems
      .map((s) => s?.id)
      .filter((v): v is number => typeof v === 'number'),
  }
}

export function CategoriesTab() {
  const { t } = useTranslation()
  const { can } = usePermissions()

  const canEdit = can('inventory.change_category')
  const canDelete = can('inventory.delete_category')

  const [items, setItems] = useState<CategoryRow[]>([])
  const [systems, setSystems] = useState<SizeSystem[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<CategoryRow | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const dataLoaded = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [catsRes, sysRes] = await Promise.all([
      apiClient.api.inventoryCategoriesList().catch(() => null),
      apiClient.api.inventorySizeSystemsList().catch(() => null),
    ])
    if (catsRes === null) toast.error(t('common.unexpectedError'))
    setItems(
      Array.isArray(catsRes?.data) ? catsRes!.data.map(toRow) : []
    )
    setSystems(Array.isArray(sysRes?.data) ? sysRes!.data : [])
    setLoading(false)
  }, [t])

  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    void load()
  }, [load])

  const categoryById = useMemo(() => {
    const map = new Map<number, CategoryRow>()
    items.forEach((c) => map.set(c.id, c))
    return map
  }, [items])

  const handleToggle = useCallback(
    async (cat: CategoryRow) => {
      setTogglingId(cat.id)
      try {
        const res = cat.is_active
          ? await apiClient.api.inventoryCategoriesDeactivateCreate(cat.id)
          : await apiClient.api.inventoryCategoriesActivateCreate(cat.id)
        if (res.data) {
          const updated = toRow(res.data)
          setItems((prev) =>
            prev.map((c) => (c.id === cat.id ? updated : c))
          )
        }
      } catch (err) {
        toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
      } finally {
        setTogglingId(null)
      }
    },
    [t]
  )

  const columnHelper = useMemo(() => createColumnHelper<CategoryRow>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: () => t('inventorySettings.categories.col.name'),
        cell: (info) => {
          const c = info.row.original
          if (!canEdit) {
            return (
              <span className="font-medium text-foreground">{c.name}</span>
            )
          }
          return (
            <button
              type="button"
              className="text-left font-medium text-foreground hover:text-primary"
              onClick={() => setEditTarget(c)}
            >
              {c.name}
            </button>
          )
        },
      }),
      columnHelper.accessor('parent', {
        id: 'parent',
        header: () => t('inventorySettings.categories.col.parent'),
        cell: (info) => {
          const p = info.getValue()
          if (p == null)
            return <span className="text-muted-foreground">—</span>
          const parent = categoryById.get(p)
          return (
            <span className="text-sm text-muted-foreground">
              {parent?.name ?? `#${p}`}
            </span>
          )
        },
      }),
      columnHelper.accessor((row) => row.size_system_ids.length, {
        id: 'systems',
        header: () => t('inventorySettings.categories.col.systems'),
        meta: { align: 'right' },
        cell: (info) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('is_active', {
        id: 'is_active',
        header: () => t('inventorySettings.categories.col.status'),
        cell: (info) => {
          const active = info.getValue()
          return (
            <Badge
              className={cn(
                'font-normal',
                active
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {active ? t('common.active') : t('common.inactive')}
            </Badge>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        size: 48,
        header: () => (
          <span className="sr-only">
            {t('inventorySettings.categories.col.actions')}
          </span>
        ),
        cell: (info) => {
          const c = info.row.original
          if (!canEdit && !canDelete) return null
          const isToggling = togglingId === c.id
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('inventorySettings.categories.col.actions')}
                  disabled={isToggling}
                >
                  {isToggling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setEditTarget(c)}>
                    <Pencil className="size-4" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <DropdownMenuItem onClick={() => handleToggle(c)}>
                    <Power className="size-4" />
                    {c.is_active
                      ? t('common.deactivate')
                      : t('common.activate')}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(c)}
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
    [columnHelper, t, canEdit, canDelete, togglingId, handleToggle, categoryById]
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex justify-end shrink-0">
        <Authorized permission="inventory.add_category">
          <Button onClick={() => setEditTarget('new')}>
            <Plus className="h-4 w-4" />
            {t('inventorySettings.categories.create')}
          </Button>
        </Authorized>
      </div>

      <DataTable
        table={table}
        fillHeight
        loading={loading}
        totalCount={items.length}
        onRefresh={load}
        emptyMessage={
          <div className="flex flex-col items-center gap-2 py-4">
            <FolderTree className="h-6 w-6 text-muted-foreground/60" />
            <span>{t('inventorySettings.categories.empty')}</span>
          </div>
        }
      />

      <CategoryDialog
        target={editTarget}
        allCategories={items}
        systems={systems}
        onClose={() => setEditTarget(null)}
        onSaved={(c, mode) => {
          setItems((prev) =>
            mode === 'create'
              ? [...prev, c]
              : prev.map((x) => (x.id === c.id ? c : x))
          )
        }}
      />

      <ConfirmDeleteDialog
        open={deleteTarget != null}
        title={t('inventorySettings.categories.deleteTitle', {
          name: deleteTarget?.name ?? '',
        })}
        description={t('inventorySettings.categories.deleteDesc')}
        successMessage={t('inventorySettings.categories.deleteSuccess')}
        onConfirm={async () => {
          if (!deleteTarget) return
          await apiClient.api.inventoryCategoriesDestroy(deleteTarget.id)
        }}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          if (deleteTarget) {
            setItems((prev) => prev.filter((c) => c.id !== deleteTarget.id))
          }
        }}
      />
    </div>
  )
}

// ─── Create / edit dialog ────────────────────────────────────────────────

interface CategoryDialogProps {
  target: CategoryRow | 'new' | null
  allCategories: CategoryRow[]
  systems: SizeSystem[]
  onClose: () => void
  onSaved: (c: CategoryRow, mode: 'create' | 'edit') => void
}

function CategoryDialog({
  target,
  allCategories,
  systems,
  onClose,
  onSaved,
}: CategoryDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<string>(NO_PARENT)
  const [systemIds, setSystemIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const open = target != null
  const isEdit = target !== null && target !== 'new'

  useEffect(() => {
    if (target === 'new') {
      setName('')
      setParentId(NO_PARENT)
      setSystemIds([])
    } else if (target) {
      setName(target.name)
      setParentId(target.parent == null ? NO_PARENT : String(target.parent))
      setSystemIds([...target.size_system_ids])
    }
    setNameError(null)
  }, [target])

  // Prevent picking self or descendant as parent (basic guard: just exclude self).
  const parentOptions = useMemo(() => {
    if (!target || target === 'new') return allCategories
    return allCategories.filter((c) => c.id !== target.id)
  }, [allCategories, target])

  const toggleSystem = (id: number) => {
    setSystemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError(t('validation.required'))
      return
    }
    setSubmitting(true)
    try {
      const parent_category_id =
        parentId === NO_PARENT ? undefined : Number(parentId)
      if (target === 'new') {
        const payload: CreateCategory = {
          name: trimmedName,
          parent_category_id,
          size_system_ids: systemIds,
        }
        const res = await apiClient.api.inventoryCategoriesCreate(payload)
        if (res.data) {
          onSaved(toRow(res.data), 'create')
          toast.success(t('inventorySettings.categories.saveSuccess'))
          onClose()
        }
      } else if (target) {
        const patch: PatchedUpdateCategory = {
          name: trimmedName,
          parent_category_id:
            parent_category_id === undefined ? null : parent_category_id,
          size_system_ids: systemIds,
        }
        const res = await apiClient.api.inventoryCategoriesPartialUpdate(
          target.id,
          patch
        )
        if (res.data) {
          onSaved(toRow(res.data), 'edit')
          toast.success(t('inventorySettings.categories.saveSuccess'))
          onClose()
        }
      }
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('inventorySettings.categories.editTitle')
              : t('inventorySettings.categories.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('inventorySettings.categories.dialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="category-name" className="mb-1.5 block">
              {t('inventorySettings.categories.nameLabel')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('inventorySettings.categories.namePlaceholder')}
              autoFocus
            />
            {nameError && (
              <p className="mt-1 text-xs text-destructive">{nameError}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block">
              {t('inventorySettings.categories.parentLabel')}
            </Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>
                  {t('inventorySettings.categories.noParent')}
                </SelectItem>
                {parentOptions.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">
              {t('inventorySettings.categories.systemsLabel')}
            </Label>
            {systems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('inventorySettings.categories.noSystems')}
              </p>
            ) : (
              <ul className="space-y-1 rounded-md border border-border p-2 max-h-44 overflow-auto">
                {systems.map((s) => {
                  const checked = systemIds.includes(s.id)
                  return (
                    <li key={s.id}>
                      <label className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40 cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSystem(s.id)}
                          aria-label={s.name}
                        />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
