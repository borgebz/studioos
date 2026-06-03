import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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

interface ConfirmDeleteDialogProps {
  open: boolean
  title: string
  description: string
  successMessage: string
  /** The destroy API call. Should reject on failure. */
  onConfirm: () => Promise<unknown>
  onClose: () => void
  onDeleted: () => void
}

/**
 * Generic destructive confirmation dialog used by the inventory settings
 * tabs. The caller supplies the entity-specific copy and the API call.
 */
export function ConfirmDeleteDialog({
  open,
  title,
  description,
  successMessage,
  onConfirm,
  onClose,
  onDeleted,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await onConfirm()
      onDeleted()
      toast.success(successMessage)
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
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
