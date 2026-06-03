import { z } from 'zod'

export const userEditSchema = z.object({
  first_name: z.string().min(1, 'validation.required').max(150),
  last_name: z.string().min(1, 'validation.required').max(150),
  email: z.string().email('validation.invalidEmail'),
  phone_country_code: z.string().max(5),
  phone: z.string().max(20),
  address: z.string(),
  postal_code: z.string().max(20),
  language: z.enum(['pt', 'en']),
  role_codes: z.array(z.string()),
  permission_ids: z.array(z.number()),
})

export type UserEditFormValues = z.infer<typeof userEditSchema>
