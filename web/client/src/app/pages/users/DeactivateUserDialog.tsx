import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { UserResponse } from '@/api/studioos-api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface DeactivateUserDialogProps {
  user: UserResponse | null
  onClose: () => void
  onDeactivated: (updated: UserResponse) => void
}

export function DeactivateUserDialog({
  user,
  onClose,
  onDeactivated,
}: DeactivateUserDialogProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const open = user != null
  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : ''

  const handleConfirm = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.deactivateUser(user.id)
      if (res.data) {
        onDeactivated(res.data)
        toast.success(t('users.deactivateSuccess'))
      }
      onClose()
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('users.deactivateTitle', { name: displayName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('users.deactivateDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? t('users.deactivating') : t('users.deactivate')}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
