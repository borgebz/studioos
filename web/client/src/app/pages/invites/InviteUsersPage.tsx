import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Upload, UserPlus, FileSpreadsheet, X, Check } from 'lucide-react'
import { apiClient } from '@/api/api-client'
import type { RoleList, UserResponse } from '@/api/studioos-api'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLayout } from '@/components/shared/PageLayout'
import { CardSection } from '@/components/shared/CardSection'
import { toast } from 'sonner'
import { paths } from '@/app/paths'

export function InviteUsersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [roles, setRoles] = useState<RoleList[]>([])
  const rolesLoaded = useRef(false)

  // Single invite state
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [sending, setSending] = useState(false)
  const [invitedUsers, setInvitedUsers] = useState<UserResponse[]>([])

  // Bulk invite state
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ users: UserResponse[]; count: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (rolesLoaded.current) return
    rolesLoaded.current = true
    apiClient.api.apiRolesList().then((res) => {
      setRoles(res.data)
    })
  }, [])

  const handleSingleInvite = async () => {
    if (!email || !role) {
      toast.error(t('invites.missingFields'))
      return
    }
    setSending(true)
    try {
      const res = await apiClient.api.apiAccountsInvitesCreate({ email, role })
      setInvitedUsers((prev) => [res.data, ...prev])
      setEmail('')
      setRole('')
      toast.success(t('invites.inviteSent', { email }))
    } catch {
      toast.error(t('invites.inviteError'))
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
      const baseUrl = import.meta.env.VITE_STUDIOOS_API_BASE_URL?.replace(/\/$/, '') ?? ''
      const res = await fetch(`${baseUrl}/api/accounts/invites/bulk/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!res.ok) throw new Error()
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

  return (
    <PageLayout
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="outline" onClick={() => navigate(paths.home)}>
            {t('invites.back')}
          </Button>
          <div className="text-xs text-muted-foreground">
            {invitedUsers.length > 0 &&
              t('invites.invitedCount', { count: invitedUsers.length })}
          </div>
        </div>
      }
    >
      <PageHeader title={t('invites.title')} backTo={paths.home} />

      <Tabs defaultValue="single" className="max-w-2xl">
        <TabsList className="mb-6">
          <TabsTrigger value="single">
            <UserPlus className="mr-2 size-4" />
            {t('invites.singleTab')}
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <FileSpreadsheet className="mr-2 size-4" />
            {t('invites.bulkTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <CardSection
            title={t('invites.singleTitle')}
            description={t('invites.singleDesc')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('invites.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('invites.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSingleInvite()
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('invites.role')}</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
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
                </div>
              </div>
              <Button onClick={handleSingleInvite} disabled={sending || !email || !role}>
                {sending ? t('invites.sending') : t('invites.sendInvite')}
              </Button>
            </div>
          </CardSection>

          {invitedUsers.length > 0 && (
            <CardSection title={t('invites.recentInvites')} className="mt-4">
              <div className="space-y-2">
                {invitedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Check className="size-4 text-emerald-500" />
                      <span className="text-sm">{u.email}</span>
                    </div>
                    <Badge variant="secondary">
                      {u.role?.[0]?.name ?? '—'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardSection>
          )}
        </TabsContent>

        <TabsContent value="bulk">
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
                    <FileSpreadsheet className="size-4 text-emerald-500" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      onClick={() => {
                        setFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted"
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

          {bulkResult && (
            <CardSection
              title={t('invites.bulkResultTitle', { count: bulkResult.count })}
              className="mt-4"
            >
              <div className="space-y-2">
                {bulkResult.users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Check className="size-4 text-emerald-500" />
                      <span className="text-sm">{u.email}</span>
                    </div>
                    <Badge variant="secondary">
                      {u.role?.[0]?.name ?? '—'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardSection>
          )}
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
