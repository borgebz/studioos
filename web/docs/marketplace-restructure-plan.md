# Marketplace Restructure — Implementation Plan

> Status: **approved, not started**. Cross-repo change (`studioos-product.api` + `studioos-product.web`).
> Goal: a Listing represents a **Product** (with all its variants), not a single variant.

## 1. Root problem

The domain is `Product` 1—N `ProductVariant`, but the marketplace was built one level too low:

- `Listing.variant` is a FK to **one** `ProductVariant` (`server/marketplace/models.py:20`).
- The create form authors **1 product + N variants** and POSTs a `variants: [...]` array, but
  `create_listing` binds the listing to a **single** variant → the rest become **orphan inventory**
  with no listing and never appear in browse.
- Edit mode loads only `listing.variant` (singular) → editing a multi-variant product is **lossy**.
- Browse renders one card **per variant** → the same product appears N times.
- **No Product detail page and no Variant detail page** exist — inventory rows go nowhere; nothing
  connects inventory ↔ variants ↔ listings.

## 2. Target model

A **Listing represents a Product**. All its variants ride along automatically. The owner controls
what's buyable per-variant via `status`; the buyer picks a variant (size) on the detail page.

```
INVENTORY (the truth)          MARKETPLACE (the storefront)
Product ──1:N── Variant        Listing ──1:1── Product
                  │ status                       └─ surfaces ALL variants (buyer picks one)
                  ▼
        available / sold / maintenance / inactive …   ProductTransaction ──FK── Variant (chosen)
```

### Locked decisions
1. **`Listing.product` = `OneToOneField`** — one listing per product, one `listing_type`.
2. **Pricing = listing-level `asking_price` + optional per-variant override.** Add a **nullable**
   `ProductVariant.asking_price` now (schema-ready). Variants without an override inherit the
   listing price. Browse shows "from €X" when overrides exist. The override UI can be exposed
   later without a second migration. Final price is still negotiated via the existing
   `ProductTransaction.agreed_price`.
3. **Removing a variant from a listing = set `variant.status = inactive`** (stays in inventory,
   drops out of the listing). Not a hard delete.

## 3. Backend changes (`studioos-product.api`)

### 3.1 Models — `marketplace/models.py`
- Replace `Listing.variant` FK with `product = OneToOneField("inventory.Product",
  on_delete=CASCADE, related_name="listing")`.
- `ProductTransaction` keeps both `listing` and `variant` FKs — no change.
- Add nullable `asking_price` to `inventory.ProductVariant` (per-variant override).
- **Migration (data-preserving):**
  1. Add nullable `Listing.product`; add nullable `ProductVariant.asking_price`.
  2. Data migration: `listing.product = listing.variant.product`; if multiple listings share a
     product, keep the newest active one and close the rest (log each).
  3. Make `Listing.product` non-null + OneToOne; drop `Listing.variant`.

### 3.2 Serializers — `marketplace/serializers/listing_serializers.py`
- `ListingListSerializer` (browse): source from `product`; replace `variant_*` with aggregates —
  `variant_count`, `available_count`, `size_summary`, `condition_summary`, `price_from`.
- `ListingDetailSerializer`: `variant` (single) → `variants` (many, with per-variant availability
  and effective price = override ?? listing price).
- `ListingCreateSerializer`: nested `product` dict carries `variants: [...]` (plural).
- `ListingUpdateSerializer`: `product` dict + `variants: [...]` supporting add / update / remove
  (remove = set status inactive) + per-variant status & price override.
- New `TransactionRequestSerializer` field: required `variant_id`.

### 3.3 Services
- `create_listing`: product → all variants → one `Listing(product=...)`.
- `update_listing`: reconcile variants array (create / update / inactivate); listing fields as-is.
- Querysets scope by `product__owner` / `product__owner_type`; browse requires ≥1 listable variant.
- `request_transaction`: accept `variant_id`, validate it belongs to `listing.product` and is
  listable/available, bind `txn.variant`.

### 3.4 Views / filters — `marketplace/views/listing_views.py`
- `condition` / `size_id` / `color_id` filters → "product has a variant with X" (`Exists`/annotate).
- search, listing_type, ordering, publish/unpublish, favorite unchanged.

### 3.5 Regenerate client
`docker compose restart api` → `migrate` → verify `/api/schema/` 200 → `npm run generate-client`
→ fix call sites against new `ListingDetail.variants` / aggregate `ListingList`.

## 4. Frontend changes (`studioos-product.web`)

### 4.1 NEW — Product Detail page (the missing glue)
- Routes: `myInventoryDetail = /marketplace/my-inventory/:id`, `schoolInventoryDetail = /inventory/:id`.
- Two-column (UI guidelines §4.2):
  - Left: product info + media gallery + **Variants table** (size, condition, SKU, status badge,
    optional price override, bookings button → reuse `VariantBookingsCalendar`, edit sheet → reuse
    `ProductForm` variant sheet, remove → set inactive).
  - Right: metadata + **Listing card**: if listed → type/price/public + "View on marketplace" +
    unpublish; if not → "List on marketplace" dialog (type, price, title, public) → `create_listing`.
- This is where "variant detail" lives — no separate variant page needed.

### 4.2 `ListingDetailPage.tsx`
- Read `listing.variants[]` (not `listing.variant`).
- Add a variant/size picker (chips, disabled when unavailable); selection drives specs + availability + price.
- "Request booking/buy" passes the selected `variant_id` to `RequestBookingDialog`.
- Owner "Edit" → Product Detail (manage).

### 4.3 `RequestBookingDialog.tsx`
- Receive chosen variant; add `variant_id` to the request payload.

### 4.4 Browse + cards
- `ListingCard` / `ListingList` consumers: product as title, "from €X", image, aggregate
  ("3 available · sizes S–L") instead of one variant's condition/size. One card per product.

### 4.5 Create/Edit flow (coherent + visible)
- Primary path: create product + variants in **Inventory** (`ProductForm`), then **List on
  marketplace** from Product Detail.
- Fix `ListingForm` edit to load **all** `listing.product.variants` with per-variant status + remove.
- Surface entry points in nav so the create flow stops being hidden; make inventory rows clickable.

### 4.6 `MyListingsPage` / `SchoolListingsPage`
- One row per product-listing; row → Product Detail (manage) or ListingDetail (view).
- Condition filter → "has a variant with…".

### 4.7 i18n
- New keys (variant picker, "list on marketplace" dialog, "N available", size summary, product
  detail labels, price override) in **both** `en-us` and `pt-pt` `common.json`.

## 5. Sequencing (each phase shippable)

| Phase | Scope | Repo |
|---|---|---|
| 0 | Model + migration + serializers + services + transaction `variant_id` + regenerate client | API |
| 1 | Web types/data layer: `ListingList` aggregates, browse + `ListingCard` | Web |
| 2 | `ListingDetailPage` variant picker + `RequestBookingDialog` `variant_id` | Web |
| 3 | Product Detail page + "List on marketplace" dialog (the missing pages) | Web |
| 4 | Fix `ListingForm` edit (all variants + status/remove) + nav visibility | Web |
| 5 | `MyListings`/`SchoolListings` links, i18n, verify in preview (both themes/mobile) | Web |

## 6. Notes
- Per-variant price override: schema added in Phase 0 (nullable), UI optional/later.
- The standalone "create everything" `ListingForm` is retained but reframed as "create product →
  list" and made non-lossy; inventory-first is the primary authoring path.
