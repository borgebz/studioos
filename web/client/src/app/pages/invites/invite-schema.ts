import { z } from 'zod'

export const singleInviteSchema = z.object({
  email: z
    .string()
    .min(1, 'validation.required')
    .email('validation.invalidEmail'),
  role: z.string().min(1, 'validation.required'),
})

export type SingleInviteFormValues = z.infer<typeof singleInviteSchema>
