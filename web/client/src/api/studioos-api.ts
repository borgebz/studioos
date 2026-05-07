/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/**
 * * `draft` - Draft
 * * `scheduled` - Scheduled
 * * `published` - Published
 * * `archived` - Archived
 */
export enum VisibilityStateEnum {
  Draft = "draft",
  Scheduled = "scheduled",
  Published = "published",
  Archived = "archived",
}

/**
 * * `pending` - Pending
 * * `exported` - Exported
 * * `cancelled` - Cancelled
 */
export enum StatusB62Enum {
  Pending = "pending",
  Exported = "exported",
  Cancelled = "cancelled",
}

/**
 * * `invited` - Invited
 * * `pending` - Pending
 * * `active` - Active
 * * `pending_completion` - Pending Completion
 * * `attended` - Attended
 * * `absent` - Absent
 * * `cancelled` - Cancelled
 * * `late_cancelled` - Late Cancelled
 */
export enum StatusA03Enum {
  Invited = "invited",
  Pending = "pending",
  Active = "active",
  PendingCompletion = "pending_completion",
  Attended = "attended",
  Absent = "absent",
  Cancelled = "cancelled",
  LateCancelled = "late_cancelled",
}

/**
 * * `pending_review` - Pending review
 * * `approved` - Approved
 * * `waived` - Waived
 */
export enum Status782Enum {
  PendingReview = "pending_review",
  Approved = "approved",
  Waived = "waived",
}

/**
 * * `coaching` - Coaching
 * * `fine` - Fine
 */
export enum SourceTypeEnum {
  Coaching = "coaching",
  Fine = "fine",
}

/**
 * * `daily` - Daily
 * * `weekly` - Weekly
 * * `biweekly` - Biweekly
 * * `monthly` - Monthly
 */
export enum RecurrenceTypeEnum {
  Daily = "daily",
  Weekly = "weekly",
  Biweekly = "biweekly",
  Monthly = "monthly",
}

/**
 * * `absence` - Absence
 * * `late_cancellation` - Late cancellation
 */
export enum ReasonEnum {
  Absence = "absence",
  LateCancellation = "late_cancellation",
}

/**
 * * `new` - New Enrollments
 * * `renewal` - Renewals
 * * `both` - New & Renewals
 */
export enum PeriodTypeEnum {
  New = "new",
  Renewal = "renewal",
  Both = "both",
}

/**
 * * `enrollment_fee` - Enrollment Fee
 * * `insurance` - Insurance
 */
export enum PaymentTypeEnum {
  EnrollmentFee = "enrollment_fee",
  Insurance = "insurance",
}

/**
 * * `all` - All
 * * `classes` - Classes
 */
export enum NotificationTargetEnum {
  All = "all",
  Classes = "classes",
}

/**
 * * `none` - None
 * * `notification_test` - Notification test
 * * `notification` - Notification
 */
export enum NotificationEnum {
  None = "none",
  NotificationTest = "notification_test",
  Notification = "notification",
}

/**
 * * `pt` - Português
 * * `en` - English
 */
export enum LanguageEnum {
  Pt = "pt",
  En = "en",
}

/**
 * * `planned` - Planned
 * * `date_tbd` - Date TBD
 * * `cancelled` - Cancelled
 * * `completed` - Completed
 */
export enum EventStateEnum {
  Planned = "planned",
  DateTbd = "date_tbd",
  Cancelled = "cancelled",
  Completed = "completed",
}

/**
 * * `new` - New
 * * `renewal` - Renewal
 */
export enum EnrollmentTypeEnum {
  New = "new",
  Renewal = "renewal",
}

/**
 * * `submitted` - Submitted
 * * `under_review` - Under Review
 * * `approved` - Approved
 * * `rejected` - Rejected
 * * `cancelled` - Cancelled
 */
export enum EnrollmentReadStatusEnum {
  Submitted = "submitted",
  UnderReview = "under_review",
  Approved = "approved",
  Rejected = "rejected",
  Cancelled = "cancelled",
}

/**
 * * `pending` - Pending
 * * `confirmed` - Confirmed
 */
export enum EnrollmentPaymentReadStatusEnum {
  Pending = "pending",
  Confirmed = "confirmed",
}

/**
 * * `rgpd` - RGPD / Data Processing
 * * `internal_regulation` - Internal Regulation
 */
export enum ConsentTypeEnum {
  Rgpd = "rgpd",
  InternalRegulation = "internal_regulation",
}

/**
 * * `requested` - Requested
 * * `pending_approval` - Pending Approval
 * * `scheduled` - Scheduled
 * * `waiting_confirmation` - Waiting Confirmation
 * * `pending_completion_approval` - Pending Completion Approval
 * * `completed` - Completed
 * * `cancelled` - Cancelled
 * * `rejected` - Rejected
 */
export enum CoachingClassStatusEnum {
  Requested = "requested",
  PendingApproval = "pending_approval",
  Scheduled = "scheduled",
  WaitingConfirmation = "waiting_confirmation",
  PendingCompletionApproval = "pending_completion_approval",
  Completed = "completed",
  Cancelled = "cancelled",
  Rejected = "rejected",
}

/** Input for account activation — uid + token + new password. */
export interface ActivateAccount {
  uid: string;
  token: string;
  /** @minLength 8 */
  password: string;
}

export interface ActivationSuccess {
  message: string;
}

export interface AddParticipant {
  student_id: number;
}

export interface BillingEntryCancel {
  notes: string;
}

