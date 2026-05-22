import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import DOMPurify from 'dompurify'
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: number
  disabled?: boolean
  /** Optional id used to wire a hidden form field for native validation. */
  id?: string
  /** Show a small character count below the editor. */
  showCount?: boolean
}

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h2', 'h3', 'h4', 'blockquote', 'code', 'pre',
  'ul', 'ol', 'li', 'a', 'img', 'hr', 'span',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title']

/** Sanitize an HTML string before sending it to the API or rendering it. */
export function sanitizeHtml(input: string) {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target'],
  })
}

/** Convenience helper for rendering pre-saved HTML safely. */
export function SanitizedHtml({
  html,
  className,
}: {
  html: string
  className?: string
}) {
  const safe = useMemo(() => sanitizeHtml(html ?? ''), [html])
  return (
    <div
      className={cn(
        'rich-text max-w-none text-sm text-foreground leading-relaxed',
        '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-6 [&_h2]:mb-2',
        '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:mt-4 [&_h3]:mb-2',
        '[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1',
        '[&_p]:my-2 [&_p:first-child]:mt-0',
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-0.5',
        '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]',
        '[&_pre]:my-3 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs',
        '[&_img]:my-3 [&_img]:rounded-md [&_img]:max-h-[480px]',
        '[&_hr]:my-4 [&_hr]:border-border',
        className,
      )}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            'size-8 rounded-md text-muted-foreground hover:text-foreground',
            active && 'bg-accent text-foreground',
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function ToolbarDivider() {
  return <Separator orientation="vertical" className="mx-1 h-5" />
}

function LinkControl({ editor }: { editor: Editor }) {
  const { t } = useTranslation()
  const isActive = editor.isActive('link')
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt(t('events.form.bodyHint'), prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    const safe = url.trim()
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: safe, target: '_blank', rel: 'noopener noreferrer' })
      .run()
  }
  return (
    <>
      <ToolbarButton
        onClick={setLink}
        active={isActive}
        label="Link"
      >
        <LinkIcon className="size-4" />
      </ToolbarButton>
      {isActive && (
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          label="Unlink"
        >
          <Unlink className="size-4" />
        </ToolbarButton>
      )}
    </>
  )
}

function ImageControl({ editor }: { editor: Editor }) {
  const insert = () => {
    const url = window.prompt('Image URL', 'https://')
    if (!url) return
    editor.chain().focus().setImage({ src: url, alt: '' }).run()
  }
  return (
    <ToolbarButton onClick={insert} label="Image">
      <ImageIcon className="size-4" />
    </ToolbarButton>
  )
}

function CharCount({ editor }: { editor: Editor }) {
  const [n, setN] = useState(editor.getText().length)
  useEffect(() => {
    const update = () => setN(editor.getText().length)
    editor.on('update', update)
    return () => {
      editor.off('update', update)
    }
  }, [editor])
  return (
    <span className="font-mono text-[11px] text-muted-foreground">
      {n}
    </span>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 220,
  disabled = false,
  id,
  showCount = false,
}: RichTextEditorProps) {
  const { t } = useTranslation()
  const lastEmitted = useRef<string>(value ?? '')

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'text-primary underline underline-offset-4',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'rounded-md max-h-[480px]' },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? t('events.form.bodyPlaceholder'),
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'tiptap rich-text max-w-none text-sm text-foreground focus:outline-none',
          '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-6 [&_h2]:mb-2',
          '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:mt-4 [&_h3]:mb-2',
          '[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1',
          '[&_p]:my-2 [&_p:first-child]:mt-0',
          '[&_strong]:font-semibold [&_strong]:text-foreground',
          '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4',
          '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
          '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_li]:my-0.5',
          '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground',
          '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]',
          '[&_pre]:my-3 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs',
          '[&_img]:my-3 [&_img]:rounded-md [&_img]:max-h-[480px]',
          '[&_hr]:my-4 [&_hr]:border-border',
          'px-4 py-3 min-h-full',
        ),
      },
    },
    onUpdate({ editor }) {
      const html = sanitizeHtml(editor.getHTML())
      lastEmitted.current = html
      onChange(html)
    },
  })

  // External value -> editor (avoid loops by comparing against last emitted html).
  useEffect(() => {
    if (!editor) return
    const incoming = value ?? ''
    if (incoming !== lastEmitted.current) {
      editor.commands.setContent(incoming, { emitUpdate: false })
      lastEmitted.current = incoming
    }
  }, [value, editor])

  // Disabled state changes
  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [editor, disabled])

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-md border border-input bg-background',
          className,
        )}
        style={{ minHeight }}
      />
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      {/* Inline styles required for TipTap Placeholder to display.
          Kept here instead of in index.css so the component is self-contained. */}
      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--muted-foreground);
          pointer-events: none;
          float: left;
          height: 0;
        }
        .tiptap:focus { outline: none; }
        .tiptap ::selection { background: color-mix(in oklab, var(--primary) 30%, transparent); }
      `}</style>
      <div
        className={cn(
          'rounded-md border border-input bg-background shadow-xs',
          'focus-within:ring-2 focus-within:ring-ring/40 focus-within:ring-offset-0',
          disabled && 'opacity-60',
          className,
        )}
      >
        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5"
          role="toolbar"
          aria-label={t('events.form.body')}
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            active={editor.isActive('paragraph')}
            label="Paragraph"
          >
            <Pilcrow className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            label="Heading 2"
          >
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            label="Heading 3"
          >
            <Heading3 className="size-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            label="Bold"
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            label="Italic"
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            label="Underline"
          >
            <UnderlineIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            label="Strikethrough"
          >
            <Strikethrough className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            label="Inline code"
          >
            <Code className="size-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            label="Bullet list"
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            label="Numbered list"
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            label="Quote"
          >
            <Quote className="size-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <LinkControl editor={editor} />
          <ImageControl editor={editor} />

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            label="Undo"
          >
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            label="Redo"
          >
            <Redo2 className="size-4" />
          </ToolbarButton>
        </div>

        {/* Editor surface */}
        <div
          className="overflow-y-auto"
          style={{ minHeight }}
          onClick={() => editor.chain().focus().run()}
        >
          <EditorContent editor={editor} id={id} />
        </div>

        {showCount && (
          <div className="flex justify-end border-t border-border px-3 py-1.5">
            <CharCount editor={editor} />
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
