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

The app shell is **sidebar + content** — there is no global top bar. Brand identity, theme/language toggles and user controls live in the sidebar footer (see §15). The only horizontal bars on a page are page-owned: an in-content `PageHeader` (back arrow + title + actions) at the top, and an **optional** sticky action footer at the bottom for forms and bulk-action pages.

```
┌────────┬────────────────────────────────────────┐
│        │                                        │
│ Side-  │  Content Area                          │
│ bar    │  (scrollable, padded)                  │
│        │                                        │
│ (col-  │  ┌─ PageHeader ───────────────────┐   │
│ lapsi- │  │  ← Back    Title      Actions  │   │
│ ble)   │  └────────────────────────────────┘   │
│        │                                        │
│ logo   │  ┌─ Card Section ─────────────────┐   │
│ nav    │  │  Section Heading               │   │
│ groups │  │  Form fields / Content         │   │
│        │  └────────────────────────────────┘   │
│ user   │                                        │
│ footer │  ┌─ Card Section ─────────────────┐   │
│ (theme,│  │  ...                           │   │
│  lang, │  └────────────────────────────────┘   │
│ logout)│                                        │
│        │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄    │
│        │  Optional sticky action bar (only      │
│        │  on form / multi-step pages)           │
└────────┴────────────────────────────────────────┘
```

### Sidebar

- Uses shadcn `Sidebar` with `collapsible="icon"`.
- Header: brand wordmark and logo.
- Body: navigation items via `SidebarMenuButton` with Lucide icons. Active state from current route path. Groups organize nav items by domain (Coachings, Marketplace, School Catalog, People, Billing, Payments).
- Footer: user profile card → dropdown with theme switcher, language switcher, logout (see §15 "Sidebar Footer").
- Renders **real user data** from `useAuth()` (`user.full_name`, `user.email`, `user.profile.photo_url`).

### Content Area

- Scrollable, with consistent padding: `p-6` on desktop, `p-4` on mobile.
- Max content width depends on page complexity:
  - **Two-column pages** (create/edit with sidebar, calendar, etc.): use **`max-w-6xl`** — the sidebar column needs room.
  - **Single-column pages** (simple forms, utility pages like Invite Users): use **`max-w-4xl`**.
  - **Narrower widths (`max-w-2xl`, `max-w-3xl`) are allowed only for small focused forms** (single-column, ≤ ~6 fields) such as account settings panels or short dialogs embedded in a page. Anything larger goes back to `max-w-4xl`/`max-w-6xl`.
- Background: `bg-background` (the slightly off-white page background).
- Grain texture is applied to `SidebarInset` (the content wrapper), not to the sidebar itself (see §8 "Grain Texture").

### PageHeader (in-content top bar)

- Renders inside the scrolling content area, **not** a sticky global bar.
- Layout: `ChevronLeft` back button (when `backTo` is set) + `text-2xl font-semibold tracking-tight` title + right-aligned actions (`ml-auto`).
- Built from the shared [`PageHeader`](src/components/shared/PageHeader.tsx) component — never reimplement inline.

### Optional Bottom Action Bar

Some pages need a sticky bottom bar for primary actions (Save / Cancel / Delete on forms, or Approve / Reject on review screens). When present:

- It is **page-owned**, not global — only forms and action-heavy pages render one. Browsing pages (list views, dashboards) have no bottom bar.
- Sticky-bottom inside the scrolling content area: `sticky bottom-0 z-10 border-t border-border bg-background`.
- Contains a constrained inner container matching the page width (`mx-auto max-w-6xl flex items-center justify-between`).
- When the submit button sits outside the `<form>` element, wire them with `id="page-form"` + `form="page-form"` — see §4.6 for the full pattern.
- Destructive actions (Delete, Cancel enrollment) sit on the **left**, separated from the primary Save/Back pair on the right.

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

### 4.6 Two-column Form + Sticky Footer (Create / Edit pages)

All large create/edit pages (Coaching, Listing, Product, Enrollment review, User edit) share one concrete layout:

1. **Page header** at the top — back arrow + title + secondary actions.
2. **Two-column body** scrolls naturally — `grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6` inside `mx-auto w-full max-w-6xl`. Main form on the left, metadata/status sidebar on the right.
3. **Sticky footer** sits *outside* the scrolling body. Submit/Cancel buttons live here.

When the submit button is outside the `<form>` element (because the footer is a sibling of the form, not a child), wire them together with the `form` attribute:

```tsx
<form id="page-form" onSubmit={form.handleSubmit(onSubmit)}>
  {/* fields */}
</form>

{/* …elsewhere in the same page tree… */}
<div className="sticky bottom-0 border-t bg-background">
  <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
  <Button type="submit" form="page-form">Save</Button>
</div>
```

The `form="page-form"` attribute lets a button outside the form trigger its `onSubmit`. Keep the form `id` to a single conventional value per page (`page-form`) so the pattern is recognisable.

This pattern is identical for public pages (§16) — only the surrounding shell differs.

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

**Icons in buttons and badges.** When a Lucide icon clearly reinforces the action or status, include it — buttons like "Create", "Delete", "Publish" become more scannable with a leading icon (`<Plus className="size-4" />`), and status badges become accessible-by-default when they pair color with a glyph. Reserve text-only buttons/badges for cases where no icon adds meaning.

### Icons

