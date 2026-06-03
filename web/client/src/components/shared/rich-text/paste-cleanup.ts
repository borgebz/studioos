/**
 * Best-effort cleanup of HTML pasted from Word, Google Docs, and Pages.
 * Runs in the browser via DOMParser so we get a real tree to walk.
 *
 * We intentionally do NOT try to preserve every quirk of source formatting —
 * promo content benefits from a consistent, simple HTML structure.
 */
export function cleanPastedHtml(rawHtml: string): string {
  if (!rawHtml) return rawHtml

  // Strip Office <!--StartFragment--> / <!--EndFragment--> comments early
  let html = rawHtml
    .replace(/<!--\s*StartFragment\s*-->/g, '')
    .replace(/<!--\s*EndFragment\s*-->/g, '')
    // Strip Office "o:" and "w:" XML namespaces and their content
    .replace(/<\/?(?:o|w|v|st1|m):[^>]*>/g, '')
    // Strip Office conditional comments
    .replace(/<!\[if[\s\S]*?<!\[endif\]>/g, '')
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/g, '')

  let doc: Document
  try {
    doc = new DOMParser().parseFromString(html, 'text/html')
  } catch {
    return html
  }

  // Drop <meta>, <link>, <style>, <script> entirely
  doc.querySelectorAll('meta, link, style, script').forEach((el) => el.remove())

  // Walk all elements and clean
  doc.querySelectorAll<HTMLElement>('*').forEach((el) => {
    // Remove all class attributes (Word/GDocs add wild classes that don't match our CSS)
    el.removeAttribute('class')
    el.removeAttribute('id')
    // Remove font tags' face/size attrs (we strip them below too)
    el.removeAttribute('face')
    el.removeAttribute('size')
    el.removeAttribute('color')
    el.removeAttribute('lang')

    // Filter inline styles: drop mso-*, font-family, color (let theme decide),
    // background-color, line-height etc. Keep text-align so layout is preserved.
    const style = el.getAttribute('style')
    if (style) {
      const kept: string[] = []
      style.split(';').forEach((decl) => {
        const trimmed = decl.trim()
        if (!trimmed) return
        const [prop] = trimmed.split(':').map((s) => s.trim().toLowerCase())
        if (!prop) return
        if (prop.startsWith('mso-')) return
        if (
          prop === 'font-family' ||
          prop === 'font-size' ||
          prop === 'color' ||
          prop === 'background' ||
          prop === 'background-color' ||
          prop === 'line-height' ||
          prop === 'letter-spacing'
        ) {
          return
        }
        kept.push(trimmed)
      })
      if (kept.length) {
        el.setAttribute('style', kept.join('; '))
      } else {
        el.removeAttribute('style')
      }
    }
  })

  // Replace <b> → <strong>, <i> → <em>, <font> → unwrap
  doc.querySelectorAll('b').forEach((el) => unwrapToTag(el, 'strong'))
  doc.querySelectorAll('i').forEach((el) => unwrapToTag(el, 'em'))
  doc.querySelectorAll('font').forEach((el) => unwrap(el))

  // Drop empty paragraphs (Word writes many)
  doc.querySelectorAll('p').forEach((p) => {
    const text = p.textContent?.replace(/ |\s/g, '') ?? ''
    if (!text && p.querySelectorAll('img, br').length === 0) {
      p.remove()
    }
  })

  // Smart-quote / dash sanity (optional, light-touch)
  // Skipping for now — TipTap's input rules already handle these gracefully.

  return doc.body.innerHTML
}

function unwrap(el: HTMLElement) {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

function unwrapToTag(el: HTMLElement, tag: string) {
  const replacement = el.ownerDocument.createElement(tag)
  while (el.firstChild) replacement.appendChild(el.firstChild)
  // Carry over remaining style attribute (after cleanup pass above)
  const style = el.getAttribute('style')
  if (style) replacement.setAttribute('style', style)
  el.replaceWith(replacement)
}
