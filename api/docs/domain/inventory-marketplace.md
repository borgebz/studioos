# Domain — Inventory & Marketplace

App: `inventory` / `marketplace`  
Status: **Implemented.** Both apps have models, services, views, serializers, and URL routing. The `inventory` app also has seeds, validators, and comprehensive tests (17 test files, 130+ cases).

> **Naming note:** This document uses the original design names (`Item`, `ItemUnit`, `ItemCategory`, `ItemImage`). The implemented code uses: **Product**, **ProductVariant**, **Category**, **ProductMedia**. See `docs/inventory/data-model.md` for the current schema.

---

## Business context

StudioOS has hundreds of costumes, accessories, and props with no digital organisation. The goal is a Vinted-style internal marketplace restricted to the school community — enabling lending, renting, donating, and selling items. Reduces duplicate purchases, promotes reuse, creates a community asset registry.

---

## Model overview

### `Item` — catalogue record (a type of item)

```python
class Item(BaseModel):
    owner_type = models.IntegerField()          # 0=school, 1=parent/user
    owner_user = models.ForeignKey(User, null=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(ItemCategory, null=True)
    brand = models.CharField(max_length=120, blank=True)
    material = models.CharField(max_length=120, blank=True)
    status = models.CharField(default="active")
    notes = models.TextField(blank=True)
```

### `ItemUnit` — physical instance of an item

```python
class ItemUnit(BaseModel):
    item = models.ForeignKey(Item)
    unit_code = models.CharField(max_length=100, blank=True)
    size = models.ForeignKey(ItemSize, null=True)
    condition = models.CharField(default="good")     # good | fair | poor
    status = models.CharField(default="available")   # available | reserved | loaned | sold
    notes = models.TextField(blank=True)
```

### `ItemCategory` — hierarchical (self-FK for subcategories)

### `ItemImage` — photos per item; one marked `is_primary`

### `ItemSchoolDetails` — school-owned item metadata (code, location, acquisition, cost)

### `MarketplaceListing`

```python
class MarketplaceListing(BaseModel):
    item = models.ForeignKey(Item)
    created_by_user = models.ForeignKey(User)
    listing_type = models.CharField()  # loan | rent | donate | sell
    status = models.CharField(default="draft")  # draft | published | closed
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    asking_price = models.CharField(max_length=100, blank=True)  # free text
```

### `ListingFavorite` — "Tenho Interesse" / I'm Interested

### `Conversation` / `Message` — internal chat per listing

```python
class Conversation(BaseModel):
    listing = models.ForeignKey(MarketplaceListing)
    initiated_by_user = models.ForeignKey(User)

class Message(BaseModel):
    conversation = models.ForeignKey(Conversation)
    sender_user = models.ForeignKey(User)
    message_type = models.CharField(default="text")
    body = models.TextField()
```

### `ItemTransaction` — physical unit changing hands

```python
class ItemTransaction(BaseModel):
    item_unit = models.ForeignKey(ItemUnit)
    user = models.ForeignKey(User)
    listing = models.ForeignKey(MarketplaceListing, null=True)
    event_type = models.CharField()     # loan | return | rental | donation | sale
    status = models.CharField(default="scheduled")
    agreed_price = models.CharField(max_length=100, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True)
    notes = models.TextField(blank=True)
    recorded_by_user = models.ForeignKey(User, null=True)
```

---

## Business rules

- Only active school members can access the marketplace.
- School can lend or rent; parents can lend, rent, or donate.
- Symbolic fee may apply to loans/rentals (amount TBD).
- Contact details not exposed directly — communication goes through `Conversation`.
- "Tenho Interesse" button initiates a `Conversation` on the listing.
- Collaborators can contact parents via conversation to arrange returns.

---

## Real-time messaging consideration

The chat system requires constant updates. Current WSGI setup doesn't support WebSockets.

Options:
- **Polling** — simplest, adds latency.
- **SSE** — server-side push, one-way.
- **WebSockets** — requires ASGI + Django Channels (breaking infra change).

Decide before building the messaging system. See [open-questions.md](../open-questions.md) Q10.

---

## Future features (FutureSteps)

- Comments section on each listing item.
- Group chats per class/modality.
- Notification when a listing matches interest.
