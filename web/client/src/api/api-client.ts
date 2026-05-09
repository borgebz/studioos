import { Api } from '@/api/studioos-api'
import type { ApiConfig, RequestParams } from '@/api/studioos-api'

const API_BASE_URL = import.meta.env.VITE_STUDIOOS_API_BASE_URL ?? ''

type StudioOSApiClientConfig = Omit<ApiConfig<unknown>, 'baseUrl'> & {
  baseUrl?: string
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/$/, '')

export const SESSION_EXPIRED_EVENT = 'studioos:session-expired'

const AUTH_PATHS = ['/api/accounts/auth/login/', '/api/accounts/auth/logout/', '/api/accounts/auth/refresh/']

let refreshPromise: Promise<Response> | null = null

function createAuthFetch(baseUrl: string): typeof fetch {
  return async (input, init) => {
    const response = await fetch(input, init)

    if (response.status !== 401) return response

    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
    if (AUTH_PATHS.some((p) => url.includes(p))) return response

    if (!refreshPromise) {
      refreshPromise = fetch(`${baseUrl}/api/accounts/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).finally(() => {
        refreshPromise = null
      })
    }

    const refreshResponse = await refreshPromise
    if (!refreshResponse.ok) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
      return response
    }

    return fetch(input, init)
  }
}

export const createApiClient = (config: StudioOSApiClientConfig = {}) => {
  const baseUrl = normalizeBaseUrl(config.baseUrl ?? API_BASE_URL)
  const baseApiParams: RequestParams = {
    credentials: 'include',
    ...config.baseApiParams,
    headers: {
      Accept: 'application/json',
      ...config.baseApiParams?.headers,
    },
  }

  return new Api({
    ...config,
    baseUrl,
    baseApiParams,
    customFetch: createAuthFetch(baseUrl),
  })
}

export const apiClient = createApiClient()

export type ApiClient = ReturnType<typeof createApiClient>
