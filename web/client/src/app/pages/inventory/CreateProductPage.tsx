import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/api/api-client'
import type { ProductDetail } from '@/api/studioos-api'
import { parseApiError } from '@/lib/api-errors'
import { paths } from '@/app/paths'
import { FullPageLoader } from '@/components/shared/LogoLoader'

import { ProductForm } from './ProductForm'

export interface CreateProductPageProps {
  mode?: 'create' | 'edit'
  context: 'personal' | 'school'
}

export function CreateProductPage({
  mode = 'create',
  context,
}: CreateProductPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isSchool = context === 'school'
  const backTarget = isSchool ? paths.schoolInventory : paths.myInventory

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(mode === 'edit')

  const loaded = useRef(false)
  useEffect(() => {
    if (mode !== 'edit') return
    if (loaded.current) return
    loaded.current = true

    const productId = Number(id)
    if (!productId || Number.isNaN(productId)) {
      navigate(backTarget)
      return
    }

    const retrieve = isSchool
      ? apiClient.api.inventorySchoolProductsRetrieve2(productId)
      : apiClient.api.inventoryProductsRetrieve2(productId)
    retrieve
      .then((res) => setProduct(res.data))
      .catch((err) => {
        toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
        navigate(backTarget)
      })
      .finally(() => setLoading(false))
  }, [mode, id, isSchool, navigate, backTarget, t])

  if (mode === 'edit') {
    if (loading || !product) {
      return <FullPageLoader />
    }
    return <ProductForm mode="edit" context={context} product={product} />
  }

  return <ProductForm mode="create" context={context} />
}
