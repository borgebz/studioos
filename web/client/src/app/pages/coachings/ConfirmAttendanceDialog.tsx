import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { CoachingClass, CoachingParticipant } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmAttendanceDialogProps {
  coaching: CoachingClass | null
  participant: CoachingParticipant | null
  /** Choice the user made: true = attended, false = absent. */
  attended: boolean
  onClose: () => void
  onConfirmed: (updated: CoachingParticipant) => void
}

export function ConfirmAttendanceDialog({
  coaching,
  participant,
  attended,
  onClose,
  onConfirmed,
}: ConfirmAttendanceDialogProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const open = coaching != null && participant != null

  const handleConfirm = async () => {
    if (!coaching || !participant) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.coachingsParticipantsConfirmAttendanceCreate(
        coaching.id,
        participant.id,
        { attended }
      )
      if (res.data) onConfirmed(res.data)
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
            {attended
              ? t('myCoachings.confirmAttendance.attendedTitle')
              : t('myCoachings.confirmAttendance.absentTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {attended
              ? t('myCoachings.confirmAttendance.attendedDesc')
              : t('myCoachings.confirmAttendance.absentDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            variant={attended ? 'default' : 'destructive'}
          >
            {submitting
              ? t('myCoachings.confirmAttendance.submitting')
              : attended
                ? t('myCoachings.confirmAttendance.attendedSubmit')
                : t('myCoachings.confirmAttendance.absentSubmit')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
