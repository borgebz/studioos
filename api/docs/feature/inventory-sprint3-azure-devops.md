# Feature — Inventory

---

## Criar app Inventory

Correr script para criação de app com nome `inventory`.

---

## Seeds

### Colors

## 3. Color  

  

### Objetivo  

Criar um conjunto inicial de cores reutilizáveis para filtros e variantes.  

  

### Registos exemplo  

- `Black`  

- `White`  

- `Blue`  

- `Pink`  

  

### Exemplo básico  

```json  

[  

  {  

    "name": "Black",  

    "hex_code": "#000000",  

    "is_active": true  

  },  

  {  

    "name": "White",  

    "hex_code": "#FFFFFF",  

    "is_active": true  

  },  

  {  

    "name": "Blue",  

    "hex_code": "#2563EB",  

    "is_active": true  

  },  

  {  

    "name": "Pink",  

    "hex_code": "#EC4899",  

    "is_active": true  

  }  

]

---

## Data Model

# Inventory Data Model

## 1. SizeSystem

Representa um sistema de tamanhos para organizar tamanhos compatíveis por contexto, por exemplo roupa, calçado ou acessórios.

**Campos**

- `id`
- `name`
- `is_active`
- audit fields

**Observações**

- Serve de base para associar categorias e tamanhos ao mesmo sistema.
- Evita misturar tamanhos incompatíveis entre tipos diferentes de artigo.

---

## 2. Category

Representa uma categoria do inventário.

**Campos**

- `id`
- `parent_category_id`
- `name`
- `sort_order`
- `is_active`
- `size_system_id`
- audit fields

**Observações**

- `parent_category_id` é opcional e permite hierarquia de categorias.
- `size_system_id` é opcional e define qual o sistema de tamanhos aplicável à categoria.
- Pode ser usada para organizar figurinos, acessórios, cenários, sapatos, etc.

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
- Permite pesquisa e filtros por cor.
- `hex_code` permite mostrar a cor visualmente no frontend.

---

## 5. Product

Representa o item base do inventário.

**Campos**

- `id`
- `owner_type` `(school, member)`
- `owner_id`
- `category_id`
- `name`
- `description`
- `target_gender`
- `brand`
- `material`
- `status` `(active, inactive, archived)`
- audit fields

**Observações**

- `owner_type` distingue peças da escola de peças de membros.
- `owner_id` identifica o dono concreto do produto.
- `category_id` é opcional.
- Este modelo representa o artigo base, não a unidade concreta reservável no calendário.
- Um `Product` pode ter uma ou várias variantes.

---

## 6. ProductVariant

Representa uma variante concreta de um item do inventário.

**Campos**

- `id`
- `product_id`
- `size_id`
- `condition` `(new, excellent, good, fair, damaged)`
- `sku` `(Stock Keeping Unit)`
- `status` `(available, reserved, in_use, maintenance, inactive, sold, donated)`
- `acquisition_type` `(purchased, donated, school_owned, other)`
- `acquired_at`
- `internal_notes`
- `public_notes`
- audit fields

**Observações**

- Esta é a entidade principal para disponibilidade real, estado atual e timeline.
- `size_id` é opcional.
- `acquired_at` permite mostrar a entrada/compra/doação do item na timeline.
- `internal_notes` são notas internas; `public_notes` podem ser usadas no frontend caso faça sentido.
- O calendário deve ser gerido ao nível da variante.
- A variante pode ter cores e media específicos associados.

---

## 7. VariantColor

Representa a associação entre uma variante e uma cor.

**Campos**

- `id`
- `variant_id`
- `color_id`

**Observações**

- Deve existir restrição única para evitar duplicação da mesma combinação `variant_id + color_id`.
- Uma variante pode ter zero, uma ou várias cores.

---

## 8. ProductMedia

Representa imagens associadas a um item do inventário.

**Campos**

- `id`
- `product_id`
- `image`
- `is_primary`
- `sort_order`
- audit fields

**Observações**

- Um produto pode ter zero ou várias imagens.
- `is_primary` identifica a imagem principal ao nível do produto.
- `sort_order` controla a ordem de apresentação.
- As imagens estão associadas ao `Product`.
- Uma mesma imagem de `ProductMedia` pode depois ser associada a uma ou várias variantes através de `VariantMedia`.

---

## 9. VariantMedia

Representa a associação entre uma variante e uma imagem do produto.

**Campos**

- `id`
- `variant_id`
- `product_media_id`

**Observações**

- Deve existir restrição única para evitar duplicação da mesma combinação `variant_id + product_media_id`.
- Esta tabela permite indicar quais imagens do produto pertencem visualmente a cada variante.
- Exemplo:
  - um produto "Camisola" pode ter variantes azul e verde
  - as imagens continuam guardadas em `ProductMedia`
  - `VariantMedia` indica quais dessas imagens pertencem à variante azul e quais pertencem à variante verde
- O utilizador pode adicionar imagens ao criar/editar a variante, mas os ficheiros devem ser guardados ao nível do `Product`.
- Antes de criar a associação, deve validar-se que `product_media.product_id == variant.product_id`.

---

## 10. SchoolProductDetails

Representa dados específicos de controlo interno para itens da escola.

**Campos**

- `product_id`
- `inventory_code`
- `storage_location`
- `notes`

**Observações**

- Deve existir apenas para produtos com `owner_type = school`.
- `product_id` é one-to-one com `Product`.
- Serve para dados institucionais e operacionais, como código interno e localização física.

---

## 11. VariantBooking

Representa a ocupação temporal real de uma variante, servindo de base ao calendário e timeline do inventário.

**Campos**

- `id`
- `variant_id`
- `booking_type` `(reservation, loan, rent, school_use, maintenance, blocked)`
- `status` `(pending, confirmed, active, completed, cancelled)`
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

- Esta é a tabela principal para suportar calendário e timeline do item.
- `pending` pode ser usado para pré-reserva.
- Pode existir booking sem qualquer fluxo de marketplace.
- Permite registar uso interno da escola, manutenção, bloqueios e períodos de empréstimo/aluguer.
- O estado `overdue` não precisa de existir persistido; pode ser calculado dinamicamente com base em `end_at`, `actual_end_at` e `status`.
- Deve existir validação para impedir overlap indevido entre bookings ativos da mesma variante.

---

## Relações entre modelos

- `SizeSystem` 1 — N `Category`
- `SizeSystem` 1 — N `Size`
- `Category` 1 — N `Category` (auto-relação por `parent_category_id`)
- `Category` 1 — N `Product`
- `Product` 1 — N `ProductVariant`
- `Size` 1 — N `ProductVariant`
- `ProductVariant` 1 — N `VariantColor`
- `Color` 1 — N `VariantColor`
- `Product` 1 — N `ProductMedia`
- `ProductVariant` 1 — N `VariantMedia`
- `ProductMedia` 1 — N `VariantMedia`
- `Product` 1 — 1 `SchoolProductDetails`
- `ProductVariant` 1 — N `VariantBooking`

---

## Notas finais de modelação

- A app de inventário deve focar-se em catálogo, organização, estado e disponibilidade temporal dos itens.
- Marketplace deve ficar separado como domínio próprio.
- A timeline completa do item deve ser construída juntando:
  - eventos pontuais, como `acquired_at`
  - intervalos temporais, vindos de `VariantBooking`
- Para itens da escola, o controlo deve ser mais rigoroso, usando `SchoolProductDetails` e bookings formais.
- Para itens dos membros, o inventário pode existir com menor rigidez, mas continua a beneficiar de calendário ao nível da variante.
- `ProductMedia` guarda os ficheiros ao nível do produto.
- `VariantMedia` resolve a associação visual entre imagens e variantes, sem duplicar ficheiros.

---

## Endpoints — SizeSystem

## Endpoints da entidade SizeSystem

### Base

- `POST /inventory/size-systems`
- `GET /inventory/size-systems`
- `PUT /inventory/size-systems/{sizeSystemId}`
- `DELETE /inventory/size-systems/{sizeSystemId}`
- `POST /inventory/size-systems/{sizeSystemId}/activate`
- `POST /inventory/size-systems/{sizeSystemId}/deactivate`

---

## Regras / lógicas chave

### 1. Autenticação

- Apenas utilizadores autenticados podem aceder aos endpoints de `SizeSystem`.

### 2. Permissões

- Todos os endpoints de `SizeSystem` devem ser restritos a utilizadores administrativos.
- Utilizadores comuns não devem ter acesso direto a `SizeSystem`.
- O uso funcional do sistema de tamanhos para utilizadores comuns deve acontecer de forma indireta através de:
  - `Category`
  - `Size`

### 3. Leitura

- `GET /inventory/size-systems` devolve a lista de sistemas de tamanhos disponíveis.
- A listagem pode ser simples, ordenada por nome.
- Pode incluir os `sizes` associados, se isso for útil para o backoffice.

### 4. Criação

- `POST /inventory/size-systems` cria um novo sistema de tamanhos.
- Deve aceitar os campos próprios do modelo:
  - `name`
  - `is_active`
  - `sizes` (opcional)
- `name` deve ser obrigatório.
- Deve evitar duplicados óbvios, por exemplo dois sistemas com o mesmo nome lógico.

#### 4.1. Sizes no POST

- O body pode incluir um array `sizes`.
- Se o array for enviado, os `Size` devem ser criados logo associados ao novo `SizeSystem`.
- Cada item do array pode conter, por exemplo:
  - `name`
  - `sort_order`
- Não deve ser possível criar tamanhos duplicados dentro do mesmo sistema no mesmo pedido.
- Se o pedido falhar em qualquer size, a operação deve falhar por completo.

### 5. Edição

- `PUT /inventory/size-systems/{sizeSystemId}` altera um sistema de tamanhos.
- A edição deve permitir alterar:
  - `name`
- Ao editar o nome, deve continuar a validar unicidade lógica para evitar sistemas repetidos.

### 6. Remoção

- `DELETE /inventory/size-systems/{sizeSystemId}` faz soft delete do sistema de tamanhos.
- Não deve permitir remoção se o sistema estiver a ser usado por:
  - Se existir algum `ProductVariant` com uma `Category` onde `category.size_system_id = {sizeSystemId}`
- Se existirem dependências, deve devolver erro explícito (`SizeSystemHasAssociatedProducts`).
- Se existir apenas `Category` `category.size_system_id = {sizeSystemId}` altera o `category.size_system_id` para null.

### 7. Ativação / desativação

- `POST /inventory/size-systems/{sizeSystemId}/activate` ativa o registo.
- `POST /inventory/size-systems/{sizeSystemId}/deactivate` desativa o registo.
- A desativação deve impedir uso futuro do sistema em novos fluxos, mas não deve quebrar histórico.

### 8. Integridade

- Um `SizeSystem` serve de referência para categorias e tamanhos.
- Antes de apagar, o sistema deve validar se existem relações ativas associadas.
- Os `Size` enviados no `PUT` têm de pertencer ao próprio `SizeSystem`, se vierem com `id`.
- Não deve ser possível usar o `PUT` do `SizeSystem` para “mover” `Size` de outro sistema.

### 9. Regras de negócio

- `SizeSystem` é uma entidade de configuração, não operacional.
- Deve mudar pouco ao longo do tempo.
- Serve para garantir consistência entre categorias e tamanhos, por exemplo roupa, calçado ou outros contextos.
- Uma categoria pode apontar para um `SizeSystem` para indicar que os tamanhos usados nessa categoria devem vir desse sistema.

### 10. Simplicidade

- Este módulo deve ser leve.
- Não precisa de lógica complexa nesta fase.
- O foco principal é:
  - criar
  - listar
  - editar
  - opcionalmente criar sizes no mesmo payload
  - impedir duplicados
  - impedir remoção quando existem dependências

### 11. Validações recomendadas

- `name` obrigatório
- `name` normalizado para validação de duplicados
- `sizes[].name` obrigatório, quando enviado
- não permitir nomes de `Size` duplicados dentro do mesmo sistema
- não permitir que um `Size` de outro sistema seja atualizado por este endpoint
- não permitir delete com dependências
- mensagens de erro claras quando o sistema já estiver em uso

---

## Endpoints — Size

## Endpoints da entidade Size

### Base

- `POST /inventory/sizes`
- `GET /inventory/sizes`
- `DELETE /inventory/sizes/{sizeId}`
- `POST /inventory/sizes/{sizeId}/activate`
- `POST /inventory/sizes/{sizeId}/deactivate`

---

## Regras / lógicas chave

### 1. Autenticação

- Apenas utilizadores autenticados podem aceder aos endpoints de `Size`.

### 2. Permissões

- Leitura pode ser permitida a perfis com acesso ao módulo de inventário.
- Criação, remoção, ativação e desativação devem ser restritas a perfis administrativos, coordenação ou outro papel de gestão configurado para inventário.
- Utilizadores comuns não devem criar nem alterar o estado de tamanhos.

### 3. Leitura

- `GET /inventory/sizes` devolve a lista de tamanhos.
- A listagem deve poder ser filtrada por:
  - `size_system_id`
- A ordenação deve respeitar `sort_order` e depois `name`.
- Este endpoint é o principal para popular selects no frontend.

### 4. Criação

- `POST /inventory/sizes` cria um novo tamanho.
- Deve aceitar os campos próprios do modelo:
  - `name`
  - `size_system_id`
- `name` deve ser obrigatório.
- `size_system_id` deve existir, quando enviado.
- `is_active` pode ter default `true`.
- Inferir sort_order manualmente, ter em conta se é numérico ou não.

### 5. Regra de unicidade

- Não deve existir duplicação lógica do mesmo tamanho dentro do mesmo sistema.
- Exemplos:
  - `38` no sistema `Calçado EU` não deve existir duas vezes
  - `M` no sistema `Roupa Adulto` não deve existir duas vezes
- O mesmo `name` pode existir em sistemas diferentes.

### 6. Sem endpoint de edição

- Não deve existir `PUT /inventory/sizes/{sizeId}`.
- A gestão de tamanhos deve ser mantida simples:
  - criar
  - listar
  - apagar
  - ativar
  - desativar
- Se existir necessidade futura de corrigir `name` ou `sort_order`, essa decisão deve ser avaliada separadamente.

### 7. Remoção

- `DELETE /inventory/sizes/{sizeId}` faz soft delete do tamanho.
- Não deve permitir remoção se o tamanho estiver a ser usado por:
  - `ProductVariant`
- Se existirem dependências, o endpoint deve devolver erro explícito.
- Nesses casos, a alternativa correta é desativar o registo.

### 8. Ativação / desativação

- `POST /inventory/sizes/{sizeId}/activate` ativa o tamanho.
- `POST /inventory/sizes/{sizeId}/deactivate` desativa o tamanho.
- A desativação deve impedir uso futuro do tamanho em novos creates/edits operacionais, mas não deve quebrar histórico.
- Um `Size` inativo pode continuar associado a variantes antigas.

### 9. Integridade

- Um `Size` precisa estar associado a um `SizeSystem`.
- Um `Size` pode ser referenciado por variantes de produtos.
- Não deve ser possível apagar um tamanho que esteja em uso, para não deixar referências partidas.
- Tamanhos inativos não devem poder ser usados em novos `ProductVariant`.

### 10. Regras de negócio

- `Size` é uma entidade de configuração do inventário.
- Deve ser reutilizável entre vários itens.
- A relação com `SizeSystem` permite manter coerência entre categorias e tamanhos.
- A UI pode usar este endpoint para preencher selects de tamanhos no registo/edição de variantes.

### 11. Simplicidade

- Este módulo deve manter-se simples.
- O foco principal é:
  - criar
  - listar
  - filtrar por sistema
  - ativar / desativar
  - impedir duplicados
  - impedir remoção quando existem variantes associadas

### 12. Validações recomendadas

- `name` obrigatório
- `sort_order` com default simples
- size_system_id obrigatorio
- validar que `size_system_id` existe
- validar unicidade lógica de `name + size_system_id`
- não permitir delete com dependências
- não permitir usar `Size` inativo em novos fluxos operacionais
- mensagens de erro claras quando o tamanho já estiver em uso

---

## Endpoints — Category

## Endpoints da entidade Category

### Base

- `POST /inventory/categories`
- `GET /inventory/categories`
- `PUT /inventory/categories/{categoryId}`
- `DELETE /inventory/categories/{categoryId}`
- `POST /inventory/categories/{categoryId}/activate`
- `POST /inventory/categories/{categoryId}/deactivate`

---

### Regras / lógicas chave

#### 1. Autenticação

- Apenas utilizadores autenticados podem aceder aos endpoints de `Category`.

#### 2. Permissões

- Leitura pode ser permitida a perfis com acesso ao módulo de inventário.
- Criação, edição, remoção, ativação e desativação devem ser restritas a perfis administrativos, coordenação ou outro papel de gestão configurado para inventário.
- Utilizadores comuns não devem criar nem alterar categorias.

#### 3. Leitura

- `GET /inventory/categories` devolve a lista de categorias.
- Por defeito, a resposta deve devolver a estrutura hierárquica aninhada, incluindo subcategorias dentro da respetiva categoria pai.
- A listagem pode suportar:
  - filtro por `parent_category_id`
  - filtro por `is_active`
  - filtro por `size_system_id`
- A ordenação deve respeitar `sort_order` e depois `name`, em cada nível da árvore.
- Para fluxos operacionais, o client normalmente deve usar apenas categorias ativas.

#### 4. Criação

- `POST /inventory/categories` cria uma nova categoria.
- Deve aceitar os campos próprios do modelo:
  - `name`
  - `parent_category_id`
  - `sort_order`
  - `is_active`
  - `size_system_id`
  - `subcategories` (opcional)
- `name` deve ser obrigatório.
- `parent_category_id` é opcional.
- `size_system_id` é opcional.
- Se `size_system_id` for enviado, o `SizeSystem` tem de existir e estar ativo.

#### 4.1. Subcategorias no POST

- O body pode incluir um array `subcategories`.
- Se o array for enviado, devem ser criadas novas categorias filhas associadas à categoria principal criada no pedido.
- Cada subcategoria pode conter, por exemplo:
  - `name`
  - `sort_order`
  - `is_active`
  - `size_system_id`
- Se a subcategoria não enviar `size_system_id`, deve herdar o `size_system_id` da categoria pai.
- Não deve ser possível criar subcategorias duplicadas no mesmo nível no mesmo pedido.
- Se falhar a criação de qualquer subcategoria, a operação deve falhar por completo.

#### 5. Hierarquia

- Uma categoria pode ter categoria pai.
- Se `parent_category_id` existir, a categoria pai tem de existir.
- Não deve ser possível criar ciclos na hierarquia.
- Uma categoria não pode apontar para si própria como pai.
- A hierarquia deve manter-se simples e coerente.

#### 6. Regra de unicidade

- Não deve existir duplicação lógica da mesma categoria no mesmo nível hierárquico.
- Exemplo:
  - não deve existir duas categorias `Figurinos` com o mesmo `parent_category_id`
- O mesmo nome pode existir noutro ramo da árvore, se isso fizer sentido funcional.

#### 7. Size system

- `size_system_id` define o sistema de tamanhos aplicável à categoria.
- É uma configuração útil para orientar a escolha de tamanhos nas variantes dos produtos dessa categoria.
- Se existir, o `SizeSystem` tem de existir.
- `size_system_id` deve ser definido na criação.

#### 8. Edição

- `PUT /inventory/categories/{categoryId}` altera uma categoria existente.
- Deve permitir editar apenas os campos editáveis do próprio modelo:
  - `name`
  - `parent_category_id`
  - `sort_order`
  - `is_active`
  - `size_system_id`
- Ao editar `parent_category_id`, deve continuar a validar:
  - existência
  - ausência de ciclos
  - que a categoria não aponta para si própria
- Ao editar `name` ou `parent_category_id`, deve continuar a validar duplicação lógica no mesmo nível.

#### 9. Remoção

- `DELETE /inventory/categories/{categoryId}` faz soft delete da categoria.
- Não deve permitir remoção se existir algum `Product` associado:
  - diretamente a `category_id = {categoryId}`
  - ou a qualquer categoria descendente dessa categoria
- Se existirem dependências, o endpoint deve devolver erro explícito e recomendar a desativação da categoria em vez da remoção.
- Exemplo de código de erro:
  - `CategoryHasAssociatedProducts`

#### 10. Ativação / desativação

- `POST /inventory/categories/{categoryId}/activate` ativa a categoria.
- `POST /inventory/categories/{categoryId}/deactivate` desativa a categoria.
- A desativação deve impedir uso futuro da categoria em novos creates/edits operacionais, mas não deve quebrar histórico.
- Uma categoria inativa pode continuar associada a produtos antigos.

#### 11. Integridade

- Não deve ser possível deixar produtos sem referência válida por causa da remoção de categoria.
- Não deve ser possível partir a árvore hierárquica.
- Antes de apagar, o sistema deve validar dependências ativas.
- Categorias inativas não devem poder ser usadas em novos `Product`.

#### 12. Regras de negócio

- `Category` é uma entidade estrutural do inventário.
- Serve para organizar o catálogo e melhorar pesquisa, filtros e navegação.
- Também ajuda a definir contexto funcional, por exemplo que sistema de tamanhos deve ser usado.
- Deve ser relativamente estável e mudar pouco no dia a dia operacional.

#### 13. Simplicidade

- Este módulo deve manter-se simples.
- O foco principal é:
  - criar
  - listar
  - organizar hierarquia
  - editar
  - ativar / desativar
  - impedir ciclos
  - impedir duplicados no mesmo nível
  - impedir remoção com dependências

#### 14. Validações recomendadas

- `name` obrigatório
- validar que `parent_category_id` existe, quando enviado
- validar que `size_system_id` existe e está ativo, quando enviado
- não permitir auto-referência
- não permitir ciclos na árvore
- validar unicidade lógica de `name + parent_category_id`
- não permitir delete com dependências
- não permitir uso de categoria inativa em novos fluxos operacionais
- mensagens de erro claras quando a categoria já estiver em uso

---

## Endpoints — Color

# Endpoints da entidade Color

## Base
- `POST /inventory/colors`
- `GET /inventory/colors`
- `DELETE /inventory/colors/{colorId}`
- `POST /inventory/colors/{colorId}/activate`
- `POST /inventory/colors/{colorId}/deactivate`

---

# Regras / lógicas chave

## 1. Autenticação
- Apenas utilizadores autenticados podem aceder aos endpoints de `Color`.

## 2. Permissões
- Leitura pode ser permitida a perfis com acesso ao módulo de inventário.
- Criação, remoção, ativação e desativação devem ser restritas a perfis administrativos, coordenação ou outro papel de gestão configurado para inventário.
- Utilizadores comuns não devem criar nem alterar o estado de cores.

## 3. Leitura
- `GET /inventory/colors` devolve a lista de cores disponíveis.
- A listagem pode suportar filtro por:
  - `is_active`
- A listagem deve ser simples e normalmente ordenada por `name`.
- Este endpoint serve também para popular selects e filtros no frontend.
- A resposta deve incluir também `hex_code`, para permitir representação visual da cor no frontend.

## 4. Criação
- `POST /inventory/colors` cria uma nova cor.
- Deve aceitar apenas os campos próprios do modelo:
  - `name`
  - `hex_code`
  - `is_active`
- `name` deve ser obrigatório.
- `hex_code` deve ser obrigatório.
- `is_active` pode ter default `true`.

## 5. Hex da cor
- `hex_code` representa a cor em formato hexadecimal.
- Deve ser usado pelo frontend para mostrar a cor visualmente, por exemplo em badges, selects ou previews.
- O valor deve seguir um formato válido, por exemplo:
  - `#000000`
  - `#FFFFFF`
  - `#FF6600`
