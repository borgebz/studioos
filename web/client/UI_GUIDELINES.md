# StudioOS UI Guidelines

Brand name: **StudioOS**  
Primary color: **#146664** — `oklch(0.5234 0.0898 190.75)`  
Design reference: **Saleor Dashboard** (clean admin panel, card-based layout, generous whitespace)

---

## 1. Design Principles

- **Clean and professional.** No decorative elements. Every element serves a purpose.
- **Card-based sections.** Content is grouped into white cards with clear headings, separated by whitespace — never a flat wall of fields.
- **Generous spacing.** Pages breathe. Sections have clear vertical rhythm. Dense data lives in tables, not cramped forms.
- **Consistent hierarchy.** Page title at the top, section headings inside cards, labels on inputs. Never skip a level.
- **Minimal color.** The UI is mostly neutral (whites, grays, borders). Primary teal (`#146664`) appears only on interactive elements — buttons, links, active states, focus rings. Avoid coloring backgrounds or large surfaces with the primary.

---

## 2. Color System

All colors use **oklch** format and are defined as CSS custom properties in `src/index.css`. Never use raw hex/rgb in components — always reference the semantic variables via Tailwind classes.

### Global CSS Rules

- **Never modify `src/index.css` directly** — it defines the design tokens (CSS custom properties) and base styles. Treat it as the source of truth for the theme.
- **Never hardcode color values** in components. Always use Tailwind semantic classes (`text-foreground`, `bg-card`, `border-border`, etc.) or CSS custom properties (`var(--login-brand)`).
- When a component needs theme-aware custom colors, define new CSS custom properties in `index.css` with both `:root` (light) and `.dark` (dark) variants, then reference them via `var()`.

### Semantic Roles

| Role | Tailwind Class | Usage |
|------|---------------|-------|
| **Primary** | `bg-primary`, `text-primary` | CTA buttons, active sidebar items, links, focus rings |
| **Secondary** | `bg-secondary`, `text-secondary-foreground` | Secondary buttons, subtle backgrounds |
| **Destructive** | `bg-destructive`, `text-destructive` | Delete buttons, error states, danger actions |
| **Muted** | `bg-muted`, `text-muted-foreground` | Disabled text, helper text, placeholders |
| **Accent** | `bg-accent`, `text-accent-foreground` | Hover backgrounds on menus, sidebar items |
| **Card** | `bg-card`, `text-card-foreground` | Content cards, elevated sections |
| **Background** | `bg-background` | Page background (light gray feel vs white cards) |
| **Border** | `border-border` | Card borders, dividers, input borders |

### Primary Palette (from #146664)

Use these only via CSS variables. For reference:

| Shade | Usage | Approx Hex |
|-------|-------|-----------|
| Primary | Buttons, active states | `#146664` |
| Primary foreground | Text on primary bg | `#FAFAFA` |
| Ring | Focus outlines | Primary at ~50% opacity |

### Rules

- Never hardcode colors. Always use `text-foreground`, `bg-card`, `border-border`, etc.
- The page background (`bg-background`) should feel slightly off-white in light mode so that `bg-card` cards stand out.
- Dark mode is handled automatically by the CSS variables — no conditional classes needed beyond the `.dark` root toggle.
- Chart colors (`chart-1` through `chart-5`) are reserved for data visualization only.

---

## 3. Layout Architecture

The app uses a fixed layout inspired by Saleor:

```
┌─────────────────────────────────────────────────┐
│  TopBar (h-14, sticky, border-bottom)           │
├────────┬────────────────────────────────────────┤
│        │                                        │
│ Side-  │  Content Area                          │
│ bar    │  (scrollable, padded)                  │
│        │                                        │
│ (col-  │  ┌─ Page Header ──────────────────┐   │
│ lapsi- │  │  ← Back    Title      Actions  │   │
│ ble)   │  └────────────────────────────────┘   │
│        │                                        │
│        │  ┌─ Card Section ─────────────────┐   │
│        │  │  Section Heading               │   │
│        │  │  ─────────────────────────     │   │
│        │  │  Form fields / Content         │   │
│        │  └────────────────────────────────┘   │
│        │                                        │
│        │  ┌─ Card Section ─────────────────┐   │
│        │  │  ...                           │   │
│        │  └────────────────────────────────┘   │
│        │                                        │
└────────┴────────────────────────────────────────┘
```

### TopBar

