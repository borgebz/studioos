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

interface TeacherConfirmSessionDialogProps {
  coaching: CoachingClass | null
  onClose: () => void
  onConfirmed: (updated: CoachingClass) => void
}

export function TeacherConfirmSessionDialog({
  coaching,
  onClose,
  onConfirmed,
}: TeacherConfirmSessionDialogProps) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (coaching) setNotes('')
  }, [coaching])

  const open = coaching != null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coaching) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.coachingsTeacherConfirmCreate(
        coaching.id,
        { teacher_notes: notes.trim() || undefined }
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('myCoachings.teacherConfirm.title')}</DialogTitle>
            <DialogDescription>
              {t('myCoachings.teacherConfirm.desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <Label htmlFor="teacher-notes">
              {t('myCoachings.teacherConfirm.notesLabel')}
            </Label>
            <Textarea
              id="teacher-notes"
              rows={4}
              placeholder={t('myCoachings.teacherConfirm.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? t('myCoachings.teacherConfirm.submitting')
                : t('myCoachings.teacherConfirm.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
