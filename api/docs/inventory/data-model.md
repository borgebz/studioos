# Inventory — Data Model

> PBI #222 · Sprint 3 · StudioOS

---

## 1. SizeSystem

Representa um sistema de tamanhos para organizar tamanhos compatíveis por contexto (roupa, calçado, acessórios).

**Campos**
- `id`
- `name`
- `is_active`
- audit fields

**Observações**
- Serve de base para associar categorias e tamanhos ao mesmo sistema.
- Evita misturar tamanhos incompatíveis entre tipos diferentes de artigo.

**Seeds iniciais:** `ClothingAdult`, `ClothingKids`, `ShoesEU`, `OneSize`

---

## 2. Category

Representa uma categoria do inventário.

**Campos**
- `id`
- `parent_category_id`
- `name`
- `sort_order`
- `is_active`
- audit fields

**Relação com SizeSystem**
- A relação é many-to-many, gerida pela tabela de junção `CategorySizeSystem` (campos: `category_id`, `size_system_id`).
- Uma categoria pode estar associada a vários sistemas de tamanhos em simultâneo.

**Observações**
- `parent_category_id` é opcional e permite hierarquia de categorias.

**Seeds iniciais:** `Costumes` (→ `Ballet`, `Contemporary`), `Accessories`, `Shoes`

---

## 3. Size

Representa um tamanho disponível no inventário.

**Campos**
- `id`
- `name`
- `sort_order`
- `size_system_id`
- `is_active`
- audit fields

**Observações**
- `size_system_id` deve existir para manter coerência com o sistema de tamanhos.
- O mesmo nome de tamanho pode existir em sistemas diferentes.

**Seeds iniciais (por sistema)**
- `ClothingAdult`: `XS`, `S`, `M`, `L`
- `ClothingKids`: `4Y`, `6Y`, `8Y`, `10Y`
- `ShoesEU`: `36`, `37`, `38`, `39`
- `OneSize`: `One Size`

---

## 4. Color

Representa uma cor que pode ser associada a uma variante de item.

**Campos**
- `id`
- `name`
- `is_active`
- `hex_code`
- audit fields

**Observações**
- A associação à variante é feita através de `VariantColor`.
- `hex_code` permite mostrar a cor visualmente no frontend.

**Seeds iniciais:** `Black (#000000)`, `White (#FFFFFF)`, `Blue (#2563EB)`, `Pink (#EC4899)`

---

## 5. Product

Representa o item base do inventário.

**Campos**
- `id`
- `owner_type` (`school`, `member`)
- `owner_id`
- `category_id`
- `name`
- `description`
- `target_gender`
- `brand`
- `material`
- `status` (`active`, `inactive`, `archived`)
- audit fields

**Observações**
- `owner_type` distingue peças da escola de peças de membros.
- `owner_id` identifica o dono concreto do produto.
- `category_id` é opcional.
- Um `Product` pode ter uma ou várias variantes.

---

## 6. ProductVariant

Representa uma variante concreta de um item do inventário.

**Campos**
- `id`
- `product_id`
- `size_id`
- `condition` (`new`, `excellent`, `good`, `fair`, `damaged`)
- `sku`
- `status` (`available`, `reserved`, `in_use`, `maintenance`, `inactive`, `sold`, `donated`)
- `acquisition_type` (`purchased`, `donated`, `school_owned`, `other`)
- `acquired_at`
- `internal_notes`
- `public_notes`
- audit fields

**Observações**
- Esta é a entidade principal para disponibilidade real, estado atual e timeline.
- `size_id` é opcional.
- O calendário deve ser gerido ao nível da variante.

---

## 7. VariantColor

Representa a associação entre uma variante e uma cor.

**Campos**
- `id`
- `variant_id`
- `color_id`

**Observações**
- Restrição única em `variant_id + color_id`.
- Sem CRUD próprio público — gerido pelo endpoint de `ProductVariant`.

---

## 8. ProductMedia

Representa imagens associadas a um item do inventário.

**Campos**
- `id`
- `product_id`
- `image`
- `content_hash` (SHA-256, max 64 chars — used for deduplication)
- `is_primary`
- `sort_order`
- audit fields

**Observações**
- Sem CRUD próprio público — gerido pelo endpoint de `Product`.
- `content_hash` permite detetar uploads duplicados antes de persistir o ficheiro.
- Uma mesma imagem pode depois ser associada a variantes via `VariantMedia`.

---

## 9. VariantMedia

Representa a associação entre uma variante e uma imagem do produto.

**Campos**
- `id`
- `variant_id`
- `product_media_id`

**Observações**
- Restrição única em `variant_id + product_media_id`.
- Sem CRUD próprio público — gerido pelo endpoint de `ProductVariant`.
- Antes de criar a associação, validar que `product_media.product_id == variant.product_id`.

---

## 10. SchoolProductDetails

Representa dados específicos de controlo interno para itens da escola.

**Campos**
- `product_id` (one-to-one com `Product`)
- `inventory_code`
- `storage_location`
- `notes`

**Observações**
- Apenas para produtos com `owner_type = school`.
- Sem CRUD próprio público — gerido pelo endpoint de `Product`.

---

## 11. VariantBooking

Representa a ocupação temporal real de uma variante.

**Campos**
- `id`
- `variant_id`
- `booking_type` (`reservation`, `loan`, `rent`, `school_use`, `maintenance`, `blocked`)
- `status` (`pending`, `confirmed`, `active`, `completed`, `cancelled`)
- `start_at`
- `end_at`
- `actual_start_at`
- `actual_end_at`
- `created_by_user_id`
- `approved_by_user_id`
- `title`
- `notes`
- audit fields

**Observações**
- É a tabela principal para calendário e timeline.
- `overdue` não existe persistido — calculado dinamicamente.
- Deve existir validação para impedir overlap entre bookings ativos da mesma variante.

---

## Relações entre modelos

```
SizeSystem  M — N  Category      (via CategorySizeSystem join table)
SizeSystem  1 — N  Size
Category    1 — N  Category      (auto-relação por parent_category_id)
Category    1 — N  Product
Product     1 — N  ProductVariant
Size        1 — N  ProductVariant
ProductVariant 1 — N  VariantColor
Color       1 — N  VariantColor
Product     1 — N  ProductMedia
ProductVariant 1 — N  VariantMedia
ProductMedia   1 — N  VariantMedia
Product     1 — 1  SchoolProductDetails
ProductVariant 1 — N  VariantBooking
```

---

## Códigos de erro dos serviços

| Código | Contexto | Significado |
|--------|----------|-------------|
| `VariantHasActiveBookings` | Soft-delete de `ProductVariant` | Não é possível apagar uma variante com bookings ativos |
| `ProductHasVariants` | Soft-delete de `Product` | Não é possível apagar um produto que ainda tem variantes |

---

## Notas finais de modelação

- A app de inventário foca-se em catálogo, organização, estado e disponibilidade temporal dos itens.
- Marketplace deve ficar separado como domínio próprio.
- A timeline completa do item é construída juntando `acquired_at` e intervalos de `VariantBooking`.
- `ProductMedia` guarda os ficheiros ao nível do produto; `VariantMedia` resolve a associação visual sem duplicar ficheiros.
