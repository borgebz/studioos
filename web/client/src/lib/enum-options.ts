/**
 * Helpers for turning generated API enums (from `@/api/studioos-api`) into the
 * `{ value, labelKey }` shape that our `<Select>` / `<RadioGroup>` /
 * `<Combobox>` lists expect — without hand-rolling the value list.
 *
 * Every enum the API exposes already lives in the auto-generated client.
 * If a form needs the labels of one of those enums, do not copy the values
 * into a local `const FOO = [{ value: 'bar', labelKey: '…' }, …]` array.
 * Use `enumOptions(GeneratedEnum, 'domain.fieldName')` instead — that way
 * adding/removing a choice on the API side surfaces as a TypeScript change,
 * not a silent drift between two files.
 *
 * Example:
 *
 *   import { ConditionEnum } from '@/api/studioos-api'
 *   import { enumOptions } from '@/lib/enum-options'
 *
 *   const CONDITIONS = enumOptions(ConditionEnum, 'marketplace.condition')
 *   // → [
 *   //     { value: 'new',       labelKey: 'marketplace.conditionNew' },
 *   //     { value: 'excellent', labelKey: 'marketplace.conditionExcellent' },
 *   //     …
 *   //   ]
 */

export interface EnumOption<V extends string> {
  value: V
  labelKey: string
}

/** Convert a snake_case enum value to PascalCase for i18n key suffixing. */
function toPascalCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')
}

/**
 * Build `{ value, labelKey }` pairs from a generated enum object.
 *
 * The `labelKey` for each entry is `${prefix}${PascalCase(value)}` — e.g.
 * `condition` + `new` → `conditionNew`. This matches the existing translation
 * key convention (e.g. `marketplace.conditionNew`).
 */
export function enumOptions<E extends Record<string, string>>(
  enumObject: E,
  prefix: string,
): EnumOption<E[keyof E]>[] {
  return Object.values(enumObject).map((value) => ({
    value: value as E[keyof E],
    labelKey: `${prefix}${toPascalCase(value)}`,
  }))
}
