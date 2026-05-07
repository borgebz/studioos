import { createContext } from 'react'
import type { Login, Me } from '@/api/studioos-api'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type AuthContextValue = {
  user: Me | null
  status: AuthStatus
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: Login) => Promise<Me>
  logout: () => Promise<void>
  refreshUser: () => Promise<Me | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