- **All icons MUST come from [Lucide React](https://lucide.dev/)** (`lucide-react`). Never create inline `<svg>` elements for icons.
- Import icons by name: `import { Plus, Trash2, ChevronLeft } from 'lucide-react'`.
- Size: icons inside buttons inherit size via the button variant. Standalone icons use `className="size-4"` (16px) or `size-5` (20px).
- When a design requires a custom decorative SVG that has no Lucide equivalent (e.g., brand illustrations, data visualization charts, complex silhouettes), extract it into a shared component in `src/components/shared/` — never inline it repeatedly. Example: `SubmitArrow.tsx`, `DancerSilhouette.tsx`.

### Date & Time Inputs

- **Never use native `<Input type="date">`, `<Input type="time">`, or `<Input type="datetime-local">`**. These render inconsistently across browsers and don't match the design system.
- For dates: use the custom `DatePicker` component (`@/components/shared/DatePicker`).
- For times: use the custom `TimePicker` component (`@/components/shared/TimePicker`).
- Both components are styled to match the design system, support dark mode, and meet accessibility requirements.

### Inputs & Forms

- Always use floating labels or top-aligned labels (label above input, like Saleor).
- Labels: `text-sm font-medium text-foreground`.
- Helper text: `text-sm text-muted-foreground` below the input.
- Error text: `text-sm text-destructive` below the input, replacing helper text.
- Required fields: mark with a red asterisk (`<span className="text-destructive">*</span>`) next to the label. Do not add "(optional)" labels — if a field has no asterisk, it's understood to be optional.
- Input groups: wrap related inputs in a card section with a section heading.
- Use `React Hook Form` + `Zod` for all form validation.
- **Controller wrapping:** shadcn components like `Select`, `Checkbox`, `DatePicker`, and `RadioGroup` don't use native form elements, so they must be wrapped with `Controller` from react-hook-form. Use `field.value` and `field.onChange` to wire them up. Native `Input` and `Textarea` can use `register()` directly.

### Tables

- Use the `DataTable` component backed by TanStack React Table.
- Header row: `text-xs font-medium text-muted-foreground`, sentence case (no uppercase).
- Body rows: `text-sm`, hover state `hover:bg-muted/50`.
- Clickable rows: `cursor-pointer` + navigate on click.
- Checkbox column: first column, `w-[40px]`, use `getSelectionColumn<T>()`.
- **Actions column:** last column, `size: 48`, sr-only header. Use a single `MoreHorizontal` (⋯) icon inside a `ghost` `icon` Button as `DropdownMenuTrigger`. Menu items use icon + label; destructive items get `className="text-destructive"`. Gate the entire dropdown behind a permission check (`usePermissions().can(…)`), and conditionally render individual items based on domain state.
- Pagination: prefer infinite scroll via `usePaginatedList` + `useInfiniteScroll`. `DataTable` accepts `hasNextPage`, `isFetchingNextPage`, and `onLoadMore` props.
- Fill-height layout: pass `fillHeight` to pin the header and scroll the body within the parent.

#### Column-header filters

Filters live on the column they affect — not in a separate filter bar above the table. Declare a filter on a column by setting `meta.filter`; `DataTable` renders a `ListFilter` icon next to the header label that opens a popover. The icon is muted by default and turns `text-primary` with a small dot when the filter is active.

```ts
columnHelper.accessor('status', {
  header: () => t('billing.col.status'),
  meta: {
    filter: {
      type: 'select',
      label: t('billing.col.status'),
      anyLabel: t('billing.filter.allStatuses'),
      options: [
        { value: StatusEnum.Pending, label: t('billing.status.pending') },
        { value: StatusEnum.Exported, label: t('billing.status.exported') },
      ],
    },
  },
  cell: ...
})
```

Supported `type` values:
- **`text`** — debounced text input (`contains`-style match).
- **`select`** — radio list with an "Any" reset row. Pair with `anyLabel` for a custom label like "All statuses".
- **`multi-select`** — checkbox list. Value is `string[]`.
- **`boolean`** — three-state Any / Yes / No. Value is `boolean | undefined`.

**State handling.** Use the `useColumnFilters` hook (from `@/components/ui/data-table-filters`) to manage `columnFilters` state. Wire it into `useReactTable` with `state.columnFilters` + `onColumnFiltersChange`, and set `manualFiltering: true` because filtering happens on the server (see §Data fetching).

```ts
const { columnFilters, setColumnFilters } = useColumnFilters({
  columns,
  syncToUrl: true,
  defaultFilters: [{ id: 'status', value: 'pending' }],
})

const statusFilter = columnFilters.find((f) => f.id === 'status')?.value as MyEnum | undefined

const table = useReactTable({
  data, columns,
  state: { columnFilters },
  onColumnFiltersChange: setColumnFilters,
  manualFiltering: true,
  getCoreRowModel: getCoreRowModel(),
})
```

**URL persistence (`syncToUrl: true`).** Filters round-trip through `useSearchParams`:
- Initial state is parsed from the URL and validated against each column's filter def — unknown values are dropped silently.
- Writes use `setSearchParams(..., { replace: true })`, so changing filters doesn't pollute browser history.
- URL param key defaults to the column id; override per-column via `meta.filter.urlKey` when the API expects a different name.
- `defaultFilters` are written to the URL on first mount only. Clearing a default filter resolves to "no filter", not back to the default.
- Sensitive text filters (PII, ID lookups) should stay out of the URL — leave `syncToUrl` off for those pages, or omit `meta.filter` and use a dedicated dialog instead.

### Cards (Content Sections)

- Every content group is a card: `bg-card rounded-lg border border-border p-6`.
- Card heading: `text-lg font-semibold` or `text-base font-semibold`.
- Card description (optional): `text-sm text-muted-foreground` below heading.
- Separate heading from content with `Separator` or `mb-4` spacing.
- Cards stack vertically with `gap-6` between them.

#### Card Elevation (Saleor-aligned, flat by default)

We follow Saleor's visual language: **borders separate cards, not shadows**. Pick the right tier for each surface; do not combine border + shadow on the same element unless the tier explicitly calls for it.

| Tier | When to use | Shadow class | Examples |
|---|---|---|---|
| **1. Section cards** | Page-level content groups: heading + fields/content. The default for almost everything. | *none* (border only) | `CardSection`, the two outer panels on the Messages page, sidebars on detail pages, any `bg-card rounded-lg border border-border p-6` container |
| **2. Grid tiles** | Standalone clickable atoms in a gallery layout — the whole card is the click target. | `shadow-sm` resting · `hover:shadow-md` | `ProductCard`, `ListingCard`, any tappable tile in a catalogue grid |
| **3. Floating overlays** | Anything that escapes the page flow and floats over content. | `shadow-md` (menus) · `shadow-lg` (modals) | Popover, Dropdown, Select content, Combobox content, Dialog, AlertDialog, Sheet, Tooltip |
| **4. Conversational atoms** | Discrete utterances on a conversation surface. Not cards — speech acts. | `shadow-sm` | Chat bubbles in `MessageThread`, sonner toasts |

**Rules:**

- **Section cards stay flat.** No `shadow-sm`, no `shadow-xs`. If a section feels "stuck to the background", that's a background-contrast problem (`bg-background` vs `bg-card`), not a shadow problem.
- **The raw shadcn `Card` primitive has no shadow** (we stripped its default `shadow-sm`). It now matches `CardSection`. Pages that want a lifted tile use `ProductCard`/`ListingCard` or apply `shadow-sm hover:shadow-md` explicitly.
- **Form controls keep `shadow-xs`.** Inputs, `Select` trigger, outline `Button`, etc. — that subtle lift is part of the control affordance, not card elevation. Don't touch it.
- **Never combine border + `shadow-sm` on a section card.** Saleor picks one or the other for section-level surfaces, and it picks the border. So do we.

### Badges / Status

- **Always use the shadcn `Badge` primitive** (`@/components/ui/badge`). Never build a custom pill — color and icon are passed via `className` and children. Domain-specific status mappings (e.g. `StatusBadge` in marketplace-helpers, `ProductStatusBadge`) wrap the same primitive — never reinvent it.
- **One colored badge per row, max.** Status is the column that earns color and shape. Other enums (type, kind, role, source, category) render as plain `text-sm text-muted-foreground` — never as colored badges. Multiple colored badges on the same row creates visual noise.
- **Prefer badges with an icon.** When a badge represents a status with an obvious metaphor (check = active, clock = pending, ban = cancelled), include a Lucide icon before the label: `<Badge><Check className="size-3" /> Active</Badge>`. The icon doubles as redundant signal for color-blind users (§20).
- Status colors — consistent mapping:
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

### Loading & Empty States

Three patterns, depending on context:

| Situation | Component | Example |
|-----------|-----------|---------|
| **Loading data into a component** (list, form, card) | `Skeleton` shaped to match expected content | Fetching users → skeleton table rows |
| **Full-page transition** (redirect, big reload, submission) | `LogoLoader` (the animated SVG, used by `FullPageLoader`) | Submitting enrollment, auth redirect |
| **Empty list / no results** | Centered Lucide icon + heading + helper line + optional CTA. The `LogoLoader` can also be repurposed as the visual anchor of an empty state when it fits the page (no dedicated `EmptyState` component exists yet — compose inline). | Empty marketplace, no coachings scheduled |

**Skeleton rules:**
- Match the skeleton shape to the expected content layout.
- Table loading: skeleton rows with column widths matching the real data.
- Card loading: skeleton lines for heading + 2-3 content lines.
- Never show a blank page or a raw `animate-spin` spinner — those are not acceptable substitutes for Skeleton.

**LogoLoader / FullPageLoader rules:**
- Use for transitions where the entire page is replaced (navigation after form submit, auth loading, onboarding completion).
- Not for partial data loading within a visible page.
- `LogoLoader` is the underlying animated mark; `FullPageLoader` is the full-screen wrapper. Either may be reused as the centerpiece of an empty state when the page warrants it.

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

Use the system font stack (default Tailwind `font-sans`) for all UI text. The exception is **brand identity elements** — the "StudioOS" wordmark and editorial headings (hero titles on public pages) use `Georgia, 'Times New Roman', serif` in italic. This is a deliberate brand choice, not a custom font import.

### Case: never uppercase app labels

In-app UI labels — **column headers, filter titles, section labels inside cards, form field labels, dropdown headings** — render in **sentence case**. Do not use `uppercase` (or `text-transform: uppercase`) and do not pair `tracking-wider` with small caps-style text. That styling reads as generic AI-template aesthetic and undermines the Saleor-clean visual we're targeting.

```tsx
// ❌ Wrong
<th className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">General information</p>

// ✅ Correct — sentence-case label, no tracking quirks
<th className="text-xs font-medium text-muted-foreground">Name</th>
<p className="text-xs font-medium text-muted-foreground">General information</p>
```

**Exceptions where uppercase is intentional** (and stays):
- Brand decorative elements on public/auth pages — `ADMIT ONE · STAGE DOOR`, `BRAGA · PORTUGAL`, `EST. MMXIV`, `SEASON XXIV — XXV`, the dashed step labels (`PASSO 1 DE 3`), the footer copyright line. These are listed in §24 and are part of the printed-ticket aesthetic.
- The brand wordmark `StudioOS` itself is mixed case — never force it to upper.

If you're tempted to write `uppercase tracking-wider` on app chrome, ask whether you actually want a brand decorative element. If not, drop both classes.

---

## 7. Responsive Behavior

**Mobile-first is mandatory.** Every page, component, and interaction must be fully usable on mobile devices. This is not optional — dance school staff and students will use the app primarily on their phones.

| Breakpoint | Layout |
|-----------|--------|
| `< md` (mobile) | Sidebar collapsed to off-canvas sheet. Single-column content. `p-4`. |
| `md – lg` (tablet) | Sidebar collapsed to icon-only. Single-column content. `p-6`. |
| `>= lg` (desktop) | Sidebar expanded. Two-column layout on detail pages. `p-6`. |

### Rules

- All pages must work at mobile width — **test mobile first, desktop second**.
- Tables on mobile: horizontal scroll with `overflow-x-auto`.
- Two-column detail pages collapse to single column below `lg`.
- Sticky footer actions bar remains visible at all breakpoints.
- Use `hidden md:flex` / `flex md:hidden` for responsive element swaps.
- Touch targets must be at least 44×44px on mobile (buttons, checkboxes, interactive elements).
- File upload components must support both drag & drop (desktop) and tap-to-select / camera capture (mobile).
- Forms should use appropriate mobile input types (`type="tel"`, `type="email"`, `inputmode="numeric"`, etc.).
- Modals and sheets on mobile should be full-width or use `Sheet` sliding from bottom.
- Avoid hover-only interactions — always provide a tap/click alternative.

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
- **Transparency over grain:** Never use transparent/alpha backgrounds (e.g., `bg-primary/5`) directly on cards or elevated elements over grain — the dots bleed through. Use solid backgrounds (`bg-card`, `bg-background`) instead. If you need a tinted surface over grain, layer it: set `bg-background` on the element (solid, blocks grain) and add a `::before` pseudo-element with the tint (`before:absolute before:inset-0 before:bg-primary/5`). Make sure inner content has `relative` to sit above the pseudo-element.

---

## 9. Internationalization (i18n)

- All user-facing text must use `useTranslation()` hook with keys from the `common` namespace.
- Never hardcode strings in components — **except brand identity elements** (see below).
- Translation files: `src/i18n/locales/{pt-pt,en-us}/common.json`.
- Key naming: dot-separated, camelCase — `"coachings.statusPending"`, `"events.createButton"`.
- Group keys by domain: `nav.*`, `coachings.*`, `enrollments.*`, `billing.*`, `events.*`, etc.
- Pluralization: use i18next plural syntax when needed (`_one`, `_other` suffixes).

### Brand Elements (not translated)

Some elements are part of the brand identity and are **not** translated via i18n. See §22 for the full list. Key examples: `"StudioOS"`, `"ADMIT ONE · STAGE DOOR"`, `"— a small school for the moving body —"`, `"◐ EST. MMXIV"`, `"BRAGA"`, `"PORTUGAL"`.

### Design System Pages (exempt from i18n)

Design system showcase pages (`src/app/pages/design-system/`) are **dev-facing only** and do not require full i18n coverage. Hardcoded demo strings (placeholder text, sample labels, toast messages) are acceptable here — focus translation effort on real app pages and shared components.

---

## 10. API Integration & Data Fetching

**All API communication MUST go through the auto-generated API client** (`src/api/studioos-api.ts`). This is non-negotiable.

### The Golden Rule

- **NEVER use raw `fetch()`, `axios`, `XMLHttpRequest`, or any other HTTP client directly.** Every request — GET, POST, PUT, PATCH, DELETE — must use `apiClient.*` methods.
- The API client handles base URL configuration, cookie-based authentication (httpOnly cookies), automatic session refresh, and typed request/response contracts. Bypassing it means losing all of that.
- If the generated client is missing an endpoint, **regenerate the client** (`npm run generate-client`) — do not work around it with raw `fetch`.
- If the endpoint exists but the generated method signature is wrong (e.g., missing body type, wrong return type), fix the `@extend_schema` decorator in the API repo and regenerate — do not patch it with raw requests.
- **File uploads** that require `multipart/form-data` also go through the API client. The generated client supports this via its `RequestParams` options. Use `apiClient.api.someUploadEndpoint(data, { headers: { 'Content-Type': 'multipart/form-data' } })` or pass a `FormData` body directly.

### API Client Namespace

All endpoints live under a single `apiClient.api` namespace. Method names are prefixed by domain:

| Domain | Method prefix | Examples |
|--------|--------------|----------|
| Core | `api*` | `apiCoachingsCreate()`, `apiAccountsUsersList()`, `apiRolesList()` |
| Inventory | `inventory*` | `inventoryCategoriesList()`, `inventoryColorsCreate()`, `inventoryProductsRetrieve()` |
| Marketplace | `marketplace*` | `marketplaceSchoolListingsCreate()`, `marketplaceListingsRetrieve()` |

```tsx
await apiClient.api.apiCoachingsCreate(payload)
await apiClient.api.inventoryCategoriesList()
await apiClient.api.marketplaceSchoolListingsCreate(payload)
```

Pages that don't have their API endpoints ready yet may use temporary mock data in `src/mocks/` with realistic Portuguese names — never "test123" or "Lorem ipsum".

### Data Fetching Rules

- **Server-side filtering and sorting is mandatory.** All list filtering (search, status, type, category, etc.) and sorting (by date, price, name, etc.) must be done via API query parameters — never by fetching all data and filtering/sorting client-side with `.filter()`, `.sort()`, or `useMemo`. Use `useDebouncedValue` (from `@/hooks/use-debounced-value`) for text search inputs to avoid excessive API calls, and pass filter/sort values as `resetDeps` to `usePaginatedList` so the list refetches when they change. If a sort option is needed, add an `ordering` query param to the API endpoint first.
- Use `apiClient.*` methods directly in page components via `useEffect`.
- **Prevent duplicate requests from React StrictMode:** Use a `useRef` guard to ensure the effect only runs once:

```tsx
const dataLoaded = useRef(false)
useEffect(() => {
  if (dataLoaded.current) return
  dataLoaded.current = true
  const load = async () => {
    const [res1, res2] = await Promise.all([
      apiClient.api.apiModalitiesList().catch(() => null),
      apiClient.api.apiStudiosList().catch(() => null),
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

### API Client Generation (Swagger)

The TypeScript API client is **auto-generated** from the Django API's OpenAPI schema. Never edit `src/api/studioos-api.ts` manually.

**Prerequisites:** The API server must be reachable at `http://127.0.0.1:8000`. It normally runs via Docker Compose from the `studioos-product.api` repo (`docker compose up`).

**Command (from `client/`):**

```bash
npm run generate-client
```

This runs: `swagger-typescript-api generate --path http://127.0.0.1:8000/api/schema/ --output ./src/api --name studioos-api.ts`

**Docker workflow — the part people forget.** Python edits inside the API repo are not picked up by a long-running Docker container until it reloads. After **any** API-side change that affects the schema (new/changed `@extend_schema`, new serializer fields, model `choices`, new endpoints, `SPECTACULAR_SETTINGS` tweaks), do this in order:

```bash
# from studioos-product.api/
docker compose restart api                                       # reload Python code
docker compose exec -T api uv run python manage.py migrate       # only if a migration was added
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  http://127.0.0.1:8000/api/schema/                              # sanity: must be 200

# then from studioos-product.web/client/
npm run generate-client
```

Skipping the restart means the regenerated client mirrors *the previous* schema — symptoms include "missing method", "stale enum names", or "field still typed as `string` after I added choices". Always restart, then regenerate.

If you only changed `SPECTACULAR_SETTINGS` (e.g. `ENUM_NAME_OVERRIDES`), the restart alone is enough — no migration needed.

**When to regenerate:**

- After adding or modifying `@extend_schema` decorators in the API views.
- After adding new endpoints or changing serializers.
- After fixing incorrect/missing OpenAPI documentation.
- After tweaking `SPECTACULAR_SETTINGS` (e.g. adding an `ENUM_NAME_OVERRIDES` entry).
- After model field changes that surface through serializers (e.g. adding `choices=` to a `CharField`).

**Common issues:**

- **Methods return `void`:** The API view is missing `@extend_schema(responses={...})`. Add the decorator with the correct serializer in the API repo, then regenerate.
- **Method names change:** All generated methods are prefixed with `api` (e.g., `apiCoachingsList`, `apiModalitiesList`). If the API path or operation ID changes, method names change too — update all frontend call sites.
- **Paginated responses typed as arrays:** If a view uses `paginated_response()` but `@extend_schema` declares `Serializer(many=True)`, the generated type says `T[]` but the runtime returns `{count, next, previous, results: T[]}`. The frontend must handle both shapes: `const items = Array.isArray(data) ? data : data?.results ?? []`.
- **Enums named `StatusXxxEnum` / `Status0B2Enum`:** drf-spectacular couldn't infer a stable name (typically because multiple models declare the same inner `class Status(TextChoices)`). Fix by adding an `ENUM_NAME_OVERRIDES` entry in `server/config/settings.py` mapping the desired name to either a dotted path (`billing.models.FineStatus.choices`) for top-level `TextChoices`, or a literal `[("value", "Label"), …]` for inner-class `TextChoices` that `import_string` can't load.

**Workflow for adding/fixing API documentation:**

1. Edit the view in `studioos-product.api/server/<app>/views.py` — add/fix `@extend_schema` decorators.
2. `docker compose restart api` (and `docker compose exec -T api uv run python manage.py migrate` if applicable).
3. Verify the schema: `curl http://127.0.0.1:8000/api/schema/` and check the relevant path.
4. Regenerate: `npm run generate-client` (from the `client/` directory).
5. Update frontend call sites if method signatures changed.

### Never Duplicate Generated Enums or Response Shapes

The generated client (`@/api/studioos-api`) is the single source of truth for **every** API-defined value set and response shape. Pages must not redefine them.

This means **never** hand-roll:

```tsx
// ❌ Wrong — duplicates ConditionEnum / AcquisitionTypeEnum / Status7B2Enum.
const CONDITIONS = [
  { value: 'new', labelKey: 'marketplace.conditionNew' },
  { value: 'excellent', labelKey: 'marketplace.conditionExcellent' },
  // …
]

// ❌ Wrong — duplicates the generated ListingDetail / ProductDetail.
interface ListingDetailRuntime {
  id: number
  listing_type: string
  product: { id: number; name: string; /* … */ }
  // …
}
```

Use the generated types directly, and convert enums to `{ value, labelKey }` arrays with the shared helper `enumOptions()` (`src/lib/enum-options.ts`):

```tsx
// ✅ Correct
import { ConditionEnum, type ListingDetail } from '@/api/studioos-api'
import { enumOptions } from '@/lib/enum-options'

const CONDITIONS = enumOptions(ConditionEnum, 'marketplace.condition')
// → [{ value: 'new', labelKey: 'marketplace.conditionNew' }, …]

function buildEditDefaults(listing: ListingDetail) { /* … */ }
```

**Translation keys follow the convention `${prefix}${PascalCase(value)}`** — e.g. `marketplace.condition` + `new` → `marketplace.conditionNew`. Add the matching keys to both locale files; the helper produces them deterministically so a missing key is a clear failure.

#### When the generated client looks wrong

If the generated client's enum or type doesn't match what the API actually returns at runtime, **do not paper over it** with a hand-rolled type. The schema is wrong. Fix the source:

1. Add or correct the `@extend_schema(responses=…)` decorator on the API view (see [docs/architecture-overview.md](../../studioos-product.api/docs/architecture-overview.md)).
2. Verify with `curl http://127.0.0.1:8000/api/schema/` that the path now describes the correct response.
3. Regenerate the client: `npm run generate-client`.
4. Remove any old work-around types and casts.

#### Exception: API field has no choices

Some fields are `string` in the schema because the backend has not (yet) declared choices for them — e.g. `target_gender`. In that single case, keep a local `{ value, labelKey }` array, but add a code comment naming the field and noting that it's pending an API enum.

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
│   ├── ui/                 # shadcn primitives + custom data-table/input-group (do not edit primitives manually)
│   ├── layout/             # App shell (TopBar, Sidebar, etc.)
│   └── shared/             # Reusable composed components
│       ├── PageHeader.tsx
│       ├── PageLayout.tsx
│       ├── CardSection.tsx
│       ├── DatePicker.tsx
│       ├── TimePicker.tsx
│       ├── ImageCropDialog.tsx
│       ├── MediaUpload.tsx
│       ├── TreeSelect.tsx
│       ├── LogoLoader.tsx
│       ├── ProfileSetupPrompt.tsx
│       ├── ScheduleCalendar.tsx
│       ├── ListingCard.tsx
│       ├── ListingsGridView.tsx
│       ├── ListingsToolbar.tsx
│       ├── ProductCard.tsx
│       ├── ProductStatusBadge.tsx
│       ├── ColorSwatchPicker.tsx
│       └── SubmitArrow.tsx
├── auth/                   # Authentication & authorization
│   ├── auth-context.ts     # AuthContextValue type + React context
│   ├── AuthContext.tsx      # AuthProvider (token refresh, login/logout)
│   ├── useAuth.ts           # useAuth() hook
│   ├── permissions.ts       # usePermissions(), <Authorized>, <ProtectedRoute>
│   └── nav-config.ts        # Sidebar navigation map with permission declarations
├── hooks/                  # Custom hooks — camelCase filenames
│   ├── useDebouncedValue.ts
│   ├── usePaginatedList.ts
│   ├── useInfiniteScroll.ts
│   └── useMobile.ts
├── mocks/                  # Mock data files
├── api/                    # Auto-generated API client (do not edit)
├── lib/                    # Utilities (cn, formatters, constants) — kebab-case filenames
├── i18n/                   # Translation config + locale files
├── theme/                  # ThemeProvider
└── assets/                 # Static files (logos, images)
```

`DataTable` is a custom composed wrapper around TanStack Table and lives under `components/ui/data-table.tsx` alongside the shadcn primitives — treat it as project-owned, not auto-generated. `TreeSelect` is a custom composed primitive and lives under `components/shared/TreeSelect.tsx`.

### Naming Conventions

- Components: `PascalCase.tsx` — `CoachingsListPage.tsx`, `ProductStatusBadge.tsx`.
- Hooks: `camelCase.ts` starting with `use` — `useDebouncedValue.ts`, `usePaginatedList.ts`.
- Utilities, configs, non-component: `kebab-case.ts` — `api-errors.ts`, `user-utils.ts`, `image-resize.ts`.
- Mock files: `camelCase.ts` — `students.ts`, `coachings.ts`.
- Translation keys: `domain.keyName` — `coachings.statusPending`.

---

## 12. shadcn Components — Installed Inventory

The project uses both **shadcn/ui** (Radix-based) primitives and **`@base-ui/react`** primitives — the latter is what powers `combobox` (chip-input, autocomplete). Both are first-class; pick whichever the matching shadcn registry entry uses.

Install new primitives via `npx shadcn@latest add <component>`. Do not hand-edit `src/components/ui/*.tsx` files for installed primitives — re-run the CLI instead.

### Currently installed in `src/components/ui/`

`alert-dialog`, `avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`, `combobox` (base-ui), `data-table` (custom), `dialog`, `dropdown-menu`, `input`, `input-group` (base-ui), `label`, `popover`, `radio-group`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`.

Update this list whenever you add or remove a primitive.

### Notes

- `data-table` is a custom TanStack-React-Table wrapper — keep it under `ui/` but treat it as project-owned.
- `combobox` and `input-group` use `@base-ui/react`; they expose chip-input, autocomplete, and addon slots that Radix-based primitives do not.
- Multi-select dropdowns must use `Combobox` (`multiple` + `ComboboxChips`) — see §13.
- `TreeSelect` is project-owned, lives in `components/shared/`, and is not a shadcn primitive.

---

## 13. Component Reuse Rules

**Always use existing components before building new ones.** This is the single most important rule for maintaining UI consistency.

### Lookup Order

When you need a UI element (multi-select, combobox, color picker, radio cards, date range, etc.):

1. **Check installed shadcn primitives first** — look in `src/components/ui/`. If the component exists there, use it.
2. **Check shared components** — look in `src/components/shared/`. Reusable composed components live here (`DatePicker`, `TimePicker`, `ImageCropDialog`, `ProductCard`, `ListingCard`, etc.).
3. **Check the shadcn registry** — browse [ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components). If a suitable component exists, install it (`npx shadcn@latest add <component>`) rather than hand-building one.
4. **Only then build custom** — if no shadcn primitive or shared component covers the need, build a new component in `src/components/shared/` following the project patterns.

### Rules

- **Never hand-build a component that shadcn already provides.** Examples: multi-select must use `Combobox` (`multiple` + `ComboboxChips` + `ComboboxChipsInput`) — never a hand-built popover-with-checkboxes; radio cards use `RadioGroup`; popovers use `Popover`.
- **Never duplicate a shared component.** If `src/components/shared/DatePicker.tsx` exists, don't create an inline date picker in a page file. Import and use the shared one.
- **Extract when reused.** If you build a custom component for one page and a second page needs it, extract it to `src/components/shared/` immediately — don't copy-paste. Pages may keep a co-located `*-helpers.tsx` file for single-page utilities (e.g. `marketplace-helpers.tsx`); promote to `shared/` the moment a second page imports from it.
- **Composition over recreation.** Compose complex widgets from shadcn primitives (`Popover` + `Command` = searchable dropdown, `Combobox` + `ComboboxChips` = multi-select) rather than building from scratch with raw `<div>`, `<input>`, and manual event handlers.

### Installed shadcn Components (keep this list updated)

When installing a new shadcn component, add it to the list in §12 and verify it doesn't duplicate an existing shared component.

---

## 14. Design System Showcase

The Design System (`/design-system`) is a living catalogue. **Every shadcn primitive installed under `src/components/ui/` should have a showcase page** demonstrating its variants and states — this is the hard requirement.

For **custom shared components** under `src/components/shared/`, a showcase page is *encouraged* but not gating: small wrappers (`PageHeader`, `CardSection`, `PageLayout`) can be understood from one usage site, while non-trivial composed widgets (`DatePicker`, `TimePicker`, `LogoLoader`, `ScheduleCalendar`, `TreeSelect`, `MediaUpload`, `ImageCropDialog`) should get a page when time allows. Missing showcases here are tech debt, not blockers.

### Scope

- **shadcn/ui primitives** — required.
- **Custom shared components** — encouraged; add when a second consumer arrives or when behaviour is non-obvious.
- **Composed patterns** (filter bar, status badge with domain colors) — only worth a page when they generalise across domains.

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

## 15. Login Page

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

#### Sidebar Footer (User Profile)

The sidebar footer uses a card-like trigger that opens a dropdown menu:

- **Trigger:** A `button` styled as a subtle card (`rounded-lg border border-border/50 bg-card`) containing avatar + name + email + `ChevronsUpDown` icon. Highlights on hover with `hover:bg-accent`.
- **Collapsed state:** When the sidebar is collapsed to icons, only the avatar is shown — text and chevron are hidden via `group-data-[collapsible=icon]:hidden`.
- **Dropdown contents:** Theme switcher (sub-menu), language switcher (sub-menu), separator, logout (destructive). No duplicated user info in the dropdown — it's already visible in the trigger.
- **Dropdown width:** `w-48`, aligned to start, opens upward (`side="top"`).

---

## 16. Public Pages

Public pages (login, enrollment) are standalone — no sidebar, no auth guard. They have their own layout and manage theme/language toggles independently.

### Routing

- Public pages are registered as `isPublicPage` or `isAuthPage` in `App.tsx` and render `<AppRoutes />` directly, bypassing the sidebar shell and auth check.
- They do not use `useAuth()`. API calls that may fail without auth use `.catch(() => null)` for graceful degradation.

### Layout Structure

Public pages use a full-width `<main>` with grain, structured as sibling children — not nested inside a constrained container:

```
<main className="grain min-h-svh bg-background text-foreground">
  {/* Top bar — full-width, sticky */}
  <div className="sticky top-0 z-10 border-b border-border bg-background">
    <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
      {/* Logo + contact info + theme/lang toggles */}
    </div>
  </div>

  {/* Content — constrained */}
  <div className="mx-auto max-w-4xl px-6 py-10">
    {/* Hero, form cards, etc. */}
    <form id="page-form" ...>...</form>
  </div>

  {/* Sticky footer — full-width */}
  <div className="sticky bottom-0 z-10 border-t border-border bg-background">
    <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-2.5">
      {/* Cancel + Submit (form="page-form") */}
    </div>
  </div>

  {/* Copyright — full-width */}
  <div className="border-t border-border px-6 py-3 text-center text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
    © 2026 StudioOS · Braga
  </div>
