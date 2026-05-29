import type { TFunction } from 'i18next'
import {
  BookingTypeEnum,
  VariantBookingStatusEnum,
} from '@/api/studioos-api'

/**
 * UI helpers for the variant-bookings admin. The kind/status enums are
 * server-canonical; we colour them locally for badges and translate via
 * i18n.
 */

export const BOOKING_TYPE_VALUES: BookingTypeEnum[] = [
  BookingTypeEnum.Reservation,
  BookingTypeEnum.Loan,
  BookingTypeEnum.Rent,
  BookingTypeEnum.Sale,
  BookingTypeEnum.Donation,
  BookingTypeEnum.SchoolUse,
  BookingTypeEnum.Maintenance,
  BookingTypeEnum.Blocked,
]

export const BOOKING_STATUS_VALUES: VariantBookingStatusEnum[] = [
  VariantBookingStatusEnum.Pending,
  VariantBookingStatusEnum.Confirmed,
  VariantBookingStatusEnum.Completed,
  VariantBookingStatusEnum.Blocked,
  VariantBookingStatusEnum.Cancelled,
]

const TYPE_LABEL_KEY: Record<BookingTypeEnum, string> = {
  [BookingTypeEnum.Reservation]: 'inventoryBookings.type.reservation',
  [BookingTypeEnum.Loan]: 'inventoryBookings.type.loan',
  [BookingTypeEnum.Rent]: 'inventoryBookings.type.rent',
  [BookingTypeEnum.Sale]: 'inventoryBookings.type.sale',
  [BookingTypeEnum.Donation]: 'inventoryBookings.type.donation',
  [BookingTypeEnum.SchoolUse]: 'inventoryBookings.type.schoolUse',
  [BookingTypeEnum.Maintenance]: 'inventoryBookings.type.maintenance',
  [BookingTypeEnum.Blocked]: 'inventoryBookings.type.blocked',
}

const STATUS_LABEL_KEY: Record<VariantBookingStatusEnum, string> = {
  [VariantBookingStatusEnum.Pending]: 'inventoryBookings.status.pending',
  [VariantBookingStatusEnum.Confirmed]: 'inventoryBookings.status.confirmed',
  [VariantBookingStatusEnum.Completed]: 'inventoryBookings.status.completed',
  [VariantBookingStatusEnum.Blocked]: 'inventoryBookings.status.blocked',
  [VariantBookingStatusEnum.Cancelled]: 'inventoryBookings.status.cancelled',
}

export function bookingTypeLabel(
  t: TFunction,
  v: BookingTypeEnum | string
): string {
  const key = TYPE_LABEL_KEY[v as BookingTypeEnum]
  return key ? t(key) : String(v)
}

export function bookingStatusLabel(
  t: TFunction,
  v: VariantBookingStatusEnum | string
): string {
  const key = STATUS_LABEL_KEY[v as VariantBookingStatusEnum]
  return key ? t(key) : String(v)
}

/**
 * Tailwind class string for the type badge. Eight kinds × two themes lives
 * here to keep the columns/calendar consistent.
 */
export function bookingTypeBadgeClass(v: BookingTypeEnum | string): string {
  switch (v) {
    case BookingTypeEnum.Reservation:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case BookingTypeEnum.Loan:
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
    case BookingTypeEnum.Rent:
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
    case BookingTypeEnum.Sale:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case BookingTypeEnum.Donation:
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400'
    case BookingTypeEnum.SchoolUse:
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
    case BookingTypeEnum.Maintenance:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    case BookingTypeEnum.Blocked:
      return 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700/40 dark:text-zinc-300'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function bookingStatusBadgeClass(
  v: VariantBookingStatusEnum | string
): string {
  switch (v) {
    case VariantBookingStatusEnum.Pending:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case VariantBookingStatusEnum.Confirmed:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case VariantBookingStatusEnum.Completed:
      return 'bg-muted text-muted-foreground'
    case VariantBookingStatusEnum.Blocked:
      return 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700/40 dark:text-zinc-300'
    case VariantBookingStatusEnum.Cancelled:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}