- Height: `h-14` (3.5rem), sticky, `z-50`.
- Contains: sidebar trigger, brand name ("StudioOS"), right-aligned actions (language switcher, theme toggle, user menu).
- Background: `bg-card` with `border-b border-border`.

### Sidebar

- Uses shadcn `Sidebar` with `collapsible="icon"`.
- Sits below the TopBar (`top: 3.5rem`).
- Navigation items use `SidebarMenuButton` with Lucide icons.
- Active state determined by current route path.
- Groups: organize nav items into `SidebarGroup` by domain (e.g., Dashboard, Catalog, People, Finance).

### Content Area

- Scrollable, with consistent padding: `p-6` on desktop, `p-4` on mobile.
- Max content width: none (fluid), but card sections should not exceed `max-w-4xl` for form pages.
- Background: `bg-background` (the slightly off-white page background).

---

## 4. Page Templates

### 4.1 List Page (e.g., All Products, All Students)

```
Page Header:  Title + "Create" button (primary)
Filters:      Filter bar (dropdowns, search input)
Content:      Data table in a card
Footer:       Pagination (rows per page + page navigation)
```

**Components used:** `Button`, `Input` (search), `Select` (filters), `DropdownMenu` (bulk actions), `Table`, `Checkbox`, `Skeleton` (loading), `Badge` (status).

**Patterns:**
- Table rows are clickable (navigate to detail page).
- Checkbox column for bulk selection.
- Empty state: centered icon + message + CTA button.
- Loading state: `Skeleton` rows matching table structure.
- List/grid toggle via icon buttons (like Saleor product views).

### 4.2 Detail / Edit Page (e.g., Edit Product, Student Profile)

```
Page Header:  ← Back button + Entity name + action icons (settings, delete)
Layout:       Two-column on desktop (main content left, sidebar right)
              Single column on mobile
Main column:  Card sections with form fields
Side column:  Metadata cards (status, type, category, permissions)
Footer:       Sticky bottom bar with "Back" (outline) + "Save" (primary)
```

**Components used:** `Button`, `Input`, `Select`, `Separator`, `Sheet` (for sub-forms), `Tooltip`, `Badge`, `Avatar` (user profile).

**Patterns:**
- Each logical group of fields is a separate card with a heading.
- Two-column layout: `grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6`.
- Collapsible sections use chevron icon + `Collapsible` component.
- Destructive actions (Delete) use a red outline button at bottom-left, separated from Save/Back.
- Back button uses `ChevronLeft` icon, not text.

### 4.3 Create Page (e.g., New Product, Create Customer)

Same as Detail page but:
- No delete button.
- Page title is "Create [Entity]" or "New [Entity]".
- Footer: "Back" + "Save" (no delete).
- Side column may show fewer metadata cards.

### 4.4 Dashboard / Home Page

```
Header:       Welcome message + user info
Onboarding:   Checklist card (collapsible steps)
Stats:        Summary cards (e.g., sales, out of stock)
Activity:     Recent activity feed
```

**Components used:** `Card`, `Badge`, `Separator`, `Skeleton`, `Button`.

### 4.5 Settings / Configuration Page

```
Header:       Section title
Content:      Stacked card sections, each with a heading + description + controls
```

**Components used:** `Switch`, `Select`, `Input`, `Separator`, `Label`.

---

## 5. Component Usage Guide

### Buttons

| Variant | When to use |
|---------|------------|
| `default` (primary) | Main CTA per page — "Save", "Create", "Publish". Max one primary per section. |
| `outline` | Secondary actions — "Back", "Cancel", "Export". |
| `secondary` | Tertiary actions, toolbar buttons. |
| `ghost` | Icon-only buttons, inline actions, table row actions. |
| `destructive` | "Delete", "Remove", "Cancel enrollment". Always requires confirmation dialog. |
| `link` | Inline text links within content. |

**Sizes:** Use `default` for page-level actions, `sm` for table/card-level actions, `icon` for icon-only buttons.

### Inputs & Forms

- Always use floating labels or top-aligned labels (label above input, like Saleor).
- Labels: `text-sm font-medium text-foreground`.
- Helper text: `text-sm text-muted-foreground` below the input.
- Error text: `text-sm text-destructive` below the input, replacing helper text.
- Required fields: no asterisk — instead, mark optional fields with "(optional)".
- Input groups: wrap related inputs in a card section with a section heading.
- Use `React Hook Form` + `Zod` for all form validation.

### Tables

