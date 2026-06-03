import { z } from 'zod'

export const activateAccountSchema = z.object({
  password: z.string().min(8, 'auth.activate.passwordTooShort'),
})

export type ActivateAccountFormValues = z.infer<typeof activateAccountSchema>
