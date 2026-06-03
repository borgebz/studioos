/**
 * ProductSpecsSection — the two-column "Specifications" card shared by the
 * marketplace listing detail and the inventory product detail. Renders nothing
 * when there are no specs to show.
 */
import { TargetGenderEnum } from '@/api/studioos-api'
import { CardSection } from '@/components/shared/CardSection'

const GENDER_LABEL_KEYS: Record<string, string> = {
  [TargetGenderEnum.Female]: 'marketplace.genderFemale',
  [TargetGenderEnum.Male]: 'marketplace.genderMale',
  [TargetGenderEnum.Unisex]: 'marketplace.genderUnisex',
}

type Translate = (key: string, opts?: Record<string, unknown>) => string

export interface ProductSpecsSource {
  brand?: string | null
  material?: string | null
  target_gender?: string | null
}

function buildProductSpecs(
  product: ProductSpecsSource,
  t: Translate
): { label: string; value: string }[] {
  const specs: { label: string; value: string }[] = []
  if (product.brand) {
    specs.push({ label: t('marketplace.detail.specBrand'), value: product.brand })
  }
  if (product.material) {
    specs.push({
      label: t('marketplace.detail.specMaterial'),
      value: product.material,
    })
  }
  if (product.target_gender) {
    const key = GENDER_LABEL_KEYS[product.target_gender]
    if (key) {
      specs.push({ label: t('marketplace.targetGender'), value: t(key) })
    }
  }
  return specs
}

export function ProductSpecsSection({
  product,
  t,
}: {
  product: ProductSpecsSource
  t: Translate
}) {
  const specs = buildProductSpecs(product, t)
  if (specs.length === 0) return null

  return (
    <CardSection title={t('marketplace.detail.specs')}>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {specs.map((s) => (
          <div
            key={s.label}
            className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-2 last:border-b-0 last:pb-0 sm:[&:nth-last-child(2)]:border-b-0 sm:[&:nth-last-child(2)]:pb-0"
          >
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="truncate text-sm font-medium text-foreground">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </CardSection>
  )
}