- Use the shadcn `Table` component.
- Header row: `text-sm font-medium text-muted-foreground`, uppercase or sentence case.
- Body rows: `text-sm`, hover state `hover:bg-muted/50`.
- Clickable rows: `cursor-pointer` + navigate on click.
- Checkbox column: first column, `w-[40px]`.
- Actions column: last column, right-aligned, icon buttons (`ghost` variant, `icon-sm` size).
- Pagination: below table, right-aligned, "No. of rows" select + page arrows.

### Cards (Content Sections)

- Every content group is a card: `bg-card rounded-lg border border-border p-6`.
- Card heading: `text-lg font-semibold` or `text-base font-semibold`.
- Card description (optional): `text-sm text-muted-foreground` below heading.
- Separate heading from content with `Separator` or `mb-4` spacing.
- Cards stack vertically with `gap-6` between them.

### Badges / Status

- Use `Badge` for status indicators (active, pending, cancelled, etc.).
- Status colors: define a consistent mapping:
  - **Active / Published / Completed**: `bg-emerald-100 text-emerald-800` (light) / `bg-emerald-900/30 text-emerald-400` (dark)
  - **Pending / Scheduled / Draft**: `bg-amber-100 text-amber-800` (light) / `bg-amber-900/30 text-amber-400` (dark)
  - **Cancelled / Rejected / Error**: `bg-red-100 text-red-800` (light) / `bg-red-900/30 text-red-400` (dark)
  - **Neutral / Archived**: `bg-muted text-muted-foreground`

### Dialogs & Confirmations

- Use `AlertDialog` for destructive confirmations (delete, cancel enrollment).
- Use `Dialog` for forms that don't need a full page (quick edit, add participant).
- Use `Sheet` for side panels with detailed content (filters panel, extended settings).

### Dropdowns

- `DropdownMenu` for action menus (three-dot menu, bulk actions).
- `Select` for form field selection (single value from a list).
- Items with icons: icon + label, consistent `gap-2`.
- Danger items: `text-destructive` with destructive icon color.
- Keyboard shortcuts: right-aligned `text-muted-foreground text-xs`.

### Tooltips

- Use on icon-only buttons to clarify purpose.
- Use on truncated text.
- Keep content to one short line.
- Side: `top` by default, adjust to avoid viewport clipping.

### Skeletons (Loading States)

- Every page must have a loading state using `Skeleton`.
- Match the skeleton shape to the expected content layout.
- Table loading: skeleton rows with column widths matching the real data.
- Card loading: skeleton lines for heading + 2-3 content lines.
- Never show a blank page or a raw spinner.

### Separators

- Use `Separator` between card sections, not between individual fields.
- Horizontal by default. Vertical only in toolbars or inline groups.

### Avatars

- User avatars: circle, initials fallback with `bg-primary text-primary-foreground`.
- Sizes: `h-8 w-8` in tables/lists, `h-16 w-16` in profile detail, `h-24 w-24` in profile edit (like Saleor staff page).

### Navigation

- Use `react-router-dom` `NavLink` for sidebar items.
- Breadcrumbs: not used (Saleor uses back arrow + page title instead).
- Back navigation: `← Back` icon button at top-left of page header, navigates to the parent list.

---

## 6. Spacing & Typography

### Spacing Scale (Tailwind)

| Token | px | Usage |
|-------|-----|-------|
| `gap-1` / `p-1` | 4px | Tight icon groups, inline spacing |
| `gap-2` / `p-2` | 8px | Between icon and label, compact lists |
| `gap-3` / `p-3` | 12px | Between form fields within a group |
| `gap-4` / `p-4` | 16px | Mobile page padding, card internal sections |
| `gap-6` / `p-6` | 24px | Desktop page padding, between cards, card padding |
| `gap-8` / `p-8` | 32px | Between major page sections |

### Typography

| Element | Classes | Example |
|---------|---------|---------|
| Page title | `text-2xl font-semibold tracking-tight` | "All Products" |
| Page subtitle | `text-sm text-muted-foreground` | "Learn more about..." |
| Card heading | `text-lg font-semibold` | "General Information" |
| Card subheading | `text-sm text-muted-foreground` | "The primary address of this customer." |
| Table header | `text-sm font-medium text-muted-foreground` | "Product", "Availability" |
| Table cell | `text-sm` | "Gift Card 50" |
| Label | `text-sm font-medium` | "First Name" |
| Helper text | `text-sm text-muted-foreground` | "Enter the product display name." |
| Error text | `text-sm text-destructive` | "This field is required." |
| Button text | `text-sm font-medium` | "Save", "Create Product" |