- Mais tarde, o backoffice/frontend deve disponibilizar uma forma simples e segura de o utilizador escolher visualmente a cor correta, idealmente através de color picker ou mecanismo semelhante.

## 6. Unicidade
- Não deve existir duplicação lógica de cores.
- Exemplo:
  - não deve existir `Preto` duas vezes
  - não deve existir `preto` e `Preto` como registos diferentes
- A validação deve idealmente normalizar espaços e capitalização antes de comparar.

## 7. Sem endpoint de edição
- Não deve existir `PUT /inventory/colors/{colorId}`.
- A gestão de cores deve ser mantida simples:
  - criar
  - listar
  - apagar
  - ativar
  - desativar
- Se existir necessidade futura de corrigir `name` ou `hex_code`, essa decisão deve ser avaliada separadamente.

## 8. Remoção
- `DELETE /inventory/colors/{colorId}` faz soft delete da cor.
- Não deve permitir remoção se a cor estiver a ser usada em variantes.
- Se existirem dependências, o endpoint deve devolver erro explícito.
- Nesses casos, a alternativa correta é desativar o registo.

## 9. Ativação / desativação
- `POST /inventory/colors/{colorId}/activate` ativa a cor.
- `POST /inventory/colors/{colorId}/deactivate` desativa a cor.
- A desativação deve impedir uso futuro da cor em novos creates/edits operacionais, mas não deve quebrar histórico.
- Uma cor inativa pode continuar associada a variantes antigas.

