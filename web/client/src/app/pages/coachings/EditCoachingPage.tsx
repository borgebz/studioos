import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import type { CoachingClass } from '@/api/studioos-api'
import { paths } from '@/app/paths'
import { FullPageLoader } from '@/components/shared/LogoLoader'

import { CoachingForm } from './CoachingForm'

export function EditCoachingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [coaching, setCoaching] = useState<CoachingClass | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const coachingId = Number(id)
    if (!coachingId || Number.isNaN(coachingId)) {
      navigate(paths.coachingsRequests)
      return
    }
    apiClient.api
      .coachingsRetrieve(coachingId)
      .then((res) => setCoaching(res.data))
      .catch((err) => {
        toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
        navigate(paths.coachingsRequests)
      })
      .finally(() => setLoading(false))
  }, [id, navigate, t])

  if (loading || !coaching) {
    return <FullPageLoader />
  }

  return <CoachingForm mode="edit" coaching={coaching} />
}
