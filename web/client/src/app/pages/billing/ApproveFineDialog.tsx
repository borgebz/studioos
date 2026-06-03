import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { FineDetail, FineList } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ApproveFineDialogProps {
  fine: FineList | null
  onClose: () => void
  onApproved: (updated: FineDetail) => void
}

export function ApproveFineDialog({
  fine,
  onClose,
  onApproved,
}: ApproveFineDialogProps) {
  const { t } = useTranslation()
  const currency = t('common.currencySymbol')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingSuggested, setLoadingSuggested] = useState(false)

  useEffect(() => {
    if (!fine) return
    setAmount('')
    setNotes('')
    setLoadingSuggested(true)
    apiClient.api
      .billingFinesRetrieve(fine.id)
      .then((res) => {
        if (res.data?.suggested_amount) setAmount(res.data.suggested_amount)
      })
      .catch(() => {
        // If fetching suggestion fails, the user can still type a value or leave
        // it blank — the API will fall back to COACHING_FINE_DEFAULT_AMOUNT.
      })
      .finally(() => setLoadingSuggested(false))
  }, [fine])

  const open = fine != null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fine) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.billingFinesApproveCreate(fine.id, {
        amount: amount.trim() || null,
        notes: notes.trim(),
      })
      if (res.data) onApproved(res.data)
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
            <DialogTitle>{t('billingFines.approveTitle')}</DialogTitle>
            <DialogDescription>
              {t('billingFines.approveDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-amount">
                {t('billingFines.amountLabel')}
                <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currency}
                </span>
                <Input
                  id="approve-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className="pl-7 tabular-nums"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loadingSuggested}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-notes">
                {t('billingFines.notesLabel')}
              </Label>
              <Textarea
                id="approve-notes"
                rows={3}
                placeholder={t('billingFines.notesApprovePlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingSuggested || !amount.trim()}
            >
              {submitting
                ? t('billingFines.approving')
                : t('billingFines.approve')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