### Font

Use the system font stack (default Tailwind `font-sans`). No custom fonts.

---

## 7. Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| `< md` (mobile) | Sidebar collapsed to off-canvas sheet. Single-column content. `p-4`. |
| `md – lg` (tablet) | Sidebar collapsed to icon-only. Single-column content. `p-6`. |
| `>= lg` (desktop) | Sidebar expanded. Two-column layout on detail pages. `p-6`. |

### Rules

- All pages must work at mobile width.
- Tables on mobile: horizontal scroll with `overflow-x-auto`.
- Two-column detail pages collapse to single column below `lg`.
- Sticky footer actions bar remains visible at all breakpoints.
- Use `hidden md:flex` / `flex md:hidden` for responsive element swaps.

---

## 8. Dark Mode

- Dark mode is toggled via `ThemeProvider` (stored in `localStorage` key `studioos-theme`).
- All colors adapt automatically via CSS variables — **no conditional dark: classes needed** for semantic colors.
- When using non-semantic Tailwind colors (e.g., `bg-emerald-100` for badges), provide dark variants: `dark:bg-emerald-900/30`.
- Cards in dark mode use `bg-card` (elevated from `bg-background`), maintaining the same visual hierarchy.
- Borders become subtler in dark mode (`oklch(1 0 0 / 10%)`).
- Test every page in both themes before considering it done.

### Grain Texture

The app uses a subtle dot grain texture on the main content area (not the sidebar). The reusable `.grain` CSS class is defined in `index.css`.

- **Apply grain:** Add the `grain` class to the container element (e.g., `SidebarInset`).
- **Grain is behind content:** Uses `isolation: isolate` on the parent and `z-index: -1` on the `::before` pseudo-element. The `Input` and `Textarea` components use `bg-background dark:bg-input/30` — opaque white in light mode (covers grain dots) and the original shadcn semi-transparent tint in dark mode (grain dots are subtle enough not to matter). No per-instance overrides needed.
- **Dark mode grain:** Uses `--grain-dot: rgba(255, 255, 255, 0.04)` for light-colored dots on dark backgrounds.
- **Do not add grain to the sidebar** — only the content area.

---

## 9. Internationalization (i18n)

- All user-facing text must use `useTranslation()` hook with keys from the `common` namespace.
- Never hardcode strings in components — **except brand identity elements** (see below).
- Translation files: `src/i18n/locales/{pt-pt,en-us}/common.json`.
- Key naming: dot-separated, camelCase — `"coachings.statusPending"`, `"events.createButton"`.
- Group keys by domain: `nav.*`, `coachings.*`, `enrollments.*`, `billing.*`, `events.*`, etc.
- Pluralization: use i18next plural syntax when needed (`_one`, `_other` suffixes).

### Brand Elements (English-only)

Some elements are part of the brand identity and must remain in English regardless of locale. These are **not** translated via i18n:
- The login page chip text: `"ADMIT ONE · STAGE DOOR"`
- The login page footer tagline: `"— a small school for the moving body —"`
- The brand name: `"StudioOS"`

---

## 10. API Integration & Data Fetching

Pages use the auto-generated API client (`src/api/studioos-api.ts`) via `apiClient.api.*` methods. Pages that don't have their API endpoints ready yet may use temporary mock data in `src/mocks/` with realistic Portuguese names — never "test123" or "Lorem ipsum".

### Data Fetching Rules

- Use `apiClient.api.*` methods directly in page components via `useEffect`.
- **Prevent duplicate requests from React StrictMode:** Use a `useRef` guard to ensure the effect only runs once:

```tsx
const dataLoaded = useRef(false)
useEffect(() => {
  if (dataLoaded.current) return
  dataLoaded.current = true
  const load = async () => {
    const [res1, res2] = await Promise.all([
      apiClient.api.modalitiesList().catch(() => null),
      apiClient.api.studiosList().catch(() => null),
    ])
    if (res1?.data) setModalities(res1.data)
    if (res2?.data) setStudios(res2.data)
  }
  void load()
}, [])
```

