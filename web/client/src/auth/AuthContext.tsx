import { useCallback, useEffect, useMemo, useState } from 'react'
import i18n from '@/i18n'
import { apiClient, SESSION_EXPIRED_EVENT } from '@/api/api-client'
import { AuthContext } from '@/auth/auth-context'
import type { AuthContextValue } from '@/auth/auth-context'
import type { Login, Me } from '@/api/studioos-api'
import type { ReactNode } from 'react'

const LANG_KEY = 'i18nextLng'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.api.accountsMeRetrieve()
      setUser(response.data)
      setStatus('authenticated')
      if (!localStorage.getItem(LANG_KEY) && response.data.language) {
        i18n.changeLanguage(response.data.language)
      }
      return response.data
    } catch {
      setUser(null)
      setStatus('unauthenticated')
      return null
    }
  }, [])

  const login = useCallback(
    async (credentials: Login) => {
      setStatus('loading')
      await apiClient.api.accountsAuthLoginCreate(credentials)

      const currentUser = await refreshUser()

      if (!currentUser) {
        throw new Error('Unable to load authenticated user.')
      }

      return currentUser
    },
    [refreshUser]
  )

  const logout = useCallback(async () => {
    try {
      await apiClient.api.accountsAuthLogoutCreate({})
    } finally {
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null)
      setStatus('unauthenticated')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      login,
      logout,
      refreshUser,
    }),
    [login, logout, refreshUser, status, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
