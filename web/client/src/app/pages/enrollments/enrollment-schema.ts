import { z } from 'zod'

export const enrollmentSchema = z.object({
  enrollment_type: z.enum(['new', 'renewal']),

  student_name: z.string().min(1, 'enrollments.validation.studentNameRequired').max(255),
  student_email: z.string().min(1, 'enrollments.validation.studentEmailRequired').email('enrollments.validation.studentEmailInvalid'),
  student_date_of_birth: z.string().min(1, 'enrollments.validation.dobRequired').refine(
    (val) => new Date(val) < new Date(),
    'enrollments.validation.dobFuture',
  ),
  student_nif: z.string().max(20).optional().default(''),
  student_nationality: z.string().max(100).optional().default(''),
  student_document_number: z.string().max(50).optional().default(''),
  student_document_expiry: z.string().optional().default(''),
  address: z.string().optional().default(''),
  postal_code: z.string().max(20).optional().default(''),

  parent_name: z.string().min(1, 'enrollments.validation.parentNameRequired').max(255),
  parent_email: z.string().min(1, 'enrollments.validation.parentEmailRequired').email('enrollments.validation.parentEmailInvalid'),
  parent_phone: z.string().min(1, 'enrollments.validation.parentPhoneRequired').max(30),
  parent_phone_country_code: z.string().max(5).optional().default('+351'),

  modality_ids: z.array(z.number()).min(1, 'enrollments.validation.modalityRequired'),

  historical_notes: z.string().optional().default(''),

  consent_rgpd: z.literal(true, { error: 'enrollments.validation.consentRequired' }),
  consent_internal_regulation: z.literal(true, { error: 'enrollments.validation.consentRequired' }),
})

export type EnrollmentFormValues = z.infer<typeof enrollmentSchema>

export const enrollmentDefaults: EnrollmentFormValues = {
  enrollment_type: 'new',
  student_name: '',
  student_email: '',
  student_date_of_birth: '',
  student_nif: '',
  student_nationality: '',
  student_document_number: '',
  student_document_expiry: '',
  address: '',
  postal_code: '',
  parent_name: '',
  parent_email: '',
  parent_phone: '',
  parent_phone_country_code: '+351',
  modality_ids: [],
  historical_notes: '',
  consent_rgpd: false as unknown as true,
  consent_internal_regulation: false as unknown as true,
}
