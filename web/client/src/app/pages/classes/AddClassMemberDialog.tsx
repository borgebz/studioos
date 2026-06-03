import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, Search, UserPlus } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { ClasseMember, UserResponse } from '@/api/studioos-api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/user-utils'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

interface AddClassMemberDialogProps {
  open: boolean
  classeId: number
  existingStudentIds: number[]
  onClose: () => void
  onAdded: (member: ClasseMember) => void
}

function userName(user: UserResponse): string {
  const full = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return user.display_name || full || user.email
}

export function AddClassMemberDialog({
  open,
  classeId,
  existingStudentIds,
  onClose,
  onAdded,
}: AddClassMemberDialogProps) {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 250)
  const [results, setResults] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    if (!open) return
    const term = search.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    const reqId = ++reqIdRef.current
    setLoading(true)
    apiClient.api
      .listUsers({ search: term, is_active: true })
      .then((res) => {
        if (reqId !== reqIdRef.current) return
        const arr = res.data?.results ?? []
        setResults(arr)
      })
      .catch(() => {
        if (reqId !== reqIdRef.current) return
        setResults([])
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setLoading(false)
      })
  }, [search, open])

  useEffect(() => {
    if (!open) {
      setSearchInput('')
      setResults([])
    }
  }, [open])

  const handleAdd = async (user: UserResponse) => {
    setSubmittingId(user.id)
    try {
      const res = await apiClient.api.classesMembersCreate(classeId, {
        student_id: user.id,
      })
      if (res.data) {
        onAdded(res.data)
        toast.success(t('classes.members.addSuccess'))
      }
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('classes.members.addTitle')}</DialogTitle>
          <DialogDescription>
            {t('classes.members.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('classes.members.searchPlaceholder')}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border border-border">
          {loading && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
          {!loading && search.trim().length < 2 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t('classes.members.typeToSearch')}
            </div>
          )}
          {!loading && search.trim().length >= 2 && results.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t('classes.members.noResults')}
            </div>
          )}
          {!loading &&
            results.map((u) => {
              const already = existingStudentIds.includes(u.id)
              const name = userName(u)
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    {u.photo_url && (
                      <AvatarImage src={u.photo_url} alt={name} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={already ? 'ghost' : 'outline'}
                    disabled={already || submittingId === u.id}
                    onClick={() => handleAdd(u)}
                  >
                    {already ? (
                      t('classes.members.alreadyMember')
                    ) : submittingId === u.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="size-3.5" />
                        {t('classes.members.add')}
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
