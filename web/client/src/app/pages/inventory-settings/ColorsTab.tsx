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
  Palette,
  Pencil,
  Power,
  Plus,
  Trash2,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { Color, CreateColor } from '@/api/studioos-api'
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

const HEX_RE = /^#[0-9a-f]{6}$/i

export function ColorsTab() {
  const { t } = useTranslation()
  const { can } = usePermissions()

  // The Colors API has no PATCH endpoint, so we don't expose an edit
  // affordance — only create / activate / deactivate / delete.
  const canManage = can('inventory.add_color') || can('inventory.delete_color')
  const canDelete = can('inventory.delete_color')

  const [items, setItems] = useState<Color[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Color | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const dataLoaded = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiClient.api.inventoryColorsList().catch((err) => {
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
    async (color: Color) => {
      setTogglingId(color.id)
      try {
        const res = color.is_active
          ? await apiClient.api.inventoryColorsDeactivateCreate(color.id)
          : await apiClient.api.inventoryColorsActivateCreate(color.id)
        if (res.data) {
          setItems((prev) =>
            prev.map((c) => (c.id === color.id ? res.data! : c))
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

  const columnHelper = useMemo(() => createColumnHelper<Color>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: () => t('inventorySettings.colors.col.name'),
        cell: (info) => {
          const c = info.row.original
          return (
            <div className="flex items-center gap-3">
              <span
                className="inline-block size-4 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: c.hex_code }}
                aria-hidden
              />
              {canEdit ? (
                <button
                  type="button"
                  className="text-left font-medium text-foreground hover:text-primary"
                  onClick={() => setEditTarget(c)}
                >
                  {c.name}
                </button>
              ) : (
                <span className="font-medium text-foreground">{c.name}</span>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor('hex_code', {
        id: 'hex_code',
        header: () => t('inventorySettings.colors.col.hex'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {info.getValue().toUpperCase()}
          </span>
        ),
      }),
      columnHelper.accessor('is_active', {
        id: 'is_active',
        header: () => t('inventorySettings.colors.col.status'),
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
            {t('inventorySettings.colors.col.actions')}
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
                  aria-label={t('inventorySettings.colors.col.actions')}
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
        <Authorized permission="inventory.add_color">
          <Button onClick={() => setEditTarget('new')}>
            <Plus className="h-4 w-4" />
            {t('inventorySettings.colors.create')}
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
            <Palette className="h-6 w-6 text-muted-foreground/60" />
            <span>{t('inventorySettings.colors.empty')}</span>
          </div>
        }
      />

      <ColorDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(c, mode) => {
          setItems((prev) =>
            mode === 'create'
              ? [...prev, c]
              : prev.map((it) => (it.id === c.id ? c : it))
          )
        }}
      />

      <ConfirmDeleteDialog
        open={deleteTarget != null}
        title={t('inventorySettings.colors.deleteTitle', {
          name: deleteTarget?.name ?? '',
        })}
        description={t('inventorySettings.colors.deleteDesc')}
        successMessage={t('inventorySettings.colors.deleteSuccess')}
        onConfirm={async () => {
          if (!deleteTarget) return
          await apiClient.api.inventoryColorsDestroy(deleteTarget.id)
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

interface ColorDialogProps {
  target: Color | 'new' | null
  onClose: () => void
  onSaved: (c: Color, mode: 'create' | 'edit') => void
}

function ColorDialog({ target, onClose, onSaved }: ColorDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#000000')
  const [submitting, setSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [hexError, setHexError] = useState<string | null>(null)

  const open = target != null
  const isEdit = target !== null && target !== 'new'

  useEffect(() => {
    if (target === 'new') {
      setName('')
      setHex('#000000')
    } else if (target && target !== 'new') {
      setName(target.name)
      setHex(target.hex_code)
    }
    setNameError(null)
    setHexError(null)
  }, [target])

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    let valid = true
    if (!trimmedName) {
      setNameError(t('validation.required'))
      valid = false
    } else {
      setNameError(null)
    }
    if (!HEX_RE.test(hex)) {
      setHexError(t('inventorySettings.colors.hexHint'))
      valid = false
    } else {
      setHexError(null)
    }
    if (!valid) return

    setSubmitting(true)
    try {
      if (target === 'new') {
        const payload: CreateColor = { name: trimmedName, hex_code: hex }
        const res = await apiClient.api.inventoryColorsCreate(payload)
        if (res.data) {
          onSaved(res.data, 'create')
          toast.success(t('inventorySettings.colors.saveSuccess'))
          onClose()
        }
      } else if (target) {
        // No PATCH endpoint for color; recreate via delete-then-create is too
        // dangerous. The API exposes only create/destroy/activate-deactivate,
        // so editing name/hex is not supported server-side. We surface the
        // limitation by disabling the field in edit mode.
        toast.info(t('inventorySettings.colors.editUnsupported'))
        onClose()
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
              ? t('inventorySettings.colors.editTitle')
              : t('inventorySettings.colors.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('inventorySettings.colors.dialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="color-name" className="mb-1.5 block">
              {t('inventorySettings.colors.nameLabel')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="color-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEdit}
              placeholder={t('inventorySettings.colors.namePlaceholder')}
              autoFocus
            />
            {nameError && (
              <p className="mt-1 text-xs text-destructive">{nameError}</p>
            )}
          </div>
          <div>
            <Label htmlFor="color-hex" className="mb-1.5 block">
              {t('inventorySettings.colors.hexLabel')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label={t('inventorySettings.colors.hexLabel')}
                value={hex}
                disabled={isEdit}
                onChange={(e) => setHex(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
              />
              <Input
                id="color-hex"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                disabled={isEdit}
                placeholder="#146664"
                className="font-mono uppercase"
                maxLength={7}
              />
            </div>
            {hexError && (
              <p className="mt-1 text-xs text-destructive">{hexError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          {!isEdit && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {t('common.save')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
