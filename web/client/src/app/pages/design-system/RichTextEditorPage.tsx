import { useState } from 'react'
import {
  RichTextEditor,
  SanitizedHtml,
} from '@/components/shared/RichTextEditor'

const SEED_HTML = `
<h2>Spring Showcase 2026</h2>
<p>Join us for our biggest event of the year. Performances from <strong>every modality</strong> — contemporary, ballet, hip-hop and more.</p>
<ul>
  <li>Saturday, May 30 · 7:00 PM</li>
  <li>Auditório Municipal, Lisboa</li>
  <li>Tickets €15 (€10 students)</li>
</ul>
<p>Got questions? <a href="mailto:info@studioos.app">Email us</a>.</p>
`.trim()

async function fakeUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function RichTextEditorPage() {
  const [html, setHtml] = useState(SEED_HTML)

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Rich text editor</h1>
        <p className="mt-1 text-muted-foreground">
          TipTap-based editor used for event promo content and other long-form
          fields.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Default</h2>
        <RichTextEditor
          value={html}
          onChange={setHtml}
          onImageUpload={fakeUpload}
          showCount
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Rendered output (SanitizedHtml)
        </h2>
        <div className="rounded-md border border-border bg-background p-4">
          <SanitizedHtml html={html} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">HTML source</h2>
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-[11px] leading-relaxed">
          {html}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Disabled</h2>
        <RichTextEditor value={html} onChange={() => {}} disabled />
      </section>
    </div>
  )
}
