import { z } from 'zod'

export const accountSettingsSchema = z.object({
  display_name: z.string().min(1, 'validation.required'),
  bio: z.string(),
  is_public: z.boolean(),
})

export type AccountSettingsFormValues = z.infer<typeof accountSettingsSchema>