## 10. Integridade
- `Color` é uma entidade de referência reutilizável.
- Não deve ser possível apagar uma cor que esteja associada a variantes.
- Antes de apagar, o sistema deve validar dependências ativas.
- Cores inativas não devem poder ser usadas em novos `ProductVariant`.

## 11. Regras de negócio
- `Color` serve para classificação e filtros do inventário.
- É reutilizável entre várias variantes.
- A associação da cor à peça é feita ao nível da variante, não do produto base.
- Embora `VariantColor` não tenha CRUD próprio, a existência de `Color` como tabela global justifica gestão central própria.
- O `hex_code` acrescenta valor funcional e visual ao frontend, reduzindo ambiguidade na representação da cor.

## 12. Simplicidade
- Este módulo deve manter-se leve.
- O foco principal é:
  - criar
  - listar
  - ativar / desativar
  - impedir duplicados
  - impedir remoção quando existem associações

## 13. Validações recomendadas
- `name` obrigatório
- `hex_code` obrigatório
- validar formato hexadecimal válido
- `name` normalizado para validação de duplicados
- `is_active` com default simples
- não permitir delete com dependências
- não permitir uso de cor inativa em novos fluxos operacionais
- mensagens de erro claras quando a cor já estiver em uso

---

## Endpoints — Product

