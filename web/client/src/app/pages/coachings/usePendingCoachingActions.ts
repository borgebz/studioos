import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiClient } from '@/api/api-client'
import { useAuth } from '@/auth/useAuth'
import { usePermissions } from '@/auth/permissions'
import {
  CoachingClassStatusEnum,
  type CoachingClass,
} from '@/api/studioos-api'

import {
  getCoachingRowActions,
  rowHasPendingAction,
  type CoachingActorContext,
} from './coaching-row-actions'

const POLL_INTERVAL_MS = 60_000

/** Custom event — dispatch from anywhere to force every mounted hook to refetch. */
const PENDING_REFRESH_EVENT = 'studioos:pending-coachings-refresh'

export function triggerPendingCoachingsRefresh() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PENDING_REFRESH_EVENT))
}

/**
 * Counts coachings in the current user's "My Coachings" inbox that need their
 * attention right now (teacher accept on requested, teacher confirm on
 * waiting_confirmation, participant accept-invite, participant
 * confirm-attendance). The number drives the yellow sidebar indicator.
 *
 * Skips the request entirely when the user has none of the qualifying perms.
 */
export function usePendingCoachingActions(): {
  count: number
  refresh: () => void
} {
  const { user } = useAuth()
  const { can } = usePermissions()
  const userId = user?.id ?? null

  const actorCtx = useMemo<CoachingActorContext>(
    () => ({
      userId: userId ?? -1,
      canTeach: can('accounts.can_teach'),
      canParticipate: can('accounts.can_participate_in_coaching'),
      canGuardian: can('coachings.can_confirm_dependent_coaching_attendance'),
    }),
    [userId, can]
  )

  // Mirror the for_me_roles build from MyCoachingRequestsPage so we count the
  // same population the page will display.
  const forMeRoles = useMemo<
    Array<'requester' | 'teacher' | 'participant' | 'dependent'>
  >(() => {
    const roles: Array<'requester' | 'teacher' | 'participant' | 'dependent'> =
      []
    if (can('coachings.add_coachingclass')) roles.push('requester')
    if (can('accounts.can_teach')) roles.push('teacher')
    if (can('accounts.can_participate_in_coaching')) roles.push('participant')
    if (can('coachings.can_confirm_dependent_coaching_attendance'))
      roles.push('dependent')
    return roles
  }, [can])
  const forMeRolesKey = forMeRoles.slice().sort().join(',')

  // Only the three statuses where a current-user action is possible. Saves
  // bandwidth and lets the DB use the status index.
  const activeStatuses = useMemo<CoachingClassStatusEnum[]>(
    () => [
      CoachingClassStatusEnum.Requested,
      CoachingClassStatusEnum.Scheduled,
      CoachingClassStatusEnum.WaitingConfirmation,
    ],
    []
  )

  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (userId === null || forMeRoles.length === 0) {
      setCount(0)
      return
    }
    try {
      const res = await apiClient.api.getAllCoachings({
        for_me_roles: forMeRoles,
        status: activeStatuses,
      })
      const rows = ((res.data as { results?: CoachingClass[] }).results ??
        []) as CoachingClass[]
      const n = rows.reduce(
        (acc, row) =>
          acc + (rowHasPendingAction(getCoachingRowActions(row, actorCtx)) ? 1 : 0),
        0
      )
      setCount(n)
    } catch {
      // non-fatal — keep previous count
    }
    // forMeRolesKey makes the hook re-fetch when the role set changes, while
    // keeping the actual array reference stable inside the call.
  }, [userId, forMeRoles, activeStatuses, actorCtx, forMeRolesKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, POLL_INTERVAL_MS)
    const onFocus = () => refresh()
    const onAppRefresh = () => refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener(PENDING_REFRESH_EVENT, onAppRefresh)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(PENDING_REFRESH_EVENT, onAppRefresh)
    }
  }, [refresh])

  return { count, refresh }
}