</main>
```

### Key Patterns

- **Top bar branding:** Logo icon (`/logo-dancer.svg`) + italic Georgia "StudioOS" wordmark in `text-primary`, matching the login page style.
- **Theme/language toggles:** Small ghost icon buttons in the top bar, managed locally (not via sidebar).
- **Sticky footer outside form:** When the submit button lives in a full-width sticky bar outside the `<form>`, use `id` on the form and `form="page-form"` on the submit button to link them.
- **Hero headings:** Use Georgia serif with `clamp()` font sizes for responsive scaling (e.g., `clamp(42px, 5.5vw, 64px)`).
- **Full-screen loading:** Use `<FullPageLoader />` as a sibling of the content during submission.

---

## 17. Scrolling & Overflow

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

## 18. Card Layout Patterns

### Toolbar + Content Split

- **Separate toolbar/filters and content into different cards.** Toolbar elements (day selector, search, category filters) go in one card; the main content (grid, table, list) goes in a second card below, with `gap-4` between them.
- This keeps the visual hierarchy clear and allows each card to have its own scroll/overflow behavior.

---

## 19. API-First Data Fetching

- **Always prefer real API requests** over mock data. Use `apiClient.api.*` methods for all data fetching.
- Mock data in `src/mocks/` is only acceptable as a temporary stopgap when the API endpoint genuinely does not exist yet. Delete the mock file as soon as the real endpoint is available.
- Never introduce new mock hooks (`useMock*`) when the API already supports the operation.

---

## 20. Accessibility

- All interactive elements must be keyboard navigable.
- Focus rings use `ring` color variable — visible in both themes.
- Icon-only buttons must have `aria-label` (not `title`) or a wrapping `Tooltip`. The `aria-label` is the required accessible name — `title` is unreliable for screen readers.
- **`aria-label` values must use `t()`** — they are screen-reader-facing text and follow the same i18n rules as visible text. Never hardcode English strings in aria attributes.
- Form inputs must have associated `Label` components (using `htmlFor`/`id`). This applies equally to `Input`, `Select`, `Switch`, `Checkbox`, and `RadioGroup`.
- Custom picker components (TimePicker, DatePicker, color pickers) must provide `aria-label` on all selectable items (e.g., `t('timePicker.selectHour', { hour })`).
- Status badges must not rely on color alone — include text labels.
- Tables must use proper `<thead>`, `<tbody>`, `<th scope="col">` structure (shadcn Table handles this).
- Modals must trap focus and be dismissible with `Escape`.

---

## 21. Destructive Action Dialogs

Destructive `AlertDialogAction` buttons must use the `asChild` + `Button variant="destructive"` pattern. Never hardcode `bg-destructive text-white`:

```tsx
// ✅ Correct
<AlertDialogAction asChild>
  <Button variant="destructive">{t('common.delete')}</Button>
