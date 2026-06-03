/**
 * Shared page-content width.
 *
 * Single source of truth for how wide the main content column may grow.
 *
 * Why this exists: pages used to hardcode a fixed `max-w-6xl` (1152px). On
 * large/ultra-wide monitors that left the content stranded in a narrow column
 * with huge empty margins. Instead of a fixed cap we let the content grow with
 * the viewport — filling the space on bigger screens while still keeping a
 * generous reading cap so tables and text never get absurdly wide on ultrawide
 * displays. Horizontal breathing room scales via responsive padding (see
 * `PageLayout`), so margins grow proportionally with the screen.
 *
 * Usage: replace any `mx-auto w-full max-w-6xl` content wrapper with
 * `cn(PAGE_CONTENT, ...)`. For full-height (table) pages keep the flex chain:
 * `cn(PAGE_CONTENT, 'flex flex-col flex-1 min-h-0')`.
 */
export const PAGE_CONTENT = 'mx-auto w-full max-w-[1600px]'