## Endpoints da entidade Product

### Base

#### Member
- `POST /inventory/products`
- `GET /inventory/products`
- `GET /inventory/products/{productId}`
- `PUT /inventory/products/{productId}`
- `DELETE /inventory/products/{productId}`

#### School
- `POST /inventory/school/products`
- `GET /inventory/school/products`
- `GET /inventory/school/products/{productId}`
- `PUT /inventory/school/products/{productId}`
- `DELETE /inventory/school/products/{productId}`

---

### Regras / lógicas chave

#### 1. Autenticação
- Apenas utilizadores autenticados podem aceder aos endpoints de `Product`.

#### 2. Permissões
- `POST /inventory/products` cria produto no contexto pessoal do utilizador autenticado, apenas se ele tiver permissão para criar inventário member.
- `POST /inventory/school/products` cria produto com `owner_type = school`, apenas para perfis com permissão de gestão de inventário da escola.
- `GET /inventory/products` devolve produtos visíveis no contexto member/pessoal.
- `GET /inventory/school/products` deve ser restrito a perfis com acesso ao inventário da escola.
- Edição e remoção devem respeitar o contexto do produto:
  - produtos `member` só podem ser alterados por quem os gere
  - produtos `school` só podem ser alterados por quem tem permissão de gestão school

#### 3. Owner
- `owner_type` opções:
  - `school`
  - `member`