</AlertDialogAction>

// ❌ Wrong — hardcoded colors bypass theme
<AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90">
  {t('common.delete')}
</AlertDialogAction>
```

---

## 22. Toast Notifications

We use **Sonner** (`toast` from `sonner`) for all toast notifications. The `<Toaster>` is mounted once in `App.tsx` with `position="top-right"`.

### Import

```tsx
import { toast } from 'sonner'
```

### Variants and when to use them

| Variant | When | Example |
|---|---|---|
| `toast.success(msg)` | API mutation succeeded | `toast.success(t('account.saved'))` |
| `toast.error(msg)` | API call failed | `toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))` |
| `toast.warning(msg)` | Client-side validation (not form errors) | `toast.warning(t('account.photoTooLarge'))` |

### Rules

- **Always use i18n keys** — never hardcode English strings in toasts.
- **API errors go through `parseApiError`** — it translates PascalCase codes and passes DRF strings through. Always provide a fallback: `parseApiError(err, t) ?? t('common.unexpectedError')`.
- **Client-side validation** (file size, file type, etc.) uses `toast.warning`, not `toast.error`. Reserve `error` for actual failures.
- **Form field errors use `form.setError()`**, not toasts. Use `parseApiFieldErrors` for API field errors. Only use `toast.error` for non-field errors (general messages).
- **Success toasts are brief** — one short sentence: `t('coachings.createSuccess')`. No description needed for simple confirmations.

```tsx
// ✅ Correct — API error with parseApiError + fallback
catch (err) {
  toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
}