export interface BillingEntryDetail {
  id: number;
  source_type: SourceTypeEnum;
  student_id: number;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount_due: string;
  /** Single-line, human-readable description shown to the student and on accounting exports. Generated at creation time, not editable afterwards. */
  description: string;
  status: StatusB62Enum;
  /** @format date-time */
  exported_at: string | null;
  /** @format date-time */
  cancelled_at: string | null;
  notes: string;
  coaching_class: CoachingClassBillingDetail | null;
  coaching_participant: CoachingParticipantBilling;
  fine: FineBillingSummary | null;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface BillingEntryList {
  id: number;
  source_type: SourceTypeEnum;
  student_id: number;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount_due: string;
  /** Single-line, human-readable description shown to the student and on accounting exports. Generated at creation time, not editable afterwards. */
  description: string;
  status: StatusB62Enum;
  coaching_class: CoachingClassBillingSummary | null;
  fine: FineBillingSummary | null;
  /** @format date-time */
  created_at: string;
}

/** Multipart upload for bulk invite spreadsheet. */
export interface BulkInviteFile {
  /** @format uri */
  file: string;
}

export interface BulkInviteUsersListPayload {
  users: UserResponse[];
  count: number;
}

export interface BulkInviteUsersWrapper {
  data: BulkInviteUsersListPayload;
}

export interface CoachingApprove {
  studio_id: number;
  /**
   * @format decimal
   * @pattern ^-?\d{0,6}(?:\.\d{0,2})?$
   */
  total_price: string;
}

export interface CoachingCancel {
  cancellation_reason?: string;
}

export interface CoachingClass {
  id: number;
  /**
   * * `requested` - Requested
   * * `pending_approval` - Pending Approval
   * * `scheduled` - Scheduled
   * * `waiting_confirmation` - Waiting Confirmation
   * * `pending_completion_approval` - Pending Completion Approval
   * * `completed` - Completed
   * * `cancelled` - Cancelled
   * * `rejected` - Rejected
   */
  status?: CoachingClassStatusEnum;
  teacher: UserResponse;
  modality: Modality;
  studio: Studio;
  /** @format date-time */
  start_datetime: string;
  /** @format date-time */
  end_datetime: string;
  /** @format date-time */
  completed_at?: string | null;
  /** If False, complete_coaching does not generate billing entries. Only set or changed for coordination-scheduled coachings (no requester); student-requested coachings keep billing defaults from workflow. */
  is_billable?: boolean;
  /**
   * Set by coordination at approval.
   * @format decimal
   * @pattern ^-?\d{0,6}(?:\.\d{0,2})?$
   */
  total_price?: string | null;
  requested_by: UserResponse;
  recurring_id: number | null;
  recurring_coaching: RecurringCoaching;
  classe_id: number | null;
  notes?: string;
  teacher_notes?: string;
  /** @format date-time */
  teacher_confirmed_at?: string | null;
  teacher_confirmed_by: UserResponse;
  rejection_reason?: string;
  cancellation_reason?: string;
  participants: CoachingParticipant[];
}

/** Extended coaching summary that includes the teacher — used in detail responses. */
export interface CoachingClassBillingDetail {
  id: number;
  /** @format date-time */
  start_datetime: string;
  /** @format date-time */
  end_datetime: string;
  modality: Modality;
  teacher: UserResponse | null;
}

export interface CoachingClassBillingSummary {
  id: number;
  /** @format date-time */
  start_datetime: string;
  /** @format date-time */
  end_datetime: string;
  modality: Modality;
}

export interface CoachingParticipant {
  id: number;
  student: UserResponse;
  /**
   * * `invited` - Invited
   * * `pending` - Pending
   * * `active` - Active
   * * `pending_completion` - Pending Completion
   * * `attended` - Attended
   * * `absent` - Absent
   * * `cancelled` - Cancelled
   * * `late_cancelled` - Late Cancelled
   */
  status?: StatusA03Enum;
  /** True when a coordination/direction user invited this student (invite → accept becomes active without a pending approval step). */
  invited_by_staff?: boolean;
  /** @format date-time */
  cancelled_at?: string | null;
  cancellation_reason?: string;
}

export interface CoachingParticipantBilling {
  id: number;
  /**
   * * `invited` - Invited
   * * `pending` - Pending
   * * `active` - Active
   * * `pending_completion` - Pending Completion
   * * `attended` - Attended
   * * `absent` - Absent
   * * `cancelled` - Cancelled
   * * `late_cancelled` - Late Cancelled
   */
  status?: StatusA03Enum;
}

export interface CoachingReject {
  rejection_reason?: string;
}

export interface CoachingRequest {
  teacher_id: number;
  modality_id: number;
  studio_id?: number | null;
  /** @format date-time */
  start_datetime: string;
  /** @format date-time */
  end_datetime: string;
  notes?: string;
  classe_id?: number | null;
}

/** Public onboarding completion after invite. */
export interface CompleteOnboarding {
  /** @maxLength 150 */
  first_name: string;
  /** @maxLength 150 */
  last_name: string;
  /** @minLength 8 */
  password: string;
  /** @maxLength 20 */
  phone: string;
  /** @maxLength 5 */
  phone_country_code: string;
  /** @format date */
  date_of_birth: string;
}

export interface ConfirmParticipantAttendance {
  attended: boolean;
}

export interface ConsentInput {
  /**
   * * `rgpd` - RGPD / Data Processing
   * * `internal_regulation` - Internal Regulation
   */
  consent_type: ConsentTypeEnum;
  accepted: boolean;
}

export interface Conversation {
  id: number;
  participant_ids: number[];
  last_message: Message | null;
  /** @format date-time */
  updated_at: string;
}

export interface CreateConversation {
  user_id: number;
}

export interface CreateRole {
  /** @maxLength 50 */
  code: string;
  /** @maxLength 150 */
  name: string;
  description: string;
}

/** Input serializer for creating a new user. */
export interface CreateUser {
  /** @format email */
  email: string;
  /** @maxLength 150 */
  first_name: string;
  /** @maxLength 150 */
  last_name: string;
  /** @maxLength 50 */
  role_code: string;
  /**
   * @maxLength 20
   * @default ""
   */
  phone?: string;
  /**
   * @maxLength 5
   * @default ""
   */
  phone_country_code?: string;
}

/** Body for POST ``/api/coachings/`` — coordination-created timetable coaching. */
export interface DirectCoordinationCoachingCreate {
  teacher_id: number;
  modality_id: number;
  studio_id: number;
  /**
   * @format decimal
   * @pattern ^-?\d{0,6}(?:\.\d{0,2})?$
   */
  total_price: string;
  /** @format date-time */
  start_datetime: string;
  /** @format date-time */
  end_datetime: string;
  /**
   * Coordination-only; ignored on student-request flows.
   * @default true
   */
  is_billable?: boolean;
  notes?: string;
  /**
   * Roster fill: true = ACTIVE from enrollments; false = staff-invite (INVITED).
   * @default true
   */
  schedule?: boolean;
  classe_id?: number | null;
  recurring_coaching?: RecurringCoachingSubmit | null;
}

export interface EnrollmentConsentRead {
  id: number;
  consent_type: ConsentTypeEnum;
  accepted: boolean;
  /** @format date-time */
  accepted_at: string | null;
}

export interface EnrollmentFileRead {
  id: number;
  /** @format uri */
  file: string;
  original_filename: string;
  mime_type: string;
  /** @format date-time */
  created_at: string;
}

export interface EnrollmentModalityRead {
  id: number;
  modality_id: number;
  modality_name: string;
}

export interface EnrollmentPaymentCreate {
  /**
   * * `enrollment_fee` - Enrollment Fee
   * * `insurance` - Insurance
   */
  payment_type: PaymentTypeEnum;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount: string;
  /** Optional notes from direction about this payment. */
  notes?: string;
}

export interface EnrollmentPaymentRead {
  id: number;
  payment_type: PaymentTypeEnum;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount: string;
  status: EnrollmentPaymentReadStatusEnum;
  confirmed_by: number | null;
  /** @format email */
  confirmed_by_email: string;
  /** Optional notes from direction about this payment. */
  notes: string;
  /** @format date-time */
  created_at: string;
}

export interface EnrollmentPeriod {
  id: number;
  /**
   * Format: 2025/2026
   * @maxLength 9
   */
  academic_year: string;
  /**
   * * `new` - New Enrollments
   * * `renewal` - Renewals
   * * `both` - New & Renewals
   */
  period_type?: PeriodTypeEnum;
  /** @format date */
  start_date: string;
  /** @format date */
  end_date: string;
  is_open?: boolean;
  /**
   * Matrícula fee. Null means not required.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  enrollment_fee?: string | null;
  /**
   * Insurance for general regime. Null means not required.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  insurance_general?: string | null;
  /**
   * Insurance for intensive regime. Null means not required.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  insurance_intensive?: string | null;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface EnrollmentRead {
  id: number;
  student: number | null;
  parent: number | null;
  period: EnrollmentPeriod;
  status: EnrollmentReadStatusEnum;
  enrollment_type: EnrollmentTypeEnum;
  /** @format email */
  student_email: string;
  student_name: string;
  /** @format date */
  student_date_of_birth: string;
  student_nif: string;
  student_nationality: string;
  student_document_number: string;
  /** @format date */
  student_document_expiry: string | null;
  address: string;
  postal_code: string;
  parent_name: string;
  /** @format email */
  parent_email: string;
  parent_phone: string;
  parent_phone_country_code: string;
  /** Prior dance experience: school, level, modality, exams, observations. */
  historical_notes: string;
  enrollment_modalities: EnrollmentModalityRead[];
  files: EnrollmentFileRead[];
  consents: EnrollmentConsentRead[];
  payments: EnrollmentPaymentRead[];
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

/**
 * Input serializer for enrollment submission.
 * Validates the flat enrollment data + nested modalities and consents.
 * The service layer handles all the creation logic.
 */
export interface EnrollmentSubmit {
  period_id?: number | null;
  /** @default "new" */
  enrollment_type?: EnrollmentTypeEnum;
  /** @format email */
  student_email: string;
  /** @maxLength 255 */
  student_name: string;
  /** @format date */
  student_date_of_birth: string;
  /**
   * @maxLength 20
   * @default ""
   */
  student_nif?: string;
  /**
   * @maxLength 100
   * @default ""
   */
  student_nationality?: string;
  /**
   * @maxLength 50
   * @default ""
   */
  student_document_number?: string;
  /** @format date */
  student_document_expiry?: string | null;
  /** @default "" */
  address?: string;
  /**
   * @maxLength 20
   * @default ""
   */
  postal_code?: string;
  /** @maxLength 255 */
  parent_name: string;
  /** @format email */
  parent_email: string;
  /** @maxLength 30 */
  parent_phone: string;
  /**
   * @maxLength 5
   * @default ""
   */
  parent_phone_country_code?: string;
  /** @default "" */
  historical_notes?: string;
  /** @minItems 1 */
  modality_ids: number[];
  consents?: ConsentInput[];
  consent_rgpd?: boolean;
  consent_internal_regulation?: boolean;
}

export interface ErrorDetail {
  /** Non-field errors such as authentication, permission, or business rule violations. */
  messages?: string[];
  /** Field-level validation errors keyed by field name. */
  field_name?: string[];
}

export interface ErrorResponse {
  errors: ErrorDetail;
}

export interface Event {
  id: number;
  /** @maxLength 255 */
  title: string;
  description: string;
  body?: string;
  /** @format uri */
  cover_photo_url: string;
  /** @maxLength 255 */
  location?: string;
  /** @format date-time */
  event_date?: string | null;
  /**
   * * `planned` - Planned
   * * `date_tbd` - Date TBD
   * * `cancelled` - Cancelled
   * * `completed` - Completed
   */
  event_state?: EventStateEnum;
  /**
   * * `draft` - Draft
   * * `scheduled` - Scheduled
   * * `published` - Published
   * * `archived` - Archived
   */
  visibility_state?: VisibilityStateEnum;
  contact_info?: string;
  notification_target: NotificationTargetEnum;
  class_target_classe_ids: number[];
  /** @format date-time */
  publication_scheduled_at?: string | null;
  /** @format date-time */
  published_at?: string | null;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface EventComment {
  id: number;
  event: number;
  owner: number;
  body: string;
  parent_comment?: number | null;
  replies: any[];
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface EventCommentCreate {
  body: string;
  parent_comment_id?: number | null;
}

export interface EventCommentUpdate {
  body: string;
}

export interface EventCreate {
  /** @maxLength 255 */
  title: string;
  description: string;
  body?: string;
  /** @format uri */
  cover_photo?: string;
  /** @maxLength 255 */
  location?: string;
  /** @format date-time */
  event_date?: string | null;
  contact_info?: string;
  /** @default "all" */
  notification_target?: NotificationTargetEnum;
  class_target_classe_ids?: number[];
}

export interface EventFile {
  id: number;
  event: number;
  /** @format uri */
  file_url: string | null;
  /** @maxLength 255 */
  file_name?: string;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface EventFileCreate {
  /** @format uri */
  file: string;
  /** @maxLength 255 */
  file_name?: string;
}

export interface EventInterest {
  id: number;
  event: number;
  user: number;
  /** @format date-time */
  created_at: string;
}

/** Compact shape for GET /events/ list responses. */
export interface EventList {
  id: number;
  /** @maxLength 255 */
  title: string;
  /** @format uri */
  cover_photo_url: string;
  /** @maxLength 255 */
  location?: string;
  /** @format date-time */
  event_date?: string | null;
  /**
   * * `planned` - Planned
   * * `date_tbd` - Date TBD
   * * `cancelled` - Cancelled
   * * `completed` - Completed
   */
  event_state?: EventStateEnum;
}

export interface EventPost {
  id: number;
  event: number;
  /** @maxLength 255 */
  title: string;
  body: string;
  /** @format date-time */
  publication_scheduled_at?: string | null;
  /** @format date-time */
  published_at?: string | null;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface EventPostCreate {
  /** @maxLength 255 */
  title: string;
  body: string;
}

export interface EventPostPublish {
  /** @default "none" */
  notification?: NotificationEnum;
}

export interface EventPostSchedulePublication {
  /** @format date-time */
  publication_scheduled_at: string;
  /** @default "none" */
  notification?: NotificationEnum;
}

export interface EventPostUpdate {
  /** @maxLength 255 */
  title: string;
  body: string;
}

export interface EventPublish {
  /** @default "none" */
  notification?: NotificationEnum;
}

export interface EventSchedulePublication {
  /** @format date-time */
  publication_scheduled_at: string;
  /** @default "none" */
  notification?: NotificationEnum;
}

export interface EventUpdate {
  /** @maxLength 255 */
  title: string;
  description: string;
  body?: string;
  /** @format uri */
  cover_photo?: string;
  /** @maxLength 255 */
  location?: string;
  /** @format date-time */
  event_date?: string | null;
  contact_info?: string;
  /**
   * * `all` - All
   * * `classes` - Classes
   */
  notification_target?: NotificationTargetEnum;
  class_target_classe_ids?: number[];
}

export interface FineApprove {
  /**
   * If omitted/null, settings.COACHING_FINE_DEFAULT_AMOUNT is used.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount?: string | null;
  notes?: string;
}

/** Compact fine view embedded in BillingEntry detail/list. */
export interface FineBillingSummary {
  id: number;
  reason: ReasonEnum;
  status: Status782Enum;
  /**
   * Set on approval. Null while pending review or when waived.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount?: string | null;
}

export interface FineDetail {
  id: number;
  reason: ReasonEnum;
  status: Status782Enum;
  /**
   * Set on approval. Null while pending review or when waived.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount: string | null;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  suggested_amount: string;
  student_id: number;
  coaching_class: CoachingClassBillingDetail | null;
  coaching_participant: CoachingParticipantBilling;
  /** @format date-time */
  reviewed_at: string | null;
  reviewed_by: UserResponse | null;
  notes: string;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface FineList {
  id: number;
  reason: ReasonEnum;
  status: Status782Enum;
  /**
   * Set on approval. Null while pending review or when waived.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount: string | null;
  student_id: number;
  coaching_class: CoachingClassBillingSummary;
  /** @format date-time */
  reviewed_at: string | null;
  /** @format date-time */
  created_at: string;
}

export interface FineWaive {
  notes: string;
}

/** Single invite: email + role code (see ``accounts.Role`` / seed_roles). */
export interface InviteSingle {
  /** @format email */
  email: string;
  /** @maxLength 50 */
  role: string;
}

/** Input serializer for login. */
export interface Login {
  /** @format email */
  email: string;
  password: string;
}

export interface LoginSuccess {
  detail: string;
}

export interface Me {
  id: number;
  /** @format email */
  email: string;
  full_name: string;
  role: string[];
  permissions: string[];
  language: string;
  profile: MeEndpointProfileOutput | null;
}

export interface MeEndpointProfileOutput {
  display_name?: string;
  photo_url?: string | null;
}

export interface Message {
  id: number;
  sender_id: number;
  body: string;
  file_url: string | null;
  original_filename: string;
  mime_type: string;
  /** @format date-time */
  created_at: string;
}

export interface Modality {
  id: number;
  /** @maxLength 255 */
  name: string;
  description?: string;
  /**
   * Maximum number of students for this modality, if applicable.
   * @min 0
   * @max 2147483647
   */
  max_capacity?: number | null;
  /**
   * Minimum student age in months for eligibility.
   * @min 0
   * @max 2147483647
   */
  min_age_months?: number | null;
  /**
   * Maximum student age in months for eligibility.
   * @min 0
   * @max 32767
   */
  max_age_months?: number | null;
  studios: Studio[];
}

export interface ModalitySubmit {
  /** @maxLength 255 */
  name: string;
  description?: string;
  /** @min 1 */
  max_capacity?: number | null;
  /** @min 0 */
  min_age_months?: number | null;
  /** @min 0 */
  max_age_months?: number | null;
  allowed_studio_ids?: number[];
}

export interface ModalitySummary {
  id: number;
  /** @maxLength 255 */
  name: string;
}

export interface OnboardingCompleteSuccess {
  detail: string;
}

export interface OnboardingPreviewInner {
  /** @format email */
  email: string;
  role: string;
}

export interface OnboardingPreviewWrapper {
  data: OnboardingPreviewInner;
}

export interface ParticipantCancel {
  cancellation_reason?: string;
}

export interface PatchedCoachingUpdate {
  teacher_id?: number;
  modality_id?: number;
  studio_id?: number | null;
  /**
   * @format decimal
   * @pattern ^-?\d{0,6}(?:\.\d{0,2})?$
   */
  total_price?: string | null;
  /** Only for coordination-scheduled coachings (no requester). */
  is_billable?: boolean;
  /** @format date-time */
  start_datetime?: string;
  /** @format date-time */
  end_datetime?: string;
  notes?: string;
}

export interface PatchedEnrollmentPeriod {
  id?: number;
  /**
   * Format: 2025/2026
   * @maxLength 9
   */
  academic_year?: string;
  /**
   * * `new` - New Enrollments
   * * `renewal` - Renewals
   * * `both` - New & Renewals
   */
  period_type?: PeriodTypeEnum;
  /** @format date */
  start_date?: string;
  /** @format date */
  end_date?: string;
  is_open?: boolean;
  /**
   * Matrícula fee. Null means not required.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  enrollment_fee?: string | null;
  /**
   * Insurance for general regime. Null means not required.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  insurance_general?: string | null;
  /**
   * Insurance for intensive regime. Null means not required.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  insurance_intensive?: string | null;
  /** @format date-time */
  created_at?: string;
  /** @format date-time */
  updated_at?: string;
}

export interface PatchedEnrollmentUpdate {
  /**
   * @format email
   * @maxLength 254
   */
  student_email?: string;
  /** @maxLength 255 */
  student_name?: string;
  /** @format date */
  student_date_of_birth?: string;
  /** @maxLength 20 */
  student_nif?: string;
  /** @maxLength 100 */
  student_nationality?: string;
  /** @maxLength 50 */
  student_document_number?: string;
  /** @format date */
  student_document_expiry?: string | null;
  address?: string;
  /** @maxLength 20 */
  postal_code?: string;
  /** @maxLength 255 */
  parent_name?: string;
  /**
   * @format email
   * @maxLength 254
   */
  parent_email?: string;
  /** @maxLength 30 */
  parent_phone?: string;
  /** @maxLength 5 */
  parent_phone_country_code?: string;
  /** Prior dance experience: school, level, modality, exams, observations. */
  historical_notes?: string;
}

export interface PatchedModalityUpdate {
  /** @maxLength 255 */
  name?: string;
  description?: string;
  /** @min 1 */
  max_capacity?: number | null;
  /** @min 0 */
  min_age_months?: number | null;
  /** @min 0 */
  max_age_months?: number | null;
  allowed_studio_ids?: number[];
}

export interface PatchedProfile {
  /** @maxLength 200 */
  display_name?: string;
  bio?: string;
  /** @format uri */
  photo?: string | null;
  photo_url?: string | null;
  is_public?: boolean;
}

export interface PatchedStudioUpdate {
  /** @maxLength 255 */
  name?: string;
  /** @min 1 */
  max_capacity?: number;
  description?: string;
  allowed_modality_ids?: number[];
}

export interface PatchedTeacherAvailabilityUpdate {
  /** @format date-time */
  start_datetime?: string;
  /** @format date-time */
  end_datetime?: string;
  modality_id?: number | null;
  notes?: string;
}

export interface PatchedUpdateRole {
  description?: string;
}

/** Partial update of principal user fields (direction / ``accounts.change_user``). */
export interface PatchedUserCoreUpdate {
  /** @maxLength 150 */
  first_name?: string;
  /** @maxLength 150 */
  last_name?: string;
  /** @format email */
  email?: string;
  /** @maxLength 20 */
  phone?: string;
  /** @maxLength 5 */
  phone_country_code?: string;
  /**
   * * `pt` - Português
   * * `en` - English
   */
  language?: LanguageEnum;
  parent_id?: number | null;
  address?: string;
  /** @maxLength 20 */
  postal_code?: string;
}

export interface Permission {
  id: number;
  /** @maxLength 100 */
  codename: string;
  app_label: string;
  /** @maxLength 255 */
  name: string;
}

export interface Profile {
  /** @maxLength 200 */
  display_name?: string;
  bio?: string;
  /** @format uri */
  photo?: string | null;
  photo_url: string | null;
  is_public?: boolean;
}

export interface RecurringCoaching {
  id: number;
  /**
   * * `daily` - Daily
   * * `weekly` - Weekly
   * * `biweekly` - Biweekly
   * * `monthly` - Monthly
   */
  recurrence_type: RecurrenceTypeEnum;
  /**
   * Repeat every N periods (e.g. 2 = every other week when type is weekly).
   * @min 0
   * @max 2147483647
   */
  recurrence_interval?: number;
  /**
   * For weekly patterns: comma-separated weekday codes, e.g. "MO,WE".
   * @maxLength 20
   */
  days_of_week?: string;
  /** @format date */
  end_date?: string | null;
  /**
   * @min 0
   * @max 2147483647
   */
  occurrences_count?: number | null;
  notes?: string;
}

export interface RecurringCoachingSubmit {
  /**
   * * `daily` - Daily
   * * `weekly` - Weekly
   * * `biweekly` - Biweekly
   * * `monthly` - Monthly
   */
  recurrence_type: RecurrenceTypeEnum;
  /**
   * @min 1
   * @default 1
   */
  recurrence_interval?: number;
  /** @default "" */
  days_of_week?: string;
  /** @format date */
  end_date?: string | null;
  /** @min 1 */
  occurrences_count?: number | null;
  /** @default "" */
  notes?: string;
}

export interface RefreshSuccess {
  detail: string;
}

/** Resolve refresh token from JSON ``refresh`` or httpOnly cookie ``studioos_refresh``. */
export interface RefreshTokenSource {
  refresh?: string;
}

export interface RoleDetail {
  /** @maxLength 50 */
  code: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface RoleList {
  /** @maxLength 50 */
  code: string;
  name: string;
  description: string;
  permission_count: number;
}

export interface SendMessage {
  /** @default "" */
  body?: string;
  /** @format uri */
  file?: string | null;
  /** @maxLength 255 */
  original_filename?: string;
  /**
   * @maxLength 100
   * @default ""
   */
  mime_type?: string;
}

export interface SetRolePermissions {
  permission_ids: number[];
}

export interface Studio {
  id: number;
  /** @maxLength 255 */
  name: string;
  /**
   * Maximum number of people allowed in this studio.
   * @min 0
   * @max 2147483647
   */
  max_capacity: number;
  description?: string;
  modalities: ModalitySummary[];
}

export interface StudioSubmit {
  /** @maxLength 255 */
  name: string;
  /** @min 1 */
  max_capacity: number;
  description?: string;
  allowed_modality_ids?: number[];
}

export interface TeacherAvailability {
  id: number;
  teacher_id: number;
  modality: Modality;
  /** @format date-time */
  start_datetime: string;
  /** @format date-time */
  end_datetime: string;
  notes?: string;
}

export interface TeacherAvailabilitySubmit {
  /** @format date-time */
  start_datetime: string;
  /** @format date-time */
  end_datetime: string;
  modality_id?: number | null;
  notes?: string;
}

export interface TeacherConfirmCoaching {
  teacher_notes?: string;
}

/** Minimal teacher row for pickers (users with ``accounts.can_teach``). */
export interface TeacherSummary {
  id: number;
  /** @maxLength 150 */
  first_name?: string;
  /** @maxLength 150 */
  last_name?: string;
  /**
   * @format email
   * @maxLength 254
   */
  email: string;
  /** @maxLength 20 */
  phone?: string;
  /** @maxLength 5 */
  phone_country_code?: string;
}

export interface UserModality {
  id: number;
  modality: Modality;
}

export interface UserModalitySubmit {
  modality_id: number;
}

/** Output serializer for user data in API responses. */
export interface UserResponse {
  id: number;
  /**
   * @format email
   * @maxLength 254
   */
  email: string;
  /** @maxLength 150 */
  first_name?: string;
  /** @maxLength 150 */
  last_name?: string;
  /** @maxLength 20 */
  phone?: string;
  /** @maxLength 5 */
  phone_country_code?: string;
  /**
   * Active
   * Designates whether this user should be treated as active. Unselect this instead of deleting accounts.
   */
  is_active?: boolean;
  role: UserResponseRoleOutput[] | null;
  /** @format date-time */
  created_at: string;
}

export interface UserResponseRoleOutput {
  code: string;
  name: string;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title StudioOS API
 * @version 1.0.0
 *
 * School dance management platform
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * @description POST /api/accounts/activate/ Verifies the activation token, sets the password, and activates the user. Public endpoint — the user isn't authenticated yet.
     *
     * @tags accounts
     * @name AccountsActivateCreate
     * @request POST:/api/accounts/activate/
     * @secure
     */
    accountsActivateCreate: (
      data: ActivateAccount,
      params: RequestParams = {},
    ) =>
      this.request<ActivationSuccess, ErrorResponse>({
        path: `/api/accounts/activate/`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/accounts/auth/login/ Accepts email + password and stores JWT in httpOnly cookies.
     *
     * @tags accounts
     * @name AccountsAuthLoginCreate
     * @request POST:/api/accounts/auth/login/
     * @secure
     */
    accountsAuthLoginCreate: (data: Login, params: RequestParams = {}) =>
      this.request<LoginSuccess, ErrorResponse>({
        path: `/api/accounts/auth/login/`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/accounts/auth/logout/ Blacklists the refresh token (JSON body and/or ``studioos_refresh`` cookie) and clears auth cookies.
     *
     * @tags accounts
     * @name AccountsAuthLogoutCreate
     * @request POST:/api/accounts/auth/logout/
     * @secure
     */
    accountsAuthLogoutCreate: (
      data: RefreshTokenSource,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/accounts/auth/logout/`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description POST /api/accounts/auth/refresh/ Accepts refresh token in JSON body and/or ``studioos_refresh`` cookie; new tokens are set as httpOnly cookies (same as login).
     *
     * @tags accounts
     * @name AccountsAuthRefreshCreate
     * @request POST:/api/accounts/auth/refresh/
     * @secure
     */
    accountsAuthRefreshCreate: (
      data: RefreshTokenSource,
      params: RequestParams = {},
    ) =>
      this.request<RefreshSuccess, ErrorResponse>({
        path: `/api/accounts/auth/refresh/`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/accounts/invites/ — invite a single user (inactive until onboarding).
     *
     * @tags accounts
     * @name AccountsInvitesCreate
     * @request POST:/api/accounts/invites/
     */
    accountsInvitesCreate: (data: InviteSingle, params: RequestParams = {}) =>
      this.request<UserResponse, ErrorResponse>({
        path: `/api/accounts/invites/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/accounts/invites/bulk/ — bulk invite from an Excel file.
     *
     * @tags accounts
     * @name AccountsInvitesBulkCreate
     * @request POST:/api/accounts/invites/bulk/
     */
    accountsInvitesBulkCreate: (
      data: BulkInviteFile,
      params: RequestParams = {},
    ) =>
      this.request<BulkInviteUsersWrapper, ErrorResponse>({
        path: `/api/accounts/invites/bulk/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description GET /auth/me/ Returns authenticated user data, role, permissions and profile. Used by the frontend to bootstrap session state and drive RBAC.
     *
     * @tags accounts
     * @name AccountsMeRetrieve
     * @request GET:/api/accounts/me/
     */
    accountsMeRetrieve: (params: RequestParams = {}) =>
      this.request<Me, ErrorResponse>({
        path: `/api/accounts/me/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET / POST /api/accounts/onboard/{token}/ — validate token / complete onboarding (public).
     *
     * @tags accounts
     * @name AccountsOnboardRetrieve
     * @request GET:/api/accounts/onboard/{token}/
     * @secure
     */
    accountsOnboardRetrieve: (token: string, params: RequestParams = {}) =>
      this.request<OnboardingPreviewWrapper, ErrorResponse>({
        path: `/api/accounts/onboard/${token}/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description GET / POST /api/accounts/onboard/{token}/ — validate token / complete onboarding (public).
     *
     * @tags accounts
     * @name AccountsOnboardCreate
     * @request POST:/api/accounts/onboard/{token}/
     * @secure
     */
    accountsOnboardCreate: (
      token: string,
      data: CompleteOnboarding,
      params: RequestParams = {},
    ) =>
      this.request<OnboardingCompleteSuccess, ErrorResponse>({
        path: `/api/accounts/onboard/${token}/`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/accounts/profile/me/ — retrieve own profile POST /api/accounts/profile/me/ - creates profile PATCH /api/accounts/profile/me/ — update own profile (including photo upload)
     *
     * @tags accounts
     * @name AccountsProfileMeRetrieve
     * @request GET:/api/accounts/profile/me/
     */
    accountsProfileMeRetrieve: (params: RequestParams = {}) =>
      this.request<Profile, ErrorResponse>({
        path: `/api/accounts/profile/me/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/accounts/profile/me/ — retrieve own profile POST /api/accounts/profile/me/ - creates profile PATCH /api/accounts/profile/me/ — update own profile (including photo upload)
     *
     * @tags accounts
     * @name AccountsProfileMeCreate
     * @request POST:/api/accounts/profile/me/
     */
    accountsProfileMeCreate: (data: Profile, params: RequestParams = {}) =>
      this.request<Profile, ErrorResponse>({
        path: `/api/accounts/profile/me/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/accounts/profile/me/ — retrieve own profile POST /api/accounts/profile/me/ - creates profile PATCH /api/accounts/profile/me/ — update own profile (including photo upload)
     *
     * @tags accounts
     * @name AccountsProfileMePartialUpdate
     * @request PATCH:/api/accounts/profile/me/
     */
    accountsProfileMePartialUpdate: (
      data: PatchedProfile,
      params: RequestParams = {},
    ) =>
      this.request<Profile, ErrorResponse>({
        path: `/api/accounts/profile/me/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description GET /api/accounts/teachers/ — users with ``accounts.can_teach`` (minimal fields).
     *
     * @tags accounts
     * @name AccountsTeachersList
     * @request GET:/api/accounts/teachers/
     */
    accountsTeachersList: (params: RequestParams = {}) =>
      this.request<TeacherSummary[], ErrorResponse>({
        path: `/api/accounts/teachers/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/accounts/users/ — list users (coordination & direction). POST /api/accounts/users/ — create user.
     *
     * @tags accounts
     * @name AccountsUsersList
     * @request GET:/api/accounts/users/
     */
    accountsUsersList: (params: RequestParams = {}) =>
      this.request<UserResponse[], ErrorResponse>({
        path: `/api/accounts/users/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/accounts/users/ — list users (coordination & direction). POST /api/accounts/users/ — create user.
     *
     * @tags accounts
     * @name AccountsUsersCreate
     * @request POST:/api/accounts/users/
     */
    accountsUsersCreate: (data: CreateUser, params: RequestParams = {}) =>
      this.request<UserResponse, ErrorResponse>({
        path: `/api/accounts/users/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description PATCH /api/accounts/users/<pk>/ — update principal fields (direction only). Requires ``accounts.change_user``.
     *
     * @tags accounts
     * @name AccountsUsersPartialUpdate
     * @request PATCH:/api/accounts/users/{id}/
     */
    accountsUsersPartialUpdate: (
      id: number,
      data: PatchedUserCoreUpdate,
      params: RequestParams = {},
    ) =>
      this.request<UserResponse, ErrorResponse>({
        path: `/api/accounts/users/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/accounts/users/{pk}/resend-invite/
     *
     * @tags accounts
     * @name AccountsUsersResendInviteCreate
     * @request POST:/api/accounts/users/{id}/resend-invite/
     */
    accountsUsersResendInviteCreate: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/accounts/users/${id}/resend-invite/`,
        method: "POST",
        ...params,
      }),

    /**
     * No description
     *
     * @tags billing
     * @name BillingEntriesList
     * @request GET:/api/billing/entries/
     */
    billingEntriesList: (
      query?: {
        coaching_class_id?: number;
        /** @format date-time */
        date_from?: string;
        /** @format date-time */
        date_to?: string;
        /**
         * * `coaching` - Coaching
         * * `fine` - Fine
         * @minLength 1
         */
        source_type?: "coaching" | "fine";
        /**
         * * `pending` - Pending
         * * `exported` - Exported
         * * `cancelled` - Cancelled
         * @minLength 1
         */
        status?: "pending" | "exported" | "cancelled";
        student_id?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<BillingEntryList[], ErrorResponse>({
        path: `/api/billing/entries/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags billing
     * @name BillingEntriesRetrieve
     * @request GET:/api/billing/entries/{id}/
     */
    billingEntriesRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<BillingEntryDetail, ErrorResponse>({
        path: `/api/billing/entries/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags billing
     * @name BillingEntriesCancelCreate
     * @request POST:/api/billing/entries/{id}/cancel/
     */
    billingEntriesCancelCreate: (
      id: number,
      data: BillingEntryCancel,
      params: RequestParams = {},
    ) =>
      this.request<BillingEntryDetail, ErrorResponse>({
        path: `/api/billing/entries/${id}/cancel/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags billing
     * @name BillingFinesList
     * @request GET:/api/billing/fines/
     */
    billingFinesList: (
      query?: {
        coaching_class_id?: number;
        /**
         * * `absence` - Absence
         * * `late_cancellation` - Late cancellation
         * @minLength 1
         */
        reason?: "absence" | "late_cancellation";
        /**
         * * `pending_review` - Pending review
         * * `approved` - Approved
         * * `waived` - Waived
         * @minLength 1
         */
        status?: "pending_review" | "approved" | "waived";
        student_id?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<FineList[], ErrorResponse>({
        path: `/api/billing/fines/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags billing
     * @name BillingFinesRetrieve
     * @request GET:/api/billing/fines/{id}/
     */
    billingFinesRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<FineDetail, ErrorResponse>({
        path: `/api/billing/fines/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags billing
     * @name BillingFinesApproveCreate
     * @request POST:/api/billing/fines/{id}/approve/
     */
    billingFinesApproveCreate: (
      id: number,
      data: FineApprove,
      params: RequestParams = {},
    ) =>
      this.request<FineDetail, ErrorResponse>({
        path: `/api/billing/fines/${id}/approve/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags billing
     * @name BillingFinesWaiveCreate
     * @request POST:/api/billing/fines/{id}/waive/
     */
    billingFinesWaiveCreate: (
      id: number,
      data: FineWaive,
      params: RequestParams = {},
    ) =>
      this.request<FineDetail, ErrorResponse>({
        path: `/api/billing/fines/${id}/waive/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesRetrieve
     * @request GET:/api/classes/
     */
    classesRetrieve: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/classes/`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesCreate
     * @request POST:/api/classes/
     */
    classesCreate: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/classes/`,
        method: "POST",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesMembersRetrieve
     * @request GET:/api/classes/{classe_id}/members/
     */
    classesMembersRetrieve: (classeId: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/classes/${classeId}/members/`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesMembersCreate
     * @request POST:/api/classes/{classe_id}/members/
     */
    classesMembersCreate: (classeId: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/classes/${classeId}/members/`,
        method: "POST",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesMembersDestroy
     * @request DELETE:/api/classes/{classe_id}/members/{id}/
     */
    classesMembersDestroy: (
      classeId: number,
      id: number,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/classes/${classeId}/members/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesRetrieve2
     * @request GET:/api/classes/{id}/
     */
    classesRetrieve2: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/classes/${id}/`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesPartialUpdate
     * @request PATCH:/api/classes/{id}/
     */
    classesPartialUpdate: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/classes/${id}/`,
        method: "PATCH",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesDestroy
     * @request DELETE:/api/classes/{id}/
     */
    classesDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/classes/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description ``GET /api/coachings/`` — list coachings. ``POST /api/coachings/`` — direct coordination scheduling (timetable / scheduled coaching).
     *
     * @tags coachings
     * @name CoachingsList
     * @request GET:/api/coachings/
     */
    coachingsList: (
      query?: {
        /** @format date-time */
        date_from?: string;
        /** @format date-time */
        date_to?: string;
        requested_by_id?: number;
        /**
         * * `requested` - Requested
         * * `pending_approval` - Pending Approval
         * * `scheduled` - Scheduled
         * * `waiting_confirmation` - Waiting Confirmation
         * * `pending_completion_approval` - Pending Completion Approval
         * * `completed` - Completed
         * * `cancelled` - Cancelled
         * * `rejected` - Rejected
         * @minLength 1
         */
        status?:
          | "requested"
          | "pending_approval"
          | "scheduled"
          | "waiting_confirmation"
          | "pending_completion_approval"
          | "completed"
          | "cancelled"
          | "rejected";
        studio_id?: number;
        teacher_id?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<CoachingClass[], ErrorResponse>({
        path: `/api/coachings/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description ``GET /api/coachings/`` — list coachings. ``POST /api/coachings/`` — direct coordination scheduling (timetable / scheduled coaching).
     *
     * @tags coachings
     * @name CoachingsCreate
     * @request POST:/api/coachings/
     */
    coachingsCreate: (
      data: DirectCoordinationCoachingCreate,
      params: RequestParams = {},
    ) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsParticipantsList
     * @request GET:/api/coachings/{coaching_id}/participants/
     */
    coachingsParticipantsList: (
      coachingId: number,
      params: RequestParams = {},
    ) =>
      this.request<CoachingParticipant[], ErrorResponse>({
        path: `/api/coachings/${coachingId}/participants/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsParticipantsCreate
     * @request POST:/api/coachings/{coaching_id}/participants/
     */
    coachingsParticipantsCreate: (
      coachingId: number,
      data: AddParticipant,
      params: RequestParams = {},
    ) =>
      this.request<CoachingParticipant, ErrorResponse>({
        path: `/api/coachings/${coachingId}/participants/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST — coordination approves a peer-invited pending participant (scheduled coachings).
     *
     * @tags coachings
     * @name CoachingsParticipantsApproveCreate
     * @request POST:/api/coachings/{coaching_id}/participants/{id}/approve/
     */
    coachingsParticipantsApproveCreate: (
      coachingId: number,
      id: number,
      params: RequestParams = {},
    ) =>
      this.request<CoachingParticipant, ErrorResponse>({
        path: `/api/coachings/${coachingId}/participants/${id}/approve/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsParticipantsCancelCreate
     * @request POST:/api/coachings/{coaching_id}/participants/{id}/cancel/
     */
    coachingsParticipantsCancelCreate: (
      coachingId: number,
      id: number,
      data: ParticipantCancel,
      params: RequestParams = {},
    ) =>
      this.request<CoachingParticipant, ErrorResponse>({
        path: `/api/coachings/${coachingId}/participants/${id}/cancel/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST — student or parent confirms ATTENDED / ABSENT after session end.
     *
     * @tags coachings
     * @name CoachingsParticipantsConfirmAttendanceCreate
     * @request POST:/api/coachings/{coaching_id}/participants/{id}/confirm-attendance/
     */
    coachingsParticipantsConfirmAttendanceCreate: (
      coachingId: number,
      id: number,
      data: ConfirmParticipantAttendance,
      params: RequestParams = {},
    ) =>
      this.request<CoachingParticipant, ErrorResponse>({
        path: `/api/coachings/${coachingId}/participants/${id}/confirm-attendance/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST — invited student confirms attendance (staff invite → active; legacy invite → pending).
     *
     * @tags coachings
     * @name CoachingsParticipantsAcceptCreate
     * @request POST:/api/coachings/{coaching_id}/participants/accept/
     */
    coachingsParticipantsAcceptCreate: (
      coachingId: number,
      params: RequestParams = {},
    ) =>
      this.request<CoachingParticipant, ErrorResponse>({
        path: `/api/coachings/${coachingId}/participants/accept/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsRetrieve
     * @request GET:/api/coachings/{id}/
     */
    coachingsRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsPartialUpdate
     * @request PATCH:/api/coachings/{id}/
     */
    coachingsPartialUpdate: (
      id: number,
      data: PatchedCoachingUpdate,
      params: RequestParams = {},
    ) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST — teacher accepts the request (coaching status only; participants unchanged).
     *
     * @tags coachings
     * @name CoachingsAcceptCreate
     * @request POST:/api/coachings/{id}/accept/
     */
    coachingsAcceptCreate: (id: number, params: RequestParams = {}) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/accept/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST — coordination schedules the coaching; activates ``pending`` roster rows only.
     *
     * @tags coachings
     * @name CoachingsApproveCreate
     * @request POST:/api/coachings/{id}/approve/
     */
    coachingsApproveCreate: (
      id: number,
      data: CoachingApprove,
      params: RequestParams = {},
    ) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/approve/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsCancelCreate
     * @request POST:/api/coachings/{id}/cancel/
     */
    coachingsCancelCreate: (
      id: number,
      data: CoachingCancel,
      params: RequestParams = {},
    ) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/cancel/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsCompleteCreate
     * @request POST:/api/coachings/{id}/complete/
     */
    coachingsCompleteCreate: (id: number, params: RequestParams = {}) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/complete/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsRejectCreate
     * @request POST:/api/coachings/{id}/reject/
     */
    coachingsRejectCreate: (
      id: number,
      data: CoachingReject,
      params: RequestParams = {},
    ) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/reject/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST — assigned teacher confirms the session took place (waiting_confirmation).
     *
     * @tags coachings
     * @name CoachingsTeacherConfirmCreate
     * @request POST:/api/coachings/{id}/teacher-confirm/
     */
    coachingsTeacherConfirmCreate: (
      id: number,
      data: TeacherConfirmCoaching,
      params: RequestParams = {},
    ) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/teacher-confirm/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description ``POST /api/coachings/request/`` — student/parent (and similar) coaching requests.
     *
     * @tags coachings
     * @name CoachingsRequestCreate
     * @request POST:/api/coachings/request/
     */
    coachingsRequestCreate: (
      data: CoachingRequest,
      params: RequestParams = {},
    ) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/request/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsTeachersAvailabilityList
     * @request GET:/api/coachings/teachers/{user_id}/availability/
     */
    coachingsTeachersAvailabilityList: (
      userId: number,
      query?: {
        /** @format date-time */
        date_from?: string;
        /** @format date-time */
        date_to?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<TeacherAvailability[], ErrorResponse>({
        path: `/api/coachings/teachers/${userId}/availability/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsTeachersAvailabilityCreate
     * @request POST:/api/coachings/teachers/{user_id}/availability/
     */
    coachingsTeachersAvailabilityCreate: (
      userId: number,
      data: TeacherAvailabilitySubmit,
      params: RequestParams = {},
    ) =>
      this.request<TeacherAvailability, ErrorResponse>({
        path: `/api/coachings/teachers/${userId}/availability/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsTeachersAvailabilityPartialUpdate
     * @request PATCH:/api/coachings/teachers/{user_id}/availability/{id}/
     */
    coachingsTeachersAvailabilityPartialUpdate: (
      id: number,
      userId: number,
      data: PatchedTeacherAvailabilityUpdate,
      params: RequestParams = {},
    ) =>
      this.request<TeacherAvailability, ErrorResponse>({
        path: `/api/coachings/teachers/${userId}/availability/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags coachings
     * @name CoachingsTeachersAvailabilityDestroy
     * @request DELETE:/api/coachings/teachers/{user_id}/availability/{id}/
     */
    coachingsTeachersAvailabilityDestroy: (
      id: number,
      userId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/coachings/teachers/${userId}/availability/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/ — submit a new enrollment (public) Accepts multipart/form-data with either: - `data`: JSON string containing enrollment fields, modality_ids, and consents; or - flat form fields (same keys as the submit serializer), including optional `consent_rgpd` and `consent_internal_regulation` booleans instead of a `consents` JSON array when not using the `data` field. Plus one or more file uploads (e.g. payment proof) as usual. Also accepts pure application/json (without files).
     *
     * @tags enrollments
     * @name EnrollmentsCreate
     * @request POST:/api/enrollments/
     * @secure
     */
    enrollmentsCreate: (data: EnrollmentSubmit, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description GET   /api/enrollments/<pk>/          — retrieve an enrollment PATCH /api/enrollments/<pk>/          — update snapshot data (no status changes)
     *
     * @tags enrollments
     * @name EnrollmentsRetrieve
     * @request GET:/api/enrollments/{id}/
     */
    enrollmentsRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET   /api/enrollments/<pk>/          — retrieve an enrollment PATCH /api/enrollments/<pk>/          — update snapshot data (no status changes)
     *
     * @tags enrollments
     * @name EnrollmentsPartialUpdate
     * @request PATCH:/api/enrollments/{id}/
     */
    enrollmentsPartialUpdate: (
      id: number,
      data: PatchedEnrollmentUpdate,
      params: RequestParams = {},
    ) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/<pk>/approve/ — approve and create users
     *
     * @tags enrollments
     * @name EnrollmentsApproveCreate
     * @request POST:/api/enrollments/{id}/approve/
     */
    enrollmentsApproveCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/approve/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/<pk>/cancel/
     *
     * @tags enrollments
     * @name EnrollmentsCancelCreate
     * @request POST:/api/enrollments/{id}/cancel/
     */
    enrollmentsCancelCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/cancel/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/enrollments/<pk>/payments/  — list payments for an enrollment POST /api/enrollments/<pk>/payments/  — create a payment record
     *
     * @tags enrollments
     * @name EnrollmentsPaymentsList
     * @request GET:/api/enrollments/{id}/payments/
     */
    enrollmentsPaymentsList: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentPaymentRead[], ErrorResponse>({
        path: `/api/enrollments/${id}/payments/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/enrollments/<pk>/payments/  — list payments for an enrollment POST /api/enrollments/<pk>/payments/  — create a payment record
     *
     * @tags enrollments
     * @name EnrollmentsPaymentsCreate
     * @request POST:/api/enrollments/{id}/payments/
     */
    enrollmentsPaymentsCreate: (
      id: number,
      data: EnrollmentPaymentCreate,
      params: RequestParams = {},
    ) =>
      this.request<EnrollmentPaymentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/payments/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/<pk>/payments/<payment_pk>/confirm/
     *
     * @tags enrollments
     * @name EnrollmentsPaymentsConfirmCreate
     * @request POST:/api/enrollments/{id}/payments/{payment_pk}/confirm/
     */
    enrollmentsPaymentsConfirmCreate: (
      id: number,
      paymentPk: number,
      params: RequestParams = {},
    ) =>
      this.request<EnrollmentPaymentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/payments/${paymentPk}/confirm/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/<pk>/reject/
     *
     * @tags enrollments
     * @name EnrollmentsRejectCreate
     * @request POST:/api/enrollments/{id}/reject/
     */
    enrollmentsRejectCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/reject/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/<pk>/start-review/
     *
     * @tags enrollments
     * @name EnrollmentsStartReviewCreate
     * @request POST:/api/enrollments/{id}/start-review/
     */
    enrollmentsStartReviewCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/start-review/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description GET /api/enrollments/list/ — list enrollments (staff only)
     *
     * @tags enrollments
     * @name EnrollmentsListList
     * @request GET:/api/enrollments/list/
     */
    enrollmentsListList: (
      query?: {
        /** @minLength 1 */
        academic_year?: string;
        /**
         * * `new` - New
         * * `renewal` - Renewal
         * @minLength 1
         */
        enrollment_type?: "new" | "renewal";
        /**
         * * `submitted` - Submitted
         * * `under_review` - Under Review
         * * `approved` - Approved
         * * `rejected` - Rejected
         * * `cancelled` - Cancelled
         * @minLength 1
         */
        status?:
          | "submitted"
          | "under_review"
          | "approved"
          | "rejected"
          | "cancelled";
      },
      params: RequestParams = {},
    ) =>
      this.request<EnrollmentRead[], ErrorResponse>({
        path: `/api/enrollments/list/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description GET /api/enrollments/periods/ Public — no authentication required. Used by the enrollment form to display the open period and its fees.
     *
     * @tags enrollments
     * @name EnrollmentsPeriodsList
     * @request GET:/api/enrollments/periods/
     * @secure
     */
    enrollmentsPeriodsList: (params: RequestParams = {}) =>
      this.request<EnrollmentPeriod[], ErrorResponse>({
        path: `/api/enrollments/periods/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description GET   /api/enrollments/periods/<pk>/ — public, no auth required PATCH /api/enrollments/periods/<pk>/ — direction only
     *
     * @tags enrollments
     * @name EnrollmentsPeriodsRetrieve
     * @request GET:/api/enrollments/periods/{id}/
     * @secure
     */
    enrollmentsPeriodsRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentPeriod, ErrorResponse>({
        path: `/api/enrollments/periods/${id}/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description GET   /api/enrollments/periods/<pk>/ — public, no auth required PATCH /api/enrollments/periods/<pk>/ — direction only
     *
     * @tags enrollments
     * @name EnrollmentsPeriodsPartialUpdate
     * @request PATCH:/api/enrollments/periods/{id}/
     */
    enrollmentsPeriodsPartialUpdate: (
      id: number,
      data: PatchedEnrollmentPeriod,
      params: RequestParams = {},
    ) =>
      this.request<EnrollmentPeriod, ErrorResponse>({
        path: `/api/enrollments/periods/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/periods/<pk>/close/ — close a period
     *
     * @tags enrollments
     * @name EnrollmentsPeriodsCloseCreate
     * @request POST:/api/enrollments/periods/{id}/close/
     */
    enrollmentsPeriodsCloseCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentPeriod, ErrorResponse>({
        path: `/api/enrollments/periods/${id}/close/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/periods/<pk>/open/  — open a enrollment period window
     *
     * @tags enrollments
     * @name EnrollmentsPeriodsOpenCreate
     * @request POST:/api/enrollments/periods/{id}/open/
     */
    enrollmentsPeriodsOpenCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentPeriod, ErrorResponse>({
        path: `/api/enrollments/periods/${id}/open/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/periods/create/ Direction only. Creates a new enrollment period.
     *
     * @tags enrollments
     * @name EnrollmentsPeriodsCreateCreate
     * @request POST:/api/enrollments/periods/create/
     */
    enrollmentsPeriodsCreateCreate: (
      data: EnrollmentPeriod,
      params: RequestParams = {},
    ) =>
      this.request<EnrollmentPeriod, ErrorResponse>({
        path: `/api/enrollments/periods/create/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsList
     * @request GET:/api/events/
     * @secure
     */
    eventsList: (params: RequestParams = {}) =>
      this.request<EventList[], ErrorResponse>({
        path: `/api/events/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsCreate
     * @request POST:/api/events/
     */
    eventsCreate: (data: EventCreate, params: RequestParams = {}) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsCommentsList
     * @request GET:/api/events/{event_id}/comments/
     * @secure
     */
    eventsCommentsList: (eventId: number, params: RequestParams = {}) =>
      this.request<EventComment[], ErrorResponse>({
        path: `/api/events/${eventId}/comments/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsCommentsCreate
     * @request POST:/api/events/{event_id}/comments/
     */
    eventsCommentsCreate: (
      eventId: number,
      data: EventCommentCreate,
      params: RequestParams = {},
    ) =>
      this.request<EventComment, ErrorResponse>({
        path: `/api/events/${eventId}/comments/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsCommentsUpdate
     * @request PUT:/api/events/{event_id}/comments/{comment_id}/
     */
    eventsCommentsUpdate: (
      commentId: number,
      eventId: number,
      data: EventCommentUpdate,
      params: RequestParams = {},
    ) =>
      this.request<EventComment, ErrorResponse>({
        path: `/api/events/${eventId}/comments/${commentId}/`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsCommentsDestroy
     * @request DELETE:/api/events/{event_id}/comments/{comment_id}/
     */
    eventsCommentsDestroy: (
      commentId: number,
      eventId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/events/${eventId}/comments/${commentId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsFilesList
     * @request GET:/api/events/{event_id}/files/
     * @secure
     */
    eventsFilesList: (eventId: number, params: RequestParams = {}) =>
      this.request<EventFile[], ErrorResponse>({
        path: `/api/events/${eventId}/files/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsFilesCreate
     * @request POST:/api/events/{event_id}/files/
     */
    eventsFilesCreate: (
      eventId: number,
      data: EventFileCreate,
      params: RequestParams = {},
    ) =>
      this.request<EventFile, ErrorResponse>({
        path: `/api/events/${eventId}/files/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsFilesDestroy
     * @request DELETE:/api/events/{event_id}/files/{file_id}/
     */
    eventsFilesDestroy: (
      eventId: number,
      fileId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/events/${eventId}/files/${fileId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsInterestsCreate
     * @request POST:/api/events/{event_id}/interests/
     */
    eventsInterestsCreate: (eventId: number, params: RequestParams = {}) =>
      this.request<EventInterest, ErrorResponse>({
        path: `/api/events/${eventId}/interests/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsInterestsMeDestroy
     * @request DELETE:/api/events/{event_id}/interests/me/
     */
    eventsInterestsMeDestroy: (eventId: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/events/${eventId}/interests/me/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsPostsList
     * @request GET:/api/events/{event_id}/posts/
     * @secure
     */
    eventsPostsList: (eventId: number, params: RequestParams = {}) =>
      this.request<EventPost[], ErrorResponse>({
        path: `/api/events/${eventId}/posts/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsPostsCreate
     * @request POST:/api/events/{event_id}/posts/
     */
    eventsPostsCreate: (
      eventId: number,
      data: EventPostCreate,
      params: RequestParams = {},
    ) =>
      this.request<EventPost, ErrorResponse>({
        path: `/api/events/${eventId}/posts/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsPostsRetrieve
     * @request GET:/api/events/{event_id}/posts/{post_id}/
     * @secure
     */
    eventsPostsRetrieve: (
      eventId: number,
      postId: number,
      params: RequestParams = {},
    ) =>
      this.request<EventPost, ErrorResponse>({
        path: `/api/events/${eventId}/posts/${postId}/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsPostsUpdate
     * @request PUT:/api/events/{event_id}/posts/{post_id}/
     */
    eventsPostsUpdate: (
      eventId: number,
      postId: number,
      data: EventPostUpdate,
      params: RequestParams = {},
    ) =>
      this.request<EventPost, ErrorResponse>({
        path: `/api/events/${eventId}/posts/${postId}/`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsPostsDestroy
     * @request DELETE:/api/events/{event_id}/posts/{post_id}/
     */
    eventsPostsDestroy: (
      eventId: number,
      postId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/events/${eventId}/posts/${postId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsPostsPublishCreate
     * @request POST:/api/events/{event_id}/posts/{post_id}/publish/
     */
    eventsPostsPublishCreate: (
      eventId: number,
      postId: number,
      data: EventPostPublish,
      params: RequestParams = {},
    ) =>
      this.request<EventPost, ErrorResponse>({
        path: `/api/events/${eventId}/posts/${postId}/publish/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsPostsSchedulePublicationCreate
     * @request POST:/api/events/{event_id}/posts/{post_id}/schedule-publication/
     */
    eventsPostsSchedulePublicationCreate: (
      eventId: number,
      postId: number,
      data: EventPostSchedulePublication,
      params: RequestParams = {},
    ) =>
      this.request<EventPost, ErrorResponse>({
        path: `/api/events/${eventId}/posts/${postId}/schedule-publication/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsRetrieve
     * @request GET:/api/events/{id}/
     * @secure
     */
    eventsRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/${id}/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsUpdate
     * @request PUT:/api/events/{id}/
     */
    eventsUpdate: (id: number, data: EventUpdate, params: RequestParams = {}) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/${id}/`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsDestroy
     * @request DELETE:/api/events/{id}/
     */
    eventsDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/events/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsArchiveCreate
     * @request POST:/api/events/{id}/archive/
     */
    eventsArchiveCreate: (id: number, params: RequestParams = {}) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/${id}/archive/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsCancelCreate
     * @request POST:/api/events/{id}/cancel/
     */
    eventsCancelCreate: (id: number, params: RequestParams = {}) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/${id}/cancel/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsCompleteCreate
     * @request POST:/api/events/{id}/complete/
     */
    eventsCompleteCreate: (id: number, params: RequestParams = {}) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/${id}/complete/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsPublishCreate
     * @request POST:/api/events/{id}/publish/
     */
    eventsPublishCreate: (
      id: number,
      data: EventPublish,
      params: RequestParams = {},
    ) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/${id}/publish/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags events
     * @name EventsSchedulePublicationCreate
     * @request POST:/api/events/{id}/schedule-publication/
     */
    eventsSchedulePublicationCreate: (
      id: number,
      data: EventSchedulePublication,
      params: RequestParams = {},
    ) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/${id}/schedule-publication/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags messaging
     * @name MessagingConversationsList
     * @request GET:/api/messaging/conversations/
     */
    messagingConversationsList: (params: RequestParams = {}) =>
      this.request<Conversation[], ErrorResponse>({
        path: `/api/messaging/conversations/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags messaging
     * @name MessagingConversationsCreate
     * @request POST:/api/messaging/conversations/
     */
    messagingConversationsCreate: (
      data: CreateConversation,
      params: RequestParams = {},
    ) =>
      this.request<Conversation, ErrorResponse>({
        path: `/api/messaging/conversations/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags messaging
     * @name MessagingConversationsMessagesList
     * @request GET:/api/messaging/conversations/{conversation_id}/messages/
     */
    messagingConversationsMessagesList: (
      conversationId: number,
      params: RequestParams = {},
    ) =>
      this.request<Message[], ErrorResponse>({
        path: `/api/messaging/conversations/${conversationId}/messages/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags messaging
     * @name MessagingConversationsMessagesCreate
     * @request POST:/api/messaging/conversations/{conversation_id}/messages/
     */
    messagingConversationsMessagesCreate: (
      conversationId: number,
      data: SendMessage,
      params: RequestParams = {},
    ) =>
      this.request<Message, ErrorResponse>({
        path: `/api/messaging/conversations/${conversationId}/messages/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags modalities
     * @name ModalitiesList
     * @request GET:/api/modalities/
     */
    modalitiesList: (params: RequestParams = {}) =>
      this.request<Modality[], ErrorResponse>({
        path: `/api/modalities/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags modalities
     * @name ModalitiesCreate
     * @request POST:/api/modalities/
     */
    modalitiesCreate: (data: ModalitySubmit, params: RequestParams = {}) =>
      this.request<Modality, ErrorResponse>({
        path: `/api/modalities/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags modalities
     * @name ModalitiesRetrieve
     * @request GET:/api/modalities/{id}/
     */
    modalitiesRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<Modality, ErrorResponse>({
        path: `/api/modalities/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags modalities
     * @name ModalitiesPartialUpdate
     * @request PATCH:/api/modalities/{id}/
     */
    modalitiesPartialUpdate: (
      id: number,
      data: PatchedModalityUpdate,
      params: RequestParams = {},
    ) =>
      this.request<Modality, ErrorResponse>({
        path: `/api/modalities/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags modalities
     * @name ModalitiesDestroy
     * @request DELETE:/api/modalities/{id}/
     */
    modalitiesDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/modalities/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags modalities
     * @name ModalitiesUsersModalitiesList
     * @request GET:/api/modalities/users/{user_id}/modalities/
     */
    modalitiesUsersModalitiesList: (
      userId: number,
      params: RequestParams = {},
    ) =>
      this.request<UserModality[], ErrorResponse>({
        path: `/api/modalities/users/${userId}/modalities/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags modalities
     * @name ModalitiesUsersModalitiesCreate
     * @request POST:/api/modalities/users/{user_id}/modalities/
     */
    modalitiesUsersModalitiesCreate: (
      userId: number,
      data: UserModalitySubmit,
      params: RequestParams = {},
    ) =>
      this.request<UserModality, ErrorResponse>({
        path: `/api/modalities/users/${userId}/modalities/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags modalities
     * @name ModalitiesUsersModalitiesDestroy
     * @request DELETE:/api/modalities/users/{user_id}/modalities/{id}/
     */
    modalitiesUsersModalitiesDestroy: (
      id: number,
      userId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/modalities/users/${userId}/modalities/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description GET  /api/roles/ — list roles. POST /api/roles/ — create role.
     *
     * @tags roles
     * @name RolesList
     * @request GET:/api/roles/
     */
    rolesList: (params: RequestParams = {}) =>
      this.request<RoleList[], ErrorResponse>({
        path: `/api/roles/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/roles/ — list roles. POST /api/roles/ — create role.
     *
     * @tags roles
     * @name RolesCreate
     * @request POST:/api/roles/
     */
    rolesCreate: (data: CreateRole, params: RequestParams = {}) =>
      this.request<RoleDetail, ErrorResponse>({
        path: `/api/roles/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description GET    /api/roles/<code>/ — retrieve role. PATCH  /api/roles/<code>/ — update description. DELETE /api/roles/<code>/ — delete role.
     *
     * @tags roles
     * @name RolesRetrieve
     * @request GET:/api/roles/{code}/
     */
    rolesRetrieve: (code: string, params: RequestParams = {}) =>
      this.request<RoleDetail, ErrorResponse>({
        path: `/api/roles/${code}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET    /api/roles/<code>/ — retrieve role. PATCH  /api/roles/<code>/ — update description. DELETE /api/roles/<code>/ — delete role.
     *
     * @tags roles
     * @name RolesPartialUpdate
     * @request PATCH:/api/roles/{code}/
     */
    rolesPartialUpdate: (
      code: string,
      data: PatchedUpdateRole,
      params: RequestParams = {},
    ) =>
      this.request<RoleDetail, ErrorResponse>({
        path: `/api/roles/${code}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description GET    /api/roles/<code>/ — retrieve role. PATCH  /api/roles/<code>/ — update description. DELETE /api/roles/<code>/ — delete role.
     *
     * @tags roles
     * @name RolesDestroy
     * @request DELETE:/api/roles/{code}/
     */
    rolesDestroy: (code: string, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/roles/${code}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description PUT /api/roles/<code>/permissions/ — replace permission set.
     *
     * @tags roles
     * @name RolesPermissionsUpdate
     * @request PUT:/api/roles/{code}/permissions/
     */
    rolesPermissionsUpdate: (
      code: string,
      data: SetRolePermissions,
      params: RequestParams = {},
    ) =>
      this.request<RoleDetail, ErrorResponse>({
        path: `/api/roles/${code}/permissions/`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description GET /api/roles/permissions/available/ — list Django permissions.
     *
     * @tags roles
     * @name RolesPermissionsAvailableList
     * @request GET:/api/roles/permissions/available/
     */
    rolesPermissionsAvailableList: (params: RequestParams = {}) =>
      this.request<Permission[], ErrorResponse>({
        path: `/api/roles/permissions/available/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description OpenApi3 schema for this API. Format can be selected via content negotiation. - YAML: application/vnd.oai.openapi - JSON: application/vnd.oai.openapi+json
     *
     * @tags schema
     * @name SchemaRetrieve
     * @request GET:/api/schema/
     * @secure
     */
    schemaRetrieve: (
      query?: {
        format?: "json" | "yaml";
        lang?:
          | "af"
          | "ar"
          | "ar-dz"
          | "ast"
          | "az"
          | "be"
          | "bg"
          | "bn"
          | "br"
          | "bs"
          | "ca"
          | "ckb"
          | "cs"
          | "cy"
          | "da"
          | "de"
          | "dsb"
          | "el"
          | "en"
          | "en-au"
          | "en-gb"
          | "eo"
          | "es"
          | "es-ar"
          | "es-co"
          | "es-mx"
          | "es-ni"
          | "es-ve"
          | "et"
          | "eu"
          | "fa"
          | "fi"
          | "fr"
          | "fy"
          | "ga"
          | "gd"
          | "gl"
          | "he"
          | "hi"
          | "hr"
          | "hsb"
          | "ht"
          | "hu"
          | "hy"
          | "ia"
          | "id"
          | "ig"
          | "io"
          | "is"
          | "it"
          | "ja"
          | "ka"
          | "kab"
          | "kk"
          | "km"
          | "kn"
          | "ko"
          | "ky"
          | "lb"
          | "lt"
          | "lv"
          | "mk"
          | "ml"
          | "mn"
          | "mr"
          | "ms"
          | "my"
          | "nb"
          | "ne"
          | "nl"
          | "nn"
          | "os"
          | "pa"
          | "pl"
          | "pt"
          | "pt-br"
          | "ro"
          | "ru"
          | "sk"
          | "sl"
          | "sq"
          | "sr"
          | "sr-latn"
          | "sv"
          | "sw"
          | "ta"
          | "te"
          | "tg"
          | "th"
          | "tk"
          | "tr"
          | "tt"
          | "udm"
          | "ug"
          | "uk"
          | "ur"
          | "uz"
          | "vi"
          | "zh-hans"
          | "zh-hant";
      },
      params: RequestParams = {},
    ) =>
      this.request<Record<string, any>, any>({
        path: `/api/schema/`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags studios
     * @name StudiosList
     * @request GET:/api/studios/
     */
    studiosList: (params: RequestParams = {}) =>
      this.request<Studio[], ErrorResponse>({
        path: `/api/studios/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags studios
     * @name StudiosCreate
     * @request POST:/api/studios/
     */
    studiosCreate: (data: StudioSubmit, params: RequestParams = {}) =>
      this.request<Studio, ErrorResponse>({
        path: `/api/studios/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags studios
     * @name StudiosRetrieve
     * @request GET:/api/studios/{id}/
     */
    studiosRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<Studio, ErrorResponse>({
        path: `/api/studios/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags studios
     * @name StudiosPartialUpdate
     * @request PATCH:/api/studios/{id}/
     */
    studiosPartialUpdate: (
      id: number,
      data: PatchedStudioUpdate,
      params: RequestParams = {},
    ) =>
      this.request<Studio, ErrorResponse>({
        path: `/api/studios/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags studios
     * @name StudiosDestroy
     * @request DELETE:/api/studios/{id}/
     */
    studiosDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/studios/${id}/`,
        method: "DELETE",
        ...params,
      }),
  };
}
