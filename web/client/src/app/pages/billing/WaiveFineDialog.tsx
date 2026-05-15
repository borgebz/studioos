import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { FineDetail, FineList } from '@/api/studioos-api'
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

interface WaiveFineDialogProps {
  fine: FineList | null
  onClose: () => void
  onWaived: (updated: FineDetail) => void
}

export function WaiveFineDialog({
  fine,
  onClose,
  onWaived,
}: WaiveFineDialogProps) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (fine) setNotes('')
  }, [fine])

  const open = fine != null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fine) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.billingFinesWaiveCreate(fine.id, {
        notes: notes.trim(),
      })
      if (res.data) onWaived(res.data)
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
            <DialogTitle>{t('billingFines.waiveTitle')}</DialogTitle>
            <DialogDescription>
              {t('billingFines.waiveDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <Label htmlFor="waive-notes">
              {t('billingFines.waiveNotes')}
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Textarea
              id="waive-notes"
              rows={4}
              placeholder={t('billingFines.waiveNotesPlaceholder')}
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
              {submitting
                ? t('billingFines.waiving')
                : t('billingFines.waive')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
