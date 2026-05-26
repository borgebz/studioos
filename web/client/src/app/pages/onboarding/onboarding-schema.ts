import { z } from 'zod'

export const onboardingSchema = z.object({
  first_name: z.string().min(1, 'validation.required'),
  last_name: z.string().min(1, 'validation.required'),
  phone_country_code: z.string().min(1, 'validation.required'),
  phone: z.string().min(1, 'validation.required'),
  date_of_birth: z.date({ error: 'validation.required' }),
  password: z.string().min(8, 'auth.onboarding.passwordTooShort'),
})

export type OnboardingFormValues = z.infer<typeof onboardingSchema>
