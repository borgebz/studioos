/**
 * AvailabilityHint — inline conflict preview for coaching forms.
 *
 * Polls ``GET /api/coachings/check-availability/`` 400ms after the inputs
 * settle, then surfaces three states: free / conflict / loading. The "View"
 * button lets the parent open a fuller drawer (TeacherStudioAvailabilityDialog).
 *
 * Shared between the admin CoachingForm and the request flow so both keep the
 * same UX. Date+time → datetime conversion lives in ``buildCurrentSlot``.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { apiClient } from '@/api/api-client'
import type { CoachingAvailability } from '@/api/studioos-api'
import { Button } from '@/components/ui/button'

export interface AvailabilityHintProps {
  teacherId: number | null
  studioId: number | null
  startDatetime: string | null
  endDatetime: string | null
  /** When editing an existing coaching, exclude its own slot from conflict checks. */
  excludeCoachingId: number | null
  onOpenDrawer: () => void
}

/**
 * Combine a calendar date with two HH:MM strings into a {start, end} pair.
 * Returns null whenever the inputs are incomplete or the end is not after start.
 */
export function buildCurrentSlot(
  date: Date | undefined,
  startTime: string,
  endTime: string
): { start: Date; end: Date } | null {
  if (!date || !startTime || !endTime) return null
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  ) {
    return null
  }
  const start = new Date(date)
  start.setHours(sh, sm, 0, 0)
  const end = new Date(date)
  end.setHours(eh, em, 0, 0)
  if (end <= start) return null
  return { start, end }
}

export function AvailabilityHint({
  teacherId,
  studioId,
  startDatetime,
  endDatetime,
  excludeCoachingId,
  onOpenDrawer,
}: AvailabilityHintProps) {
  const { t } = useTranslation()
  const [result, setResult] = useState<CoachingAvailability | null>(null)
  const [loading, setLoading] = useState(false)

  const inputsReady =
    teacherId !== null && startDatetime !== null && endDatetime !== null

  useEffect(() => {
    if (!inputsReady) {
      setResult(null)
      return
    }
    let cancelled = false
    setLoading(true)
    const handle = window.setTimeout(() => {
      apiClient.api
        .checkCoachingAvailability({
          teacher_id: teacherId!,
          studio_id: studioId ?? undefined,
          date_from: startDatetime!,
          date_to: endDatetime!,
          exclude_coaching_id: excludeCoachingId ?? undefined,
        })
        .then((res) => {
          if (!cancelled) setResult(res.data)
        })
        .catch(() => {
          if (!cancelled) setResult(null)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [
    inputsReady,
    teacherId,
    studioId,
    startDatetime,
    endDatetime,
    excludeCoachingId,
  ])

  if (!inputsReady) return null

  if (loading && !result) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t('coachings.availability.hint.checking')}
      </div>
    )
  }

  if (!result) return null

  const teacherCount = result.teacher_busy.length
  const studioCount = result.studio_busy.length
  const total = teacherCount + studioCount

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t('coachings.availability.hint.free')}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>
          {teacherCount > 0 && studioCount > 0
            ? t('coachings.availability.hint.bothConflicts', {
                teacher: teacherCount,
                studio: studioCount,
              })
            : teacherCount > 0
              ? t('coachings.availability.hint.teacherConflicts', {
                  count: teacherCount,
                })
              : t('coachings.availability.hint.studioConflicts', {
                  count: studioCount,
                })}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-amber-800 hover:text-amber-900 dark:text-amber-300"
        onClick={onOpenDrawer}
      >
        {t('coachings.availability.hint.view')}
      </Button>
    </div>
  )
}
