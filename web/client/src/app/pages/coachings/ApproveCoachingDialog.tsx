import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { CoachingClass, Studio } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ApproveCoachingDialogProps {
  coaching: CoachingClass | null
  onClose: () => void
  onApproved: (updated: CoachingClass) => void
}

export function ApproveCoachingDialog({
  coaching,
  onClose,
  onApproved,
}: ApproveCoachingDialogProps) {
  const { t } = useTranslation()
  const [studios, setStudios] = useState<Studio[]>([])
  const [studioId, setStudioId] = useState<string>('')
  const [totalPrice, setTotalPrice] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!coaching) return
    // Pre-fill from the existing request when possible.
    setStudioId(coaching.studio?.id ? String(coaching.studio.id) : '')
    setTotalPrice(coaching.total_price ?? '')
  }, [coaching])

  useEffect(() => {
    if (!coaching) return
    let cancelled = false
    apiClient.api
      .studiosList()
      .then((res) => {
        if (cancelled) return
        setStudios(res.data ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setStudios([])
      })
    return () => {
      cancelled = true
    }
  }, [coaching])

  const open = coaching != null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coaching) return
    if (!studioId || !totalPrice) return
    setSubmitting(true)
    try {
      const res = await apiClient.api.coachingsApproveCreate(coaching.id, {
        studio_id: Number(studioId),
        total_price: totalPrice,
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
            <DialogTitle>{t('coachingRequests.approveTitle')}</DialogTitle>
            <DialogDescription>
              {t('coachingRequests.approveDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-studio">
                {t('coachingRequests.studio')}
              </Label>
              <Select value={studioId} onValueChange={setStudioId}>
                <SelectTrigger id="approve-studio">
                  <SelectValue
                    placeholder={t('coachingRequests.selectStudio')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {studios.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-price">
                {t('coachingRequests.totalPrice')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {t('common.currencySymbol')}
                </span>
                <Input
                  id="approve-price"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="pl-7"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  autoFocus
                />
              </div>
              {coaching && coaching.participants?.length > 0 && totalPrice && (
                <p className="text-xs text-muted-foreground">
                  {t('coachingRequests.pricePerParticipant', {
                    price: (
                      Number(totalPrice || 0) /
                      Math.max(coaching.participants.length, 1)
                    ).toFixed(2),
                  })}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting || !studioId || !totalPrice}
            >
              {submitting
                ? t('coachingRequests.approving')
                : t('coachingRequests.approve')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
