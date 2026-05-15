import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'validation.required')
    .email('validation.invalidEmail'),
  password: z
    .string()
    .min(1, 'validation.required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
