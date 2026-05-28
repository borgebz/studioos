import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Power,
  Ruler,
  Trash2,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  CreateSizeSystem,
  PatchedUpdateSizeSystem,
  SizeSystem,
} from '@/api/studioos-api'
import { Authorized, usePermissions } from '@/auth/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export function SizeSystemsTab() {
  const { t } = useTranslation()
  const { can } = usePermissions()

  const canEdit = can('inventory.change_sizesystem')
  const canDelete = can('inventory.delete_sizesystem')

  const [items, setItems] = useState<SizeSystem[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<SizeSystem | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SizeSystem | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const dataLoaded = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiClient.api.inventorySizeSystemsList().catch((err) => {
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

  const handleToggle = useCallback(
    async (ss: SizeSystem) => {
      setTogglingId(ss.id)
      try {
        const res = ss.is_active
          ? await apiClient.api.inventorySizeSystemsDeactivateCreate(ss.id)
          : await apiClient.api.inventorySizeSystemsActivateCreate(ss.id)
        if (res.data) {
          setItems((prev) =>
            prev.map((x) => (x.id === ss.id ? res.data! : x))
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

  const columnHelper = useMemo(() => createColumnHelper<SizeSystem>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: () => t('inventorySettings.sizeSystems.col.name'),
        cell: (info) => {
          const ss = info.row.original
          if (!canEdit) {
            return (
              <span className="font-medium text-foreground">{ss.name}</span>
            )
          }
          return (
            <button
              type="button"
              className="text-left font-medium text-foreground hover:text-primary"
              onClick={() => setEditTarget(ss)}
            >
              {ss.name}
            </button>
          )
        },
      }),
      columnHelper.accessor((row) => row.sizes?.length ?? 0, {
        id: 'sizes',
        header: () => t('inventorySettings.sizeSystems.col.sizes'),
        meta: { align: 'right' },
        cell: (info) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('is_active', {
        id: 'is_active',
        header: () => t('inventorySettings.sizeSystems.col.status'),
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
            {t('inventorySettings.sizeSystems.col.actions')}
          </span>
        ),
        cell: (info) => {
          const ss = info.row.original
          if (!canEdit && !canDelete) return null
          const isToggling = togglingId === ss.id
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('inventorySettings.sizeSystems.col.actions')}
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
                  <DropdownMenuItem onClick={() => setEditTarget(ss)}>
                    <Pencil className="size-4" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <DropdownMenuItem onClick={() => handleToggle(ss)}>
                    <Power className="size-4" />
                    {ss.is_active
                      ? t('common.deactivate')
                      : t('common.activate')}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(ss)}
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
    [columnHelper, t, canEdit, canDelete, togglingId, handleToggle]
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex justify-end shrink-0">
        <Authorized permission="inventory.add_sizesystem">
          <Button onClick={() => setEditTarget('new')}>
            <Plus className="h-4 w-4" />
            {t('inventorySettings.sizeSystems.create')}
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
            <Ruler className="h-6 w-6 text-muted-foreground/60" />
            <span>{t('inventorySettings.sizeSystems.empty')}</span>
          </div>
        }
      />

      <SizeSystemDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(ss, mode) => {
          setItems((prev) =>
            mode === 'create'
              ? [...prev, ss]
              : prev.map((x) => (x.id === ss.id ? ss : x))
          )
        }}
      />

      <ConfirmDeleteDialog
        open={deleteTarget != null}
        title={t('inventorySettings.sizeSystems.deleteTitle', {
          name: deleteTarget?.name ?? '',
        })}
        description={t('inventorySettings.sizeSystems.deleteDesc')}
        successMessage={t('inventorySettings.sizeSystems.deleteSuccess')}
        onConfirm={async () => {
          if (!deleteTarget) return
          await apiClient.api.inventorySizeSystemsDestroy(deleteTarget.id)
        }}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          if (deleteTarget) {
            setItems((prev) => prev.filter((s) => s.id !== deleteTarget.id))
          }
        }}
      />
    </div>
  )
}

// ─── Create / edit dialog ────────────────────────────────────────────────

interface SizeSystemDialogProps {
  target: SizeSystem | 'new' | null
  onClose: () => void
  onSaved: (ss: SizeSystem, mode: 'create' | 'edit') => void
}

function SizeSystemDialog({ target, onClose, onSaved }: SizeSystemDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const open = target != null
  const isEdit = target !== null && target !== 'new'

  useEffect(() => {
    if (target === 'new') {
      setName('')
    } else if (target) {
      setName(target.name)
    }
    setNameError(null)
  }, [target])

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError(t('validation.required'))
      return
    }
    setSubmitting(true)
    try {
      if (target === 'new') {
        const payload: CreateSizeSystem = { name: trimmedName }
        const res = await apiClient.api.inventorySizeSystemsCreate(payload)
        if (res.data) {
          onSaved(res.data, 'create')
          toast.success(t('inventorySettings.sizeSystems.saveSuccess'))
          onClose()
        }
      } else if (target) {
        const patch: PatchedUpdateSizeSystem = { name: trimmedName }
        const res = await apiClient.api.inventorySizeSystemsPartialUpdate(
          target.id,
          patch
        )
        if (res.data) {
          onSaved(res.data, 'edit')
          toast.success(t('inventorySettings.sizeSystems.saveSuccess'))
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
              ? t('inventorySettings.sizeSystems.editTitle')
              : t('inventorySettings.sizeSystems.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('inventorySettings.sizeSystems.dialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="size-system-name" className="mb-1.5 block">
            {t('inventorySettings.sizeSystems.nameLabel')}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="size-system-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('inventorySettings.sizeSystems.namePlaceholder')}
            autoFocus
          />
          {nameError && (
            <p className="mt-1 text-xs text-destructive">{nameError}</p>
          )}
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
