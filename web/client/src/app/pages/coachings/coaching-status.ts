/**
 * Shared status → badge color mapping for coaching classes.
 *
 * Keyed by `CoachingClassStatusEnum` value. Follows the design-system status
 * palette (§Badges): amber = pending, emerald = active/scheduled, blue =
 * awaiting a counterparty, muted = terminal, red = rejected. Reused by the
 * coaching list (`StatusPill`) and the calendar detail drawer so the same
 * status always reads the same color.
 */
import {
  CoachingClassStatusEnum,
  CoachingParticipantStatusEnum,
} from '@/api/studioos-api'

/**
 * Terminal coaching statuses — the session is finished, cancelled, or rejected,
 * so its schedule can no longer be edited.
 */
const TERMINAL_COACHING_STATUSES = new Set<string>([
  CoachingClassStatusEnum.Completed,
  CoachingClassStatusEnum.Cancelled,
  CoachingClassStatusEnum.Rejected,
])

/** Whether a coaching is still in an editable (non-terminal) lifecycle stage. */
export function isEditableCoachingStatus(status?: string | null): boolean {
  return !!status && !TERMINAL_COACHING_STATUSES.has(status)
}

export const COACHING_STATUS_STYLES: Record<string, string> = {
  requested:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  pending_approval:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  scheduled:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  waiting_confirmation:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  pending_completion_approval:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

/** Status → badge color mapping for coaching *participants*. */
export const PARTICIPANT_STATUS_STYLES: Record<string, string> = {
  invited:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  pending:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  active:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending_completion:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  attended:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-muted text-muted-foreground',
  late_cancelled: 'bg-muted text-muted-foreground',
}

/** Participant rows that staff can still remove (cancel) from a coaching. */
const CANCELLABLE_PARTICIPANT_STATUSES = new Set<string>([
  CoachingParticipantStatusEnum.Invited,
  CoachingParticipantStatusEnum.Pending,
  CoachingParticipantStatusEnum.Active,
])

export function isCancellableParticipantStatus(
  status?: string | null
): boolean {
  return !!status && CANCELLABLE_PARTICIPANT_STATUSES.has(status)
}

/**
 * A participant still counts as part of the session unless they've been
 * cancelled. Used to filter the "current participants" roster and its count.
 */
export function isActiveParticipant(status?: string | null): boolean {
  return (
    status !== CoachingParticipantStatusEnum.Cancelled &&
    status !== CoachingParticipantStatusEnum.LateCancelled
  )
}