- `POST /inventory/products` deve criar sempre com:
  - `owner_type = member`
  - `owner_id = utilizador autenticado`
- `POST /inventory/school/products` deve criar sempre com:
  - `owner_type = school`
  - `owner_id = null`
- `owner_type` e `owner_id` não devem poder ser alterados depois da criação.

#### 4. Leitura da lista
- `GET /inventory/products` e `GET /inventory/school/products` devem devolver uma resposta compacta para cards/listagem.
- A lista deve devolver apenas dados essenciais, por exemplo:
  - `id`
  - `name`
  - `owner_type`
  - `category`
  - `status`
  - `top 5` imagens
  - informação resumida de variantes, se necessário
- A listagem pode suportar:
  - filtro por `category_id`
  - filtro por `status`
  - filtro por `size`, se `category_id` existir
  - pesquisa por `name`
- `school_details` não precisa de vir na lista.

#### 5. Leitura do detalhe
- `GET /inventory/products/{productId}` e `GET /inventory/school/products/{productId}` devem devolver toda a informação aninhada do produto.
- O detalhe deve incluir:
  - dados completos do produto
  - `media`
  - `variants`
  - em cada variant:
    - `size`
    - `colors`
    - `media`
    - estado e disponibilidade
  - `school_details`, apenas se `owner_type = school`

#### 6. Criação
- O `POST` deve aceitar os campos próprios do produto:
  - `category_id`
  - `name`
  - `description`
  - `target_gender`
  - `brand`
  - `material`
  - `status`
  - `media` (opcional)
  - `variants` (opcional)
  - `school_details` (opcional, apenas school)
- `name` deve ser obrigatório.
- `category_id` é opcional.
- Se `category_id` for enviado, a categoria tem de existir e estar ativa.

#### 7. Criação aninhada de variants
- O `POST` de `Product` pode receber um array `variants`.
- Cada item de `variants` pode incluir toda a informação necessária da variante, por exemplo:
  - `size_id`
  - `condition`
  - `sku`
  - `status`
  - `acquisition_type`
  - `acquired_at`
  - `internal_notes`
  - `public_notes`
  - `color_ids` (opcional)
  - `media_ids` (opcional)
  - `media` (opcional)
- Se forem enviadas imagens dentro de uma variante:
  - os ficheiros devem ser criados ao nível de `ProductMedia`
  - e depois associados à variante através de `VariantMedia`
- A criação do produto e das variantes deve ser tratada como uma operação única.
- Se falhar qualquer parte da criação aninhada, o pedido deve falhar por completo.

#### 8. Product gere os seus dependentes
- `ProductMedia` não deve ter CRUD próprio público.
- `SchoolProductDetails` não deve ter CRUD próprio público.
- O `POST/PUT` de `Product` deve gerir estes dados dependentes.
- Na edição do produto, deve ser possível:
  - adicionar media novo
  - remover media existente
  - alterar ordenação
  - definir imagem principal
  - criar/editar `school_details`, quando aplicável

#### 9. Edição
- `PUT` altera os campos editáveis do produto e respetivos dados dependentes.
- Não deve permitir alterar:
  - `owner_type`
  - `owner_id`
- `school_details` só pode existir/ser editado em produtos `school`.
- A edição do produto não deve gerir criação/edição/remoção de variantes.
- A gestão de variantes deve continuar a ser feita pelos endpoints de `ProductVariant`.

#### 10. Remoção (Provavelmente lógica pendente ainda do modulo de Marketplace)
- `DELETE` faz sempre soft delete.
- Não deve permitir remoção se existirem dependências críticas, por exemplo:
  - faturação
  - histórico crítico
- Se existir faturação associada, o produto não deve poder ser apagado.
- Nesses casos, a alternativa correta deve ser usar `status = archived`.

#### 11. Estado do produto
- O `status` do produto é estrutural.
- Pode ser:
  - `active`
  - `inactive`
  - `archived`
- `archived` faz sentido para produtos que já não devem ser usados, mas precisam de continuar no histórico.

#### 12. Integridade
- Não pode existir produto sem `owner_type`, `owner_id` ou `name`.
- `school_details` só deve existir se `owner_type = school`.
- O produto é a raiz estrutural do item.
- Disponibilidade e operação real vivem ao nível de `ProductVariant`.

#### 13. Validações recomendadas
- `name` obrigatório
- validar que `category_id` existe e está ativa, quando enviado
- validar valores permitidos de `status`
- não permitir alteração de `owner_type`
- não permitir alteração de `owner_id`
- validar que cada `size_id` enviado nas variantes existe e está ativo
- validar coerência entre `size_id` e `size_system_id` da categoria, se aplicável
- validar que todas as `color_ids` existem e estão ativas
- validar que todos os `media_ids` pertencem ao mesmo produto, quando enviados
- não permitir delete com faturação ou dependências críticas
- usar `archived` quando o produto já não deve estar ativo mas não pode ser apagado

---

## Endpoints — ProductVariant

## Endpoints da entidade ProductVariant

  

### Base

  

- `POST /inventory/products/{productId}/variants`

- `GET /inventory/products/{productId}/variants`

- `GET /inventory/variants/{variantId}`

- `PUT /inventory/variants/{variantId}`

- `DELETE /inventory/variants/{variantId}`

  

---

  

### Regras / lógicas chave

  

#### 1. Autenticação

- Apenas utilizadores autenticados podem aceder aos endpoints de `ProductVariant`.

  

#### 2. Permissões

- As permissões da variant devem seguir as permissões do `Product` pai.

- Variantes de produtos `member` seguem permissões member.

- Variantes de produtos `school` seguem permissões school.

  

#### 3. Leitura

- `GET /inventory/products/{productId}/variants` devolve as variantes do produto.

- `GET /inventory/variants/{variantId}` devolve o detalhe da variante.

- O detalhe deve incluir:

  - `size`

  - `colors`

  - `media`

  - estado

  - disponibilidade resumida

  - informação de listagem, se necessário

  

#### 4. Criação

- `POST /inventory/products/{productId}/variants` cria uma nova variante.

- Deve aceitar:

  - `size_id`

  - `condition`

  - `sku`

  - `status`

  - `acquisition_type`

  - `acquired_at`

  - `internal_notes`

  - `public_notes`

  - `color_ids` (opcional)

  - `media_ids` (opcional)

  - `media` (opcional)

- `productId` tem de existir.

  

#### 5. Variant gere os seus dependentes

- `VariantColor` não deve ter CRUD próprio público.

- `VariantMedia` não deve ter CRUD próprio público.

