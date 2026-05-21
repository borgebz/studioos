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
 * * `confirmed` - Confirmed
 * * `completed` - Completed
 * * `blocked` - Blocked
 * * `cancelled` - Cancelled
 */
export enum VariantBookingStatusEnum {
  Pending = "pending",
  Confirmed = "confirmed",
  Completed = "completed",
  Blocked = "blocked",
  Cancelled = "cancelled",
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
export enum TransactionStatusEnum {
  Pending = "pending",
  Accepted = "accepted",
  Completed = "completed",
  Rejected = "rejected",
  Cancelled = "cancelled",
  Blocked = "blocked",
}

/**
 * * `female` - Female
 * * `male` - Male
 * * `unisex` - Unisex
 */
export enum TargetGenderEnum {
  Female = "female",
  Male = "male",
  Unisex = "unisex",
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
 * * `available` - Available
 * * `maintenance` - Maintenance
 * * `inactive` - Inactive
 * * `sold` - Sold
 * * `donated` - Donated
 * * `archived` - Archived
 */
export enum ProductVariantStatusEnum {
  Available = "available",
  Maintenance = "maintenance",
  Inactive = "inactive",
  Sold = "sold",
  Donated = "donated",
  Archived = "archived",
}

/**
 * * `active` - Active
 * * `inactive` - Inactive
 * * `archived` - Archived
 */
export enum ProductStatusEnum {
  Active = "active",
  Inactive = "inactive",
  Archived = "archived",
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

export type NullEnum = null;

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
 * * `draft` - Draft
 * * `active` - Active
 * * `closed` - Closed
 */
export enum ListingStatusEnum {
  Draft = "draft",
  Active = "active",
  Closed = "closed",
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
 * * `pending_review` - Pending review
 * * `approved` - Approved
 * * `waived` - Waived
 */
export enum FineStatusEnum {
  PendingReview = "pending_review",
  Approved = "approved",
  Waived = "waived",
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
 * * `invited` - Invited
 * * `pending` - Pending
 * * `active` - Active
 * * `pending_completion` - Pending Completion
 * * `attended` - Attended
 * * `absent` - Absent
 * * `cancelled` - Cancelled
 * * `late_cancelled` - Late Cancelled
 */
export enum CoachingParticipantStatusEnum {
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

export enum BlankEnum {
  Value = "",
}

/**
 * * `pending` - Pending
 * * `exported` - Exported
 * * `cancelled` - Cancelled
 */
export enum BillingEntryStatusEnum {
  Pending = "pending",
  Exported = "exported",
  Cancelled = "cancelled",
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

export interface Availability {
  id: number;
  teacher_id: number;
  modality: Modality;
  /** @format date-time */
  start_datetime: string;
  /** @format date-time */
  end_datetime: string;
  notes?: string;
  is_recurring: string;
  recurring: RecurringAvailability;
}

export interface AvailabilitySubmit {
  /** @format date-time */
  start_datetime: string;
  /** @format date-time */
  end_datetime: string;
  modality_id?: number | null;
  notes?: string;
  recurring?: RecurringAvailabilitySubmit | null;
}

export interface BillingEntryCancel {
  notes: string;
}

export interface BillingEntryDetail {
  id: number;
  source_type: SourceTypeEnum;
  student: UserResponse;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount_due: string;
  /** Single-line, human-readable description shown to the student and on accounting exports. Generated at creation time, not editable afterwards. */
  description: string;
  status: BillingEntryStatusEnum;
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
  student: UserResponse;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount_due: string;
  /** Single-line, human-readable description shown to the student and on accounting exports. Generated at creation time, not editable afterwards. */
  description: string;
  status: BillingEntryStatusEnum;
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

export interface Classe {
  id: number;
  /** @maxLength 255 */
  name: string;
  description?: string;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
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

export interface ClasseList {
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

export interface ClasseMember {
  id: number;
  student: UserResponse;
  /** @format date-time */
  created_at: string;
}

export interface ClasseMemberSubmit {
  student_id: number;
}

export interface ClasseMemberSummary {
  id: number;
  student: ClasseMemberSummaryStudent;
}

export interface ClasseMemberSummaryStudent {
  id: number;
  first_name: string;
  last_name: string;
  /** @format email */
  email: string;
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
  status?: CoachingParticipantStatusEnum;
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
  status?: CoachingParticipantStatusEnum;
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
  /** Explicit student user IDs to add as participants. Merged with classe members when classe_id is also provided; duplicates are removed automatically. */
  participant_ids?: number[];
  recurring_coaching?: RecurringCoachingSubmit | null;
}

export interface EnrollmentConsentRead {
  id: number;
  consent_type: ConsentTypeEnum;
  accepted: boolean;
  /** @format date-time */
  accepted_at: string | null;
  ip_address: string | null;
  user_agent: string;
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

/** A concrete time slot — either a one-time availability or an expanded recurring occurrence. */
export interface ExpandedSlot {
  id: number | null;
  teacher_id: number;
  modality: Modality | null;
  /** @format date-time */
  start_datetime: string;
  /** @format date-time */
  end_datetime: string;
  notes: string;
  is_recurring: boolean;
  recurring_id: number | null;
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
  status: FineStatusEnum;
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
  status: FineStatusEnum;
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
  student: UserResponse;
  coaching_class: CoachingClassBillingDetail | null;
  coaching_participant: CoachingParticipantBilling;
  billing_entry: FineLinkedBillingEntry | null;
  /** @format date-time */
  reviewed_at: string | null;
  reviewed_by: UserResponse | null;
  notes: string;
  /** @format date-time */
  created_at: string;
  /** @format date-time */
  updated_at: string;
}

/**
 * Compact billing-entry view embedded on a Fine — mirror of FineBillingSummary.
 *
 * Lets the UI tell the reviewer at a glance whether the charge generated by
 * an approved fine has since been cancelled, without a second roundtrip.
 */
export interface FineLinkedBillingEntry {
  id: number;
  status: BillingEntryStatusEnum;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount_due: string;
}

export interface FineList {
  id: number;
  reason: ReasonEnum;
  status: FineStatusEnum;
  /**
   * Set on approval. Null while pending review or when waived.
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  amount: string | null;
  student: UserResponse;
  coaching_class: CoachingClassBillingSummary;
  billing_entry: FineLinkedBillingEntry | null;
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

export interface ListCoachingClasses {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: CoachingClass[];
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
  status?: ListingStatusEnum;
  /** @maxLength 255 */
  title: string;
  description?: string;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  asking_price?: string | null;
  is_public?: boolean;
  product: ProductDetail;
  variant: ProductVariantRead;
  active_booking_windows: Record<string, any>[];
  owner_display: Record<string, any>;
  is_favorited: boolean;
  favorites_count: number;
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
  status?: ListingStatusEnum;
  /** @maxLength 255 */
  title: string;
  /**
   * @format decimal
   * @pattern ^-?\d{0,8}(?:\.\d{0,2})?$
   */
  asking_price?: string | null;
  /** @format uri */
  primary_media_url: string | null;
  product_name: string;
  product_category: string;
  variant_condition: string;
  variant_size: string;
  variant_status: string;
  /** @format date-time */
  available_from: string | null;
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

export interface PasswordResetConfirm {
  uid: string;
  token: string;
  /** @minLength 8 */
  password: string;
}

export interface PasswordResetConfirmSuccess {
  detail: string;
}

export interface PasswordResetRequest {
  /** @format email */
  email: string;
}

export interface PasswordResetRequestSuccess {
  detail: string;
}

export interface PatchedAvailabilityUpdate {
  /** @format date-time */
  start_datetime?: string;
  /** @format date-time */
  end_datetime?: string;
  modality_id?: number | null;
  notes?: string;
  recurring?: RecurringAvailabilityUpdate | null;
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
  status?: ProductStatusEnum;
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
  status?: ProductVariantStatusEnum;
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
  status?: ProductStatusEnum;
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
  /** Replaces the user's role-group memberships (multi-role). */
  role_codes?: string[];
  /** Replaces the user's individual permissions (independent of roles). */
  permission_ids?: number[];
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
  status?: VariantBookingStatusEnum;
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
  status?: ProductStatusEnum;
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
  target_gender?: TargetGenderEnum | BlankEnum | NullEnum | null;
  /** @maxLength 255 */
  brand?: string | null;
  /** @maxLength 255 */
  material?: string | null;
  status: ProductStatusEnum;
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
  status: ProductVariantStatusEnum;
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
  status?: ProductVariantStatusEnum;
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

export interface RecurringAvailability {
  /**
   * Comma-separated weekday integers (0=Mon..6=Sun), e.g. '0,2,4' for Mon/Wed/Fri.
   * @maxLength 20
   */
  days_of_week: string;
  /** @format time */
  start_time: string;
  /** @format time */
  end_time: string;
  /**
   * Inclusive start date for this recurrence to apply.
   * @format date
   */
  valid_from: string;
  /**
   * Inclusive end date. Null means open-ended.
   * @format date
   */
  valid_until?: string | null;
}

export interface RecurringAvailabilitySubmit {
  /** Comma-separated weekday integers (0=Mon..6=Sun), e.g. '0,2,4'. */
  days_of_week: string;
  /** @format time */
  start_time: string;
  /** @format time */
  end_time: string;
  /** @format date */
  valid_from?: string;
  /** @format date */
  valid_until?: string | null;
}

export interface RecurringAvailabilityUpdate {
  days_of_week?: string;
  /** @format time */
  start_time?: string;
  /** @format time */
  end_time?: string;
  /** @format date */
  valid_from?: string;
  /** @format date */
  valid_until?: string | null;
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

export interface SchoolListingCreateMultipart {
  /** JSON-encoded ListingCreate payload. Files for product.media[i].image are sent as separate form fields named media_0, media_1, ..., matching the index of each media entry. */
  payload: string;
  /** @format uri */
  media_0?: string;
  /** @format uri */
  media_1?: string;
  /** @format uri */
  media_2?: string;
  /** @format uri */
  media_3?: string;
  /** @format uri */
  media_4?: string;
  /** @format uri */
  media_5?: string;
  /** @format uri */
  media_6?: string;
  /** @format uri */
  media_7?: string;
  /** @format uri */
  media_8?: string;
  /** @format uri */
  media_9?: string;
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
  status?: ProductStatusEnum;
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
  status?: TransactionStatusEnum;
  requester_display: Record<string, any>;
  owner_display: Record<string, any>;
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

export interface UserList {
  count: number;
  /** @format uri */
  next?: string | null;
  /** @format uri */
  previous?: string | null;
  results: UserResponse[];
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
  address?: string;
  /** @maxLength 20 */
  postal_code?: string;
  /**
   * * `pt` - Português
   * * `en` - English
   */
  language?: LanguageEnum;
  parent_id: number | null;
  /**
   * Active
   * Designates whether this user should be treated as active. Unselect this instead of deleting accounts.
   */
  is_active?: boolean;
  role: UserResponseRoleOutput[] | null;
  display_name: string | null;
  photo_url: string | null;
  user_permission_ids: number[];
  /** @format date-time */
  last_login?: string | null;
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
  status: VariantBookingStatusEnum;
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
  status?: VariantBookingStatusEnum;
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
     * @description POST /api/accounts/auth/password-reset/ Accepts an email and enqueues a password-reset email (if the account exists). Always returns 200 to prevent email enumeration.
     *
     * @tags accounts
     * @name AccountsAuthPasswordResetCreate
     * @request POST:/api/accounts/auth/password-reset/
     * @secure
     */
    accountsAuthPasswordResetCreate: (
      data: PasswordResetRequest,
      params: RequestParams = {},
    ) =>
      this.request<PasswordResetRequestSuccess, ErrorResponse>({
        path: `/api/accounts/auth/password-reset/`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description POST /api/accounts/auth/password-reset/confirm/ Validates uid + token and sets the new password.
     *
     * @tags accounts
     * @name AccountsAuthPasswordResetConfirmCreate
     * @request POST:/api/accounts/auth/password-reset/confirm/
     * @secure
     */
    accountsAuthPasswordResetConfirmCreate: (
      data: PasswordResetConfirm,
      params: RequestParams = {},
    ) =>
      this.request<PasswordResetConfirmSuccess, ErrorResponse>({
        path: `/api/accounts/auth/password-reset/confirm/`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
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
     * @description GET /api/accounts/emails/export/ Export filtered user emails as CSV. Direction and coordination only.
     *
     * @tags accounts
     * @name AccountsEmailsExportRetrieve
     * @request GET:/api/accounts/emails/export/
     */
    accountsEmailsExportRetrieve: (
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
        type: ContentType.FormData,
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
        type: ContentType.FormData,
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
        type: ContentType.FormData,
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
     * @name ListUsers
     * @request GET:/api/accounts/users/
     */
    listUsers: (
      query?: {
        is_active?: boolean;
        /**
         * @minLength 1
         * @maxLength 50
         */
        role_code?: string;
        /**
         * Case-insensitive match on email, first_name, or last_name.
         * @minLength 1
         */
        search?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<UserList, ErrorResponse>({
        path: `/api/accounts/users/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/accounts/users/ — list users (coordination & direction). POST /api/accounts/users/ — create user.
     *
     * @tags accounts
     * @name CreateUser
     * @request POST:/api/accounts/users/
     */
    createUser: (data: CreateUser, params: RequestParams = {}) =>
      this.request<UserResponse, ErrorResponse>({
        path: `/api/accounts/users/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description GET   /api/accounts/users/<pk>/ — fetch a single user. PATCH /api/accounts/users/<pk>/ — update principal fields (direction only). Requires ``accounts.view_user`` (GET) / ``accounts.change_user`` (PATCH).
     *
     * @tags accounts
     * @name GetUser
     * @request GET:/api/accounts/users/{id}/
     */
    getUser: (id: number, params: RequestParams = {}) =>
      this.request<UserResponse, ErrorResponse>({
        path: `/api/accounts/users/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description GET   /api/accounts/users/<pk>/ — fetch a single user. PATCH /api/accounts/users/<pk>/ — update principal fields (direction only). Requires ``accounts.view_user`` (GET) / ``accounts.change_user`` (PATCH).
     *
     * @tags accounts
     * @name UpdateUser
     * @request PATCH:/api/accounts/users/{id}/
     */
    updateUser: (
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
     * @description POST /api/accounts/users/{pk}/deactivate/ Sets ``is_active=False`` on the user. Re-activation is handled by re-issuing an invite (``resend-invite``) so the user resets their password through onboarding.
     *
     * @tags accounts
     * @name DeactivateUser
     * @request POST:/api/accounts/users/{id}/deactivate/
     */
    deactivateUser: (id: number, params: RequestParams = {}) =>
      this.request<UserResponse, ErrorResponse>({
        path: `/api/accounts/users/${id}/deactivate/`,
        method: "POST",
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
     * @tags availability
     * @name AvailabilityTeachersList
     * @request GET:/api/availability/teachers/{user_id}/
     */
    availabilityTeachersList: (
      userId: number,
      query: {
        /** @format date-time */
        date_from: string;
        /** @format date-time */
        date_to: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ExpandedSlot[], ErrorResponse>({
        path: `/api/availability/teachers/${userId}/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags availability
     * @name AvailabilityTeachersCreate
     * @request POST:/api/availability/teachers/{user_id}/
     */
    availabilityTeachersCreate: (
      userId: number,
      data: AvailabilitySubmit,
      params: RequestParams = {},
    ) =>
      this.request<Availability, ErrorResponse>({
        path: `/api/availability/teachers/${userId}/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags availability
     * @name AvailabilityTeachersRetrieve
     * @request GET:/api/availability/teachers/{user_id}/{id}/
     */
    availabilityTeachersRetrieve: (
      id: number,
      userId: number,
      params: RequestParams = {},
    ) =>
      this.request<Availability, ErrorResponse>({
        path: `/api/availability/teachers/${userId}/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags availability
     * @name AvailabilityTeachersPartialUpdate
     * @request PATCH:/api/availability/teachers/{user_id}/{id}/
     */
    availabilityTeachersPartialUpdate: (
      id: number,
      userId: number,
      data: PatchedAvailabilityUpdate,
      params: RequestParams = {},
    ) =>
      this.request<Availability, ErrorResponse>({
        path: `/api/availability/teachers/${userId}/${id}/`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags availability
     * @name AvailabilityTeachersDestroy
     * @request DELETE:/api/availability/teachers/{user_id}/{id}/
     */
    availabilityTeachersDestroy: (
      id: number,
      userId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/availability/teachers/${userId}/${id}/`,
        method: "DELETE",
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
     * @name ClassesList
     * @request GET:/api/classes/
     */
    classesList: (params: RequestParams = {}) =>
      this.request<ClasseList[], ErrorResponse>({
        path: `/api/classes/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesCreate
     * @request POST:/api/classes/
     */
    classesCreate: (data: ClasseSubmit, params: RequestParams = {}) =>
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
     * @tags classes
     * @name ClassesMembersList
     * @request GET:/api/classes/{classe_id}/members/
     */
    classesMembersList: (classeId: number, params: RequestParams = {}) =>
      this.request<ClasseMember[], ErrorResponse>({
        path: `/api/classes/${classeId}/members/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesMembersCreate
     * @request POST:/api/classes/{classe_id}/members/
     */
    classesMembersCreate: (
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
     * @tags classes
     * @name ClassesMembersDestroy
     * @request DELETE:/api/classes/{classe_id}/members/{id}/
     */
    classesMembersDestroy: (
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
     * @tags classes
     * @name ClassesRetrieve
     * @request GET:/api/classes/{id}/
     */
    classesRetrieve: (id: number, params: RequestParams = {}) =>
      this.request<ClasseDetail, ErrorResponse>({
        path: `/api/classes/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags classes
     * @name ClassesPartialUpdate
     * @request PATCH:/api/classes/{id}/
     */
    classesPartialUpdate: (
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
     * @tags classes
     * @name ClassesDestroy
     * @request DELETE:/api/classes/{id}/
     */
    classesDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/classes/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description ``GET /api/coachings/`` — list coachings. ``POST /api/coachings/`` — direct coordination scheduling (timetable / scheduled coaching).
     *
     * @tags coachings
     * @name GetAllCoachings
     * @request GET:/api/coachings/
     */
    getAllCoachings: (
      query?: {
        /** @format date-time */
        date_from?: string;
        /** @format date-time */
        date_to?: string;
        modality_id?: number[];
        /** Filter coachings where this user is a participant. */
        participant_id?: number;
        recurring_coaching_id?: number;
        requested_by_id?: number;
        status?: (
          | "requested"
          | "pending_approval"
          | "scheduled"
          | "waiting_confirmation"
          | "pending_completion_approval"
          | "completed"
          | "cancelled"
          | "rejected"
        )[];
        studio_id?: number[];
        teacher_id?: number[];
      },
      params: RequestParams = {},
    ) =>
      this.request<ListCoachingClasses, ErrorResponse>({
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
     * @description POST — invited student (or parent on their behalf) confirms attendance.
     *
     * @tags coachings
     * @name CoachingsParticipantsAcceptCreate
     * @request POST:/api/coachings/{coaching_id}/participants/accept/
     */
    coachingsParticipantsAcceptCreate: (
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
     * @description POST — cancel all (future) sessions in a recurring series.
     *
     * @tags coachings
     * @name CoachingsRecurringCancelCreate
     * @request POST:/api/coachings/recurring/{recurring_id}/cancel/
     */
    coachingsRecurringCancelCreate: (
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
        type: ContentType.FormData,
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
        student_id?: number;
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
        type: ContentType.FormData,
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
        type: ContentType.FormData,
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
        type: ContentType.FormData,
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
     * @tags inventory
     * @name InventoryBookingsRetrieve
     * @request GET:/api/inventory/bookings/{booking_id}/
     */
    inventoryBookingsRetrieve: (
      bookingId: number,
      params: RequestParams = {},
    ) =>
      this.request<VariantBooking, ErrorResponse>({
        path: `/api/inventory/bookings/${bookingId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryBookingsPartialUpdate
     * @request PATCH:/api/inventory/bookings/{booking_id}/
     */
    inventoryBookingsPartialUpdate: (
      bookingId: number,
      data: PatchedVariantBookingWrite,
      params: RequestParams = {},
    ) =>
      this.request<VariantBooking, ErrorResponse>({
        path: `/api/inventory/bookings/${bookingId}/`,
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
     * @request DELETE:/api/inventory/bookings/{booking_id}/
     */
    inventoryBookingsDestroy: (bookingId: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/inventory/bookings/${bookingId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesList
     * @request GET:/api/inventory/categories/
     */
    inventoryCategoriesList: (params: RequestParams = {}) =>
      this.request<Category[], ErrorResponse>({
        path: `/api/inventory/categories/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesCreate
     * @request POST:/api/inventory/categories/
     */
    inventoryCategoriesCreate: (
      data: CreateCategory,
      params: RequestParams = {},
    ) =>
      this.request<Category, ErrorResponse>({
        path: `/api/inventory/categories/`,
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
     * @request GET:/api/inventory/categories/{category_id}/
     */
    inventoryCategoriesRetrieve: (
      categoryId: number,
      params: RequestParams = {},
    ) =>
      this.request<Category, ErrorResponse>({
        path: `/api/inventory/categories/${categoryId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesPartialUpdate
     * @request PATCH:/api/inventory/categories/{category_id}/
     */
    inventoryCategoriesPartialUpdate: (
      categoryId: number,
      data: PatchedUpdateCategory,
      params: RequestParams = {},
    ) =>
      this.request<Category, ErrorResponse>({
        path: `/api/inventory/categories/${categoryId}/`,
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
     * @request DELETE:/api/inventory/categories/{category_id}/
     */
    inventoryCategoriesDestroy: (
      categoryId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/inventory/categories/${categoryId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesActivateCreate
     * @request POST:/api/inventory/categories/{category_id}/activate/
     */
    inventoryCategoriesActivateCreate: (
      categoryId: number,
      params: RequestParams = {},
    ) =>
      this.request<Category, ErrorResponse>({
        path: `/api/inventory/categories/${categoryId}/activate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryCategoriesDeactivateCreate
     * @request POST:/api/inventory/categories/{category_id}/deactivate/
     */
    inventoryCategoriesDeactivateCreate: (
      categoryId: number,
      params: RequestParams = {},
    ) =>
      this.request<Category, ErrorResponse>({
        path: `/api/inventory/categories/${categoryId}/deactivate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsList
     * @request GET:/api/inventory/colors/
     */
    inventoryColorsList: (params: RequestParams = {}) =>
      this.request<Color[], ErrorResponse>({
        path: `/api/inventory/colors/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsCreate
     * @request POST:/api/inventory/colors/
     */
    inventoryColorsCreate: (data: CreateColor, params: RequestParams = {}) =>
      this.request<Color, ErrorResponse>({
        path: `/api/inventory/colors/`,
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
     * @request GET:/api/inventory/colors/{color_id}/
     */
    inventoryColorsRetrieve: (colorId: number, params: RequestParams = {}) =>
      this.request<Color, ErrorResponse>({
        path: `/api/inventory/colors/${colorId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsDestroy
     * @request DELETE:/api/inventory/colors/{color_id}/
     */
    inventoryColorsDestroy: (colorId: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/inventory/colors/${colorId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsActivateCreate
     * @request POST:/api/inventory/colors/{color_id}/activate/
     */
    inventoryColorsActivateCreate: (
      colorId: number,
      params: RequestParams = {},
    ) =>
      this.request<Color, ErrorResponse>({
        path: `/api/inventory/colors/${colorId}/activate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryColorsDeactivateCreate
     * @request POST:/api/inventory/colors/{color_id}/deactivate/
     */
    inventoryColorsDeactivateCreate: (
      colorId: number,
      params: RequestParams = {},
    ) =>
      this.request<Color, ErrorResponse>({
        path: `/api/inventory/colors/${colorId}/deactivate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsRetrieve
     * @request GET:/api/inventory/products/
     */
    inventoryProductsRetrieve: (
      query?: {
        category_id?: number;
        /** @minLength 1 */
        name?: string;
        /**
         * * `-updated_at` - Recently updated
         * * `updated_at` - Oldest updated
         * * `name` - Name A-Z
         * * `-name` - Name Z-A
         * @minLength 1
         */
        ordering?: "-updated_at" | "updated_at" | "name" | "-name";
        /**
         * * `active` - Active
         * * `inactive` - Inactive
         * * `archived` - Archived
         * @minLength 1
         */
        status?: "active" | "inactive" | "archived";
      },
      params: RequestParams = {},
    ) =>
      this.request<InventoryMemberProductList, ErrorResponse>({
        path: `/api/inventory/products/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsCreate
     * @request POST:/api/inventory/products/
     */
    inventoryProductsCreate: (
      data: ProductCreate,
      params: RequestParams = {},
    ) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/api/inventory/products/`,
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
     * @request GET:/api/inventory/products/{id}/
     */
    inventoryProductsRetrieve2: (id: number, params: RequestParams = {}) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/api/inventory/products/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsPartialUpdate
     * @request PATCH:/api/inventory/products/{id}/
     */
    inventoryProductsPartialUpdate: (
      id: number,
      data: PatchedProductUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/api/inventory/products/${id}/`,
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
     * @request DELETE:/api/inventory/products/{id}/
     */
    inventoryProductsDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/inventory/products/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsVariantsRetrieve
     * @request GET:/api/inventory/products/{product_id}/variants/
     */
    inventoryProductsVariantsRetrieve: (
      productId: number,
      params: RequestParams = {},
    ) =>
      this.request<InventoryProductVariantList, ErrorResponse>({
        path: `/api/inventory/products/${productId}/variants/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryProductsVariantsCreate
     * @request POST:/api/inventory/products/{product_id}/variants/
     */
    inventoryProductsVariantsCreate: (
      productId: number,
      data: ProductVariantWrite,
      params: RequestParams = {},
    ) =>
      this.request<ProductVariantRead, ErrorResponse>({
        path: `/api/inventory/products/${productId}/variants/`,
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
     * @request GET:/api/inventory/school/products/
     */
    inventorySchoolProductsRetrieve: (
      query?: {
        category_id?: number;
        /** @minLength 1 */
        name?: string;
        /**
         * * `-updated_at` - Recently updated
         * * `updated_at` - Oldest updated
         * * `name` - Name A-Z
         * * `-name` - Name Z-A
         * @minLength 1
         */
        ordering?: "-updated_at" | "updated_at" | "name" | "-name";
        /**
         * * `active` - Active
         * * `inactive` - Inactive
         * * `archived` - Archived
         * @minLength 1
         */
        status?: "active" | "inactive" | "archived";
      },
      params: RequestParams = {},
    ) =>
      this.request<InventorySchoolProductList, ErrorResponse>({
        path: `/api/inventory/school/products/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySchoolProductsCreate
     * @request POST:/api/inventory/school/products/
     */
    inventorySchoolProductsCreate: (
      data: SchoolProductCreate,
      params: RequestParams = {},
    ) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/api/inventory/school/products/`,
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
     * @request GET:/api/inventory/school/products/{id}/
     */
    inventorySchoolProductsRetrieve2: (
      id: number,
      params: RequestParams = {},
    ) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/api/inventory/school/products/${id}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySchoolProductsPartialUpdate
     * @request PATCH:/api/inventory/school/products/{id}/
     */
    inventorySchoolProductsPartialUpdate: (
      id: number,
      data: PatchedSchoolProductUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ProductDetail, ErrorResponse>({
        path: `/api/inventory/school/products/${id}/`,
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
     * @request DELETE:/api/inventory/school/products/{id}/
     */
    inventorySchoolProductsDestroy: (id: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/inventory/school/products/${id}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizeSystemsList
     * @request GET:/api/inventory/size-systems/
     */
    inventorySizeSystemsList: (params: RequestParams = {}) =>
      this.request<SizeSystem[], ErrorResponse>({
        path: `/api/inventory/size-systems/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizeSystemsCreate
     * @request POST:/api/inventory/size-systems/
     */
    inventorySizeSystemsCreate: (
      data: CreateSizeSystem,
      params: RequestParams = {},
    ) =>
      this.request<SizeSystem, ErrorResponse>({
        path: `/api/inventory/size-systems/`,
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
     * @request PATCH:/api/inventory/size-systems/{size_system_id}/
     */
    inventorySizeSystemsPartialUpdate: (
      sizeSystemId: number,
      data: PatchedUpdateSizeSystem,
      params: RequestParams = {},
    ) =>
      this.request<SizeSystem, ErrorResponse>({
        path: `/api/inventory/size-systems/${sizeSystemId}/`,
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
     * @request DELETE:/api/inventory/size-systems/{size_system_id}/
     */
    inventorySizeSystemsDestroy: (
      sizeSystemId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/inventory/size-systems/${sizeSystemId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizeSystemsActivateCreate
     * @request POST:/api/inventory/size-systems/{size_system_id}/activate/
     */
    inventorySizeSystemsActivateCreate: (
      sizeSystemId: number,
      params: RequestParams = {},
    ) =>
      this.request<SizeSystem, ErrorResponse>({
        path: `/api/inventory/size-systems/${sizeSystemId}/activate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizeSystemsDeactivateCreate
     * @request POST:/api/inventory/size-systems/{size_system_id}/deactivate/
     */
    inventorySizeSystemsDeactivateCreate: (
      sizeSystemId: number,
      params: RequestParams = {},
    ) =>
      this.request<SizeSystem, ErrorResponse>({
        path: `/api/inventory/size-systems/${sizeSystemId}/deactivate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesList
     * @request GET:/api/inventory/sizes/
     */
    inventorySizesList: (params: RequestParams = {}) =>
      this.request<Size[], ErrorResponse>({
        path: `/api/inventory/sizes/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesCreate
     * @request POST:/api/inventory/sizes/
     */
    inventorySizesCreate: (data: CreateSize, params: RequestParams = {}) =>
      this.request<Size, ErrorResponse>({
        path: `/api/inventory/sizes/`,
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
     * @request GET:/api/inventory/sizes/{size_id}/
     */
    inventorySizesRetrieve: (sizeId: number, params: RequestParams = {}) =>
      this.request<Size, ErrorResponse>({
        path: `/api/inventory/sizes/${sizeId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesDestroy
     * @request DELETE:/api/inventory/sizes/{size_id}/
     */
    inventorySizesDestroy: (sizeId: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/inventory/sizes/${sizeId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesActivateCreate
     * @request POST:/api/inventory/sizes/{size_id}/activate/
     */
    inventorySizesActivateCreate: (
      sizeId: number,
      params: RequestParams = {},
    ) =>
      this.request<Size, ErrorResponse>({
        path: `/api/inventory/sizes/${sizeId}/activate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventorySizesDeactivateCreate
     * @request POST:/api/inventory/sizes/{size_id}/deactivate/
     */
    inventorySizesDeactivateCreate: (
      sizeId: number,
      params: RequestParams = {},
    ) =>
      this.request<Size, ErrorResponse>({
        path: `/api/inventory/sizes/${sizeId}/deactivate/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryVariantsRetrieve
     * @request GET:/api/inventory/variants/{variant_id}/
     */
    inventoryVariantsRetrieve: (
      variantId: number,
      params: RequestParams = {},
    ) =>
      this.request<ProductVariantRead, ErrorResponse>({
        path: `/api/inventory/variants/${variantId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryVariantsPartialUpdate
     * @request PATCH:/api/inventory/variants/{variant_id}/
     */
    inventoryVariantsPartialUpdate: (
      variantId: number,
      data: PatchedProductVariantWrite,
      params: RequestParams = {},
    ) =>
      this.request<ProductVariantRead, ErrorResponse>({
        path: `/api/inventory/variants/${variantId}/`,
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
     * @request DELETE:/api/inventory/variants/{variant_id}/
     */
    inventoryVariantsDestroy: (variantId: number, params: RequestParams = {}) =>
      this.request<void, ErrorResponse>({
        path: `/api/inventory/variants/${variantId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryVariantsBookingsRetrieve
     * @request GET:/api/inventory/variants/{variant_id}/bookings/
     */
    inventoryVariantsBookingsRetrieve: (
      variantId: number,
      params: RequestParams = {},
    ) =>
      this.request<InventoryVariantBookingList, ErrorResponse>({
        path: `/api/inventory/variants/${variantId}/bookings/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags inventory
     * @name InventoryVariantsBookingsCreate
     * @request POST:/api/inventory/variants/{variant_id}/bookings/
     */
    inventoryVariantsBookingsCreate: (
      variantId: number,
      data: VariantBookingWrite,
      params: RequestParams = {},
    ) =>
      this.request<VariantBooking, ErrorResponse>({
        path: `/api/inventory/variants/${variantId}/bookings/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Public listings — only ACTIVE + is_public.
     *
     * @tags marketplace
     * @name MarketplaceListingsRetrieve
     * @request GET:/api/marketplace/listings/
     */
    marketplaceListingsRetrieve: (
      query?: {
        category_id?: number;
        color_id?: number;
        /** @minLength 1 */
        condition?: string;
        /**
         * * `rent` - Rent
         * * `sell` - Sell
         * * `lend` - Lend
         * * `donate` - Donate
         * @minLength 1
         */
        listing_type?: "rent" | "sell" | "lend" | "donate";
        /**
         * * `-created_at` - Newest first
         * * `created_at` - Oldest first
         * * `asking_price` - Price ascending
         * * `-asking_price` - Price descending
         * @minLength 1
         */
        ordering?:
          | "-created_at"
          | "created_at"
          | "asking_price"
          | "-asking_price";
        /** @minLength 1 */
        search?: string;
        size_id?: number;
        /**
         * * `draft` - Draft
         * * `active` - Active
         * * `closed` - Closed
         * @minLength 1
         */
        status?: "draft" | "active" | "closed";
      },
      params: RequestParams = {},
    ) =>
      this.request<MarketplaceListingList, ErrorResponse>({
        path: `/api/marketplace/listings/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Public listings — only ACTIVE + is_public.
     *
     * @tags marketplace
     * @name MarketplaceListingsCreate
     * @request POST:/api/marketplace/listings/
     */
    marketplaceListingsCreate: (
      data: ListingCreate,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/api/marketplace/listings/`,
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
     * @request GET:/api/marketplace/listings/{listing_id}/
     */
    marketplaceListingsRetrieve2: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Detail view with authorization: public listings visible to anyone authenticated, otherwise only owner or user with view_productlisting permission.
     *
     * @tags marketplace
     * @name MarketplaceListingsPartialUpdate
     * @request PATCH:/api/marketplace/listings/{listing_id}/
     */
    marketplaceListingsPartialUpdate: (
      listingId: number,
      data: PatchedListingUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/`,
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
     * @request DELETE:/api/marketplace/listings/{listing_id}/
     */
    marketplaceListingsDestroy: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsAvailabilityRetrieve
     * @request GET:/api/marketplace/listings/{listing_id}/availability/
     */
    marketplaceListingsAvailabilityRetrieve: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/availability/`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsCommentsList
     * @request GET:/api/marketplace/listings/{listing_id}/comments/
     */
    marketplaceListingsCommentsList: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingComment[], ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/comments/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsCommentsCreate
     * @request POST:/api/marketplace/listings/{listing_id}/comments/
     */
    marketplaceListingsCommentsCreate: (
      listingId: number,
      data: ListingCommentCreate,
      params: RequestParams = {},
    ) =>
      this.request<ListingComment, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/comments/`,
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
     * @request PUT:/api/marketplace/listings/{listing_id}/comments/{comment_id}/
     */
    marketplaceListingsCommentsUpdate: (
      commentId: number,
      listingId: number,
      data: ListingCommentUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ListingComment, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/comments/${commentId}/`,
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
     * @request DELETE:/api/marketplace/listings/{listing_id}/comments/{comment_id}/
     */
    marketplaceListingsCommentsDestroy: (
      commentId: number,
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/comments/${commentId}/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsFavoriteCreate
     * @request POST:/api/marketplace/listings/{listing_id}/favorite/
     */
    marketplaceListingsFavoriteCreate: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/favorite/`,
        method: "POST",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsFavoriteDestroy
     * @request DELETE:/api/marketplace/listings/{listing_id}/favorite/
     */
    marketplaceListingsFavoriteDestroy: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/favorite/`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsPublishCreate
     * @request POST:/api/marketplace/listings/{listing_id}/publish/
     */
    marketplaceListingsPublishCreate: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/publish/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsRequestCreate
     * @request POST:/api/marketplace/listings/{listing_id}/request/
     */
    marketplaceListingsRequestCreate: (
      listingId: number,
      data: TransactionRequest,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/request/`,
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
     * @request POST:/api/marketplace/listings/{listing_id}/unpublish/
     */
    marketplaceListingsUnpublishCreate: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/api/marketplace/listings/${listingId}/unpublish/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceListingsFavoritesRetrieve
     * @request GET:/api/marketplace/listings/favorites/
     */
    marketplaceListingsFavoritesRetrieve: (params: RequestParams = {}) =>
      this.request<FavoriteListingsList, ErrorResponse>({
        path: `/api/marketplace/listings/favorites/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns the current user's own listings regardless of status.
     *
     * @tags marketplace
     * @name MarketplaceListingsMineRetrieve
     * @request GET:/api/marketplace/listings/mine/
     */
    marketplaceListingsMineRetrieve: (
      query?: {
        category_id?: number;
        color_id?: number;
        /** @minLength 1 */
        condition?: string;
        /**
         * * `rent` - Rent
         * * `sell` - Sell
         * * `lend` - Lend
         * * `donate` - Donate
         * @minLength 1
         */
        listing_type?: "rent" | "sell" | "lend" | "donate";
        /**
         * * `-created_at` - Newest first
         * * `created_at` - Oldest first
         * * `asking_price` - Price ascending
         * * `-asking_price` - Price descending
         * @minLength 1
         */
        ordering?:
          | "-created_at"
          | "created_at"
          | "asking_price"
          | "-asking_price";
        /** @minLength 1 */
        search?: string;
        size_id?: number;
        /**
         * * `draft` - Draft
         * * `active` - Active
         * * `closed` - Closed
         * @minLength 1
         */
        status?: "draft" | "active" | "closed";
      },
      params: RequestParams = {},
    ) =>
      this.request<MyListingsList, ErrorResponse>({
        path: `/api/marketplace/listings/mine/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsRetrieve
     * @request GET:/api/marketplace/school/listings/
     */
    marketplaceSchoolListingsRetrieve: (
      query?: {
        category_id?: number;
        color_id?: number;
        /** @minLength 1 */
        condition?: string;
        /**
         * * `rent` - Rent
         * * `sell` - Sell
         * * `lend` - Lend
         * * `donate` - Donate
         * @minLength 1
         */
        listing_type?: "rent" | "sell" | "lend" | "donate";
        /**
         * * `-created_at` - Newest first
         * * `created_at` - Oldest first
         * * `asking_price` - Price ascending
         * * `-asking_price` - Price descending
         * @minLength 1
         */
        ordering?:
          | "-created_at"
          | "created_at"
          | "asking_price"
          | "-asking_price";
        /** @minLength 1 */
        search?: string;
        size_id?: number;
        /**
         * * `draft` - Draft
         * * `active` - Active
         * * `closed` - Closed
         * @minLength 1
         */
        status?: "draft" | "active" | "closed";
      },
      params: RequestParams = {},
    ) =>
      this.request<SchoolListingList, ErrorResponse>({
        path: `/api/marketplace/school/listings/`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsCreate
     * @request POST:/api/marketplace/school/listings/
     */
    marketplaceSchoolListingsCreate: (
      data: SchoolListingCreateMultipart,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/api/marketplace/school/listings/`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsRetrieve2
     * @request GET:/api/marketplace/school/listings/{listing_id}/
     */
    marketplaceSchoolListingsRetrieve2: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/api/marketplace/school/listings/${listingId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsPartialUpdate
     * @request PATCH:/api/marketplace/school/listings/{listing_id}/
     */
    marketplaceSchoolListingsPartialUpdate: (
      listingId: number,
      data: PatchedListingUpdate,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/api/marketplace/school/listings/${listingId}/`,
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
     * @request POST:/api/marketplace/school/listings/{listing_id}/publish/
     */
    marketplaceSchoolListingsPublishCreate: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/api/marketplace/school/listings/${listingId}/publish/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolListingsUnpublishCreate
     * @request POST:/api/marketplace/school/listings/{listing_id}/unpublish/
     */
    marketplaceSchoolListingsUnpublishCreate: (
      listingId: number,
      params: RequestParams = {},
    ) =>
      this.request<ListingDetail, ErrorResponse>({
        path: `/api/marketplace/school/listings/${listingId}/unpublish/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsRetrieve
     * @request GET:/api/marketplace/school/transactions/
     */
    marketplaceSchoolTransactionsRetrieve: (params: RequestParams = {}) =>
      this.request<SchoolTransactionList, ErrorResponse>({
        path: `/api/marketplace/school/transactions/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Admin/school detail — can view any transaction.
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsRetrieve2
     * @request GET:/api/marketplace/school/transactions/{transaction_id}/
     */
    marketplaceSchoolTransactionsRetrieve2: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/school/transactions/${transactionId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsAcceptCreate
     * @request POST:/api/marketplace/school/transactions/{transaction_id}/accept/
     */
    marketplaceSchoolTransactionsAcceptCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/school/transactions/${transactionId}/accept/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsBlockCreate
     * @request POST:/api/marketplace/school/transactions/{transaction_id}/block/
     */
    marketplaceSchoolTransactionsBlockCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/school/transactions/${transactionId}/block/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsCompleteCreate
     * @request POST:/api/marketplace/school/transactions/{transaction_id}/complete/
     */
    marketplaceSchoolTransactionsCompleteCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/school/transactions/${transactionId}/complete/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsRejectCreate
     * @request POST:/api/marketplace/school/transactions/{transaction_id}/reject/
     */
    marketplaceSchoolTransactionsRejectCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/school/transactions/${transactionId}/reject/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceSchoolTransactionsUnblockCreate
     * @request POST:/api/marketplace/school/transactions/{transaction_id}/unblock/
     */
    marketplaceSchoolTransactionsUnblockCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/school/transactions/${transactionId}/unblock/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Own-transaction detail — user must be requester or owner.
     *
     * @tags marketplace
     * @name MarketplaceTransactionsRetrieve
     * @request GET:/api/marketplace/transactions/{transaction_id}/
     */
    marketplaceTransactionsRetrieve: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/transactions/${transactionId}/`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceTransactionsAcceptCreate
     * @request POST:/api/marketplace/transactions/{transaction_id}/accept/
     */
    marketplaceTransactionsAcceptCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/transactions/${transactionId}/accept/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceTransactionsCancelCreate
     * @request POST:/api/marketplace/transactions/{transaction_id}/cancel/
     */
    marketplaceTransactionsCancelCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/transactions/${transactionId}/cancel/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceTransactionsCompleteCreate
     * @request POST:/api/marketplace/transactions/{transaction_id}/complete/
     */
    marketplaceTransactionsCompleteCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/transactions/${transactionId}/complete/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceTransactionsRejectCreate
     * @request POST:/api/marketplace/transactions/{transaction_id}/reject/
     */
    marketplaceTransactionsRejectCreate: (
      transactionId: number,
      params: RequestParams = {},
    ) =>
      this.request<TransactionDetail, ErrorResponse>({
        path: `/api/marketplace/transactions/${transactionId}/reject/`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags marketplace
     * @name MarketplaceTransactionsMineRetrieve
     * @request GET:/api/marketplace/transactions/mine/
     */
    marketplaceTransactionsMineRetrieve: (params: RequestParams = {}) =>
      this.request<MyTransactionsList, ErrorResponse>({
        path: `/api/marketplace/transactions/mine/`,
        method: "GET",
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
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags modalities
     * @name ModalitiesList
     * @request GET:/api/modalities/
     * @secure
     */
    modalitiesList: (params: RequestParams = {}) =>
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
