import { z } from 'zod'

export const createListingSchema = z.object({
  // Listing
  listing_type: z.string().min(1, 'validation.required'),
  title: z.string().min(1, 'validation.required'),
  description: z.string(),
  asking_price: z.string(),
  is_public: z.boolean(),

  // Product
  product_name: z.string().min(1, 'validation.required'),
  product_description: z.string(),
  category_id: z.string(),
  target_gender: z.string(),
  brand: z.string(),
  material: z.string(),

  // School details
  inventory_code: z.string(),
  storage_location: z.string(),
  school_notes: z.string(),
})

export type CreateListingFormValues = z.infer<typeof createListingSchema>

export const defaultListingValues: CreateListingFormValues = {
  listing_type: 'sell',
  title: '',
  description: '',
  asking_price: '',
  is_public: false,
  product_name: '',
  product_description: '',
  category_id: '',
  target_gender: '',
  brand: '',
  material: '',
  inventory_code: '',
  storage_location: '',
  school_notes: '',
}
