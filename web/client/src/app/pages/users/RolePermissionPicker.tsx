import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type { Permission, RoleList } from '@/api/studioos-api'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CardSection } from '@/components/shared/CardSection'
import { cn } from '@/lib/utils'

interface Props {
  selectedRoles: string[]
  selectedPerms: number[]
  onRolesChange: (codes: string[]) => void
  onPermsChange: (ids: number[]) => void
  disabled?: boolean
}

export function RolePermissionPicker({
  selectedRoles,
  selectedPerms,
  onRolesChange,
  onPermsChange,
  disabled = false,
}: Props) {
  const { t } = useTranslation()

  const [roles, setRoles] = useState<RoleList[]>([])
  const [allPerms, setAllPerms] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    Promise.all([
      apiClient.api.rolesList().catch(() => null),
      apiClient.api.rolesPermissionsAvailableList().catch(() => null),
    ])
      .then(([rRes, pRes]) => {
        setRoles(rRes?.data ?? [])
        setAllPerms(pRes?.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const roleSet = useMemo(() => new Set(selectedRoles), [selectedRoles])
  const permSet = useMemo(() => new Set(selectedPerms), [selectedPerms])

  const toggleRole = (code: string) => {
    if (disabled) return
    onRolesChange(
      roleSet.has(code)
        ? selectedRoles.filter((c) => c !== code)
        : [...selectedRoles, code],
    )
  }

  const togglePerm = (id: number) => {
    if (disabled) return
    onPermsChange(
      permSet.has(id)
        ? selectedPerms.filter((x) => x !== id)
        : [...selectedPerms, id],
    )
  }

  const filteredPerms = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allPerms
    return allPerms.filter(
      (p) =>
        p.codename.toLowerCase().includes(q) ||
        p.app_label.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q),
    )
  }, [allPerms, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of filteredPerms) {
      const list = map.get(p.app_label) ?? []
      list.push(p)
      map.set(p.app_label, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filteredPerms])

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
      {/* Permissions picker */}
      <CardSection
        title={t('users.permissions.permissionsCard')}
        description={t('users.permissions.permissionsDesc')}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('users.permissions.searchPlaceholder')}
              className="pl-9"
              aria-label={t('users.permissions.searchPlaceholder')}
            />
            {search && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
                onClick={() => setSearch('')}
                aria-label={t('common.cancel')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t('users.permissions.noResults')}
            </p>
          ) : (
            <div className="max-h-[480px] overflow-y-auto pr-1 space-y-4">
              {grouped.map(([app, perms]) => (
                <div key={app}>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    {app}
                  </div>
                  <ul className="space-y-1">
                    {perms.map((p) => {
                      const checked = permSet.has(p.id)
                      return (
                        <li key={p.id} className="flex items-start gap-3 py-1.5">
                          <Checkbox
                            id={`perm-${p.id}`}
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={() => togglePerm(p.id)}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`perm-${p.id}`}
                            className={cn(
                              'flex-1 cursor-pointer text-sm',
                              disabled && 'cursor-not-allowed',
                            )}
                          >
                            <div className="font-medium text-foreground">
                              {p.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {p.app_label}.{p.codename}
                            </div>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardSection>

      {/* Roles picker */}
      <CardSection
        title={t('users.permissions.rolesCard')}
        description={t('users.permissions.rolesDesc')}
      >
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('users.permissions.noRolesAvailable')}
          </p>
        ) : (
          <ul className="space-y-1">
            {roles.map((r) => {
              const checked = roleSet.has(r.code)
              return (
                <li key={r.code} className="flex items-start gap-3 py-1.5">
                  <Checkbox
                    id={`role-${r.code}`}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggleRole(r.code)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`role-${r.code}`}
                    className={cn(
                      'flex-1 cursor-pointer text-sm',
                      disabled && 'cursor-not-allowed',
                    )}
                  >
                    <div className="font-medium text-foreground">{r.name}</div>
                    {r.description && (
                      <div className="text-xs text-muted-foreground">
                        {r.description}
                      </div>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </CardSection>
    </div>
  )
}
