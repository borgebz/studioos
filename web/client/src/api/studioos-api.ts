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
 * * `rent` - Rent
 * * `sell` - Sell
 * * `lend` - Lend
 * * `donate` - Donate
 */
export enum TransactionTypeEnum {
  Rent = "rent",
  Sell = "sell",
  Lend = "lend",
  Donate = "donate",
}

/**
 * * `pending` - Pending
 * * `accepted` - Accepted
 * * `completed` - Completed
 * * `rejected` - Rejected
 * * `cancelled` - Cancelled
 * * `blocked` - Blocked
 */
export enum TransactionDetailStatusEnum {
  Pending = "pending",
  Accepted = "accepted",
  Completed = "completed",
  Rejected = "rejected",
  Cancelled = "cancelled",
  Blocked = "blocked",
}

/**
 * * `active` - Active
 * * `inactive` - Inactive
 * * `archived` - Archived
 */
export enum StatusDc4Enum {
  Active = "active",
  Inactive = "inactive",
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
 * * `available` - Available
 * * `maintenance` - Maintenance
 * * `inactive` - Inactive
 * * `sold` - Sold
 * * `donated` - Donated
 * * `archived` - Archived
 */
export enum Status7B2Enum {
  Available = "available",
  Maintenance = "maintenance",
  Inactive = "inactive",
  Sold = "sold",
  Donated = "donated",
  Archived = "archived",
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
 * * `draft` - Draft
 * * `active` - Active
 * * `closed` - Closed
 */
export enum Status421Enum {
  Draft = "draft",
  Active = "active",
  Closed = "closed",
}

/**
 * * `pending` - Pending
 * * `confirmed` - Confirmed
 * * `completed` - Completed
 * * `blocked` - Blocked
 * * `cancelled` - Cancelled
 */
export enum Status32EEnum {
  Pending = "pending",
  Confirmed = "confirmed",
  Completed = "completed",
  Blocked = "blocked",
  Cancelled = "cancelled",
}

/**
 * * `coaching` - Coaching
 * * `fine` - Fine
 * * `marketplace` - Marketplace
 */
export enum SourceTypeEnum {
  Coaching = "coaching",
  Fine = "fine",
  Marketplace = "marketplace",
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
 * * `school` - School
 * * `member` - Member
 */
export enum OwnerTypeEnum {
  School = "school",
  Member = "member",
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
 * * `rent` - Rent
 * * `sell` - Sell
 * * `lend` - Lend
 * * `donate` - Donate
 */
export enum ListingTypeEnum {
  Rent = "rent",
  Sell = "sell",
  Lend = "lend",
  Donate = "donate",
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
 * * `new` - New
 * * `excellent` - Excellent
 * * `good` - Good
 * * `fair` - Fair
 * * `damaged` - Damaged
 */
export enum ConditionEnum {
  New = "new",
  Excellent = "excellent",
  Good = "good",
  Fair = "fair",
  Damaged = "damaged",
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

/**
 * * `reservation` - Reservation
 * * `loan` - Loan
 * * `rent` - Rent
 * * `sale` - Sale
 * * `donation` - Donation
 * * `school_use` - School Use
 * * `maintenance` - Maintenance
 * * `blocked` - Blocked
 */
export enum BookingTypeEnum {
  Reservation = "reservation",
  Loan = "loan",
  Rent = "rent",
  Sale = "sale",
  Donation = "donation",
  SchoolUse = "school_use",
  Maintenance = "maintenance",
  Blocked = "blocked",
}

/**
 * * `purchased` - Purchased
 * * `donated` - Donated
 * * `school_owned` - School Owned
 * * `other` - Other
 */
export enum AcquisitionTypeEnum {
  Purchased = "purchased",
  Donated = "donated",
  SchoolOwned = "school_owned",
  Other = "other",
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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

export interface Category {
  id: number;
  /** @maxLength 255 */
  name: string;
  parent?: number | null;
  size_systems: Record<string, any>[];
  /**
   * @min -2147483648
   * @max 2147483647
   */
  sort_order?: number;
  is_active?: boolean;
  subcategories: Record<string, any>[];
}

export interface ClasseMemberSummaryStudent {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface ClasseMemberSummary {
  id: number;
  student: ClasseMemberSummaryStudent;
}

export interface Classe {
  id: number;
  /** @maxLength 255 */
  name: string;
  description?: string;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
  members: ClasseMemberSummary[];
}

export interface ClasseDetail {
  id: number;
  /** @maxLength 255 */
  name: string;
  description?: string;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
  members: ClasseMember[];
}

export interface ClasseMember {
  id: number;
  student: UserResponse;
  /** @format date-time */
  created_at: string;
}

export interface ClasseMemberSubmit {
  student_id: number;
}

export interface ClasseSubmit {
  /** @maxLength 255 */
  name: string;
  /** @default "" */
  description?: string;
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
  recurring_coaching: string;
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
  /** Student user ID when a parent requests on behalf of their child. */
  on_behalf_of?: number | null;
}

export interface Color {
  id: number;
  /** @maxLength 100 */
  name: string;
  /** @maxLength 7 */
  hex_code: string;
  is_active?: boolean;
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
  coaching_id: number | null;
  recurring_coaching_id: number | null;
  last_message: Message | null;
  /** @format date-time */
  updated_at: string;
}

export interface CreateCategory {
  name: string;
  parent_category_id?: number;
  size_system_ids?: number[];
  sort_order?: number;
  is_active?: boolean;
  subcategories?: any[];
}

export interface CreateColor {
  name: string;
  hex_code: string;
  /** @default true */
  is_active?: boolean;
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

export interface CreateSize {
  name: string;
  size_system_id: number;
  is_active?: boolean;
}

export interface CreateSizeSystem {
  name: string;
  is_active?: boolean;
  sizes?: SizeInput[];
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
   * true = coaching is created as SCHEDULED; false = goes through approval flow (REQUESTED).
   * @default true
   */
  schedule?: boolean;
  /**
   * true = participants added as ACTIVE; false = participants added as INVITED (must accept).
   * @default true
   */
  auto_confirm_participants?: boolean;
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

export interface FavoriteListingsList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: ListingList[];
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

export interface InlineVariant {
  size_id?: number | null;
  sku?: string | null;
  condition?: string;
  acquisition_type?: string;
  color_ids?: number[];
  /** @default "" */
  notes?: string;
}

export interface InventoryMemberProductList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: ProductDetail[];
}

export interface InventoryProductVariantList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: ProductVariantRead[];
}

export interface InventorySchoolProductList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: ProductDetail[];
}

export interface InventoryVariantBookingList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: VariantBooking[];
}

/** Single invite: email + role code (see ``accounts.Role`` / seed_roles). */
export interface InviteSingle {
  /** @format email */
  email: string;
  /** @maxLength 50 */
  role: string;
}

export interface ListingComment {
  id: number;
  listing: number;
  owner: number;
  body: string;
  parent_comment?: number | null;
  replies: any[];
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface ListingCommentCreate {
  body: string;
  parent_comment_id?: number | null;
}

export interface ListingCommentUpdate {
  body: string;
}

export interface ListingCreate {
  variant_id?: number | null;
  /**
   * * `rent` - Rent
   * * `sell` - Sell
   * * `lend` - Lend
   * * `donate` - Donate
   */
  listing_type: ListingTypeEnum;
  /** @maxLength 255 */
  title: string;
  /** @default "" */
  description?: string;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  asking_price?: string | null;
  /** @default false */
  is_public?: boolean;
  product?: Record<string, any>;
}

export interface ListingDetail {
  id: number;
  /**
   * * `rent` - Rent
   * * `sell` - Sell
   * * `lend` - Lend
   * * `donate` - Donate
   */
  listing_type: ListingTypeEnum;
  /**
   * * `draft` - Draft
   * * `active` - Active
   * * `closed` - Closed
   */
  status?: Status421Enum;
  /** @maxLength 255 */
  title: string;
  description?: string;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  asking_price?: string | null;
  is_public?: boolean;
  product: string;
  variant: string;
  active_booking_windows: string;
  owner_display: string;
  is_favorited: string;
  favorites_count: string;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface ListingList {
  id: number;
  /**
   * * `rent` - Rent
   * * `sell` - Sell
   * * `lend` - Lend
   * * `donate` - Donate
   */
  listing_type: ListingTypeEnum;
  /**
   * * `draft` - Draft
   * * `active` - Active
   * * `closed` - Closed
   */
  status?: Status421Enum;
  /** @maxLength 255 */
  title: string;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  asking_price?: string | null;
  primary_media_url: string;
  product_name: string;
  product_category: string;
  variant_condition: string;
  variant_size: string;
  variant_status: string;
  available_from: string;
  /** @format date-time */
  created_at: string;
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

export interface MarketplaceListingList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: ListingList[];
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

export interface MyListingsList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: ListingList[];
}

export interface MyTransactionsList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: TransactionDetail[];
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

export interface ParticipantAcceptInvite {
  /** Student user ID when a parent accepts on behalf of their child. */
  on_behalf_of?: number | null;
}

export interface ParticipantCancel {
  cancellation_reason?: string;
}

export interface PatchedClasseUpdate {
  /** @maxLength 255 */
  name?: string;
  description?: string;
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

export interface PatchedListingUpdate {
  /**
   * * `rent` - Rent
   * * `sell` - Sell
   * * `lend` - Lend
   * * `donate` - Donate
   */
  listing_type?: ListingTypeEnum;
  /** @maxLength 255 */
  title?: string;
  description?: string;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  asking_price?: string | null;
  is_public?: boolean;
  product?: Record<string, any>;
  variant?: Record<string, any>;
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

export interface PatchedProductUpdate {
  name?: string;
  description?: string;
  category_id?: number | null;
  target_gender?: string | null;
  brand?: string | null;
  material?: string | null;
  /**
   * * `active` - Active
   * * `inactive` - Inactive
   * * `archived` - Archived
   */
  status?: StatusDc4Enum;
  media?: ProductMediaInput[];
}

/** Write serializer used for POST/PATCH. */
export interface PatchedProductVariantWrite {
  /** @maxLength 100 */
  sku?: string | null;
  /**
   * * `new` - New
   * * `excellent` - Excellent
   * * `good` - Good
   * * `fair` - Fair
   * * `damaged` - Damaged
   */
  condition?: ConditionEnum;
  /**
   * * `available` - Available
   * * `maintenance` - Maintenance
   * * `inactive` - Inactive
   * * `sold` - Sold
   * * `donated` - Donated
   * * `archived` - Archived
   */
  status?: Status7B2Enum;
  /**
   * * `purchased` - Purchased
   * * `donated` - Donated
   * * `school_owned` - School Owned
   * * `other` - Other
   */
  acquisition_type?: AcquisitionTypeEnum;
  internal_notes?: string | null;
  public_notes?: string | null;
  size_id?: number | null;
  color_ids?: number[];
  media_ids?: number[];
  media_upload?: string[];
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

export interface PatchedSchoolProductUpdate {
  name?: string;
  description?: string;
  category_id?: number | null;
  target_gender?: string | null;
  brand?: string | null;
  material?: string | null;
  /**
   * * `active` - Active
   * * `inactive` - Inactive
   * * `archived` - Archived
   */
  status?: StatusDc4Enum;
  media?: ProductMediaInput[];
  school_details?: SchoolProductDetails;
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

export interface PatchedUpdateCategory {
  name?: string;
  parent_category_id?: number | null;
  size_system_ids?: number[] | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface PatchedUpdateRole {
  description?: string;
}

export interface PatchedUpdateSizeSystem {
  name?: string;
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

/** Create/update payload (variant comes from URL). */
export interface PatchedVariantBookingWrite {
  /**
   * * `reservation` - Reservation
   * * `loan` - Loan
   * * `rent` - Rent
   * * `sale` - Sale
   * * `donation` - Donation
   * * `school_use` - School Use
   * * `maintenance` - Maintenance
   * * `blocked` - Blocked
   */
  booking_type?: BookingTypeEnum;
  /**
   * * `pending` - Pending
   * * `confirmed` - Confirmed
   * * `completed` - Completed
   * * `blocked` - Blocked
   * * `cancelled` - Cancelled
   */
  status?: Status32EEnum;
  /** @format date-time */
  start_at?: string;
  /** @format date-time */
  end_at?: string;
  /** @format date-time */
  actual_start_at?: string | null;
  /** @format date-time */
  actual_end_at?: string | null;
  /** @maxLength 255 */
  title?: string;
  notes?: string;
}

export interface Permission {
  id: number;
  /** @maxLength 100 */
  codename: string;
  app_label: string;
  /** @maxLength 255 */
  name: string;
}

export interface ProductCreate {
  name: string;
  /** @default "" */
  description?: string;
  category_id?: number;
  target_gender?: string | null;
  brand?: string | null;
  material?: string | null;
  /** @default "active" */
  status?: StatusDc4Enum;
  media?: ProductMediaInput[];
  variants?: InlineVariant[];
}

export interface ProductDetail {
  id: number;
  owner_type: OwnerTypeEnum;
  owner?: number | null;
  category?: number | null;
  /** @maxLength 255 */
  name: string;
  description?: string;
  /** @maxLength 50 */
  target_gender?: string | null;
  /** @maxLength 255 */
  brand?: string | null;
  /** @maxLength 255 */
  material?: string | null;
  status: StatusDc4Enum;
  media: ProductMedia[];
  school_details: SchoolProductDetails;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface ProductMedia {
  id: number;
  /** @format uri */
  image: string;
  is_primary?: boolean;
  /**
   * @min -2147483648
   * @max 2147483647
   */
  sort_order?: number;
}

export interface ProductMediaInput {
  /** @format uri */
  image?: string;
  /** @default false */
  is_primary?: boolean;
  /** @default 0 */
  sort_order?: number;
}

/** Read-only serializer used for GET responses. */
export interface ProductVariantRead {
  id: number;
  /** @maxLength 100 */
  sku?: string | null;
  condition: ConditionEnum;
  status: Status7B2Enum;
  acquisition_type: AcquisitionTypeEnum;
  /** @format date-time */
  acquired_at?: string | null;
  internal_notes?: string | null;
  public_notes?: string | null;
  size: VariantSize;
  colors: Record<string, any>[];
  media: Record<string, any>[];
  availability: Record<string, any>;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

/** Write serializer used for POST/PATCH. */
export interface ProductVariantWrite {
  /** @maxLength 100 */
  sku?: string | null;
  /**
   * * `new` - New
   * * `excellent` - Excellent
   * * `good` - Good
   * * `fair` - Fair
   * * `damaged` - Damaged
   */
  condition?: ConditionEnum;
  /**
   * * `available` - Available
   * * `maintenance` - Maintenance
   * * `inactive` - Inactive
   * * `sold` - Sold
   * * `donated` - Donated
   * * `archived` - Archived
   */
  status?: Status7B2Enum;
  /**
   * * `purchased` - Purchased
   * * `donated` - Donated
   * * `school_owned` - School Owned
   * * `other` - Other
   */
  acquisition_type?: AcquisitionTypeEnum;
  internal_notes?: string | null;
  public_notes?: string | null;
  size_id?: number | null;
  color_ids?: number[];
  media_ids?: number[];
  media_upload?: string[];
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

export interface RecurringSeriesCancel {
  cancellation_reason?: string;
  /**
   * If true, also cancels sessions that have already ended (still cancellable by status).
   * @default false
   */
  cancel_past?: boolean;
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

export interface SchoolListingList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: ListingList[];
}

export interface SchoolProductCreate {
  name: string;
  /** @default "" */
  description?: string;
  category_id?: number;
  target_gender?: string | null;
  brand?: string | null;
  material?: string | null;
  /** @default "active" */
  status?: StatusDc4Enum;
  media?: ProductMediaInput[];
  variants?: InlineVariant[];
  school_details?: SchoolProductDetails;
}

export interface SchoolProductDetails {
  /** @default "" */
  inventory_code?: string;
  /** @default "" */
  storage_location?: string;
  /** @default "" */
  notes?: string;
}

export interface SchoolTransactionList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: TransactionDetail[];
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

export interface Size {
  id: number;
  /** @maxLength 50 */
  name: string;
  size_system: number;
  /**
   * @min -2147483648
   * @max 2147483647
   */
  sort_order?: number;
  is_active?: boolean;
}

export interface SizeInput {
  name: string;
  sort_order?: number;
}

export interface SizeSystem {
  id: number;
  /** @maxLength 255 */
  name: string;
  is_active?: boolean;
  sizes: SizeSystemSize[];
}

export interface SizeSystemSize {
  id: number;
  /** @maxLength 50 */
  name: string;
  /**
   * @min -2147483648
   * @max 2147483647
   */
  sort_order?: number;
  is_active?: boolean;
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

export interface TransactionDetail {
  id: number;
  listing_id: number | null;
  variant_id: number;
  /**
   * * `rent` - Rent
   * * `sell` - Sell
   * * `lend` - Lend
   * * `donate` - Donate
   */
  transaction_type: TransactionTypeEnum;
  /**
   * * `pending` - Pending
   * * `accepted` - Accepted
   * * `completed` - Completed
   * * `rejected` - Rejected
   * * `cancelled` - Cancelled
   * * `blocked` - Blocked
   */
  status?: TransactionDetailStatusEnum;
  requester_display: string;
  owner_display: string;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  agreed_price?: string | null;
  /** @format date-time */
  start_at?: string | null;
  /** @format date-time */
  end_at?: string | null;
  notes?: string;
  listing_title: string;
  variant_sku: string;
  product_name: string;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

export interface TransactionRequest {
  listing_id: number;
  /** @format date-time */
  start_at?: string | null;
  /** @format date-time */
  end_at?: string | null;
  /** @default "" */
  notes?: string;
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

export interface VariantBooking {
  id: number;
  variant: number;
  /**
   * * `reservation` - Reservation
   * * `loan` - Loan
   * * `rent` - Rent
   * * `sale` - Sale
   * * `donation` - Donation
   * * `school_use` - School Use
   * * `maintenance` - Maintenance
   * * `blocked` - Blocked
   */
  booking_type: BookingTypeEnum;
  /**
   * * `pending` - Pending
   * * `confirmed` - Confirmed
   * * `completed` - Completed
   * * `blocked` - Blocked
   * * `cancelled` - Cancelled
   */
  status: Status32EEnum;
  listing_id: number;
  /** @format date-time */
  start_at: string;
  /** @format date-time */
  end_at: string;
  /** @format date-time */
  actual_start_at?: string | null;
  /** @format date-time */
  actual_end_at?: string | null;
  approved_by_user?: number | null;
  /** @maxLength 255 */
  title: string;
  notes?: string;
  created_by: number;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

/** Create/update payload (variant comes from URL). */
export interface VariantBookingWrite {
  /**
   * * `reservation` - Reservation
   * * `loan` - Loan
   * * `rent` - Rent
   * * `sale` - Sale
   * * `donation` - Donation
   * * `school_use` - School Use
   * * `maintenance` - Maintenance
   * * `blocked` - Blocked
   */
  booking_type: BookingTypeEnum;
  /**
   * * `pending` - Pending
   * * `confirmed` - Confirmed
   * * `completed` - Completed
   * * `blocked` - Blocked
   * * `cancelled` - Cancelled
   */
  status?: Status32EEnum;
  /** @format date-time */
  start_at: string;
  /** @format date-time */
  end_at: string;
  /** @format date-time */
  actual_start_at?: string | null;
  /** @format date-time */
  actual_end_at?: string | null;
  /** @maxLength 255 */
  title: string;
  notes?: string;
}

export interface VariantSize {
  id: number;
  /** @maxLength 50 */
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
     * @tags api
     * @name ApiAccountsActivateCreate
     * @request POST:/api/accounts/activate/
     * @secure
     */
    apiAccountsActivateCreate: (
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
     * @tags api
     * @name ApiAccountsAuthLoginCreate
     * @request POST:/api/accounts/auth/login/
     * @secure
     */
    apiAccountsAuthLoginCreate: (data: Login, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiAccountsAuthLogoutCreate
     * @request POST:/api/accounts/auth/logout/
     * @secure
     */
    apiAccountsAuthLogoutCreate: (
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
     * @tags api
     * @name ApiAccountsAuthRefreshCreate
     * @request POST:/api/accounts/auth/refresh/
     * @secure
     */
    apiAccountsAuthRefreshCreate: (
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
     * @description GET /api/accounts/emails/export/ Export filtered user emails as CSV. Direction and coordination only.
     *
     * @tags api
     * @name ApiAccountsEmailsExportRetrieve
     * @request GET:/api/accounts/emails/export/
     */
    apiAccountsEmailsExportRetrieve: (
      query?: {
        /** @minLength 1 */
        classe_ids?: string;
        is_active?: boolean | null;
        /** @minLength 1 */
        modality_ids?: string;
        /** @minLength 1 */
        role?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<File, any>({
        path: `/api/accounts/emails/export/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/accounts/invites/ — invite a single user (inactive until onboarding).
     *
     * @tags api
     * @name ApiAccountsInvitesCreate
     * @request POST:/api/accounts/invites/
     */
    apiAccountsInvitesCreate: (
      data: InviteSingle,
      params: RequestParams = {},
    ) =>
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
     * @tags api
     * @name ApiAccountsInvitesBulkCreate
     * @request POST:/api/accounts/invites/bulk/
     */
    apiAccountsInvitesBulkCreate: (
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
     * @tags api
     * @name ApiAccountsMeRetrieve
     * @request GET:/api/accounts/me/
     */
    apiAccountsMeRetrieve: (params: RequestParams = {}) =>
      this.request<Me, ErrorResponse>({
        path: `/api/accounts/me/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET / POST /api/accounts/onboard/{token}/ — validate token / complete onboarding (public).
     *
     * @tags api
     * @name ApiAccountsOnboardRetrieve
     * @request GET:/api/accounts/onboard/{token}/
     * @secure
     */
    apiAccountsOnboardRetrieve: (token: string, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiAccountsOnboardCreate
     * @request POST:/api/accounts/onboard/{token}/
     * @secure
     */
    apiAccountsOnboardCreate: (
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
     * @tags api
     * @name ApiAccountsProfileMeRetrieve
     * @request GET:/api/accounts/profile/me/
     */
    apiAccountsProfileMeRetrieve: (params: RequestParams = {}) =>
      this.request<Profile, ErrorResponse>({
        path: `/api/accounts/profile/me/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/accounts/profile/me/ — retrieve own profile POST /api/accounts/profile/me/ - creates profile PATCH /api/accounts/profile/me/ — update own profile (including photo upload)
     *
     * @tags api
     * @name ApiAccountsProfileMeCreate
     * @request POST:/api/accounts/profile/me/
     */
    apiAccountsProfileMeCreate: (data: Profile, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiAccountsProfileMePartialUpdate
     * @request PATCH:/api/accounts/profile/me/
     */
    apiAccountsProfileMePartialUpdate: (
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
     * @tags api
     * @name ApiAccountsTeachersList
     * @request GET:/api/accounts/teachers/
     */
    apiAccountsTeachersList: (params: RequestParams = {}) =>
      this.request<TeacherSummary[], ErrorResponse>({
        path: `/api/accounts/teachers/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/accounts/users/ — list users (coordination & direction). POST /api/accounts/users/ — create user.
     *
     * @tags api
     * @name ApiAccountsUsersList
     * @request GET:/api/accounts/users/
     */
    apiAccountsUsersList: (params: RequestParams = {}) =>
      this.request<PaginatedResponse<UserResponse>, ErrorResponse>({
        path: `/api/accounts/users/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/accounts/users/ — list users (coordination & direction). POST /api/accounts/users/ — create user.
     *
     * @tags api
     * @name ApiAccountsUsersCreate
     * @request POST:/api/accounts/users/
     */
    apiAccountsUsersCreate: (data: CreateUser, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiAccountsUsersPartialUpdate
     * @request PATCH:/api/accounts/users/{id}/
     */
    apiAccountsUsersPartialUpdate: (
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
     * @tags api
     * @name ApiAccountsUsersResendInviteCreate
     * @request POST:/api/accounts/users/{id}/resend-invite/
     */
    apiAccountsUsersResendInviteCreate: (
      id: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/accounts/users/${id}/resend-invite/`,
        method: "POST",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiBillingEntriesList
     * @request GET:/api/billing/entries/
     */
    apiBillingEntriesList: (
      query?: {
        coaching_class_id?: number;
        /** @format date-time */
        date_from?: string;
        /** @format date-time */
        date_to?: string;
        /**
         * * `coaching` - Coaching
         * * `fine` - Fine
         * * `marketplace` - Marketplace
         * @minLength 1
         */
        source_type?: "coaching" | "fine" | "marketplace";
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
     * @tags api
     * @name ApiBillingEntriesRetrieve
     * @request GET:/api/billing/entries/{id}/
     */
    apiBillingEntriesRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<BillingEntryDetail, ErrorResponse>({
        path: `/api/billing/entries/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiBillingEntriesCancelCreate
     * @request POST:/api/billing/entries/{id}/cancel/
     */
    apiBillingEntriesCancelCreate: (
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
     * @tags api
     * @name ApiBillingFinesList
     * @request GET:/api/billing/fines/
     */
    apiBillingFinesList: (
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
     * @tags api
     * @name ApiBillingFinesRetrieve
     * @request GET:/api/billing/fines/{id}/
     */
    apiBillingFinesRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<FineDetail, ErrorResponse>({
        path: `/api/billing/fines/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiBillingFinesApproveCreate
     * @request POST:/api/billing/fines/{id}/approve/
     */
    apiBillingFinesApproveCreate: (
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
     * @tags api
     * @name ApiBillingFinesWaiveCreate
     * @request POST:/api/billing/fines/{id}/waive/
     */
    apiBillingFinesWaiveCreate: (
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
     * @tags api
     * @name ApiClassesList
     * @request GET:/api/classes/
     */
    apiClassesList: (params: RequestParams = {}) =>
      this.request<Classe[], ErrorResponse>({
        path: `/api/classes/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiClassesCreate
     * @request POST:/api/classes/
     */
    apiClassesCreate: (data: ClasseSubmit, params: RequestParams = {}) =>
      this.request<Classe, ErrorResponse>({
        path: `/api/classes/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiClassesMembersList
     * @request GET:/api/classes/{classe_id}/members/
     */
    apiClassesMembersList: (classeId: number, params: RequestParams = {}) =>
      this.request<ClasseMember[], ErrorResponse>({
        path: `/api/classes/${classeId}/members/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiClassesMembersCreate
     * @request POST:/api/classes/{classe_id}/members/
     */
    apiClassesMembersCreate: (
      classeId: number,
      data: ClasseMemberSubmit,
      params: RequestParams = {},
    ) =>
      this.request<ClasseMember, ErrorResponse>({
        path: `/api/classes/${classeId}/members/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiClassesMembersDestroy
     * @request DELETE:/api/classes/{classe_id}/members/{id}/
     */
    apiClassesMembersDestroy: (
      classeId: number,
      id: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/classes/${classeId}/members/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiClassesRetrieve
     * @request GET:/api/classes/{id}/
     */
    apiClassesRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<ClasseDetail, ErrorResponse>({
        path: `/api/classes/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiClassesPartialUpdate
     * @request PATCH:/api/classes/{id}/
     */
    apiClassesPartialUpdate: (
      id: number,
      data: PatchedClasseUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ClasseDetail, ErrorResponse>({
        path: `/api/classes/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiClassesDestroy
     * @request DELETE:/api/classes/{id}/
     */
    apiClassesDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/classes/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description ``GET /api/coachings/`` — list coachings. ``POST /api/coachings/`` — direct coordination scheduling (timetable / scheduled coaching).
     *
     * @tags api
     * @name ApiCoachingsList
     * @request GET:/api/coachings/
     */
    apiCoachingsList: (
      query?: {
        /** @format date-time */
        date_from?: string;
        /** @format date-time */
        date_to?: string;
        /** Filter coachings where this user is a participant. */
        participant_id?: number;
        recurring_coaching_id?: number;
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
     * @tags api
     * @name ApiCoachingsCreate
     * @request POST:/api/coachings/
     */
    apiCoachingsCreate: (
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
     * @tags api
     * @name ApiCoachingsParticipantsList
     * @request GET:/api/coachings/{coaching_id}/participants/
     */
    apiCoachingsParticipantsList: (
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
     * @tags api
     * @name ApiCoachingsParticipantsCreate
     * @request POST:/api/coachings/{coaching_id}/participants/
     */
    apiCoachingsParticipantsCreate: (
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
     * @tags api
     * @name ApiCoachingsParticipantsApproveCreate
     * @request POST:/api/coachings/{coaching_id}/participants/{id}/approve/
     */
    apiCoachingsParticipantsApproveCreate: (
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
     * @tags api
     * @name ApiCoachingsParticipantsCancelCreate
     * @request POST:/api/coachings/{coaching_id}/participants/{id}/cancel/
     */
    apiCoachingsParticipantsCancelCreate: (
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
     * @tags api
     * @name ApiCoachingsParticipantsConfirmAttendanceCreate
     * @request POST:/api/coachings/{coaching_id}/participants/{id}/confirm-attendance/
     */
    apiCoachingsParticipantsConfirmAttendanceCreate: (
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
     * @description POST — invited student (or parent on their behalf) confirms attendance.
     *
     * @tags api
     * @name ApiCoachingsParticipantsAcceptCreate
     * @request POST:/api/coachings/{coaching_id}/participants/accept/
     */
    apiCoachingsParticipantsAcceptCreate: (
      coachingId: number,
      data: ParticipantAcceptInvite,
      params: RequestParams = {},
    ) =>
      this.request<CoachingParticipant, ErrorResponse>({
        path: `/api/coachings/${coachingId}/participants/accept/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiCoachingsRetrieve
     * @request GET:/api/coachings/{id}/
     */
    apiCoachingsRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiCoachingsPartialUpdate
     * @request PATCH:/api/coachings/{id}/
     */
    apiCoachingsPartialUpdate: (
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
     * @tags api
     * @name ApiCoachingsAcceptCreate
     * @request POST:/api/coachings/{id}/accept/
     */
    apiCoachingsAcceptCreate: (id: number, params: RequestParams = {}) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/accept/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST — coordination schedules the coaching; activates ``pending`` roster rows only.
     *
     * @tags api
     * @name ApiCoachingsApproveCreate
     * @request POST:/api/coachings/{id}/approve/
     */
    apiCoachingsApproveCreate: (
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
     * @tags api
     * @name ApiCoachingsCancelCreate
     * @request POST:/api/coachings/{id}/cancel/
     */
    apiCoachingsCancelCreate: (
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
     * @tags api
     * @name ApiCoachingsCompleteCreate
     * @request POST:/api/coachings/{id}/complete/
     */
    apiCoachingsCompleteCreate: (id: number, params: RequestParams = {}) =>
      this.request<CoachingClass, ErrorResponse>({
        path: `/api/coachings/${id}/complete/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiCoachingsRejectCreate
     * @request POST:/api/coachings/{id}/reject/
     */
    apiCoachingsRejectCreate: (
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
     * @tags api
     * @name ApiCoachingsTeacherConfirmCreate
     * @request POST:/api/coachings/{id}/teacher-confirm/
     */
    apiCoachingsTeacherConfirmCreate: (
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
     * @description POST — cancel all (future) sessions in a recurring series.
     *
     * @tags api
     * @name ApiCoachingsRecurringCancelCreate
     * @request POST:/api/coachings/recurring/{recurring_id}/cancel/
     */
    apiCoachingsRecurringCancelCreate: (
      recurringId: number,
      data: RecurringSeriesCancel,
      params: RequestParams = {},
    ) =>
      this.request<CoachingClass[], ErrorResponse>({
        path: `/api/coachings/recurring/${recurringId}/cancel/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description ``POST /api/coachings/request/`` — student/parent (and similar) coaching requests.
     *
     * @tags api
     * @name ApiCoachingsRequestCreate
     * @request POST:/api/coachings/request/
     */
    apiCoachingsRequestCreate: (
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
     * @tags api
     * @name ApiCoachingsTeachersAvailabilityList
     * @request GET:/api/coachings/teachers/{user_id}/availability/
     */
    apiCoachingsTeachersAvailabilityList: (
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
     * @tags api
     * @name ApiCoachingsTeachersAvailabilityCreate
     * @request POST:/api/coachings/teachers/{user_id}/availability/
     */
    apiCoachingsTeachersAvailabilityCreate: (
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
     * @tags api
     * @name ApiCoachingsTeachersAvailabilityPartialUpdate
     * @request PATCH:/api/coachings/teachers/{user_id}/availability/{id}/
     */
    apiCoachingsTeachersAvailabilityPartialUpdate: (
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
     * @tags api
     * @name ApiCoachingsTeachersAvailabilityDestroy
     * @request DELETE:/api/coachings/teachers/{user_id}/availability/{id}/
     */
    apiCoachingsTeachersAvailabilityDestroy: (
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
     * @tags api
     * @name ApiEnrollmentsCreate
     * @request POST:/api/enrollments/
     * @secure
     */
    apiEnrollmentsCreate: (
      data: EnrollmentSubmit,
      params: RequestParams = {},
    ) =>
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
     * @tags api
     * @name ApiEnrollmentsRetrieve
     * @request GET:/api/enrollments/{id}/
     */
    apiEnrollmentsRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET   /api/enrollments/<pk>/          — retrieve an enrollment PATCH /api/enrollments/<pk>/          — update snapshot data (no status changes)
     *
     * @tags api
     * @name ApiEnrollmentsPartialUpdate
     * @request PATCH:/api/enrollments/{id}/
     */
    apiEnrollmentsPartialUpdate: (
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
     * @tags api
     * @name ApiEnrollmentsApproveCreate
     * @request POST:/api/enrollments/{id}/approve/
     */
    apiEnrollmentsApproveCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/approve/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/<pk>/cancel/
     *
     * @tags api
     * @name ApiEnrollmentsCancelCreate
     * @request POST:/api/enrollments/{id}/cancel/
     */
    apiEnrollmentsCancelCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/cancel/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/enrollments/<pk>/payments/  — list payments for an enrollment POST /api/enrollments/<pk>/payments/  — create a payment record
     *
     * @tags api
     * @name ApiEnrollmentsPaymentsList
     * @request GET:/api/enrollments/{id}/payments/
     */
    apiEnrollmentsPaymentsList: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentPaymentRead[], ErrorResponse>({
        path: `/api/enrollments/${id}/payments/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/enrollments/<pk>/payments/  — list payments for an enrollment POST /api/enrollments/<pk>/payments/  — create a payment record
     *
     * @tags api
     * @name ApiEnrollmentsPaymentsCreate
     * @request POST:/api/enrollments/{id}/payments/
     */
    apiEnrollmentsPaymentsCreate: (
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
     * @tags api
     * @name ApiEnrollmentsPaymentsConfirmCreate
     * @request POST:/api/enrollments/{id}/payments/{payment_pk}/confirm/
     */
    apiEnrollmentsPaymentsConfirmCreate: (
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
     * @tags api
     * @name ApiEnrollmentsRejectCreate
     * @request POST:/api/enrollments/{id}/reject/
     */
    apiEnrollmentsRejectCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/reject/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/<pk>/start-review/
     *
     * @tags api
     * @name ApiEnrollmentsStartReviewCreate
     * @request POST:/api/enrollments/{id}/start-review/
     */
    apiEnrollmentsStartReviewCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentRead, ErrorResponse>({
        path: `/api/enrollments/${id}/start-review/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description GET /api/enrollments/list/ — list enrollments (staff only)
     *
     * @tags api
     * @name ApiEnrollmentsListList
     * @request GET:/api/enrollments/list/
     */
    apiEnrollmentsListList: (
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
     * @tags api
     * @name ApiEnrollmentsPeriodsList
     * @request GET:/api/enrollments/periods/
     * @secure
     */
    apiEnrollmentsPeriodsList: (params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiEnrollmentsPeriodsRetrieve
     * @request GET:/api/enrollments/periods/{id}/
     * @secure
     */
    apiEnrollmentsPeriodsRetrieve: (id: number, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiEnrollmentsPeriodsPartialUpdate
     * @request PATCH:/api/enrollments/periods/{id}/
     */
    apiEnrollmentsPeriodsPartialUpdate: (
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
     * @tags api
     * @name ApiEnrollmentsPeriodsCloseCreate
     * @request POST:/api/enrollments/periods/{id}/close/
     */
    apiEnrollmentsPeriodsCloseCreate: (
      id: number,
      params: RequestParams = {},
    ) =>
      this.request<EnrollmentPeriod, ErrorResponse>({
        path: `/api/enrollments/periods/${id}/close/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/periods/<pk>/open/  — open a enrollment period window
     *
     * @tags api
     * @name ApiEnrollmentsPeriodsOpenCreate
     * @request POST:/api/enrollments/periods/{id}/open/
     */
    apiEnrollmentsPeriodsOpenCreate: (id: number, params: RequestParams = {}) =>
      this.request<EnrollmentPeriod, ErrorResponse>({
        path: `/api/enrollments/periods/${id}/open/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/enrollments/periods/create/ Direction only. Creates a new enrollment period.
     *
     * @tags api
     * @name ApiEnrollmentsPeriodsCreateCreate
     * @request POST:/api/enrollments/periods/create/
     */
    apiEnrollmentsPeriodsCreateCreate: (
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
     * @tags api
     * @name ApiEventsList
     * @request GET:/api/events/
     * @secure
     */
    apiEventsList: (params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiEventsCreate
     * @request POST:/api/events/
     */
    apiEventsCreate: (data: EventCreate, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiEventsCommentsList
     * @request GET:/api/events/{event_id}/comments/
     * @secure
     */
    apiEventsCommentsList: (eventId: number, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiEventsCommentsCreate
     * @request POST:/api/events/{event_id}/comments/
     */
    apiEventsCommentsCreate: (
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
     * @tags api
     * @name ApiEventsCommentsUpdate
     * @request PUT:/api/events/{event_id}/comments/{comment_id}/
     */
    apiEventsCommentsUpdate: (
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
     * @tags api
     * @name ApiEventsCommentsDestroy
     * @request DELETE:/api/events/{event_id}/comments/{comment_id}/
     */
    apiEventsCommentsDestroy: (
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
     * @tags api
     * @name ApiEventsFilesList
     * @request GET:/api/events/{event_id}/files/
     * @secure
     */
    apiEventsFilesList: (eventId: number, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiEventsFilesCreate
     * @request POST:/api/events/{event_id}/files/
     */
    apiEventsFilesCreate: (
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
     * @tags api
     * @name ApiEventsFilesDestroy
     * @request DELETE:/api/events/{event_id}/files/{file_id}/
     */
    apiEventsFilesDestroy: (
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
     * @tags api
     * @name ApiEventsInterestsCreate
     * @request POST:/api/events/{event_id}/interests/
     */
    apiEventsInterestsCreate: (eventId: number, params: RequestParams = {}) =>
      this.request<EventInterest, ErrorResponse>({
        path: `/api/events/${eventId}/interests/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiEventsInterestsMeDestroy
     * @request DELETE:/api/events/{event_id}/interests/me/
     */
    apiEventsInterestsMeDestroy: (
      eventId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/events/${eventId}/interests/me/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiEventsPostsList
     * @request GET:/api/events/{event_id}/posts/
     * @secure
     */
    apiEventsPostsList: (eventId: number, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiEventsPostsCreate
     * @request POST:/api/events/{event_id}/posts/
     */
    apiEventsPostsCreate: (
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
     * @tags api
     * @name ApiEventsPostsRetrieve
     * @request GET:/api/events/{event_id}/posts/{post_id}/
     * @secure
     */
    apiEventsPostsRetrieve: (
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
     * @tags api
     * @name ApiEventsPostsUpdate
     * @request PUT:/api/events/{event_id}/posts/{post_id}/
     */
    apiEventsPostsUpdate: (
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
     * @tags api
     * @name ApiEventsPostsDestroy
     * @request DELETE:/api/events/{event_id}/posts/{post_id}/
     */
    apiEventsPostsDestroy: (
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
     * @tags api
     * @name ApiEventsPostsPublishCreate
     * @request POST:/api/events/{event_id}/posts/{post_id}/publish/
     */
    apiEventsPostsPublishCreate: (
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
     * @tags api
     * @name ApiEventsPostsSchedulePublicationCreate
     * @request POST:/api/events/{event_id}/posts/{post_id}/schedule-publication/
     */
    apiEventsPostsSchedulePublicationCreate: (
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
     * @tags api
     * @name ApiEventsRetrieve
     * @request GET:/api/events/{id}/
     * @secure
     */
    apiEventsRetrieve: (id: number, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiEventsUpdate
     * @request PUT:/api/events/{id}/
     */
    apiEventsUpdate: (
      id: number,
      data: EventUpdate,
      params: RequestParams = {},
    ) =>
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
     * @tags api
     * @name ApiEventsDestroy
     * @request DELETE:/api/events/{id}/
     */
    apiEventsDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/events/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiEventsArchiveCreate
     * @request POST:/api/events/{id}/archive/
     */
    apiEventsArchiveCreate: (id: number, params: RequestParams = {}) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/${id}/archive/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiEventsCancelCreate
     * @request POST:/api/events/{id}/cancel/
     */
    apiEventsCancelCreate: (id: number, params: RequestParams = {}) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/${id}/cancel/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiEventsCompleteCreate
     * @request POST:/api/events/{id}/complete/
     */
    apiEventsCompleteCreate: (id: number, params: RequestParams = {}) =>
      this.request<Event, ErrorResponse>({
        path: `/api/events/${id}/complete/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiEventsPublishCreate
     * @request POST:/api/events/{id}/publish/
     */
    apiEventsPublishCreate: (
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
     * @tags api
     * @name ApiEventsSchedulePublicationCreate
     * @request POST:/api/events/{id}/schedule-publication/
     */
    apiEventsSchedulePublicationCreate: (
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
     * @tags api
     * @name ApiMessagingConversationsList
     * @request GET:/api/messaging/conversations/
     */
    apiMessagingConversationsList: (params: RequestParams = {}) =>
      this.request<Conversation[], ErrorResponse>({
        path: `/api/messaging/conversations/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiMessagingConversationsCreate
     * @request POST:/api/messaging/conversations/
     */
    apiMessagingConversationsCreate: (
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
     * @tags api
     * @name ApiMessagingConversationsMessagesList
     * @request GET:/api/messaging/conversations/{conversation_id}/messages/
     */
    apiMessagingConversationsMessagesList: (
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
     * @tags api
     * @name ApiMessagingConversationsMessagesCreate
     * @request POST:/api/messaging/conversations/{conversation_id}/messages/
     */
    apiMessagingConversationsMessagesCreate: (
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
     * @tags api
     * @name ApiModalitiesList
     * @request GET:/api/modalities/
     * @secure
     */
    apiModalitiesList: (params: RequestParams = {}) =>
      this.request<Modality[], ErrorResponse>({
        path: `/api/modalities/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiModalitiesCreate
     * @request POST:/api/modalities/
     */
    apiModalitiesCreate: (data: ModalitySubmit, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiModalitiesRetrieve
     * @request GET:/api/modalities/{id}/
     */
    apiModalitiesRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<Modality, ErrorResponse>({
        path: `/api/modalities/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiModalitiesPartialUpdate
     * @request PATCH:/api/modalities/{id}/
     */
    apiModalitiesPartialUpdate: (
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
     * @tags api
     * @name ApiModalitiesDestroy
     * @request DELETE:/api/modalities/{id}/
     */
    apiModalitiesDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/modalities/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiModalitiesUsersModalitiesList
     * @request GET:/api/modalities/users/{user_id}/modalities/
     */
    apiModalitiesUsersModalitiesList: (
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
     * @tags api
     * @name ApiModalitiesUsersModalitiesCreate
     * @request POST:/api/modalities/users/{user_id}/modalities/
     */
    apiModalitiesUsersModalitiesCreate: (
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
     * @tags api
     * @name ApiModalitiesUsersModalitiesDestroy
     * @request DELETE:/api/modalities/users/{user_id}/modalities/{id}/
     */
    apiModalitiesUsersModalitiesDestroy: (
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
     * @tags api
     * @name ApiRolesList
     * @request GET:/api/roles/
     */
    apiRolesList: (params: RequestParams = {}) =>
      this.request<RoleList[], ErrorResponse>({
        path: `/api/roles/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/roles/ — list roles. POST /api/roles/ — create role.
     *
     * @tags api
     * @name ApiRolesCreate
     * @request POST:/api/roles/
     */
    apiRolesCreate: (data: CreateRole, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiRolesRetrieve
     * @request GET:/api/roles/{code}/
     */
    apiRolesRetrieve: (code: string, params: RequestParams = {}) =>
      this.request<RoleDetail, ErrorResponse>({
        path: `/api/roles/${code}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET    /api/roles/<code>/ — retrieve role. PATCH  /api/roles/<code>/ — update description. DELETE /api/roles/<code>/ — delete role.
     *
     * @tags api
     * @name ApiRolesPartialUpdate
     * @request PATCH:/api/roles/{code}/
     */
    apiRolesPartialUpdate: (
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
     * @tags api
     * @name ApiRolesDestroy
     * @request DELETE:/api/roles/{code}/
     */
    apiRolesDestroy: (code: string, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/roles/${code}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description PUT /api/roles/<code>/permissions/ — replace permission set.
     *
     * @tags api
     * @name ApiRolesPermissionsUpdate
     * @request PUT:/api/roles/{code}/permissions/
     */
    apiRolesPermissionsUpdate: (
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
     * @tags api
     * @name ApiRolesPermissionsAvailableList
     * @request GET:/api/roles/permissions/available/
     */
    apiRolesPermissionsAvailableList: (params: RequestParams = {}) =>
      this.request<Permission[], ErrorResponse>({
        path: `/api/roles/permissions/available/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description OpenApi3 schema for this API. Format can be selected via content negotiation. - YAML: application/vnd.oai.openapi - JSON: application/vnd.oai.openapi+json
     *
     * @tags api
     * @name ApiSchemaRetrieve
     * @request GET:/api/schema/
     * @secure
     */
    apiSchemaRetrieve: (
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
     * @tags api
     * @name ApiStudiosList
     * @request GET:/api/studios/
     */
    apiStudiosList: (params: RequestParams = {}) =>
      this.request<Studio[], ErrorResponse>({
        path: `/api/studios/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiStudiosCreate
     * @request POST:/api/studios/
     */
    apiStudiosCreate: (data: StudioSubmit, params: RequestParams = {}) =>
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
     * @tags api
     * @name ApiStudiosRetrieve
     * @request GET:/api/studios/{id}/
     */
    apiStudiosRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<Studio, ErrorResponse>({
        path: `/api/studios/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags api
     * @name ApiStudiosPartialUpdate
     * @request PATCH:/api/studios/{id}/
     */
    apiStudiosPartialUpdate: (
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
     * @tags api
     * @name ApiStudiosDestroy
     * @request DELETE:/api/studios/{id}/
     */
    apiStudiosDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/studios/${id}/`,
        method: "DELETE",
        ...params,
      }),
  };
  inventory = {
    /**
     * No description
     *
     * @tags inventory
     * @name InventoryBookingsRetrieve
     * @request GET:/inventory/bookings/{booking_id}/
     */
    inventoryBookingsRetrieve: (
      bookingId: number,
      params: RequestParams = {},
    ) =>
      this.request<VariantBooking, ErrorResponse>({
        path: `/inventory/bookings/${bookingId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryBookingsPartialUpdate
     * @request PATCH:/inventory/bookings/{booking_id}/
     */
    inventoryBookingsPartialUpdate: (
      bookingId: number,
      data: PatchedVariantBookingWrite,
      params: RequestParams = {},
    ) =>
      this.request<VariantBooking, ErrorResponse>({
        path: `/inventory/bookings/${bookingId}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryBookingsDestroy
     * @request DELETE:/inventory/bookings/{booking_id}/
     */
    inventoryBookingsDestroy: (bookingId: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/inventory/bookings/${bookingId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesList
     * @request GET:/inventory/categories/
     */
    inventoryCategoriesList: (params: RequestParams = {}) =>
      this.request<Category[], ErrorResponse>({
        path: `/inventory/categories/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesCreate
     * @request POST:/inventory/categories/
     */
    inventoryCategoriesCreate: (
      data: CreateCategory,
      params: RequestParams = {},
    ) =>
      this.request<Category, ErrorResponse>({
        path: `/inventory/categories/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesRetrieve
     * @request GET:/inventory/categories/{category_id}/
     */
    inventoryCategoriesRetrieve: (
      categoryId: number,
      params: RequestParams = {},
    ) =>
      this.request<Category, ErrorResponse>({
        path: `/inventory/categories/${categoryId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesPartialUpdate
     * @request PATCH:/inventory/categories/{category_id}/
     */
    inventoryCategoriesPartialUpdate: (
      categoryId: number,
      data: PatchedUpdateCategory,
      params: RequestParams = {},
    ) =>
      this.request<Category, ErrorResponse>({
        path: `/inventory/categories/${categoryId}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesDestroy
     * @request DELETE:/inventory/categories/{category_id}/
     */
    inventoryCategoriesDestroy: (
      categoryId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/inventory/categories/${categoryId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesActivateCreate
     * @request POST:/inventory/categories/{category_id}/activate/
     */
    inventoryCategoriesActivateCreate: (
      categoryId: number,
      params: RequestParams = {},
    ) =>
      this.request<Category, ErrorResponse>({
        path: `/inventory/categories/${categoryId}/activate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesDeactivateCreate
     * @request POST:/inventory/categories/{category_id}/deactivate/
     */
    inventoryCategoriesDeactivateCreate: (
      categoryId: number,
      params: RequestParams = {},
    ) =>
      this.request<Category, ErrorResponse>({
        path: `/inventory/categories/${categoryId}/deactivate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsList
     * @request GET:/inventory/colors/
     */
    inventoryColorsList: (params: RequestParams = {}) =>
      this.request<Color[], ErrorResponse>({
        path: `/inventory/colors/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsCreate
     * @request POST:/inventory/colors/
     */
    inventoryColorsCreate: (data: CreateColor, params: RequestParams = {}) =>
      this.request<Color, ErrorResponse>({
        path: `/inventory/colors/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsRetrieve
     * @request GET:/inventory/colors/{color_id}/
     */
    inventoryColorsRetrieve: (colorId: number, params: RequestParams = {}) =>
      this.request<Color, ErrorResponse>({
        path: `/inventory/colors/${colorId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsDestroy
     * @request DELETE:/inventory/colors/{color_id}/
     */
    inventoryColorsDestroy: (colorId: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/inventory/colors/${colorId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsActivateCreate
     * @request POST:/inventory/colors/{color_id}/activate/
     */
    inventoryColorsActivateCreate: (
      colorId: number,
      params: RequestParams = {},
    ) =>
      this.request<Color, ErrorResponse>({
        path: `/inventory/colors/${colorId}/activate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsDeactivateCreate
     * @request POST:/inventory/colors/{color_id}/deactivate/
     */
    inventoryColorsDeactivateCreate: (
      colorId: number,
      params: RequestParams = {},
    ) =>
      this.request<Color, ErrorResponse>({
        path: `/inventory/colors/${colorId}/deactivate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsRetrieve
     * @request GET:/inventory/products/
     */
    inventoryProductsRetrieve: (params: RequestParams = {}) =>
      this.request<InventoryMemberProductList, ErrorResponse>({
        path: `/inventory/products/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsCreate
     * @request POST:/inventory/products/
     */
    inventoryProductsCreate: (
      data: ProductCreate,
      params: RequestParams = {},
    ) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/inventory/products/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsRetrieve2
     * @request GET:/inventory/products/{id}/
     */
    inventoryProductsRetrieve2: (id: number, params: RequestParams = {}) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/inventory/products/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsPartialUpdate
     * @request PATCH:/inventory/products/{id}/
     */
    inventoryProductsPartialUpdate: (
      id: number,
      data: PatchedProductUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/inventory/products/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsDestroy
     * @request DELETE:/inventory/products/{id}/
     */
    inventoryProductsDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/inventory/products/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsVariantsRetrieve
     * @request GET:/inventory/products/{product_id}/variants/
     */
    inventoryProductsVariantsRetrieve: (
      productId: number,
      params: RequestParams = {},
    ) =>
      this.request<InventoryProductVariantList, ErrorResponse>({
        path: `/inventory/products/${productId}/variants/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsVariantsCreate
     * @request POST:/inventory/products/{product_id}/variants/
     */
    inventoryProductsVariantsCreate: (
      productId: number,
      data: ProductVariantWrite,
      params: RequestParams = {},
    ) =>
      this.request<ProductVariantRead, ErrorResponse>({
        path: `/inventory/products/${productId}/variants/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySchoolProductsRetrieve
     * @request GET:/inventory/school/products/
     */
    inventorySchoolProductsRetrieve: (params: RequestParams = {}) =>
      this.request<InventorySchoolProductList, ErrorResponse>({
        path: `/inventory/school/products/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySchoolProductsCreate
     * @request POST:/inventory/school/products/
     */
    inventorySchoolProductsCreate: (
      data: SchoolProductCreate,
      params: RequestParams = {},
    ) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/inventory/school/products/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySchoolProductsRetrieve2
     * @request GET:/inventory/school/products/{id}/
     */
    inventorySchoolProductsRetrieve2: (
      id: number,
      params: RequestParams = {},
    ) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/inventory/school/products/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySchoolProductsPartialUpdate
     * @request PATCH:/inventory/school/products/{id}/
     */
    inventorySchoolProductsPartialUpdate: (
      id: number,
      data: PatchedSchoolProductUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/inventory/school/products/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySchoolProductsDestroy
     * @request DELETE:/inventory/school/products/{id}/
     */
    inventorySchoolProductsDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/inventory/school/products/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizeSystemsList
     * @request GET:/inventory/size-systems/
     */
    inventorySizeSystemsList: (params: RequestParams = {}) =>
      this.request<SizeSystem[], ErrorResponse>({
        path: `/inventory/size-systems/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizeSystemsCreate
     * @request POST:/inventory/size-systems/
     */
    inventorySizeSystemsCreate: (
      data: CreateSizeSystem,
      params: RequestParams = {},
    ) =>
      this.request<SizeSystem, ErrorResponse>({
        path: `/inventory/size-systems/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizeSystemsPartialUpdate
     * @request PATCH:/inventory/size-systems/{size_system_id}/
     */
    inventorySizeSystemsPartialUpdate: (
      sizeSystemId: number,
      data: PatchedUpdateSizeSystem,
      params: RequestParams = {},
    ) =>
      this.request<SizeSystem, ErrorResponse>({
        path: `/inventory/size-systems/${sizeSystemId}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizeSystemsDestroy
     * @request DELETE:/inventory/size-systems/{size_system_id}/
     */
    inventorySizeSystemsDestroy: (
      sizeSystemId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/inventory/size-systems/${sizeSystemId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizeSystemsActivateCreate
     * @request POST:/inventory/size-systems/{size_system_id}/activate/
     */
    inventorySizeSystemsActivateCreate: (
      sizeSystemId: number,
      params: RequestParams = {},
    ) =>
      this.request<SizeSystem, ErrorResponse>({
        path: `/inventory/size-systems/${sizeSystemId}/activate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizeSystemsDeactivateCreate
     * @request POST:/inventory/size-systems/{size_system_id}/deactivate/
     */
    inventorySizeSystemsDeactivateCreate: (
      sizeSystemId: number,
      params: RequestParams = {},
    ) =>
      this.request<SizeSystem, ErrorResponse>({
        path: `/inventory/size-systems/${sizeSystemId}/deactivate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesList
     * @request GET:/inventory/sizes/
     */
    inventorySizesList: (params: RequestParams = {}) =>
      this.request<Size[], ErrorResponse>({
        path: `/inventory/sizes/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesCreate
     * @request POST:/inventory/sizes/
     */
    inventorySizesCreate: (data: CreateSize, params: RequestParams = {}) =>
      this.request<Size, ErrorResponse>({
        path: `/inventory/sizes/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesRetrieve
     * @request GET:/inventory/sizes/{size_id}/
     */
    inventorySizesRetrieve: (sizeId: number, params: RequestParams = {}) =>
      this.request<Size, ErrorResponse>({
        path: `/inventory/sizes/${sizeId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesDestroy
     * @request DELETE:/inventory/sizes/{size_id}/
     */
    inventorySizesDestroy: (sizeId: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/inventory/sizes/${sizeId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesActivateCreate
     * @request POST:/inventory/sizes/{size_id}/activate/
     */
    inventorySizesActivateCreate: (
      sizeId: number,
      params: RequestParams = {},
    ) =>
      this.request<Size, ErrorResponse>({
        path: `/inventory/sizes/${sizeId}/activate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesDeactivateCreate
     * @request POST:/inventory/sizes/{size_id}/deactivate/
     */
    inventorySizesDeactivateCreate: (
      sizeId: number,
      params: RequestParams = {},
    ) =>
      this.request<Size, ErrorResponse>({
        path: `/inventory/sizes/${sizeId}/deactivate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryVariantsRetrieve
     * @request GET:/inventory/variants/{variant_id}/
     */
    inventoryVariantsRetrieve: (
      variantId: number,
      params: RequestParams = {},
    ) =>
      this.request<ProductVariantRead, ErrorResponse>({
        path: `/inventory/variants/${variantId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryVariantsPartialUpdate
     * @request PATCH:/inventory/variants/{variant_id}/
     */
    inventoryVariantsPartialUpdate: (
      variantId: number,
      data: PatchedProductVariantWrite,
      params: RequestParams = {},
    ) =>
      this.request<ProductVariantRead, ErrorResponse>({
        path: `/inventory/variants/${variantId}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryVariantsDestroy
     * @request DELETE:/inventory/variants/{variant_id}/
     */
    inventoryVariantsDestroy: (variantId: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/inventory/variants/${variantId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryVariantsBookingsRetrieve
     * @request GET:/inventory/variants/{variant_id}/bookings/
     */
    inventoryVariantsBookingsRetrieve: (
      variantId: number,
      params: RequestParams = {},
    ) =>
      this.request<InventoryVariantBookingList, ErrorResponse>({
        path: `/inventory/variants/${variantId}/bookings/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryVariantsBookingsCreate
     * @request POST:/inventory/variants/{variant_id}/bookings/
     */
    inventoryVariantsBookingsCreate: (
      variantId: number,
      data: VariantBookingWrite,
      params: RequestParams = {},
    ) =>
      this.request<VariantBooking, ErrorResponse>({
        path: `/inventory/variants/${variantId}/bookings/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  marketplace = {
    /**
     * @description Public listings — only ACTIVE + is_public.
     *
     * @tags marketplace
     * @name MarketplaceListingsRetrieve
     * @request GET:/marketplace/listings/
     */
    marketplaceListingsRetrieve: (params: RequestParams = {}) =>
      this.request<MarketplaceListingList, ErrorResponse>({
        path: `/marketplace/listings/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Public listings — only ACTIVE + is_public.
     *
     * @tags marketplace
     * @name MarketplaceListingsCreate
     * @request POST:/marketplace/listings/
     */
    marketplaceListingsCreate: (
      data: ListingCreate,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/marketplace/listings/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Detail view with authorization: public listings visible to anyone authenticated, otherwise only owner or user with view_productlisting permission.
     *
     * @tags marketplace
     * @name MarketplaceListingsRetrieve2
     * @request GET:/marketplace/listings/{listing_id}/
     */
    marketplaceListingsRetrieve2: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Detail view with authorization: public listings visible to anyone authenticated, otherwise only owner or user with view_productlisting permission.
     *
     * @tags marketplace
     * @name MarketplaceListingsPartialUpdate
     * @request PATCH:/marketplace/listings/{listing_id}/
     */
    marketplaceListingsPartialUpdate: (
      listingId: number,
      data: PatchedListingUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Detail view with authorization: public listings visible to anyone authenticated, otherwise only owner or user with view_productlisting permission.
     *
     * @tags marketplace
     * @name MarketplaceListingsDestroy
     * @request DELETE:/marketplace/listings/{listing_id}/
     */
    marketplaceListingsDestroy: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsAvailabilityRetrieve
     * @request GET:/marketplace/listings/{listing_id}/availability/
     */
    marketplaceListingsAvailabilityRetrieve: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/availability/`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsCommentsList
     * @request GET:/marketplace/listings/{listing_id}/comments/
     */
    marketplaceListingsCommentsList: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingComment[], ErrorResponse>({
        path: `/marketplace/listings/${listingId}/comments/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsCommentsCreate
     * @request POST:/marketplace/listings/{listing_id}/comments/
     */
    marketplaceListingsCommentsCreate: (
      listingId: number,
      data: ListingCommentCreate,
      params: RequestParams = {},
    ) =>
      this.request<ListingComment, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/comments/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsCommentsUpdate
     * @request PUT:/marketplace/listings/{listing_id}/comments/{comment_id}/
     */
    marketplaceListingsCommentsUpdate: (
      commentId: number,
      listingId: number,
      data: ListingCommentUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ListingComment, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/comments/${commentId}/`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsCommentsDestroy
     * @request DELETE:/marketplace/listings/{listing_id}/comments/{comment_id}/
     */
    marketplaceListingsCommentsDestroy: (
      commentId: number,
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/comments/${commentId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsFavoriteCreate
     * @request POST:/marketplace/listings/{listing_id}/favorite/
     */
    marketplaceListingsFavoriteCreate: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/favorite/`,
        method: "POST",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsFavoriteDestroy
     * @request DELETE:/marketplace/listings/{listing_id}/favorite/
     */
    marketplaceListingsFavoriteDestroy: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/favorite/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsPublishCreate
     * @request POST:/marketplace/listings/{listing_id}/publish/
     */
    marketplaceListingsPublishCreate: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/publish/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsRequestCreate
     * @request POST:/marketplace/listings/{listing_id}/request/
     */
    marketplaceListingsRequestCreate: (
      listingId: number,
      data: TransactionRequest,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/request/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsUnpublishCreate
     * @request POST:/marketplace/listings/{listing_id}/unpublish/
     */
    marketplaceListingsUnpublishCreate: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/marketplace/listings/${listingId}/unpublish/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsFavoritesRetrieve
     * @request GET:/marketplace/listings/favorites/
     */
    marketplaceListingsFavoritesRetrieve: (params: RequestParams = {}) =>
      this.request<FavoriteListingsList, ErrorResponse>({
        path: `/marketplace/listings/favorites/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns the current user's own listings regardless of status.
     *
     * @tags marketplace
     * @name MarketplaceListingsMineRetrieve
     * @request GET:/marketplace/listings/mine/
     */
    marketplaceListingsMineRetrieve: (params: RequestParams = {}) =>
      this.request<MyListingsList, ErrorResponse>({
        path: `/marketplace/listings/mine/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsRetrieve
     * @request GET:/marketplace/school/listings/
     */
    marketplaceSchoolListingsRetrieve: (params: RequestParams = {}) =>
      this.request<SchoolListingList, ErrorResponse>({
        path: `/marketplace/school/listings/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsCreate
     * @request POST:/marketplace/school/listings/
     */
    marketplaceSchoolListingsCreate: (
      data: ListingCreate,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/marketplace/school/listings/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsRetrieve2
     * @request GET:/marketplace/school/listings/{listing_id}/
     */
    marketplaceSchoolListingsRetrieve2: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/marketplace/school/listings/${listingId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsPartialUpdate
     * @request PATCH:/marketplace/school/listings/{listing_id}/
     */
    marketplaceSchoolListingsPartialUpdate: (
      listingId: number,
      data: PatchedListingUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/marketplace/school/listings/${listingId}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsPublishCreate
     * @request POST:/marketplace/school/listings/{listing_id}/publish/
     */
    marketplaceSchoolListingsPublishCreate: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/marketplace/school/listings/${listingId}/publish/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsUnpublishCreate
     * @request POST:/marketplace/school/listings/{listing_id}/unpublish/
     */
    marketplaceSchoolListingsUnpublishCreate: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/marketplace/school/listings/${listingId}/unpublish/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsRetrieve
     * @request GET:/marketplace/school/transactions/
     */
    marketplaceSchoolTransactionsRetrieve: (params: RequestParams = {}) =>
      this.request<SchoolTransactionList, ErrorResponse>({
        path: `/marketplace/school/transactions/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Admin/school detail — can view any transaction.
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsRetrieve2
     * @request GET:/marketplace/school/transactions/{transaction_id}/
     */
    marketplaceSchoolTransactionsRetrieve2: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/school/transactions/${transactionId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsAcceptCreate
     * @request POST:/marketplace/school/transactions/{transaction_id}/accept/
     */
    marketplaceSchoolTransactionsAcceptCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/school/transactions/${transactionId}/accept/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsBlockCreate
     * @request POST:/marketplace/school/transactions/{transaction_id}/block/
     */
    marketplaceSchoolTransactionsBlockCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/school/transactions/${transactionId}/block/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsCompleteCreate
     * @request POST:/marketplace/school/transactions/{transaction_id}/complete/
     */
    marketplaceSchoolTransactionsCompleteCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/school/transactions/${transactionId}/complete/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsRejectCreate
     * @request POST:/marketplace/school/transactions/{transaction_id}/reject/
     */
    marketplaceSchoolTransactionsRejectCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/school/transactions/${transactionId}/reject/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsUnblockCreate
     * @request POST:/marketplace/school/transactions/{transaction_id}/unblock/
     */
    marketplaceSchoolTransactionsUnblockCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/school/transactions/${transactionId}/unblock/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Own-transaction detail — user must be requester or owner.
     *
     * @tags marketplace
     * @name MarketplaceTransactionsRetrieve
     * @request GET:/marketplace/transactions/{transaction_id}/
     */
    marketplaceTransactionsRetrieve: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/transactions/${transactionId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceTransactionsAcceptCreate
     * @request POST:/marketplace/transactions/{transaction_id}/accept/
     */
    marketplaceTransactionsAcceptCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/transactions/${transactionId}/accept/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceTransactionsCancelCreate
     * @request POST:/marketplace/transactions/{transaction_id}/cancel/
     */
    marketplaceTransactionsCancelCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/transactions/${transactionId}/cancel/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceTransactionsCompleteCreate
     * @request POST:/marketplace/transactions/{transaction_id}/complete/
     */
    marketplaceTransactionsCompleteCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/transactions/${transactionId}/complete/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceTransactionsRejectCreate
     * @request POST:/marketplace/transactions/{transaction_id}/reject/
     */
    marketplaceTransactionsRejectCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/marketplace/transactions/${transactionId}/reject/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceTransactionsMineRetrieve
     * @request GET:/marketplace/transactions/mine/
     */
    marketplaceTransactionsMineRetrieve: (params: RequestParams = {}) =>
      this.request<MyTransactionsList, ErrorResponse>({
        path: `/marketplace/transactions/mine/`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
}
