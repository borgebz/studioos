import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { CoachingClass } from '@/api/studioos-api'
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

interface RejectCoachingDialogProps {
  coaching: CoachingClass | null
  onClose: () => void
  onRejected: (updated: CoachingClass) => void
}

export function RejectCoachingDialog({
  coaching,
  onClose,
  onRejected,
}: RejectCoachingDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (coaching) setReason('')
  }, [coaching])

  const open = coaching != null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coaching) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.coachingsRejectCreate(coaching.id, {
        rejection_reason: reason.trim() || undefined,
      })
      if (res.data) onRejected(res.data)
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
            <DialogTitle>{t('coachingRequests.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('coachingRequests.rejectDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <Label htmlFor="reject-reason">
              {t('coachingRequests.rejectionReason')}
            </Label>
            <Textarea
              id="reject-reason"
              rows={4}
              placeholder={t('coachingRequests.rejectionReasonPlaceholder')}
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
                ? t('coachingRequests.rejecting')
                : t('coachingRequests.reject')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
