import {
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Home,
  Inbox,
  MessageCircle,
  MessageSquarePlus,
  Package,
  Palette,
  Receipt,
  ShieldAlert,
  ShoppingBag,
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
        labelKey: 'nav.myRequests',
        icon: Inbox,
        permission: [
          'accounts.can_participate_in_coaching',
          'accounts.can_teach',
        ],
      },
      {
        to: paths.coachingsRequest,
        labelKey: 'nav.requestCoaching',
        icon: MessageSquarePlus,
        permission: 'accounts.can_participate_in_coaching',
      },
      {
        to: paths.coachingsRequests,
        labelKey: 'nav.reviewRequests',
        icon: ClipboardCheck,
        permission: 'coachings.change_coachingclass',
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
        to: paths.myInventory,
        labelKey: 'nav.myInventory',
        icon: Package,
        permission: 'marketplace.view_own_listings',
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

  // -- Dev-only --
  { to: paths.designSystem, labelKey: 'nav.designSystem', icon: Palette },
]
