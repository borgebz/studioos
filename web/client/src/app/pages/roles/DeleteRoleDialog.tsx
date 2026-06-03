import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import { translateApiValue } from '@/lib/translate-api-value'
import type { RoleList } from '@/api/studioos-api'
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

interface DeleteRoleDialogProps {
  role: RoleList | null
  onClose: () => void
  onDeleted: (code: string) => void
}

export function DeleteRoleDialog({
  role,
  onClose,
  onDeleted,
}: DeleteRoleDialogProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const open = role != null

  const handleConfirm = async () => {
    if (!role) return
    setSubmitting(true)
    try {
      await apiClient.api.rolesDestroy(role.code)
      onDeleted(role.code)
      toast.success(t('rolesAdmin.deleteSuccess'))
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
            {t('rolesAdmin.deleteTitle', {
              name: role
                ? translateApiValue('roleValues.name', role.name, t)
                : '',
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('rolesAdmin.deleteDesc')}
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
              {submitting ? t('common.deleting') : t('common.delete')}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
