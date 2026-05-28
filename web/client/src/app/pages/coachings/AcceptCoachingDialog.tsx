import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { CoachingClass } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AcceptCoachingDialogProps {
  coaching: CoachingClass | null
  onClose: () => void
  onAccepted: (updated: CoachingClass) => void
}

export function AcceptCoachingDialog({
  coaching,
  onClose,
  onAccepted,
}: AcceptCoachingDialogProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const open = coaching != null

  const handleAccept = async () => {
    if (!coaching) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.coachingsAcceptCreate(coaching.id)
      if (res.data) onAccepted(res.data)
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
        if (!o) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('coachingRequests.acceptTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('coachingRequests.acceptDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleAccept} disabled={submitting}>
            {submitting
              ? t('coachingRequests.accepting')
              : t('coachingRequests.accept')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