// ✅ Correct — client-side validation with warning
if (file.size > maxSize) {
  toast.warning(t('account.photoTooLarge'))
  return
}

// ✅ Correct — success after mutation
toast.success(t('account.saved'))

// ❌ Wrong — hardcoded English
toast.error('Something went wrong')

// ❌ Wrong — using toast for form field errors
toast.error('Email is required')  // → use form.setError('email', ...)
```

---

## 23. Currency & Locale

### Currency Display

Always use `t('common.currencySymbol')` for currency symbols. Never hardcode `€`, `$`, or any currency character in JSX.

### Date Formatting

All date formatting uses **Portuguese locale** (`pt` from `date-fns/locale/pt`). This is a business decision — the platform operates in Portugal and dates must always display in Portuguese format (e.g., "14 de maio de 2026"), regardless of the user's UI language setting.

```tsx
import { format } from 'date-fns'
import { pt } from 'date-fns/locale/pt'

format(date, 'dd/MM/yyyy', { locale: pt })
format(date, "d 'de' MMMM", { locale: pt })
```

---

## 24. Auth Page Patterns

### Shared CSS Classes

Auth pages (Login, Onboarding, Password Reset, Enrollment) share brand typography defined in `index.css`:

| Class | Usage |
|-------|-------|
| `.auth-heading` | Base: Georgia serif, weight 500, line-height 1.0, letter-spacing -0.012em |
| `.auth-heading-xl` | Hero: `clamp(56px, 8vw, 96px)` |
| `.auth-heading-lg` | Large: `clamp(42px, 5.5vw, 64px)` |
| `.auth-heading-md` | Medium: `clamp(36px, 4vw, 48px)` |
| `.auth-heading-sm` | Small: `clamp(32px, 4vw, 48px)` |
| `.auth-heading-xs` | Extra small: `clamp(28px, 3.5vw, 40px)` |
| `.auth-wordmark` | Italic Georgia for "StudioOS" wordmark |

**Never use inline `style={{}}` for brand heading typography.** Use the CSS classes:

```tsx
// ✅ Correct
<h1 className="auth-heading auth-heading-xl text-foreground">Welcome</h1>
<span className="auth-wordmark text-primary">StudioOS</span>

