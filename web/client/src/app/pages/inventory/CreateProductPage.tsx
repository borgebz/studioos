import { ProductForm } from './ProductForm'

export interface CreateProductPageProps {
  context: 'personal' | 'school'
}

export function CreateProductPage({ context }: CreateProductPageProps) {
  return <ProductForm context={context} />
}
