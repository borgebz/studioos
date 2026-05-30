import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import type { ListingDetail } from '@/api/studioos-api'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'
import { FullPageLoader } from '@/components/shared/LogoLoader'

import { ListingForm } from './ListingForm'

export interface CreateListingPageProps {
  mode: 'create' | 'edit'
  /** Required when mode is create. */
  context?: 'personal' | 'school'
}

export function CreateListingPage({ mode, context }: CreateListingPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [loading, setLoading] = useState(mode === 'edit')

  useEffect(() => {
    if (mode !== 'edit') return

    const listingId = Number(id)
    if (!listingId || Number.isNaN(listingId)) {
      navigate(context === 'school' ? paths.schoolListings : paths.myListings)
      return
    }

    setLoading(true)
    apiClient.api
      .marketplaceListingsRetrieve2(listingId)
      .then((res) => setListing(res.data))
      .catch((err) => {
        toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
        navigate(context === 'school' ? paths.schoolListings : paths.myListings)
      })
      .finally(() => setLoading(false))
  }, [mode, id, navigate, t, context])

  if (mode === 'edit') {
    if (loading || !listing) {
      return <FullPageLoader />
    }

    const editContext =
      listing.product?.owner_type === 'school' ? 'school' : 'personal'

    return (
      <ListingForm mode="edit" context={editContext} listing={listing} />
    )
  }

  if (!context) {
    navigate(paths.myListings)
    return null
  }

  return <ListingForm mode="create" context={context} />
}