- O `POST/PUT` de `ProductVariant` deve gerir:

  - cores da variante

  - associação de imagens da variante

- O utilizador pode adicionar imagens ao criar/editar a variante, mas os ficheiros devem ser guardados ao nível do `Product`.

- Depois dessas imagens devem ficar associadas à variante através de `VariantMedia`.

  

#### 6. Tamanho

- Se `size_id` for enviado, o tamanho tem de existir e estar ativo.

- Se a categoria do produto tiver `size_system_id`, o `size_id` deve pertencer a esse sistema.

  

#### 7. Estado da variante

- O `status` da variante deve representar o estado operacional/resumido da própria variante.

- Pode incluir, por exemplo:

  - `available`

  - `reserved`

  - `in_use`

  - `maintenance`

  - `inactive`

  - `sold`

  - `donated`

- Este estado não deve ser usado para dizer se a variante está listada ou não.

  

#### 8. Listing vs disponibilidade

- A lógica de “estar listada” deve ser separada do `status` da variante.

- Uma variante pode:

  - estar listada

  - não estar listada

- E independentemente disso pode estar:

  - disponível

  - indisponível temporariamente

  - emprestada

  - em manutenção

- A disponibilidade temporal real deve vir de `VariantBooking`.

  

#### 9. Aquisição

- `acquisition_type` ajuda a identificar origem da peça.

- Valores possíveis:

  - `purchased`

  - `donated`

  - `school_owned`

  - `other`

- `acquired_at` ajuda a construir a timeline.

  

#### 10. Edição

- `PUT /inventory/variants/{variantId}` altera os campos da variante e respetivos dados dependentes.

- Deve permitir:

  - atualizar `color_ids`

  - atualizar `media_ids`

  - adicionar imagens novas ao produto e associá-las à variante

- Alterações a `size_id` devem manter coerência com a categoria/sistema de tamanhos.

- Alterações a `status` devem ser coerentes com bookings ativos.

  

#### 11. Remoção

- `DELETE /inventory/variants/{variantId}` faz soft delete da variante.

- Não deve permitir remoção se a variante tiver dependências operacionais relevantes, por exemplo:

  - bookings

  - faturação

  - histórico crítico

- Se houver dependências, o endpoint deve devolver erro explícito.

  

#### 12. Integridade

- Não pode existir variante sem produto.

- `size_id`, quando enviado, tem de ser válido e ativo.

- Cores inativas não devem poder ser usadas em novos creates/edits.

- A associação de `media_ids` só pode usar imagens que pertençam ao mesmo `Product`.

- A variante é a unidade concreta do inventário para estado e calendário.

  

#### 13. Validações recomendadas

- validar que `productId` existe

- validar que `size_id` existe e está ativo, quando enviado

- validar coerência entre `size_id` e `size_system_id` da categoria, se aplicável

- validar valores permitidos de `condition`

- validar valores permitidos de `status`

- validar valores permitidos de `acquisition_type`

- validar que todas as `color_ids` existem e estão ativas

- validar que todos os `media_ids` pertencem ao mesmo produto

- não permitir delete com dependências críticas

- distinguir claramente listagem de disponibilidade

---

## Endpoints — VariantBooking

## Endpoints da entidade VariantBooking  

  

### Base  

  

- `POST /inventory/variants/{variantId}/bookings`  

- `GET /inventory/variants/{variantId}/bookings`  

- `GET /inventory/bookings/{bookingId}`  

- `PUT /inventory/bookings/{bookingId}`  

- `DELETE /inventory/bookings/{bookingId}`  

  

---  

  

### Regras / lógicas chave  

  

#### 1. Autenticação  

- Apenas utilizadores autenticados podem aceder aos endpoints de `VariantBooking`.  

  

#### 2. Permissões  

- As permissões do booking devem seguir o contexto da variante/produto pai.  

- Bookings de variantes de produtos `member` só podem ser geridos por quem gere esse produto, salvo permissões administrativas.  

- Bookings de variantes de produtos `school` só podem ser geridos por perfis com permissão de gestão do inventário da escola.  

- A leitura pode ser mais ampla para perfis internos que precisem de consultar disponibilidade.  

  

#### 3. Leitura  

- `GET /inventory/variants/{variantId}/bookings` devolve os bookings da variante.  

- `GET /inventory/bookings/{bookingId}` devolve o detalhe de um booking.  

- A listagem pode suportar:  

  - filtro por `status`  

  - filtro por `booking_type`  

  - filtro por período (`start_at`, `end_at`)  

- A ordenação deve ser cronológica por `start_at`.  

  

#### 4. Criação  

- `POST /inventory/variants/{variantId}/bookings` cria um booking para a variante.  

- Deve aceitar os campos próprios do modelo:  

  - `booking_type`  

  - `status`  

  - `start_at`  

  - `end_at`  

  - `actual_start_at`  

  - `actual_end_at`  

  - `title`  

  - `notes`  

- `variantId` tem de existir.  

- `booking_type`, `start_at` e `end_at` devem ser obrigatórios.  

- `status` pode ter default simples, por exemplo `pending`.  

  

#### 5. Tipos de booking  

- `booking_type` opções:  

  - `reservation`  

  - `loan`  

  - `rent`  

  - `school_use`  

  - `maintenance`  

  - `blocked`  

- O tipo define a natureza da ocupação temporal da variante.  

  

#### 6. Estado do booking  

- `status` opções:  

  - `pending`  

  - `confirmed`  

  - `active`  

  - `completed`  

  - `cancelled`  

- `pending` pode ser usado para pré-reserva.  

- `overdue` não precisa de existir persistido; pode ser calculado dinamicamente.  

  

#### 7. Datas  

- `start_at` tem de ser anterior a `end_at`.  

- `actual_start_at` e `actual_end_at` são opcionais.  

- `actual_end_at` pode ser usado para marcar o fecho real do booking.  

- O booking é a base da timeline e da disponibilidade da variante.  

  

#### 8. Overlap  

- Não deve ser possível criar ou editar bookings com overlap indevido na mesma variante.  

- O sistema deve bloquear sobreposição entre bookings ativos da mesma variante.  

- Estados que normalmente contam para bloqueio:  

  - `pending`  

  - `confirmed`  

  - `active`  

- A regra pode ser ajustada conforme o comportamento final desejado para pré-reservas.  

  

#### 9. Edição  

- `PUT /inventory/bookings/{bookingId}` altera um booking existente.  

- Deve permitir editar apenas os campos do próprio booking.  

- A edição deve continuar a validar:  

  - coerência das datas  

  - ausência de overlap indevido  

  - coerência do estado  

- Não deve permitir alterar a `variant` do booking.  

  

#### 10. Estado da variante vs bookings  

- `VariantBooking` é a fonte principal para disponibilidade temporal.  

- O `status` da `ProductVariant` deve ser coerente com os bookings ativos.  

- Exemplo:  

  - se existir booking ativo de `loan`, a variante não deve ser apresentada como livre nesse período  

