import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'
import { FullPageLoader } from '@/components/shared/LogoLoader'

import { ListingForm, type ListingDetailRuntime } from './ListingForm'

export function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [listing, setListing] = useState<ListingDetailRuntime | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const listingId = Number(id)
    if (!listingId || Number.isNaN(listingId)) {
      navigate(paths.schoolListings)
      return
    }
    apiClient.api
      .marketplaceSchoolListingsRetrieve2(listingId)
      .then((res) =>
        setListing(res.data as unknown as ListingDetailRuntime),
      )
      .catch((err) => {
        toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
        navigate(paths.schoolListings)
      })
      .finally(() => setLoading(false))
  }, [id, navigate, t])

  if (loading || !listing) {
    return <FullPageLoader />
  }

  return <ListingForm mode="edit" listing={listing} />
}
