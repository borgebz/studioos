/**
 * Extract up to 2 initials from a display name.
 * Returns '?' if the name is empty or undefined.
 */
export function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
