import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Mail,
  FileSpreadsheet,
  Upload,
  X,
  ArrowRight,
} from 'lucide-react'
import { apiClient } from '@/api/api-client'
import type { RoleList, UserResponse } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseApiError(
  err: unknown,
  t: (key: string) => string,
): string {
  const httpErr = err as { error?: { errors?: Record<string, string[]> } }
  const errors = httpErr?.error?.errors
  if (!errors) return t('invites.inviteError')

  const allMessages = Object.values(errors).flat()

  for (const msg of allMessages) {
    if (msg === 'CannotInviteRole') return t('invites.errorCannotInviteRole')
    if (msg.toLowerCase().includes('valid email'))
      return t('invites.errorInvalidEmail')
    if (msg.toLowerCase().includes('already'))
      return t('invites.errorAlreadyInvited')
  }

  return allMessages[0] ?? t('invites.inviteError')
}

export function InviteUsersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [roles, setRoles] = useState<RoleList[]>([])
  const rolesLoaded = useRef(false)

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [role, setRole] = useState('')
  const [sending, setSending] = useState(false)
  const [invitedUsers, setInvitedUsers] = useState<UserResponse[]>([])

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{
    users: UserResponse[]
    count: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (rolesLoaded.current) return
    rolesLoaded.current = true
    apiClient.api.apiRolesList().then((res) => {
      setRoles(res.data)
    })
  }, [])

  const allInvited = [...invitedUsers, ...(bulkResult?.users ?? [])]

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('')
      return false
    }
    if (!EMAIL_RE.test(value)) {
      setEmailError(t('invites.errorInvalidEmail'))
      return false
    }
    setEmailError('')
    return true
  }

  const isFormValid = EMAIL_RE.test(email) && !!role

  const handleSingleInvite = async () => {
    if (!validateEmail(email) || !role) {
      if (!role) toast.error(t('invites.missingFields'))
      return
    }
    setSending(true)
    try {
      const res = await apiClient.api.apiAccountsInvitesCreate({ email, role })
      setInvitedUsers((prev) => [res.data, ...prev])
      setEmail('')
      setRole('')
      setEmailError('')
      toast.success(t('invites.inviteSent', { email }))
    } catch (err) {
      toast.error(parseApiError(err, t))
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
      const baseUrl =
        import.meta.env.VITE_STUDIOOS_API_BASE_URL?.replace(/\/$/, '') ?? ''
      const res = await fetch(`${baseUrl}/api/accounts/invites/bulk/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const errors = body?.errors as Record<string, string[]> | undefined
        if (errors) {
          const messages = Object.values(errors).flat()
          toast.error(messages.join('. ') || t('invites.bulkError'))
        } else {
          toast.error(t('invites.bulkError'))
        }
        return
      }
      const data = await res.json()
      setBulkResult(data.data)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success(t('invites.bulkSuccess', { count: data.data.count }))
    } catch {
      toast.error(t('invites.bulkError'))
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
          <div className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={t('invites.emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) validateEmail(e.target.value)
                    }}
                    onBlur={() => validateEmail(email)}
                    className={`pl-10 ${emailError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSingleInvite()
                    }}
                  />
                </div>
                {emailError && (
                  <p className="mt-1 text-sm text-destructive">{emailError}</p>
                )}
              </div>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full sm:w-[160px]">
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
              <Button
                onClick={handleSingleInvite}
                disabled={sending || !isFormValid}
                className="gap-2"
              >
                {sending ? t('invites.sending') : t('invites.send')}
                {!sending && <ArrowRight className="size-4" />}
              </Button>
            </div>
          </div>
        </CardSection>

        {/* ── OR divider ── */}
        <div className="flex items-center gap-3 px-2">
          <Separator className="flex-1" />
          <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
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
              {uploading ? t('invites.uploading') : t('invites.uploadAndInvite')}
            </Button>
          </div>
        </CardSection>

        {/* ── Invite list ── */}
        {hasInvites && (
          <div className="pt-2">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t('invites.listTitle')}
            </p>
            <div className="divide-y divide-border">
              {allInvited.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5">
                  <span className="truncate text-sm">{u.email}</span>
                  <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                    {u.role?.[0]?.name ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
