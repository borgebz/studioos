/**
 * Translate a value supplied by the API (color name, size system, category
 * name, …) using a slug-based i18n lookup.
 *
 * The value is slugified to camelCase and concatenated with the prefix to
 * form an i18n key — e.g. `translateApiValue('inventory.color', 'Cobalt
 * Blue', t)` looks up `inventory.color.cobaltBlue`. When the key is missing
 * the raw value is returned unchanged, so admin-created values that have no
 * translation simply display as-is in both locales.
 *
 * Slug rules:
 * - Drop diacritics: "Vestuário" → "vestuario".
 * - Insert boundaries at camelCase transitions ("ClothingEU" → "clothing Eu",
 *   "KidsAge" → "kids Age") so values that arrive already-camelCased from
 *   the API still slug into clean per-token keys.
 * - Split on any non-alphanumeric run.
 * - The first token is lowercase; subsequent tokens are title-cased.
 *
 * Examples:
 *   "Beige" → "beige"
 *   "Vestuário de Treino" → "vestuarioDeTreino"
 *   "ClothingEU" → "clothingEu"
 *   "KidsHeight" → "kidsHeight"
 *
 * The slug is deterministic — pre-seeded keys in the locale files must use
 * the slugs above. Add new translations by running the value through
 * `apiValueSlug` and using the result as the key.
 */

import type { TFunction } from 'i18next'

function stripDiacritics(s: string): string {
  // ̀-ͯ covers the Combining Diacritical Marks block.
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Split a value into word tokens. Handles spaces, punctuation, and
 * camelCase boundaries so values that arrive already-camelCased (e.g.
 * "ClothingEU") still split into ["Clothing", "EU"].
 */
function tokenize(value: string): string[] {
  const cleaned = stripDiacritics(value).trim()
  // lowercase → Uppercase boundary  ("kidsAge"     → "kids Age")
  // ALLCAPS  → Capitalized boundary ("EUClothing"  → "EU Clothing")
  const withBoundaries = cleaned
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  return withBoundaries.split(/[^A-Za-z0-9]+/).filter(Boolean)
}

export function apiValueSlug(value: string): string {
  const tokens = tokenize(value)
  if (tokens.length === 0) return ''
  return tokens
    .map((tok, i) => {
      const lower = tok.toLowerCase()
      if (i === 0) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')
}

/**
 * Look up a translation for an API-supplied display value. Returns the raw
 * value when the key is missing so admin-created values still render.
 */
export function translateApiValue(
  prefix: string,
  value: string | null | undefined,
  t: TFunction
): string {
  if (value == null || value === '') return ''
  const slug = apiValueSlug(value)
  if (!slug) return value
  const key = `${prefix}.${slug}`
  const translated = t(key, { defaultValue: '__missing__' })
  return translated === '__missing__' ? value : translated
}
