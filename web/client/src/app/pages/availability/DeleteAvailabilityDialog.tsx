import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
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

interface DeleteAvailabilityDialogProps {
  /** Server id of the parent Availability (one-off slot or recurring rule). */
  availabilityId: number | null
  userId: number | null
  isRecurring: boolean
  onClose: () => void
  onDeleted: (availabilityId: number) => void
}

export function DeleteAvailabilityDialog({
  availabilityId,
  userId,
  isRecurring,
  onClose,
  onDeleted,
}: DeleteAvailabilityDialogProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const open = availabilityId != null && userId != null

  const handleConfirm = async () => {
    if (availabilityId == null || userId == null) return
    setSubmitting(true)
    try {
      await apiClient.api.availabilityTeachersDestroy(availabilityId, userId)
      onDeleted(availabilityId)
      toast.success(t('availability.deleteSuccess'))
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
            {isRecurring
              ? t('availability.deleteRecurringTitle')
              : t('availability.deleteOneOffTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRecurring
              ? t('availability.deleteRecurringDesc')
              : t('availability.deleteOneOffDesc')}
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
