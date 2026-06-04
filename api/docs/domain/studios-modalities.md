# Domain — Studios & Modalities

App: `studios`

## Models

### `Modality`

```python
class Modality(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    max_capacity = models.PositiveIntegerField(null=True, blank=True)
    min_age_months = models.PositiveIntegerField(null=True, blank=True)
    max_age_months = models.SmallIntegerField(null=True, blank=True)
```

Age constraints in months (e.g. "2y6m to 3y11m" = 30 to 47 months).

### `Studio`

```python
class Studio(BaseModel):
    name = models.CharField(max_length=255, unique=True)
    max_capacity = models.PositiveIntegerField()
    description = models.TextField(blank=True, default="")
```

### `StudioModality` (through model)

```python
class StudioModality(BaseModel):
    studio = models.ForeignKey(Studio)
    modality = models.ForeignKey(Modality)
    # Conditional unique: (studio, modality) WHERE deleted_at IS NULL
    # Allows soft-delete + restore without unique violation
```

---

## Seed data — 21 modalities

| Modality | Age |
|----------|-----|
| Baby Class I | 30–47 months |
| Baby Class II | 48–59 months |
| Baby Class I/II (Sábado) | 30–59 months |
| Ballet Clássico | 60+ months |
| Dança Contemporânea 1x/semana | 60+ months |
| Dança Contemporânea 2x/semana | 60+ months |
| Hip-Hop | — |
| Dança Jazz | — |
| Ginástica Acrobática | — |
| Regime Intensivo de Estudos em Dança | Contact school |
| Acrodance | — |
| Comercial & Fusion | — |
| Teatro Musical | — |
| Acrodance Kids | 48–71 months |
| Jazz Adultos | — |
| Dança Contemporânea Adultos | — |
| Ballet Adultos | — |
| Body Balance Adultos | — |
| PBT / Barre / Solo Barre | — |
| Flexibilidade | — |
| Sevilhanas & Flamenco | — |

---

## Key services

| Function | Notes |
|----------|-------|
| `create_studio`, `update_studio` | Standard write |
| `delete_studio` | Soft-deletes studio **AND explicitly soft-deletes all linked `StudioModality` records** |
| `add_modality_to_studio` | Creates link; restores soft-deleted link if it already exists |
| `remove_modality_from_studio` | Soft-deletes the link |
| `create_modality` | Standard write |

> **Critical:** `delete_studio` must explicitly cascade the soft-delete to `StudioModality`. Django's cascade bypasses `deleted_by`.

> **Restore pattern:** if you add a studio–modality link that was previously soft-deleted, the service restores it rather than creating a duplicate. Uses `all_objects` manager.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/studios/modalities/` | List modalities |
| POST | `/api/studios/modalities/` | Create modality |
| GET/PATCH/DELETE | `/api/studios/modalities/<pk>/` | Detail / update / soft-delete |
| GET | `/api/studios/` | List studios |
| POST | `/api/studios/` | Create studio |
| GET/PATCH/DELETE | `/api/studios/<pk>/` | Detail / update / soft-delete |
| GET | `/api/studios/<pk>/modalities/` | List linked modalities |
| POST | `/api/studios/<pk>/modalities/` | Add modality to studio |
| DELETE | `/api/studios/<pk>/modalities/<mid>/` | Remove modality from studio |

---

## Business rules

- Not every modality fits every studio — the `StudioModality` link is the gate.
- Coaching approval checks: `StudioModality.objects.filter(studio=studio, modality=coaching.modality, deleted_at__isnull=True).exists()`.
- `UserModality` links teachers to their teachable modalities. `add_user_modality` checks `can_teach` permission first.
