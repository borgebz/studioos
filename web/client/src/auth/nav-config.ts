import {
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ShieldCheck,
  CreditCard,
  GraduationCap,
  Home,
  Inbox,
  MessageCircle,
  Package,
  Receipt,
  Settings,
  ShieldAlert,
  Heart,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  Tag,
  TriangleAlert,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react'
import { paths } from '@/app/paths'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavItemConfig {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  /** Permission required to see this item. Omit for unrestricted access. */
  permission?: string | string[]
}

export interface NavGroupConfig {
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  children: NavItemConfig[]
  /**
   * Hide this group when the user holds ANY of these permissions.
   * Used for role-specific nav variants (e.g. student "Payments" vs admin "Billing").
   */
  hidePermission?: string | string[]
}

export type NavEntryConfig = NavItemConfig | NavGroupConfig

export function isNavGroup(entry: NavEntryConfig): entry is NavGroupConfig {
  return 'children' in entry
}

// ---------------------------------------------------------------------------
// Navigation map — single source of truth
//
// Permission codes match the Django `app_label.codename` format returned by
// `GET /auth/me/`. The sidebar component filters items the user cannot access
// and hides groups with zero visible children.
// ---------------------------------------------------------------------------

export const navConfig: NavEntryConfig[] = [
  // -- Always visible --
  { to: paths.home, labelKey: 'nav.home', icon: Home },

  // -- Messages (standalone) --
  {
    to: paths.messages,
    labelKey: 'nav.messages',
    icon: MessageCircle,
    permission: 'messaging.can_list_conversations',
  },

  // -- Events (standalone) --
  {
    to: paths.events,
    labelKey: 'nav.events',
    icon: Ticket,
    permission: 'events.view_event',
  },

  // -- Coachings --
  {
    labelKey: 'nav.coachings',
    icon: Inbox,
    children: [
      {
        to: paths.calendar,
        labelKey: 'nav.calendar',
        icon: CalendarDays,
        permission: 'coachings.view_coachingclass',
      },
      {
        to: paths.coachingsMyRequests,
        labelKey: 'nav.myCoachings',
        icon: Inbox,
        permission: [
          'accounts.can_participate_in_coaching',
          'accounts.can_teach',
          'coachings.can_confirm_dependent_coaching_attendance',
        ],
      },
      {
        to: paths.coachingsRequests,
        labelKey: 'nav.reviewRequests',
        icon: ClipboardCheck,
        permission: 'coachings.change_coachingclass',
      },
      {
        to: paths.myAvailability,
        labelKey: 'nav.myAvailability',
        icon: CalendarClock,
        permission: 'accounts.can_teach',
      },
    ],
  },

  // -- Marketplace (personal) --
  {
    labelKey: 'nav.marketplace',
    icon: ShoppingBag,
    children: [
      {
        to: paths.marketplace,
        labelKey: 'nav.browse',
        icon: ShoppingBag,
        permission: 'marketplace.view_productlisting',
      },
      {
        to: paths.marketplaceFavorites,
        labelKey: 'nav.favorites',
        icon: Heart,
        permission: 'marketplace.view_productlisting',
      },
      {
        to: paths.myInventory,
        labelKey: 'nav.myInventory',
        icon: Package,
        permission: 'inventory.view_product',
      },
      {
        to: paths.myListings,
        labelKey: 'nav.myListings',
        icon: Tag,
        permission: 'marketplace.view_own_listings',
      },
    ],
  },

  // -- School Catalog (admin) --
  {
    labelKey: 'nav.schoolCatalog',
    icon: Warehouse,
    children: [
      {
        to: paths.schoolInventory,
        labelKey: 'nav.schoolInventory',
        icon: Warehouse,
        permission: 'inventory.view_school_product',
      },
      {
        to: paths.schoolListings,
        labelKey: 'nav.schoolListings',
        icon: Store,
        permission: 'marketplace.manage_school_listings',
      },
      {
        to: paths.inventoryBookings,
        labelKey: 'nav.inventoryBookings',
        icon: CalendarClock,
        permission: 'inventory.view_school_product',
      },
    ],
  },

  // -- People --
  {
    labelKey: 'nav.people',
    icon: Users,
    children: [
      {
        to: paths.users,
        labelKey: 'nav.users',
        icon: Users,
        permission: 'accounts.can_list_users',
      },
      {
        to: paths.invites,
        labelKey: 'nav.invites',
        icon: UserPlus,
        permission: 'accounts.can_invite_user',
      },
      {
        to: paths.enrollmentRequests,
        labelKey: 'nav.enrollmentRequests',
        icon: ClipboardCheck,
        permission: 'enrollments.can_review_enrollment',
      },
      {
        to: paths.classes,
        labelKey: 'nav.classes',
        icon: GraduationCap,
        permission: 'classes.can_manage_classes',
      },
      {
        to: paths.roles,
        labelKey: 'nav.roles',
        icon: ShieldCheck,
        permission: 'accounts.view_role',
      },
    ],
  },

  // -- Billing (admin — shown to direction / coordination) --
  {
    labelKey: 'nav.billing',
    icon: Wallet,
    children: [
      {
        to: paths.billingEntries,
        labelKey: 'nav.billingEntries',
        icon: Receipt,
        permission: 'billing.can_cancel_billingentry',
      },
      {
        to: paths.billingFines,
        labelKey: 'nav.billingFines',
        icon: ShieldAlert,
        permission: 'billing.can_review_fine',
      },
    ],
  },

  // -- Payments (student / parent — friendlier branding) --
  {
    labelKey: 'nav.payments',
    icon: CreditCard,
    hidePermission: 'billing.can_cancel_billingentry',
    children: [
      {
        to: paths.billingEntries,
        labelKey: 'nav.myCharges',
        icon: Receipt,
        permission: 'billing.view_billingentry',
      },
      {
        to: paths.billingFines,
        labelKey: 'nav.myPenalties',
        icon: TriangleAlert,
        permission: 'billing.view_fine',
      },
    ],
  },

  // -- School Setup (admin) --
  {
    labelKey: 'nav.schoolSetup',
    icon: Settings,
    children: [
      {
        to: paths.modalities,
        labelKey: 'nav.modalities',
        icon: Sparkles,
        permission: 'modality.change_modality',
      },
      {
        to: paths.studios,
        labelKey: 'nav.studios',
        icon: Building2,
        permission: 'studios.change_studio',
      },
      {
        to: paths.enrollmentPeriods,
        labelKey: 'nav.enrollmentPeriods',
        icon: CalendarRange,
        permission: 'enrollments.can_manage_periods',
      },
      {
        to: paths.inventorySettings,
        labelKey: 'nav.inventorySettings',
        icon: Package,
        permission: [
          'inventory.view_category',
          'inventory.view_color',
          'inventory.view_size',
          'inventory.view_sizesystem',
        ],
      },
    ],
  },

]
