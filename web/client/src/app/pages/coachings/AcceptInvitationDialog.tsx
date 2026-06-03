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

interface AcceptInvitationDialogProps {
  coaching: CoachingClass | null
  participant: CoachingParticipant | null
  /** Pass the dependent's student id when a guardian is acting; null/undefined for self. */
  onBehalfOf?: number | null
  onClose: () => void
  onAccepted: (updated: CoachingParticipant) => void
}

export function AcceptInvitationDialog({
  coaching,
  participant,
  onBehalfOf,
  onClose,
  onAccepted,
}: AcceptInvitationDialogProps) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const open = coaching != null && participant != null
  // invited_by_staff → accept goes straight to active; otherwise needs coord approval.
  const goesActive = participant?.invited_by_staff === true

  const handleAccept = async () => {
    if (!coaching) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.coachingsParticipantsAcceptCreate(
        coaching.id,
        onBehalfOf ? { on_behalf_of: onBehalfOf } : {}
      )
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
            {t('myCoachings.acceptInvite.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {goesActive
              ? t('myCoachings.acceptInvite.descStaff')
              : t('myCoachings.acceptInvite.descPeer')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleAccept} disabled={submitting}>
            {submitting
              ? t('myCoachings.acceptInvite.accepting')
              : t('myCoachings.acceptInvite.accept')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
