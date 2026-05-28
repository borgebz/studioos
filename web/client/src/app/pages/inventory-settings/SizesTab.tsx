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
  Plus,
  Power,
  Rows3,
  Trash2,
} from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { CreateSize, Size, SizeSystem } from '@/api/studioos-api'
import { Authorized, usePermissions } from '@/auth/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export function SizesTab() {
  const { t } = useTranslation()
  const { can } = usePermissions()

  const canAdd = can('inventory.add_size')
  const canDelete = can('inventory.delete_size')

  const [items, setItems] = useState<Size[]>([])
  const [systems, setSystems] = useState<SizeSystem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Size | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const dataLoaded = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [sizesRes, systemsRes] = await Promise.all([
      apiClient.api.inventorySizesList().catch(() => null),
      apiClient.api.inventorySizeSystemsList().catch(() => null),
    ])
    if (sizesRes === null) {
      toast.error(t('common.unexpectedError'))
    }
    setItems(Array.isArray(sizesRes?.data) ? sizesRes!.data : [])
    setSystems(Array.isArray(systemsRes?.data) ? systemsRes!.data : [])
    setLoading(false)
  }, [t])

  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    void load()
  }, [load])

  const systemNameById = useMemo(() => {
    const map = new Map<number, string>()
    systems.forEach((s) => map.set(s.id, s.name))
    return map
  }, [systems])

  const handleToggle = useCallback(
    async (size: Size) => {
      setTogglingId(size.id)
      try {
        const res = size.is_active
          ? await apiClient.api.inventorySizesDeactivateCreate(size.id)
          : await apiClient.api.inventorySizesActivateCreate(size.id)
        if (res.data) {
          setItems((prev) =>
            prev.map((s) => (s.id === size.id ? res.data! : s))
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

  const columnHelper = useMemo(() => createColumnHelper<Size>(), [])
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: () => t('inventorySettings.sizes.col.name'),
        cell: (info) => (
          <span className="font-medium text-foreground">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('size_system', {
        id: 'system',
        header: () => t('inventorySettings.sizes.col.system'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {systemNameById.get(info.getValue()) ?? '—'}
          </span>
        ),
      }),
      columnHelper.accessor('is_active', {
        id: 'is_active',
        header: () => t('inventorySettings.sizes.col.status'),
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
            {t('inventorySettings.sizes.col.actions')}
          </span>
        ),
        cell: (info) => {
          const s = info.row.original
          if (!canAdd && !canDelete) return null
          const isToggling = togglingId === s.id
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('inventorySettings.sizes.col.actions')}
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
                <DropdownMenuItem onClick={() => handleToggle(s)}>
                  <Power className="size-4" />
                  {s.is_active ? t('common.deactivate') : t('common.activate')}
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(s)}
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
    [columnHelper, t, canAdd, canDelete, togglingId, handleToggle, systemNameById]
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex justify-end shrink-0">
        <Authorized permission="inventory.add_size">
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={systems.length === 0}
            title={
              systems.length === 0
                ? t('inventorySettings.sizes.noSystemsHint')
                : undefined
            }
          >
            <Plus className="h-4 w-4" />
            {t('inventorySettings.sizes.create')}
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
            <Rows3 className="h-6 w-6 text-muted-foreground/60" />
            <span>{t('inventorySettings.sizes.empty')}</span>
          </div>
        }
      />

      <SizeDialog
        open={createOpen}
        systems={systems}
        onClose={() => setCreateOpen(false)}
        onSaved={(s) => setItems((prev) => [...prev, s])}
      />

      <ConfirmDeleteDialog
        open={deleteTarget != null}
        title={t('inventorySettings.sizes.deleteTitle', {
          name: deleteTarget?.name ?? '',
        })}
        description={t('inventorySettings.sizes.deleteDesc')}
        successMessage={t('inventorySettings.sizes.deleteSuccess')}
        onConfirm={async () => {
          if (!deleteTarget) return
          await apiClient.api.inventorySizesDestroy(deleteTarget.id)
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

// ─── Create dialog ────────────────────────────────────────────────────────

interface SizeDialogProps {
  open: boolean
  systems: SizeSystem[]
  onClose: () => void
  onSaved: (s: Size) => void
}

function SizeDialog({ open, systems, onClose, onSaved }: SizeDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [systemId, setSystemId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [systemError, setSystemError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setSystemId(systems.length > 0 ? String(systems[0].id) : '')
      setNameError(null)
      setSystemError(null)
    }
  }, [open, systems])

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    let valid = true
    if (!trimmedName) {
      setNameError(t('validation.required'))
      valid = false
    } else {
      setNameError(null)
    }
    const sid = Number(systemId)
    if (!Number.isFinite(sid) || sid <= 0) {
      setSystemError(t('validation.required'))
      valid = false
    } else {
      setSystemError(null)
    }
    if (!valid) return

    setSubmitting(true)
    try {
      const payload: CreateSize = {
        name: trimmedName,
        size_system_id: sid,
      }
      const res = await apiClient.api.inventorySizesCreate(payload)
      if (res.data) {
        onSaved(res.data)
        toast.success(t('inventorySettings.sizes.saveSuccess'))
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
          <DialogTitle>{t('inventorySettings.sizes.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('inventorySettings.sizes.dialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="size-name" className="mb-1.5 block">
              {t('inventorySettings.sizes.nameLabel')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="size-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('inventorySettings.sizes.namePlaceholder')}
              autoFocus
            />
            {nameError && (
              <p className="mt-1 text-xs text-destructive">{nameError}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block">
              {t('inventorySettings.sizes.systemLabel')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Select value={systemId} onValueChange={setSystemId}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t('inventorySettings.sizes.systemPlaceholder')}
                />
              </SelectTrigger>
              <SelectContent>
                {systems.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {systemError && (
              <p className="mt-1 text-xs text-destructive">{systemError}</p>
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