// ❌ Wrong — duplicated inline styles
<h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 500, fontSize: 'clamp(56px, 8vw, 96px)', lineHeight: 1.1 }}>
```

### Brand Decorative Elements

These elements are part of brand identity and are NOT translated via i18n:
- `"ADMIT ONE · STAGE DOOR"` — login page chip
- `"— a small school for the moving body —"` — login page tagline
- `"StudioOS"` — brand name
- `"◐ EST. MMXIV"` — establishment mark
- `"BRAGA"`, `"PORTUGAL"` — location identifiers
- `"SEASON  XXIV — XXV"` — season mark

---

## 25. Code Quality Rules

### Shared Utility Extraction

When the same logic appears in 2+ files, extract it to `src/lib/`. Common examples:

| Utility | File | Usage |
|---------|------|-------|
| `getInitials(name)` | `src/lib/user-utils.ts` | Avatar fallback initials |
| `formatCurrency(amount)` | `src/lib/format-utils.ts` | Price display |
| `resizeImageFile(file)` | `src/lib/image-resize.ts` | Client-side image resizing |
| `getCroppedImageFile(src, crop)` | `src/lib/image-resize.ts` | Extract cropped region as JPEG |

Never copy-paste utility functions between components.

### Module-Level Mutable State

Never use module-level `let` variables as counters or ID generators (e.g., `let nextId = 0`). They persist across hot reloads and can cause ID collisions. Use `crypto.randomUUID()`, `useId()`, or `useRef` instead.

### Non-Null Assertions

Avoid TypeScript `!` non-null assertions on `.find()` results. Use optional chaining with fallbacks:

```tsx
// ✅ Correct
const teacher = teachers.find((t) => t.id === id)
if (!teacher) return

// ❌ Wrong — crashes if not found
const teacher = teachers.find((t) => t.id === id)!
```

### File Naming Convention

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase `.tsx` | `PageHeader.tsx`, `AuthContext.tsx` |
| Hooks | camelCase starting with `use` `.ts` | `useAuth.ts`, `useDateLocale.ts` |
| Utilities, configs, non-component | kebab-case `.ts` | `api-client.ts`, `user-utils.ts` |

---

## 26. Routing

### Catch-All Route

The router should include a `<Route path="*">` catch-all so unmatched URLs render a dedicated 404 page rather than a blank screen. Until that 404 page lands, this is tracked as planned work — new routes do not block on it.

### Layout Groups

Use React Router nested routes with `<Outlet>` for pages sharing a layout. Never wrap each route individually in the same layout component:

```tsx
// ✅ Correct — nested route with outlet
<Route element={<DesignSystemLayout />}>
  <Route path={paths.dsButtons} element={<ButtonsPage />} />
  <Route path={paths.dsBadges} element={<BadgePage />} />
</Route>

