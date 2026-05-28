import { z } from 'zod'

export const createProductSchema = z.object({
  // Product
  name: z.string().min(1, 'validation.required'),
  description: z.string(),
  category_id: z.string(),
  target_gender: z.string(),
  brand: z.string(),
  material: z.string(),
  status: z.string(),

  // School-only details
  inventory_code: z.string(),
  storage_location: z.string(),
  school_notes: z.string(),
})

export type CreateProductFormValues = z.infer<typeof createProductSchema>

export const defaultProductValues: CreateProductFormValues = {
  name: '',
  description: '',
  category_id: '',
  target_gender: '',
  brand: '',
  material: '',
  status: 'active',
  inventory_code: '',
  storage_location: '',
  school_notes: '',
}
