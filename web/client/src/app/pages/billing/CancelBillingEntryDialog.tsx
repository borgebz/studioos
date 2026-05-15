import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { BillingEntryDetail, BillingEntryList } from '@/api/studioos-api'
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

interface CancelBillingEntryDialogProps {
  entry: BillingEntryList | null
  onClose: () => void
  onCancelled: (updated: BillingEntryDetail) => void
}

export function CancelBillingEntryDialog({
  entry,
  onClose,
  onCancelled,
}: CancelBillingEntryDialogProps) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (entry) setNotes('')
  }, [entry])

  const open = entry != null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entry) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.billingEntriesCancelCreate(entry.id, {
        notes: notes.trim(),
      })
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
            <DialogTitle>{t('billing.cancelTitle')}</DialogTitle>
            <DialogDescription>{t('billing.cancelDesc')}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <Label htmlFor="cancel-notes">
              {t('billing.notes')}
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-notes"
              rows={4}
              placeholder={t('billing.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={submitting || !notes.trim()}
            >
              {submitting ? t('billing.cancelling') : t('billing.confirmCancel')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