- O endpoint pode devolver campos derivados úteis, por exemplo:  

  - `is_currently_available`  

  - `is_overdue`  

  

#### 11. Remoção  

- `DELETE /inventory/bookings/{bookingId}` faz soft delete do booking.  

- Não deve permitir remoção se existir dependência crítica, por exemplo faturação ou histórico fechado que tenha de ser preservado.  

- Em muitos casos, o mais correto pode ser usar `status = cancelled` ou `status = completed` em vez de apagar.  

  

#### 12. Integridade  

- Não pode existir booking sem variante.  

- Não deve ser possível partir o histórico temporal da variante.  

- A variante é a unidade concreta de calendário no inventário.  

  

#### 13. Regras de negócio  

- `VariantBooking` representa a ocupação temporal real da variante.  

- Serve para calendário, timeline e controlo de disponibilidade.  

- Pode existir sem qualquer fluxo de marketplace.  

- Permite registar:  

  - reservas  

  - empréstimos  

  - alugueres  

  - uso interno da escola  

  - manutenção  

  - bloqueios manuais  

  

#### 14. Simplicidade  

- Este módulo deve manter-se simples.  

- O foco principal é:  

  - criar bookings  

  - listar bookings da variante  

  - editar bookings  

  - impedir overlaps  

  - alimentar a timeline e disponibilidade  

  

#### 15. Validações recomendadas  

- validar que `variantId` existe  

- validar valores permitidos de `booking_type`  

- validar valores permitidos de `status`  

- validar que `start_at < end_at`  

- validar ausência de overlap indevido  

- não permitir alteração da variante do booking  

- não permitir delete quando existir dependência crítica  

- mensagens de erro claras quando já existe conflito temporal

---

## Error Codes

- `DuplicateSizeSystemName` - SizeSystem - quando se tenta criar um sistema de tamanhos com nome já existente  

- `SizeSystemInUse` - SizeSystem - quando se tenta apagar um size system que já está a ser usado por categorias ou tamanhos  

- `ImmutableCategorySizeSystem` - Category - quando se tenta alterar o `size_system_id` depois da criação  

  

- `DuplicateSizeInSystem` - Size - quando se tenta criar um size com `name` já existente dentro do mesmo `SizeSystem`  

- `SizeInUse` - Size - quando se tenta apagar um size que já está a ser usado por variantes  

- `InvalidSizeForCategory` - ProductVariant - quando o `size_id` não pertence ao `size_system` da categoria do produto  

  

- `DuplicateCategoryNameInLevel` - Category - quando se tenta criar/editar uma categoria com o mesmo nome no mesmo nível hierárquico  

- `InvalidParentCategory` - Category - quando o `parent_category_id` não existe ou não é válido  

- `CategorySelfReference` - Category - quando a categoria tenta apontar para si própria como parent  

- `CategoryHierarchyCycle` - Category - quando a alteração da hierarquia cria um ciclo  

- `CategoryHasAssociatedProducts` - Category - quando se tenta apagar uma categoria que tem produtos associados a ela ou às suas subcategorias  

  

- `DuplicateColorName` - Color - quando se tenta criar uma cor com nome já existente  

- `DuplicateColorHexCode` - Color - quando se tenta criar uma cor com `hex_code` já existente, se essa regra for aplicada  

- `InvalidHexCode` - Color - quando o `hex_code` não tem formato válido  

- `ColorInUse` - Color - quando se tenta apagar uma cor que já está associada a variantes  

  

- `ImmutableProductOwner` - Product - quando se tenta alterar `owner_type` ou `owner_id`  

- `InvalidSchoolDetailsForOwner` - Product - quando se tenta criar/editar `school_details` num produto que não é `school`  

- `ProductHasCriticalDependencies` - Product - quando se tenta apagar um produto com dependências críticas  

- `ProductHasBillingDependencies` - Product - quando se tenta apagar um produto que já tem faturação associada  

  

- `InvalidVariantMediaAssociation` - ProductVariant - quando se tenta associar `media_ids` que não pertencem ao mesmo produto da variante  

- `VariantHasCriticalDependencies` - ProductVariant - quando se tenta apagar uma variante com dependências críticas  

- `VariantHasBillingDependencies` - ProductVariant - quando se tenta apagar uma variante com faturação associada  

  

- `BookingOverlap` - VariantBooking - quando existe conflito temporal com outro booking da mesma variante  

- `InvalidBookingDateRange` - VariantBooking - quando `start_at` não é anterior a `end_at`  

- `BookingVariantImmutable` - VariantBooking - quando se tenta alterar a variante de um booking existente  

- `BookingHasCriticalDependencies` - VariantBooking - quando se tenta apagar um booking com dependências críticas  

  

- `InvalidNestedVariantPayload` - Product - quando o array `variants` enviado no create do produto tem estrutura inválida  

- `AtomicCreateFailed` - Product - quando a criação aninhada de produto e dependentes falha e a operação tem de ser revertida

---

## Tests

# Testes críticos do módulo Inventory  

  

## 1. Configuração base  

  

- Criar `SizeSystem` com nome válido  

- Impedir criação de `SizeSystem` duplicado  

- Criar `Size` associado a um `SizeSystem`  

- Impedir criação de `Size` duplicado dentro do mesmo `SizeSystem`  

- Permitir o mesmo `Size.name` em `SizeSystem` diferentes  

- Criar `Category` com e sem `parent_category_id`  

- Impedir ciclos na hierarquia de `Category`  

- Impedir duplicação de `Category.name` no mesmo nível  

- Criar `Color` com `name` e `hex_code`  

- Impedir criação de `Color` com `name` duplicado  

- Impedir `hex_code` inválido  

  

## 2. Ativação / desativação de referências  

  

- Desativar `Category`, `Size`, `Color` e garantir que continuam legíveis em histórico  

- Impedir uso de `Category` inativa na criação/edição de `Product`  

- Impedir uso de `Size` inativo na criação/edição de `ProductVariant`  

- Impedir uso de `Color` inativa na criação/edição de `ProductVariant`  

- Reativar referência e voltar a permitir uso operacional  

  

## 3. Criação de Product  

  

- Criar `Product` member via `POST /inventory/products` e validar `owner_type = member`  

- Criar `Product` school via `POST /inventory/school/products` e validar `owner_type = school`  

- Impedir alteração posterior de `owner_type` e `owner_id`  

- Criar `Product` com `media`  

- Criar `Product` school com `school_details`  

- Impedir `school_details` em produto member  

- Criar `Product` com array de `variants`  

- Garantir atomicidade: se falhar uma variant, o produto não é criado  

  

## 4. Leitura de Product  

  

- `GET /inventory/products` devolve payload compacto para cards  

- `GET /inventory/products` devolve top 5 imagens do produto  

- `GET /inventory/products/{id}` devolve payload completo  

- `GET /inventory/products/{id}` devolve variants aninhadas com:  

  - size  

  - colors  

  - media  

  - estado/disponibilidade  

- `GET /inventory/products/{id}` devolve `school_details` apenas para produtos school  

  

