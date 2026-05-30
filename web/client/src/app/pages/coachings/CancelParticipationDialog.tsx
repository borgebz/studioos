import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { CoachingClass, CoachingParticipant } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface CancelParticipationDialogProps {
  coaching: CoachingClass | null
  participant: CoachingParticipant | null
  onClose: () => void
  onCancelled: (updated: CoachingParticipant) => void
}

/**
 * Late-cancellation window — kept in sync with API setting
 * COACHING_LATE_CANCELLATION_HOURS (default 48). Cancelling within this window
 * flips the participant status to late_cancelled and may generate a fine at
 * coaching completion.
 */
const LATE_CANCELLATION_HOURS = 48

export function CancelParticipationDialog({
  coaching,
  participant,
  onClose,
  onCancelled,
}: CancelParticipationDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (coaching) setReason('')
  }, [coaching])

  const open = coaching != null && participant != null

  // Compute whether the cancellation falls inside the late window.
  const isLateCancel = (() => {
    if (!coaching?.start_datetime) return false
    const hoursUntil =
      (new Date(coaching.start_datetime).getTime() - Date.now()) /
      (1000 * 60 * 60)
    return hoursUntil < LATE_CANCELLATION_HOURS && hoursUntil > 0
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coaching || !participant) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.coachingsParticipantsCancelCreate(
        coaching.id,
        participant.id,
        { cancellation_reason: reason.trim() || undefined }
      )
      if (res.data) onCancelled(res.data)
      onClose()
    } catch (err) {
      toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {t('myCoachings.cancelParticipation.title')}
            </DialogTitle>
            <DialogDescription>
              {t('myCoachings.cancelParticipation.desc')}
            </DialogDescription>
          </DialogHeader>

          {isLateCancel && (
            <div
              className={cn(
                'mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900',
                'dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
              )}
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {t('myCoachings.cancelParticipation.lateWarning', {
                  hours: LATE_CANCELLATION_HOURS,
                })}
              </span>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Label htmlFor="cancel-reason">
              {t('myCoachings.cancelParticipation.reasonLabel')}
            </Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              placeholder={t(
                'myCoachings.cancelParticipation.reasonPlaceholder'
              )}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting
                ? t('myCoachings.cancelParticipation.submitting')
                : t('myCoachings.cancelParticipation.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