// ❌ Wrong — repeated wrapper
<Route path={paths.dsButtons} element={<DesignSystemLayout><ButtonsPage /></DesignSystemLayout>} />
<Route path={paths.dsBadges} element={<DesignSystemLayout><BadgePage /></DesignSystemLayout>} />
```

---

## 27. Form & Request Handling

### When to Use react-hook-form + zod

Any form that **submits data to the API** must use `react-hook-form` with a `zod` schema for validation. This includes create, update, login, password reset, onboarding, and enrollment flows.

Use plain `useState` only for **UI-only state**: filters, search queries, toggles, modal open/close, tab selection, pagination — anything that never leaves the browser.

```tsx
// ✅ Correct — form submitting to API uses react-hook-form + zod
const schema = z.object({
  name: z.string().min(1, t('validation.required')),
  email: z.string().email(t('validation.invalidEmail')),
  password: z.string().min(8, t('validation.passwordMin')),
})
type FormData = z.infer<typeof schema>

const form = useForm<FormData>({ resolver: zodResolver(schema) })

const onSubmit = form.handleSubmit(async (data) => {
  // data is fully typed and validated
  await apiClient.api.apiSomeEndpoint(data)
})

// ❌ Wrong — manual useState for form fields
const [name, setName] = useState('')
const [email, setEmail] = useState('')
// ... 20 more useState calls
```

### Schema File Convention

Each form page has a co-located schema file: `page-name-schema.ts`. The schema exports the zod object, the inferred type, and (for complex forms) default values:

```
pages/
  LoginPage/
    LoginPage.tsx
    login-schema.ts          ← z.object + type
  coachings/
    CreateCoachingPage.tsx
    create-coaching-schema.ts ← z.object + type + defaults
```

### Controller vs register

- **`register()`** — for native HTML inputs: `<Input>`, `<Textarea>`. Directly spread: `{...register('field')}`.
- **`Controller`** — for non-native components: `<Select>`, `<Switch>`, `<DatePicker>`, `<TimePicker>`, `<RadioGroup>`, `<TreeSelect>`, `<Checkbox>`. Wire via `field.value`/`field.onChange`.

```tsx
// register for Input
<Input id="name" {...register('name')} />

// Controller for Select
<Controller
  name="role"
  control={control}
  render={({ field }) => (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger id="role"><SelectValue /></SelectTrigger>
      <SelectContent>...</SelectContent>
    </Select>
  )}
/>
```

### File Uploads with FormData

When a form includes a file upload, use RHF+zod for all **text fields** and keep the `File` object in a separate `useState`. On submit, build `FormData` from the RHF data + file state.

The generated API client already uses `ContentType.FormData` for all file-upload endpoints — no manual `Content-Type` header needed. This is guaranteed by the API's `parser_classes = [MultiPartParser]` on views with file fields, which makes drf-spectacular advertise only `multipart/form-data` in the OpenAPI schema.

```tsx
const [photoFile, setPhotoFile] = useState<File | null>(null)
const { register, handleSubmit } = useForm<FormValues>({...})

const onSubmit = async (data: FormValues) => {
  if (photoFile) {
    const fd = new FormData()
    fd.append('display_name', data.display_name)
    fd.append('photo', photoFile)
    // Cast FormData to the generated type — the client handles it correctly
    await apiClient.api.someEndpoint(fd as unknown as Payload)
  } else {
    await apiClient.api.someEndpoint(data as unknown as Payload)
  }
}
```

**API-side rule:** Any DRF view that accepts file uploads must set `parser_classes = [MultiPartParser]` (not the default `[JSONParser, FormParser, MultiPartParser]`). This ensures drf-spectacular only emits `multipart/form-data` in the OpenAPI schema, so `swagger-typescript-api` generates `ContentType.FormData` instead of `ContentType.Json`. Without this, the generated client calls `JSON.stringify()` on the body, which destroys `FormData` objects.

### Image Cropping

For image uploads where the user should choose the best framing (profile photos, cover images), use the `ImageCropDialog` component (`@/components/shared/ImageCropDialog`). It provides a pan-and-zoom crop modal powered by `react-easy-crop`.

**Flow:** file input → validation → open crop dialog → user adjusts → confirm → receive cropped `File`.

```tsx
import { ImageCropDialog } from '@/components/shared/ImageCropDialog'

const [cropSrc, setCropSrc] = useState<string | null>(null)
const [photoFile, setPhotoFile] = useState<File | null>(null)
const [photoUrl, setPhotoUrl] = useState<string | null>(null)

// 1. On file select — validate, then open the crop dialog
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  // ... validate size/type ...
  setCropSrc(URL.createObjectURL(file))
}

// 2. On crop confirm — receive the cropped File
const handleCropComplete = useCallback((croppedFile: File) => {
  setCropSrc(null)
  setPhotoFile(croppedFile)
  setPhotoUrl(URL.createObjectURL(croppedFile))
}, [])

// 3. On cancel — close dialog
const handleCropCancel = useCallback(() => {
  setCropSrc(null)
}, [])

// 4. Render the dialog (opens when cropSrc is non-null)
<ImageCropDialog
  imageSrc={cropSrc}
  onCropComplete={handleCropComplete}
  onCancel={handleCropCancel}
  outputSize={512}       // output square size in px
  cropShape="round"      // "round" for avatars, "rect" for covers
  aspect={1}             // width/height ratio (1 = square)
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageSrc` | `string \| null` | — | Object URL to crop. Dialog opens when non-null. |
| `onCropComplete` | `(file: File) => void` | — | Called with the cropped JPEG `File`. |
| `onCancel` | `() => void` | — | Called when dismissed. |
| `outputSize` | `number` | `512` | Output square dimension in pixels. |
| `cropShape` | `"round" \| "rect"` | `"round"` | Circular mask for avatars, rectangular for general. |
| `aspect` | `number` | `1` | Aspect ratio (e.g., `16/9` for wide crops). |
| `title` | `string` | `t('imageCrop.title')` | Dialog title override. |

**Utilities** in `src/lib/image-resize.ts`:
- `resizeImageFile(file, options)` — shrink an image to fit within `maxSize` px (no crop, preserves ratio). For non-interactive resizing.
- `getCroppedImageFile(src, crop, outputSize)` — extract a pixel region from an image and return a JPEG `File`. Used internally by `ImageCropDialog`.
```

### Disabled / Read-Only Fields

Fields that display data but aren't editable (e.g., email, name from the user object) should **read directly from the source** — never copy them into useState or RHF. Use `value={user?.email}` with `disabled readOnly`:

```tsx
// ✅ Read from source
<Input value={user?.email ?? ''} disabled readOnly />

// ❌ Wrong — copied into state
const [email, setEmail] = useState(user?.email ?? '')
<Input value={email} disabled />
```

### No Native HTML Validation

Never use native HTML validation attributes: `required`, `minLength`, `maxLength`, `pattern`, `min`, `max` on `<Input>`. All validation must live in the zod schema. Native validation produces browser-default tooltips that are inconsistent, not translatable, and bypass our error UX.

```tsx
// ✅ Correct — validation in zod schema
const schema = z.object({
  password: z.string().min(8, t('validation.passwordMin')),
})
<Input {...form.register('password')} />

// ❌ Wrong — native HTML validation
<Input name="password" required minLength={8} />
```

### API Error Handling

Use the shared utilities from `src/lib/api-errors.ts` to handle API errors. **Never show raw API error strings to the user** — they may be untranslated English from DRF field validation.

#### API error structure

The API returns all errors through a centralized exception handler. The generated client throws on non-OK responses, producing this shape:

```
thrown error → { error: { errors: { messages?: string[], [field]: string[] } } }
```

All **custom API error codes are PascalCase** (e.g., `"ParticipantAlreadyEnrolled"`, `"TokenExpired"`). These are i18n keys, not human strings. DRF may also produce **raw English strings** for built-in field validation (e.g., `"This field is required."`, `"Ensure this field has no more than 255 characters."`).

#### Translation strategy

