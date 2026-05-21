import { z } from 'zod'

const recurrenceSchema = z.object({
  recurrence_type: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  recurrence_interval: z.number().min(1).max(8),
  selected_days: z.array(z.string()),
  end_type: z.enum(['count', 'date']),
  occurrences_count: z.number().min(1).max(100),
  end_date: z.date().optional(),
})

export const coachingFormSchema = z.object({
  modality_id: z.string().min(1, 'validation.required'),
  teacher_id: z.string().min(1, 'validation.required'),
  studio_id: z.string().min(1, 'validation.required'),
  date: z.date({ required_error: 'validation.required' }),
  start_time: z.string().min(1, 'validation.required'),
  end_time: z.string().min(1, 'validation.required'),
  total_price: z.string(),
  notes: z.string(),
  is_billable: z.boolean(),
  schedule: z.boolean(),
  auto_confirm_participants: z.boolean(),
  is_recurring: z.boolean(),
  recurrence: recurrenceSchema,
})

export type CoachingFormValues = z.infer<typeof coachingFormSchema>

// Backward-compat aliases — older imports.
export const createCoachingSchema = coachingFormSchema
export type CreateCoachingFormValues = CoachingFormValues

export const defaultCoachingValues: CoachingFormValues = {
  modality_id: '',
  teacher_id: '',
  studio_id: '',
  date: undefined as unknown as Date,
  start_time: '',
  end_time: '',
  total_price: '',
  notes: '',
  is_billable: true,
  schedule: true,
  auto_confirm_participants: true,
  is_recurring: false,
  recurrence: {
    recurrence_type: 'weekly',
    recurrence_interval: 1,
    selected_days: [],
    end_type: 'count',
    occurrences_count: 8,
    end_date: undefined,
  },
}