- **Consolidate related fetches** into a single `useEffect` with `Promise.all` — never split independent mount-time fetches into multiple effects.
- **Graceful permission errors:** Use `.catch(() => null)` for API calls that may fail due to role permissions (e.g., a student account can't list modalities). The page should render with partial data rather than breaking.
- **Types from the API client:** Import types from `@/api/studioos-api` (e.g., `Modality`, `Studio`, `TeacherSummary`, `UserResponse`). Do not duplicate API types locally.

### Mock Data (Temporary)

- Mock data lives in `src/mocks/` for pages whose API endpoints are not yet ready.
- Use realistic Portuguese names and data — never "test123" or "Lorem ipsum".
- Once a page is connected to the real API, delete its corresponding mock file.

---

## 11. File & Folder Structure

```
src/
├── app/                    # Route definitions, page components
│   ├── paths.ts            # Centralized route paths
│   ├── (domain)/           # Page components grouped by domain
│   │   ├── CoachingsListPage.tsx
│   │   ├── CoachingDetailPage.tsx
│   │   └── ...
├── components/
│   ├── ui/                 # shadcn primitives (do not edit manually)
│   ├── layout/             # App shell (TopBar, Sidebar, etc.)
│   └── shared/             # Reusable composed components
│       ├── PageHeader.tsx   # Back arrow + title + actions
│       ├── DataTable.tsx    # Reusable table wrapper
│       ├── StatusBadge.tsx  # Status → badge color mapping
│       ├── EmptyState.tsx   # Empty list placeholder
│       ├── CardSection.tsx  # Card with heading + children
│       └── ...
├── hooks/                  # Custom hooks (useMock*, useDebounce, etc.)
├── mocks/                  # Mock data files
├── api/                    # Auto-generated API client (do not edit)
├── lib/                    # Utilities (cn, formatters, constants)
├── i18n/                   # Translation config + locale files
├── theme/                  # ThemeProvider
└── assets/                 # Static files (logos, images)
```

### Naming Conventions

- Components: `PascalCase.tsx` — `CoachingsListPage.tsx`, `StatusBadge.tsx`.
- Hooks: `camelCase.ts` — `useMockStudents.ts`, `useDebounce.ts`.
- Utilities: `camelCase.ts` — `formatDate.ts`, `cn.ts`.
- Mock files: `camelCase.ts` — `students.ts`, `coachings.ts`.
- Translation keys: `domain.keyName` — `coachings.statusPending`.

---

## 12. shadcn Components to Install

Currently installed: `Button`, `DropdownMenu`, `Input`, `Select`, `Separator`, `Sheet`, `Sidebar`, `Skeleton`, `Tooltip`.

Install as needed (via `npx shadcn@latest add <component>`):

| Component | Usage |
|-----------|-------|
| `Table` | List pages, data grids |
| `Badge` | Status indicators |
| `Card` | Content sections (heading + body pattern) |
| `Dialog` | Modal forms, quick edits |
| `AlertDialog` | Destructive action confirmations |
| `Avatar` | User avatars with initials fallback |
| `Checkbox` | Table row selection, form checkboxes |
| `Label` | Form field labels |
| `Textarea` | Multi-line text inputs |
| `Switch` | Toggle settings |
| `Tabs` | Section switching (like Saleor's Subcategories/Products tabs) |
| `Collapsible` | Expandable sections |
| `Breadcrumb` | If needed for deep navigation |
| `Pagination` | Table pagination controls |
| `Calendar` | Date pickers (coaching scheduling) |
| `Popover` | Date picker containers, filter popovers |
| `Command` | Search/command palette |
| `ScrollArea` | Scrollable containers with styled scrollbars |
| `Form` | React Hook Form integration wrapper |
| `Sonner` / `Toast` | Success/error notifications |
| `Progress` | Upload progress, onboarding progress |
| `RadioGroup` | Single-choice form groups |

---

## 13. Design System Showcase

**Every UI component — both shadcn primitives and custom shared components — must have a corresponding showcase page in the Design System**, demonstrating all its variants and states. This is mandatory, not optional.

### Scope

This applies to:
- **shadcn/ui primitives** (`Button`, `Badge`, `Dialog`, etc.)
- **Custom shared components** (`PageHeader`, `CardSection`, `DatePicker`, `TimePicker`, `LogoLoader`, `PageLayout`, etc.)
- **Composed patterns** (e.g., a filter bar, a status badge with domain-specific colors)

If you build it or install it, it gets a showcase page.

### Requirements

- **Dedicated page:** Each component gets its own page file in `src/app/pages/design-system/` (e.g., `ButtonsPage.tsx`, `BadgePage.tsx`).
- **Route and path:** Add the route to `src/app/paths.ts` and register it in `src/app/routes.tsx` wrapped in `DesignSystemLayout`.
- **Navigation:** Add the component to the navigation list in `DesignSystemLayout.tsx` and the index grid in `DesignSystemIndexPage.tsx`.
- **i18n:** Add all necessary translation keys in both `en-us/common.json` and `pt-pt/common.json` under the `designSystem.*` namespace.
- **All variants:** Show every relevant variant, size, state (default, disabled, active, loading, error), and contextual usage example — not just one basic demo.
- **Follow existing patterns:** Match the structure of existing showcase files (header with title + subtitle, sections with uppercase tracking-wider headings, consistent spacing).

### Checklist for adding a new component showcase

1. Create `src/app/pages/design-system/[Component]Page.tsx`
2. Add path to `src/app/paths.ts`
3. Add route to `src/app/routes.tsx`
4. Add nav link in `DesignSystemLayout.tsx`
5. Add card entry in `DesignSystemIndexPage.tsx`
6. Add i18n keys in both locale files
7. Verify the page scrolls and renders correctly within `PageLayout`
8. Verify it looks correct in both light and dark themes

---

## 14. Login Page

The login page has its own visual identity, separate from the main app, with a warm/theatrical aesthetic.

### Theming

- Login-specific colors are defined as CSS custom properties in `index.css` with light and dark variants: `--login-brand-surface`, `--login-brand`, `--login-rule`, `--login-corner`, `--login-chip-bg`, `--login-panel-text`.
- **Light theme:** warm gold/cream tones. **Dark theme:** muted neutral tones.
- Reference these via `var(--login-*)` in inline styles, not hardcoded hex values.
- The right panel (login form) uses the `.grain` texture; the left panel does not.
- Corner ornaments (`L-corners`) use `var(--login-corner)` for color.
- Inputs on the login page need `bg-background dark:bg-background` to prevent grain bleed-through.

### Sidebar (AppSidebar)

- The sidebar shows **real user data** from the `useAuth()` hook — `user.full_name`, `user.email`, `user.profile.photo_url`.
- Avatar displays the user's photo when available, falling back to initials from their name.
- Do not use mock/hardcoded user data in the sidebar.

---

## 15. Scrolling & Overflow

### Page Scrolling

- **No internal scroll on page content.** The page itself scrolls naturally — never wrap page-level content in `ScrollArea` with a fixed height. Components like calendars, tables, and grids should render at their full height and let the browser handle vertical scrolling.

### Horizontal Scroll

- **`overflow-x-auto` always needs `overflow-y-hidden`.** The CSS spec coerces `overflow-y` to `auto` when `overflow-x` is set to `auto`, creating an unwanted vertical scrollbar. Always pair them:
  ```
  className="overflow-x-auto overflow-y-hidden"
  ```
- **Sticky columns need explicit backgrounds.** Any `sticky left-0` element must have `bg-background` or `bg-card` — otherwise content shows through when scrolling horizontally.
- **Prefer pure CSS over JS scroll sync.** For overlays in scrollable containers (e.g., a "now" indicator line), span the element across the full scrollable width (`absolute left-0 right-0`) so it's always visible. Never use `onScroll` + `translateX` — it causes 1-frame flicker.

---

## 16. Card Layout Patterns

### Toolbar + Content Split

- **Separate toolbar/filters and content into different cards.** Toolbar elements (day selector, search, category filters) go in one card; the main content (grid, table, list) goes in a second card below, with `gap-4` between them.
- This keeps the visual hierarchy clear and allows each card to have its own scroll/overflow behavior.

---

## 17. API-First Data Fetching

- **Always prefer real API requests** over mock data. Use `apiClient.api.*` methods for all data fetching.
- Mock data in `src/mocks/` is only acceptable as a temporary stopgap when the API endpoint genuinely does not exist yet. Delete the mock file as soon as the real endpoint is available.
- Never introduce new mock hooks (`useMock*`) when the API already supports the operation.

---

## 18. Accessibility

- All interactive elements must be keyboard navigable.
- Focus rings use `ring` color variable — visible in both themes.
- Icon-only buttons must have `aria-label` or a wrapping `Tooltip`.
- Form inputs must have associated `Label` components (using `htmlFor`).
- Status badges must not rely on color alone — include text labels.
- Tables must use proper `<thead>`, `<tbody>`, `<th scope="col">` structure (shadcn Table handles this).
- Modals must trap focus and be dismissible with `Escape`.
