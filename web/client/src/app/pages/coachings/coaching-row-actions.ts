import type { CoachingClass, CoachingParticipant } from '@/api/studioos-api'
import {
  CoachingClassStatusEnum,
  CoachingParticipantStatusEnum,
} from '@/api/studioos-api'

/**
 * What the current user can do on a coaching row, given their perms and the
 * row's state. Used to:
 *   - render the row dropdown in MyCoachingRequestsPage
 *   - count rows with at least one pending action for the sidebar indicator
 *
 * Symmetric for self and guardian-on-behalf-of-dependent: when the current
 * user is a guardian, we resolve their dependent's participant row and treat
 * it as the actor. ``onBehalfOf`` is non-null in that case and must be sent to
 * the accept/cancel endpoints.
 */

export interface CoachingActorContext {
  userId: number
  canTeach: boolean
  canParticipate: boolean
  canGuardian: boolean
}

export interface CoachingRowActions {
  /** Teacher actions (when teacher_id === userId) */
  teacherAccept: boolean
  teacherReject: boolean
  teacherConfirmSession: boolean
  /** Requester can withdraw before coordination schedules */
  requesterCancel: boolean
  /** Participant row of the current user (or their dependent) */
  participant: CoachingParticipant | null
  /** Dependent student id, when the participant belongs to a dependent */
  onBehalfOf: number | null
  /** Actions on the participant row */
  participantAcceptInvite: boolean
  participantConfirmAttendance: boolean
  participantCancel: boolean
}

/**
 * Identify the participant row the current user is acting on. Prefers their
 * own row over a dependent's — a teacher who also has dependents enrolled in
 * the same coaching (unlikely but possible) acts on themselves first.
 */
/** Student the guardian is acting for in this coaching, if any. */
export function dependentStudentInCoaching(
  coaching: CoachingClass,
  ctx: CoachingActorContext
): NonNullable<CoachingParticipant['student']> | null {
  if (!ctx.canGuardian) return null
  const { participant, onBehalfOf } = findActingParticipant(coaching, ctx)
  if (onBehalfOf && participant?.student) return participant.student
  return null
}

export function findActingParticipant(
  coaching: CoachingClass,
  ctx: CoachingActorContext
): { participant: CoachingParticipant | null; onBehalfOf: number | null } {
  const own =
    coaching.participants?.find((p) => p.student?.id === ctx.userId) ?? null
  if (own) return { participant: own, onBehalfOf: null }
  if (!ctx.canGuardian) return { participant: null, onBehalfOf: null }
  const dep =
    coaching.participants?.find((p) => p.student?.parent_id === ctx.userId) ??
    null
  return {
    participant: dep,
    onBehalfOf: dep?.student?.id ?? null,
  }
}

export function getCoachingRowActions(
  coaching: CoachingClass,
  ctx: CoachingActorContext
): CoachingRowActions {
  const status = coaching.status
  const isTeacher = coaching.teacher?.id === ctx.userId && ctx.canTeach
  const isRequester = coaching.requested_by?.id === ctx.userId
  const { participant, onBehalfOf } = findActingParticipant(coaching, ctx)
  const pStatus = participant?.status

  return {
    teacherAccept:
      isTeacher && status === CoachingClassStatusEnum.Requested,
    teacherReject:
      isTeacher && status === CoachingClassStatusEnum.Requested,
    teacherConfirmSession:
      isTeacher && status === CoachingClassStatusEnum.WaitingConfirmation,
    requesterCancel:
      isRequester &&
      (status === CoachingClassStatusEnum.Requested ||
        status === CoachingClassStatusEnum.PendingApproval),
    participant,
    onBehalfOf,
    participantAcceptInvite:
      pStatus === CoachingParticipantStatusEnum.Invited,
    participantConfirmAttendance:
      pStatus === CoachingParticipantStatusEnum.PendingCompletion,
    participantCancel:
      pStatus === CoachingParticipantStatusEnum.Invited ||
      pStatus === CoachingParticipantStatusEnum.Pending ||
      pStatus === CoachingParticipantStatusEnum.Active,
  }
}

/**
 * Whether the row needs the current user's attention right now. Powers the
 * sidebar indicator. Includes only "act now" actions — not "you may cancel".
 */
export function rowHasPendingAction(actions: CoachingRowActions): boolean {
  return (
    actions.teacherAccept ||
    actions.teacherConfirmSession ||
    actions.participantAcceptInvite ||
    actions.participantConfirmAttendance
  )
}
