import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Search, Trash2, X } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import type {
  CreateRole,
  PatchedUpdateRole,
  Permission,
  RoleDetail,
  RoleList,
} from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { CardSection } from '@/components/shared/CardSection'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { usePermissions } from '@/auth/permissions'
import { parseApiError } from '@/lib/api-errors'
import { translateApiValue } from '@/lib/translate-api-value'
import { cn } from '@/lib/utils'
import { paths } from '@/app/paths'

import { DeleteRoleDialog } from './DeleteRoleDialog'

const CODE_RE = /^[a-z][a-z0-9_]*$/

interface RoleFormPageProps {
  mode: 'create' | 'edit'
}

export function RoleFormPage({ mode }: RoleFormPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { code: codeParam } = useParams<{ code: string }>()
  const { can } = usePermissions()

  const canDelete = mode === 'edit' && can('accounts.delete_role')

  const [loading, setLoading] = useState(mode === 'edit')
  const [submitting, setSubmitting] = useState(false)
  const [role, setRole] = useState<RoleDetail | null>(null)
  const [allPerms, setAllPerms] = useState<Permission[]>([])
  const [deleteTarget, setDeleteTarget] = useState<RoleList | null>(null)

  // Form fields
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPerms, setSelectedPerms] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  // Validation
  const [codeError, setCodeError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const dataLoaded = useRef<string | null>(null)

  useEffect(() => {
    const key = mode === 'edit' ? (codeParam ?? '') : '__create__'
    if (dataLoaded.current === key) return
    if (mode === 'edit' && !codeParam) return
    dataLoaded.current = key
    const load = async () => {
      setLoading(mode === 'edit')
      const [permsRes, roleRes] = await Promise.all([
        apiClient.api.rolesPermissionsAvailableList().catch(() => null),
        mode === 'edit' && codeParam
          ? apiClient.api.rolesRetrieve(codeParam).catch(() => null)
          : Promise.resolve(null),
      ])
      setAllPerms(Array.isArray(permsRes?.data) ? permsRes!.data : [])
      if (mode === 'edit' && roleRes?.data) {
        const r = roleRes.data
        setRole(r)
        setCode(r.code)
        setName(r.name)
        setDescription(r.description ?? '')
        setSelectedPerms(new Set(r.permissions.map((p) => p.id)))
      }
      setLoading(false)
    }
    void load()
  }, [mode, codeParam])

  const togglePerm = (id: number) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredPerms = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allPerms
    return allPerms.filter(
      (p) =>
        p.codename.toLowerCase().includes(q) ||
        p.app_label.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
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

  const handleToggleApp = (perms: Permission[]) => {
    const ids = perms.map((p) => p.id)
    const allSelected = ids.every((id) => selectedPerms.has(id))
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const validate = (): boolean => {
    let valid = true
    if (mode === 'create') {
      const trimmed = code.trim()
      if (!trimmed) {
        setCodeError(t('validation.required'))
        valid = false
      } else if (!CODE_RE.test(trimmed)) {
        setCodeError(t('rolesAdmin.form.codeHint'))
        valid = false
      } else {
        setCodeError(null)
      }
    }
    if (!name.trim()) {
      setNameError(t('validation.required'))
      valid = false
    } else {
      setNameError(null)
    }
    return valid
  }

  const onSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      let savedRole: RoleDetail | null = null
      if (mode === 'create') {
        const payload: CreateRole = {
          code: code.trim(),
          name: name.trim(),
          description: description.trim(),
        }
        const res = await apiClient.api.rolesCreate(payload)
        savedRole = res.data ?? null
      } else if (role) {
        const patch: PatchedUpdateRole = {
          description: description.trim(),
        }
        const res = await apiClient.api.rolesPartialUpdate(role.code, patch)
        savedRole = res.data ?? null
      }

      if (savedRole) {
        // Update permissions via the dedicated endpoint when the user can
        // change roles. The server allows setting permissions during create
        // as a follow-up call.
        if (can('accounts.change_role')) {
          const ids = Array.from(selectedPerms)
          const res = await apiClient.api.rolesPermissionsUpdate(
            savedRole.code,
            { permission_ids: ids }
          )
          if (res.data) savedRole = res.data
        }
        setRole(savedRole)
        toast.success(t('rolesAdmin.saveSuccess'))
        if (mode === 'create') {
          navigate(paths.roleEdit.replace(':code', savedRole.code))
        }
      }
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  const translatedName = role
    ? translateApiValue('roleValues.name', role.name, t)
    : ''
  const title =
    mode === 'create'
      ? t('rolesAdmin.form.createTitle')
      : translatedName
        ? `${t('rolesAdmin.form.editTitle')} · ${translatedName}`
        : t('rolesAdmin.form.editTitle')

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader title={title} backTo={paths.roles} />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageLayout>
    )
  }

  const footer = (
    <>
      {canDelete && role ? (
        <Button
          variant="destructive"
          size="sm"
          type="button"
          onClick={() =>
            setDeleteTarget({
              code: role.code,
              name: role.name,
              description: role.description ?? '',
              permission_count: role.permissions.length,
            })
          }
          disabled={submitting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('common.delete')}
        </Button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => navigate(paths.roles)}
          disabled={submitting}
        >
          {t('common.back')}
        </Button>
        <Button type="button" onClick={onSubmit} disabled={submitting}>
          {t('common.save')}
        </Button>
      </div>
    </>
  )

  return (
    <PageLayout footer={footer}>
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader title={title} backTo={paths.roles} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          <div className="space-y-6">
            <CardSection
              title={t('rolesAdmin.form.permissionsSection')}
              description={t('rolesAdmin.form.permissionsHint')}
            >
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('rolesAdmin.form.permissionsSearch')}
                    className="pl-9"
                    aria-label={t('rolesAdmin.form.permissionsSearch')}
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
                    {t('rolesAdmin.form.noPermissionResults')}
                  </p>
                ) : (
                  <div className="max-h-[480px] overflow-y-auto pr-1 space-y-4">
                    {grouped.map(([app, perms]) => {
                      const ids = perms.map((p) => p.id)
                      const checkedCount = ids.filter((id) =>
                        selectedPerms.has(id)
                      ).length
                      const allChecked = checkedCount === ids.length
                      const someChecked = checkedCount > 0 && !allChecked
                      return (
                        <div key={app}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {app}
                            </span>
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline"
                              onClick={() => handleToggleApp(perms)}
                            >
                              {allChecked
                                ? t('rolesAdmin.form.deselectAll')
                                : t('rolesAdmin.form.selectAll')}
                            </button>
                          </div>
                          <ul className="space-y-1">
                            {perms.map((p) => {
                              const checked = selectedPerms.has(p.id)
                              return (
                                <li
                                  key={p.id}
                                  className="flex items-start gap-3 py-1.5"
                                >
                                  <Checkbox
                                    id={`perm-${p.id}`}
                                    checked={checked}
                                    onCheckedChange={() => togglePerm(p.id)}
                                    className="mt-0.5"
                                  />
                                  <label
                                    htmlFor={`perm-${p.id}`}
                                    className="flex-1 cursor-pointer text-sm"
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
                          <div className={cn('mt-1 text-xs', someChecked ? 'text-primary' : 'text-muted-foreground/60')}>
                            {checkedCount}/{ids.length}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardSection>
          </div>

          <div className="space-y-6">
            <CardSection title={t('rolesAdmin.form.general')}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role-code" className="mb-1.5 block">
                    {t('rolesAdmin.form.codeLabel')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="role-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={mode === 'edit'}
                    placeholder="my_role"
                    className="font-mono"
                    autoFocus={mode === 'create'}
                  />
                  {codeError ? (
                    <p className="mt-1 text-xs text-destructive">{codeError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('rolesAdmin.form.codeHelper')}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="role-name" className="mb-1.5 block">
                    {t('rolesAdmin.form.nameLabel')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="role-name"
                    value={
                      mode === 'edit'
                        ? translateApiValue('roleValues.name', name, t)
                        : name
                    }
                    disabled={mode === 'edit'}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('rolesAdmin.form.namePlaceholder')}
                  />
                  {nameError && (
                    <p className="mt-1 text-xs text-destructive">{nameError}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="role-desc" className="mb-1.5 block">
                    {t('rolesAdmin.form.descriptionLabel')}
                  </Label>
                  <Textarea
                    id="role-desc"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('rolesAdmin.form.descriptionPlaceholder')}
                  />
                </div>
              </div>
            </CardSection>

            <CardSection title={t('rolesAdmin.form.summary')}>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t('rolesAdmin.form.totalPermissions')}
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {selectedPerms.size}
                  </dd>
                </div>
              </dl>
            </CardSection>
          </div>
        </div>
      </div>

      <DeleteRoleDialog
        role={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => navigate(paths.roles)}
      />
    </PageLayout>
  )
}
