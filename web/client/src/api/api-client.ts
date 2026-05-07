import { Api } from '@/api/studioos-api'
import type { ApiConfig, RequestParams } from '@/api/studioos-api'

const API_BASE_URL = import.meta.env.VITE_STUDIOOS_API_BASE_URL ?? ''

type StudioOSApiClientConfig = Omit<ApiConfig<unknown>, 'baseUrl'> & {
  baseUrl?: string
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/$/, '')

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
  })
}

export const apiClient = createApiClient()

export type ApiClient = ReturnType<typeof createApiClient>