## 5. Edição de Product  

  

- Editar campos simples do produto  

- Editar `media` do produto:  

  - adicionar imagem  

  - remover imagem  

  - alterar ordenação  

  - trocar imagem principal  

- Editar `school_details` em produto school  

- Impedir edição de `school_details` em produto member  

- Impedir alteração de `owner_type`  

- Impedir alteração de `owner_id`  

  

## 6. Criação e edição de ProductVariant  

  

- Criar `ProductVariant` com `size_id` válido  

- Impedir criação com `size_id` incompatível com o `size_system` da `Category`  

- Criar `ProductVariant` com `color_ids`  

- Criar `ProductVariant` com `media_ids`  

- Criar `ProductVariant` com imagens novas e validar que ficam guardadas em `ProductMedia`  

- Validar associação de imagens à variante via `VariantMedia`  

- Impedir associação de `media_ids` que pertencem a outro produto  

- Editar `ProductVariant` e atualizar:  

  - `size_id`  

  - `color_ids`  

  - `media_ids`  

  - `status`  

  - `condition`  

- Impedir uso de `Color` inativa  

- Impedir uso de `Size` inativo  

  

## 7. Listagem vs disponibilidade da variant  

  

- Validar que uma variant pode estar listada e disponível  

- Validar que uma variant pode estar listada e indisponível  

- Validar que `status` da variant não é usado como fonte única de listing  

- Validar que a disponibilidade real é derivada dos `VariantBooking`  

  

## 8. ProductMedia e VariantMedia  

  

- Validar que imagens de variante são guardadas ao nível do produto  

- Validar que uma imagem de produto pode estar associada a várias variants  

- Validar que `VariantMedia` não duplica a mesma associação `variant + product_media`  

- Validar que remover uma imagem do produto trata corretamente as associações a variants  

  

## 9. VariantBooking  

  

- Criar `VariantBooking` válido  

- Impedir booking com `start_at >= end_at`  

- Impedir overlap entre bookings ativos da mesma variant  

- Permitir bookings sem marketplace  

- Criar booking `pending` como pré-reserva  

- Editar booking sem permitir alteração da variant  

- Calcular corretamente estado overdue de forma derivada  

- Validar impacto do booking na disponibilidade da variant  

  

## 10. Soft delete e dependências  

  

- Soft delete de `Category` sem produtos associados  

- Impedir delete de `Category` com produtos associados no ramo  

- Soft delete de `Size` sem variantes associadas  

- Impedir delete de `Size` com variantes associadas  

- Soft delete de `Color` sem variantes associadas  

- Impedir delete de `Color` com variantes associadas  

- Impedir delete de `Product` com dependências críticas  

- Impedir delete de `Product` com faturação  

- Impedir delete de `ProductVariant` com dependências críticas  

- Impedir delete de `VariantBooking` com dependências críticas  

  

## 11. Archived / histórico  

  

- Arquivar `Product` e garantir que deixa de estar ativo operacionalmente  

- Garantir que produto archived continua visível no histórico  

- Garantir que referências inativas continuam legíveis em entidades antigas  

  

## 12. Permissões críticas  

  

- Utilizador sem autenticação não consegue aceder aos endpoints protegidos  

- Utilizador sem permissão school não consegue criar/editar produtos school  

- Utilizador member não consegue editar produto de outro member  

- Utilizador sem permissão de gestão não consegue criar/editar referências administrativas  

- Utilizador com permissão adequada consegue executar fluxos completos no seu contexto  

  

## 13. Seeds / dados iniciais  

  

- Seeds de `Color` carregam corretamente  

- Seeds de `SizeSystem` e `Size` carregam corretamente  

- Seeds de `Category` e subcategorias carregam corretamente  

- Dados seeded podem ser usados para criar produtos e variants sem erro  

  

## 14. Fluxos end-to-end mais importantes  

  

- Criar produto school completo com:  

  - media  

  - school_details  

  - variants  

  - colors  

  - variant media  

- Criar produto member completo com:  

  - media  

  - variants  

  - colors  

  - variant media  

- Criar variant booking e refletir indisponibilidade na leitura do produto  

- Arquivar produto com histórico existente  

- Impedir remoções que partam histórico ou faturação

### SizeSystem

## 1. SizeSystem  

  

### Objetivo  

Criar os sistemas base de tamanhos para o inventário.  

  

### Registos exemplo  

- `ClothingAdult`  

- `ClothingKids`  

- `ShoesEU`  

- `OneSize`  

  

### Exemplo básico  

```json  

[  

  {  

    "name": "ClothingAdult",  

    "is_active": true  

  },  

  {  

    "name": "ClothingKids",  

    "is_active": true  

  },  

  {  

    "name": "ShoesEU",  

    "is_active": true  

  },  

  {  

    "name": "OneSize",  

    "is_active": true  

  }  

]

### Size

## 2. Size  

  

### Objetivo  

Criar tamanhos mínimos para cada `SizeSystem`.  

  

### Registos exemplo  

- para `ClothingAdult`: `XS`, `S`, `M`, `L`  

- para `ClothingKids`: `4Y`, `6Y`, `8Y`, `10Y`  

- para `ShoesEU`: `36`, `37`, `38`, `39`  

- para `OneSize`: `One Size`  

  

### Exemplo básico  

```json  

[  

  {  

    "name": "XS",  

    "sort_order": 1,  

    "size_system": "ClothingAdult",  

    "is_active": true  

  },  

  {  

    "name": "S",  

    "sort_order": 2,  

    "size_system": "ClothingAdult",  

    "is_active": true  

  },  

  {  

    "name": "M",  

    "sort_order": 3,  

    "size_system": "ClothingAdult",  

    "is_active": true  

  },  

  {  

    "name": "L",  

    "sort_order": 4,  

    "size_system": "ClothingAdult",  

    "is_active": true  

  }  

]

### Categories

## 4. Category  

  

### Objetivo  

Criar categorias e subcategorias mínimas para organizar o catálogo.  

  

### Registos exemplo  

- `Costumes`  

  - `Ballet`  

  - `Contemporary`  

- `Accessories`  

- `Shoes`  

  

### Exemplo básico  

```json  

[  

  {  

    "name": "Costumes",  

    "parent_category": null,  

    "sort_order": 1,  

    "is_active": true,  

    "size_system": "ClothingAdult"  

  },  

  {  

    "name": "Ballet",  

    "parent_category": "Costumes",  

    "sort_order": 1,  

    "is_active": true,  

    "size_system": "ClothingAdult"  

  },  

  {  

    "name": "Accessories",  

    "parent_category": null,  

    "sort_order": 2,  

    "is_active": true,  

    "size_system": "OneSize"  

  },  

  {  

    "name": "Shoes",  

    "parent_category": null,  

    "sort_order": 3,  

    "is_active": true,  

    "size_system": "ShoesEU"  

  }  

]

---

## Bruno Collection

Criar endpoints no Bruno collection para todos os endpoints do módulo Inventory.
