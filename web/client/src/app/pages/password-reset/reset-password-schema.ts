import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'auth.forgotPassword.validation.emailRequired')
    .email('auth.forgotPassword.validation.emailInvalid'),
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'auth.resetPassword.passwordTooShort'),
})

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