Every PascalCase error code must have a corresponding translation key under `apiErrors.*`:

```json
{
  "apiErrors": {
    "InvalidCredentials": "Email or password incorrect.",
    "ParticipantAlreadyEnrolled": "This student is already enrolled.",
    "TokenExpired": "Your session has expired. Please sign in again."
  }
}
```

The `parseApiError` utility automatically detects PascalCase codes and translates them via `t('apiErrors.${code}')`. For raw DRF validation strings (e.g., `"This password is entirely numeric."`), it passes them through as-is — they are specific, actionable, and more useful than a generic fallback.

#### Error handling pattern

```tsx
// ✅ Correct — use parseApiError with translation function
catch (err) {
  // 1. Try to map field errors to form fields
  const fieldErrors = parseApiFieldErrors(err, t)
  if (fieldErrors) {
    for (const [field, message] of Object.entries(fieldErrors)) {
      form.setError(field as keyof FormData, { message })
    }
    return
  }

  // 2. Show translated toast for non-field errors
  toast.error(parseApiError(err, t) ?? t('common.unexpectedError'))
}

// ❌ Wrong — generic catch-all
catch {
  toast.error(t('marketplace.createError'))
}

// ❌ Wrong — manually digging into the error structure
catch (err) {
  toast.error(err.error?.errors?.messages?.[0] ?? 'Something went wrong')
}
```

#### What happens with unknown errors

| Error type | Example | Frontend behavior |
|---|---|---|
| PascalCase code in `messages` | `"CannotInviteRole"` | `t('apiErrors.CannotInviteRole')` — specific translated message |
| PascalCase code on field | `{"email": ["EmailAlreadyInUse"]}` | `form.setError('email', { message: t('apiErrors.EmailAlreadyInUse') })` |
| Raw DRF on field | `{"password": ["This password is entirely numeric."]}` | `form.setError('password', { message: "This password is entirely numeric." })` — shown as-is, specific and actionable |
| Raw DRF in `messages` | `{"messages": ["Some unexpected error."]}` | Shown as-is — still more useful than a generic fallback |
| No parseable structure | Network error, timeout | `t('common.unexpectedError')` — generic fallback |

#### Shared utility

The utilities live in `src/lib/api-errors.ts`. Pages must import from there — never duplicate error parsing logic:

- `parseApiError(err, t, fallbackKey?)` — returns the first error message (translated if PascalCase, as-is if raw DRF), or `null` if unparseable
- `parseApiFieldErrors(err, t)` — returns `{ field: message }` map for `form.setError()` (translated if PascalCase, as-is if raw DRF)
- `apiErrorContains(err, code)` — checks for a specific PascalCase code
- `extractApiErrors(err)` — returns the raw errors map (for advanced cases)
- `getApiErrorStatus(err)` — returns the HTTP status code

---

## 28. Permissions & RBAC

The backend enforces permissions via `require_perm('app.codename')` decorators. The `GET /auth/me/` endpoint returns `permissions: string[]` in `app_label.codename` format. The frontend mirrors this with a thin permission layer that controls **what the user sees**, not what they can do (the API is the authority).

### Core rule: check permissions, never roles

```tsx
// ✅ Correct — permission-based
const { can } = usePermissions()
if (can('coachings.can_schedule_coaching')) { ... }

// ❌ Wrong — role-based
if (user.role.includes('direction')) { ... }
```

Roles change; permissions are the contract.

### `usePermissions()` hook

Available from `@/auth/permissions`. Returns three checkers:

```tsx
const { can, canAny, canAll } = usePermissions()

can('accounts.can_invite_user')                     // single check
canAny('accounts.can_invite_user', 'accounts.can_list_users')  // OR
canAll('enrollments.can_review_enrollment', 'enrollments.can_approve_enrollment')  // AND
```

### `<Authorized>` component

Renders children only when the user holds the required permission. When an array is passed, **any** match suffices (OR logic):

```tsx
<Authorized permission="coachings.can_schedule_coaching">
  <Button onClick={handleCreate}>Create coaching</Button>
</Authorized>

<Authorized permission={['marketplace.manage_school_listings', 'marketplace.view_productlisting']}>
  <MarketplaceActions />
</Authorized>
```

Use for buttons, cards, table columns, action menus — any UI element that should be hidden from unauthorized users.

### `<ProtectedRoute>` component

Route-level guard. Redirects to `/home` when the user lacks the permission:

```tsx
<Route
  path={paths.invites}
  element={
    <ProtectedRoute permission="accounts.can_invite_user">
      <InviteUsersPage />
    </ProtectedRoute>
  }
/>
```

Every page behind a permission **must** have both:
1. `<ProtectedRoute>` in `routes.tsx` (prevents direct URL access)
2. Permission on the nav item in `nav-config.ts` (hides the sidebar link)

### Navigation config (`nav-config.ts`)

Single source of truth for sidebar structure. Each item can declare a `permission`:

```ts
{
  to: paths.invites,
  labelKey: 'nav.invites',
  icon: UserPlus,
  permission: 'accounts.can_invite_user',  // hidden if user lacks this
}
```

Items without `permission` are always visible. Groups with zero visible children are hidden entirely. To add a new page to the sidebar, add an entry here — don't touch `AppSidebar.tsx`.

### Adding a new protected page

1. Add the route in `routes.tsx` wrapped in `<ProtectedRoute permission="...">`.
2. Add the nav item in `nav-config.ts` with the matching `permission`.
3. Use `<Authorized>` for any action buttons within the page that need finer-grained checks.

### Current permission mapping

The source of truth is `src/app/routes.tsx` (`<ProtectedRoute permission="…">`) and `src/auth/nav-config.ts` (sidebar `permission` field, plus `hidePermission` for groups that disappear when the user holds a given permission — e.g. the student "Payments" group is hidden from anyone with billing-admin rights).

The table below mirrors those files. **Do not add a "visible to: direction / coordination / …" column** — roles are not the contract and the role → permission mapping lives in the API. The frontend only ever checks permissions.

| Page | Permission |
|---|---|
| Home | *(none)* |
| Calendar | `coachings.view_coachingclass` |
| Create Coaching | `coachings.can_schedule_coaching` |
| Edit Coaching | `coachings.change_coachingclass` |
| My Coaching Requests | `accounts.can_participate_in_coaching` OR `accounts.can_teach` |
| Request Coaching | `accounts.can_participate_in_coaching` |
| Coaching Requests | `coachings.change_coachingclass` |
| Enrollment Requests | `enrollments.can_review_enrollment` |
| Enrollment Review | `enrollments.can_review_enrollment` |
| Marketplace Browse | `marketplace.view_productlisting` |
| Create Listing | `marketplace.manage_school_listings` |
| Edit Listing | `marketplace.manage_school_listings` |
| My Listings | `marketplace.view_own_listings` |
| My Inventory | `marketplace.view_own_listings` |
| My Inventory Create | `inventory.add_product` |
| School Inventory | `inventory.view_school_product` |
| School Inventory Create | `inventory.add_school_product` |
| School Listings | `marketplace.manage_school_listings` |
| Users list | `accounts.can_list_users` |
| User Detail | `accounts.view_user` |
| User Edit | `accounts.change_user` |
| Invites | `accounts.can_invite_user` |
| Billing Entries | `billing.view_billingentry` (admin actions gated by `billing.can_cancel_billingentry`) |
| Billing Fines | `billing.view_fine` (admin actions gated by `billing.can_review_fine`) |
| Account Settings | *(none)* |
| Design System | *(none)* (dev tool) |

### `hidePermission`

Sidebar groups in `nav-config.ts` may declare `hidePermission` to disappear when the user holds that permission. The current usage swaps the student-facing "Payments" group out for the admin-facing "Billing" group based on whether the user can `billing.can_cancel_billingentry`. Use sparingly — most gating should be additive (`permission`), not subtractive.
