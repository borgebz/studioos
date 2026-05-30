import { z } from 'zod'
import {
  EventStateEnum,
  NotificationTargetEnum,
  VisibilityStateEnum,
} from '@/api/studioos-api'

export const eventFormSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(160),
  body: z.string(),
  location: z.string().max(255),
  contact_info: z.string(),
  /** A local Date — we serialise to ISO before submit. */
  event_date: z.date().nullable(),
  /** "HH:mm" — combined with event_date at submit time. */
  event_time: z.string(),
  date_unknown: z.boolean(),
  visibility_state: z.nativeEnum(VisibilityStateEnum),
  event_state: z.nativeEnum(EventStateEnum),
  publication_scheduled_at: z.date().nullable(),
  publication_scheduled_time: z.string(),
  /** Audience scope — defaults to ALL. */
  notification_target: z.nativeEnum(NotificationTargetEnum),
  /** IDs of classes targeted when notification_target === CLASSES. */
  class_target_classe_ids: z.array(z.number().int().positive()),
  cover_file: z.custom<File | null>(
    (v) => v === null || v instanceof File,
    'invalid file'
  ),
})

export type EventFormValues = z.infer<typeof eventFormSchema>
