import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { Classe } from '@/api/studioos-api'
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

interface DeleteClassDialogProps {
  classe: Classe | null
  onClose: () => void
  onDeleted: (id: number) => void
}

export function DeleteClassDialog({
  classe,
  onClose,
  onDeleted,
}: DeleteClassDialogProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const open = classe != null

  const handleConfirm = async () => {
    if (!classe) return
    setSubmitting(true)
    try {
      await apiClient.api.classesDestroy(classe.id)
      onDeleted(classe.id)
      toast.success(t('classes.deleteSuccess'))
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
            {t('classes.deleteTitle', { name: classe?.name ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('classes.deleteDesc')}
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
