import { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Mail, FileSpreadsheet, Upload, X, ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { apiClient } from '@/api/api-client'
import type { BulkInviteFile, RoleList, UserResponse } from '@/api/studioos-api'
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
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { CardSection } from '@/components/shared/CardSection'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { paths } from '@/app/paths'
import { parseApiError } from '@/lib/api-errors'
import {
  singleInviteSchema,
  type SingleInviteFormValues,
} from './invite-schema'

export function InviteUsersPage() {
  const { t } = useTranslation()

  const [roles, setRoles] = useState<RoleList[]>([])
  const rolesLoaded = useRef(false)

  const [sending, setSending] = useState(false)
  const [invitedUsers, setInvitedUsers] = useState<UserResponse[]>([])

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{
    users: UserResponse[]
    count: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<SingleInviteFormValues>({
    resolver: zodResolver(singleInviteSchema),
    defaultValues: { email: '', role: '' },
    mode: 'onChange',
  })

  useEffect(() => {
    if (rolesLoaded.current) return
    rolesLoaded.current = true
    apiClient.api
      .rolesList()
      .then((res) => {
        setRoles(res.data)
      })
      .catch(() => null)
  }, [])

  const allInvited = [...invitedUsers, ...(bulkResult?.users ?? [])]

  const onSingleInvite = async (data: SingleInviteFormValues) => {
    setSending(true)
    try {
      const res = await apiClient.api.accountsInvitesCreate({
        email: data.email,
        role: data.role,
      })
      setInvitedUsers((prev) => [res.data, ...prev])
      reset()
      toast.success(t('invites.inviteSent', { email: data.email }))
    } catch (err) {
      toast.error(
        parseApiError(err, t, 'invites.inviteError') ?? t('invites.inviteError')
      )
    } finally {
      setSending(false)
    }
  }

  const handleBulkInvite = async () => {
    if (!file) {
      toast.error(t('invites.noFile'))
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.api.accountsInvitesBulkCreate(
        formData as unknown as BulkInviteFile
      )
      const bulkData = res.data.data
      setBulkResult(bulkData)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success(t('invites.bulkSuccess', { count: bulkData.count }))
    } catch (err) {
      toast.error(
        parseApiError(err, t, 'invites.bulkError') ?? t('invites.bulkError')
      )
    } finally {
      setUploading(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.endsWith('.xlsx')) {
      setFile(dropped)
    } else {
      toast.error(t('invites.invalidFile'))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.name.endsWith('.xlsx')) {
      setFile(selected)
    } else if (selected) {
      toast.error(t('invites.invalidFile'))
      e.target.value = ''
    }
  }

  const hasInvites = allInvited.length > 0

  return (
    <PageLayout>
      <PageHeader title={t('invites.title')} backTo={paths.home} />

      <div className="max-w-4xl space-y-4">
        {/* ── Single invite ── */}
        <CardSection
          title={t('invites.singleTitle')}
          description={t('invites.singleDesc')}
        >
          <form onSubmit={handleSubmit(onSingleInvite)} className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <Label htmlFor="invite-email" className="sr-only">
                  {t('invites.emailLabel')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder={t('invites.emailPlaceholder')}
                    className={`pl-10 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-destructive">
                    {t(errors.email.message ?? '')}
                  </p>
                )}
              </div>
              <Label htmlFor="invite-role" className="sr-only">
                {t('invites.roleLabel')}
              </Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="invite-role"
                      className="w-full sm:w-[160px]"
                    >
                      <SelectValue placeholder={t('invites.selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.code} value={r.code}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Button
                type="submit"
                disabled={sending || !isValid}
                className="gap-2"
              >
                {sending ? t('invites.sending') : t('invites.send')}
                {!sending && <ArrowRight className="size-4" />}
              </Button>
            </div>
          </form>
        </CardSection>

        {/* ── OR divider ── */}
        <div className="flex items-center gap-3 px-2">
          <Separator className="flex-1" />
          <span className="text-xs font-medium text-muted-foreground">
            {t('invites.orDivider')}
          </span>
          <Separator className="flex-1" />
        </div>

        {/* ── Bulk upload ── */}
        <CardSection
          title={t('invites.bulkTitle')}
          description={t('invites.bulkDesc')}
        >
          <div className="space-y-4">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <Upload className="mb-3 size-8 text-muted-foreground" />
              {file ? (
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    type="button"
                    aria-label={t('invites.removeFile')}
                    onClick={() => {
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="ml-1 flex items-center justify-center rounded-full p-2 hover:bg-muted min-h-[44px] min-w-[44px]"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('invites.dropzone')}
                  </p>
                  <button
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t('invites.browse')}
                  </button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('invites.fileRequirements')}
            </p>
            <Button onClick={handleBulkInvite} disabled={uploading || !file}>
              {uploading
                ? t('invites.uploading')
                : t('invites.uploadAndInvite')}
            </Button>
          </div>
        </CardSection>

        {/* ── Invite list ── */}
        {hasInvites && (
          <CardSection title={t('invites.listTitle')}>
            <div className="-mx-6 -mb-6">
              {allInvited.map((u, i) => {
                const initial = (u.email?.[0] ?? '?').toUpperCase()
                const roleName = u.role?.[0]?.name ?? '—'
                return (
                  <div
                    key={u.id}
                    className={`flex items-center gap-4 px-6 py-4 ${i < allInvited.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <Avatar size="sm">
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {roleName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">
                        {t('invites.sent')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardSection>
        )}
      </div>
    </PageLayout>
  )
}
