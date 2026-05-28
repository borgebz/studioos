import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { paths } from '@/app/paths'

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Thin permission-checking hook built on top of `useAuth()`.
 *
 * Always check **permissions**, never roles. Roles change; permissions are the
 * contract between backend enforcement (`require_perm`) and frontend visibility.
 *
 * ```tsx
 * const { can, canAny, canAll } = usePermissions()
 *
 * can('coachings.can_schedule_coaching')
 * canAny('accounts.can_invite_user', 'accounts.can_list_users')
 * canAll('enrollments.can_review_enrollment', 'enrollments.can_approve_enrollment')
 * ```
 */
export function usePermissions() {
  const { user } = useAuth()
  const perms = user?.permissions ?? []

  /** User holds this exact permission. */
  const can = (permission: string): boolean => perms.includes(permission)

  /** User holds **at least one** of the listed permissions. */
  const canAny = (...permissions: string[]): boolean =>
    permissions.some((p) => perms.includes(p))

  /** User holds **all** of the listed permissions. */
  const canAll = (...permissions: string[]): boolean =>
    permissions.every((p) => perms.includes(p))

  return { can, canAny, canAll } as const
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AuthorizedProps {
  /** Single permission code (OR-ed when an array is passed). */
  permission: string | string[]
  children: ReactNode
}

/**
 * Declarative guard — renders children only when the user holds the required
 * permission(s). When an array is given, **any** matching permission suffices.
 *
 * ```tsx
 * <Authorized permission="coachings.can_schedule_coaching">
 *   <Button>Create coaching</Button>
 * </Authorized>
 * ```
 */
export function Authorized({ permission, children }: AuthorizedProps) {
  const { can, canAny } = usePermissions()

  const allowed = Array.isArray(permission)
    ? canAny(...permission)
    : can(permission)

  if (!allowed) return null

  return children
}

// ---------------------------------------------------------------------------
// Route guard
// ---------------------------------------------------------------------------

export interface ProtectedRouteProps {
  /** Permission(s) required to access this route (OR-ed when array). */
  permission: string | string[]
  children: ReactNode
}

/**
 * Route-level guard — redirects to `/home` when the user lacks the required
 * permission. Use in `routes.tsx` to prevent direct-URL access:
 *
 * ```tsx
 * <Route
 *   path={paths.invites}
 *   element={
 *     <ProtectedRoute permission="accounts.can_invite_user">
 *       <InviteUsersPage />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */
export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { can, canAny } = usePermissions()

  const allowed = Array.isArray(permission)
    ? canAny(...permission)
    : can(permission)

  if (!allowed) return <Navigate to={paths.home} replace />

  return children
}
