import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { StarterKit } from '@tiptap/starter-kit'
import { Link } from '@tiptap/extension-link'
import { ResizableImage } from './rich-text/ImageNodeView'
import { SlashCommand } from './rich-text/SlashCommand'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { FontSize, TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from '@tiptap/extension-table'
import { Youtube } from '@tiptap/extension-youtube'
import { CharacterCount } from '@tiptap/extension-character-count'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import DOMPurify from 'dompurify'
import { cleanPastedHtml } from './rich-text/paste-cleanup'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
  Youtube as YoutubeIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
  id?: string
  showCount?: boolean
  /** Hook to upload images. Receives a File and must resolve to a hosted URL. */
  onImageUpload?: (file: File) => Promise<string>
}

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'hr',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'iframe',
]

const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'style',
  'class',
  'data-*',
  'colspan',
  'rowspan',
  'width',
  'height',
  'frameborder',
  'allow',
  'allowfullscreen',
]

export function sanitizeHtml(input: string) {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target'],
    ADD_TAGS: ['iframe'],
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
        // First top-level child never gets a top margin — keeps the rendered
        // content flush with whatever container it sits in (card padding,
        // list-row padding, etc.).
        '[&>*:first-child]:mt-0',
        '[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:mt-6 [&_h1]:mb-2',
        '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-6 [&_h2]:mb-2',
        '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:mt-4 [&_h3]:mb-2',
        '[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1',
        '[&_p]:my-2',
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-0.5',
        '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]',
        '[&_pre]:my-3 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs',
        '[&_img]:my-3 [&_img]:block [&_img]:rounded-md [&_img]:max-h-[640px] [&_img]:h-auto',
        '[&_img[data-align=center]]:mx-auto',
        '[&_img[data-align=left]]:mr-auto [&_img[data-align=left]]:ml-0',
        '[&_img[data-align=right]]:ml-auto [&_img[data-align=right]]:mr-0',
        '[&_hr]:my-4 [&_hr]:border-border',
        '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse',
        '[&_table_td]:border [&_table_td]:border-border [&_table_td]:px-2 [&_table_td]:py-1 [&_table_td]:align-top',
        '[&_table_th]:border [&_table_th]:border-border [&_table_th]:bg-muted [&_table_th]:px-2 [&_table_th]:py-1 [&_table_th]:text-left [&_table_th]:font-semibold',
        '[&_iframe]:my-3 [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-md',
        className
      )}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}

const PROMO_COLORS = [
  '#0f172a',
  '#475569',
  '#94a3b8',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
]

const HIGHLIGHT_COLORS = [
  '#fef08a',
  '#fed7aa',
  '#fecaca',
  '#bbf7d0',
  '#bae6fd',
  '#ddd6fe',
  '#fbcfe8',
]

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
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          className={cn(
            'size-8 rounded-md text-muted-foreground hover:text-foreground',
            active && 'bg-accent text-foreground'
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

function LinkPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const isActive = editor.isActive('link')

  const openPopover = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    setUrl(prev ?? 'https://')
    setOpen(true)
  }

  const apply = () => {
    const trimmed = url.trim()
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
          href: trimmed,
          target: '_blank',
          rel: 'noopener noreferrer',
        })
        .run()
    }
    setOpen(false)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Link"
            aria-pressed={isActive}
            onMouseDown={(e) => e.preventDefault()}
            onClick={openPopover}
            className={cn(
              'size-8 rounded-md text-muted-foreground hover:text-foreground',
              isActive && 'bg-accent text-foreground'
            )}
          >
            <LinkIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rte-link-url" className="text-xs">
                URL
              </Label>
              <Input
                id="rte-link-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    apply()
                  }
                }}
              />
            </div>
            <div className="flex justify-between gap-2">
              {isActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run()
                    setOpen(false)
                  }}
                >
                  Remove
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" size="sm" onClick={apply}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
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

function ColorPopover({ editor }: { editor: Editor }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Text color"
          onMouseDown={(e) => e.preventDefault()}
          className="size-8 rounded-md text-muted-foreground hover:text-foreground"
        >
          <Palette className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-6 gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="flex h-6 w-6 items-center justify-center rounded border border-border text-[10px] text-muted-foreground hover:bg-accent"
            aria-label="Reset color"
          >
            ×
          </button>
          {PROMO_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => editor.chain().focus().setColor(c).run()}
              className="h-6 w-6 rounded border border-border"
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function HighlightPopover({ editor }: { editor: Editor }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Highlight"
          aria-pressed={editor.isActive('highlight')}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            'size-8 rounded-md text-muted-foreground hover:text-foreground',
            editor.isActive('highlight') && 'bg-accent text-foreground'
          )}
        >
          <Highlighter className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            className="flex h-6 w-6 items-center justify-center rounded border border-border text-[10px] text-muted-foreground hover:bg-accent"
            aria-label="Reset highlight"
          >
            ×
          </button>
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHighlight({ color: c }).run()
              }
              className="h-6 w-6 rounded border border-border"
              style={{ backgroundColor: c }}
              aria-label={`Highlight ${c}`}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const FONT_SIZES = [
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '14px' },
  { label: 'Medium', value: '16px' },
  { label: 'Large', value: '18px' },
  { label: 'X-Large', value: '22px' },
  { label: 'Huge', value: '28px' },
]

function FontSizeControl({ editor }: { editor: Editor }) {
  const current =
    (editor.getAttributes('textStyle').fontSize as string | undefined) ?? ''
  const label = FONT_SIZES.find((s) => s.value === current)?.label ?? 'Size'
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Font size"
              onMouseDown={(e) => e.preventDefault()}
              className="h-8 gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {label}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Font size</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-36 p-1">
        <ul className="space-y-0.5">
          <li>
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetFontSize().run()}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              Reset
            </button>
          </li>
          {FONT_SIZES.map((s) => (
            <li key={s.value}>
              <button
                type="button"
                onClick={() =>
                  editor.chain().focus().setFontSize(s.value).run()
                }
                className={cn(
                  'flex w-full items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-accent',
                  current === s.value && 'bg-accent font-medium'
                )}
              >
                <span style={{ fontSize: s.value }}>{s.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {s.value}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

interface ImageControlProps {
  editor: Editor
  onImageUpload?: (file: File) => Promise<string>
}

function ImageControl({ editor, onImageUpload }: ImageControlProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')

  const insertUrl = () => {
    const trimmed = url.trim()
    if (!trimmed) return
    editor.chain().focus().setImage({ src: trimmed, alt: '' }).run()
    setUrl('')
    setOpen(false)
  }

  const handleFile = async (file: File) => {
    if (!onImageUpload) {
      const reader = new FileReader()
      reader.onload = () => {
        const src = String(reader.result)
        editor.chain().focus().setImage({ src, alt: file.name }).run()
      }
      reader.readAsDataURL(file)
      return
    }
    try {
      const src = await onImageUpload(file)
      editor.chain().focus().setImage({ src, alt: file.name }).run()
    } catch (err) {
      console.error('Image upload failed', err)
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Image"
            onMouseDown={(e) => e.preventDefault()}
            className="size-8 rounded-md text-muted-foreground hover:text-foreground"
          >
            <ImageIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                fileRef.current?.click()
                setOpen(false)
              }}
            >
              Upload from device
            </Button>
            <div className="space-y-1.5">
              <Label htmlFor="rte-image-url" className="text-xs">
                …or paste a URL
              </Label>
              <Input
                id="rte-image-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…/image.jpg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    insertUrl()
                  }
                }}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={insertUrl}
                disabled={!url.trim()}
              >
                Insert
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}

function YoutubePopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const insert = () => {
    const trimmed = url.trim()
    if (!trimmed) return
    editor.commands.setYoutubeVideo({ src: trimmed })
    setUrl('')
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Embed YouTube"
          onMouseDown={(e) => e.preventDefault()}
          className="size-8 rounded-md text-muted-foreground hover:text-foreground"
        >
          <YoutubeIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rte-youtube" className="text-xs">
              YouTube URL
            </Label>
            <Input
              id="rte-youtube"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  insert()
                }
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={insert}
              disabled={!url.trim()}
            >
              Embed
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TableControl({ editor }: { editor: Editor }) {
  return (
    <ToolbarButton
      onClick={() =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
      }
      label="Insert table"
    >
      <TableIcon className="size-4" />
    </ToolbarButton>
  )
}

function CharCount({ editor }: { editor: Editor }) {
  const [n, setN] = useState(
    () => editor.storage.characterCount?.characters?.() ?? 0
  )
  useEffect(() => {
    const update = () =>
      setN(editor.storage.characterCount?.characters?.() ?? 0)
    editor.on('update', update)
    return () => {
      editor.off('update', update)
    }
  }, [editor])
  return (
    <span className="font-mono text-[11px] text-muted-foreground">
      {n} chars
    </span>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 280,
  disabled = false,
  id,
  showCount = true,
  onImageUpload,
}: RichTextEditorProps) {
  const lastEmitted = useRef<string>(value ?? '')

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
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
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'rounded-md' },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'rte-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: { class: 'rounded-md' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
      SlashCommand,
      Placeholder.configure({
        placeholder: placeholder ?? 'Write something amazing…',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'tiptap rich-text max-w-none text-sm text-foreground focus:outline-none',
          'px-4 py-3 min-h-full'
        ),
      },
      transformPastedHTML: (html) => cleanPastedHtml(html),
      handleDrop(view, event, _slice, moved) {
        if (moved) return false
        const files = Array.from(event.dataTransfer?.files ?? [])
        const image = files.find((f) => f.type.startsWith('image/'))
        if (!image) return false
        event.preventDefault()
        const insert = (src: string) => {
          const { state } = view
          const node = state.schema.nodes.image.create({ src, alt: image.name })
          const tr = state.tr.replaceSelectionWith(node)
          view.dispatch(tr)
        }
        if (onImageUpload) {
          onImageUpload(image)
            .then(insert)
            .catch((e) => console.error(e))
        } else {
          const reader = new FileReader()
          reader.onload = () => insert(String(reader.result))
          reader.readAsDataURL(image)
        }
        return true
      },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files ?? [])
        const image = files.find((f) => f.type.startsWith('image/'))
        if (!image) return false
        event.preventDefault()
        const insert = (src: string) => {
          const { state } = view
          const node = state.schema.nodes.image.create({ src, alt: image.name })
          const tr = state.tr.replaceSelectionWith(node)
          view.dispatch(tr)
        }
        if (onImageUpload) {
          onImageUpload(image)
            .then(insert)
            .catch((e) => console.error(e))
        } else {
          const reader = new FileReader()
          reader.onload = () => insert(String(reader.result))
          reader.readAsDataURL(image)
        }
        return true
      },
    },
    onUpdate({ editor }) {
      const html = sanitizeHtml(editor.getHTML())
      lastEmitted.current = html
      onChange(html)
    },
  })

  useEffect(() => {
    if (!editor) return
    const incoming = value ?? ''
    if (incoming !== lastEmitted.current) {
      editor.commands.setContent(incoming, { emitUpdate: false })
      lastEmitted.current = incoming
    }
  }, [value, editor])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [editor, disabled])

  const handleClickSurface = useCallback(() => {
    editor?.chain().focus().run()
  }, [editor])

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-md border border-input bg-background',
          className
        )}
        style={{ minHeight }}
      />
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--muted-foreground);
          pointer-events: none;
          float: left;
          height: 0;
        }
        .tiptap:focus { outline: none; }
        .tiptap h1 { font-size: 1.875rem; font-weight: 600; letter-spacing: -0.025em; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .tiptap h2 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.025em; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .tiptap h3 { font-size: 1rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
        .tiptap p { margin: 0.5rem 0; }
        .tiptap p:first-child { margin-top: 0; }
        .tiptap strong { font-weight: 600; }
        .tiptap a { color: var(--primary); text-decoration: underline; text-underline-offset: 4px; }
        .tiptap ul { list-style: disc; padding-left: 1.25rem; margin: 0.5rem 0; }
        .tiptap ol { list-style: decimal; padding-left: 1.25rem; margin: 0.5rem 0; }
        .tiptap li { margin: 0.125rem 0; }
        .tiptap ul[data-type="taskList"] { list-style: none; padding-left: 0.25rem; }
        .tiptap ul[data-type="taskList"] li { display: flex; gap: 0.5rem; align-items: flex-start; }
        .tiptap ul[data-type="taskList"] li > label { user-select: none; padding-top: 0.125rem; }
        .tiptap ul[data-type="taskList"] li > div { flex: 1; }
        .tiptap blockquote { border-left: 2px solid var(--primary); padding-left: 1rem; color: var(--muted-foreground); margin: 0.75rem 0; }
        .tiptap code { background: var(--muted); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.85em; }
        .tiptap pre { background: var(--muted); padding: 0.75rem; border-radius: 0.375rem; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.75rem; margin: 0.75rem 0; overflow-x: auto; }
        .tiptap img { border-radius: 0.375rem; max-height: 480px; margin: 0.75rem 0; }
        .tiptap hr { border-color: var(--border); margin: 1rem 0; }
        .tiptap .tableWrapper { margin: 0.75rem 0; overflow-x: auto; }
        .tiptap table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .tiptap table td, .tiptap table th { border: 1px solid var(--border); padding: 0.4rem 0.6rem; vertical-align: top; min-width: 4rem; position: relative; }
        .tiptap table th { background: var(--muted); font-weight: 600; text-align: left; }
        .tiptap table p { margin: 0; }
        .tiptap table .selectedCell { background: color-mix(in oklab, var(--primary) 12%, transparent); }
        .tiptap table .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background: var(--primary); opacity: 0; transition: opacity 120ms; cursor: col-resize; }
        .tiptap table:hover .column-resize-handle { opacity: 0.3; }
        .tiptap .column-resize-handle:hover { opacity: 1; }
        .tiptap.resize-cursor { cursor: ew-resize; }
        .tiptap [data-youtube-video] { display: block; margin: 0.75rem 0; }
        .tiptap [data-youtube-video] iframe { aspect-ratio: 16/9; width: 100%; height: auto; border: 0; border-radius: 0.375rem; }
        .tiptap ::selection { background: color-mix(in oklab, var(--primary) 30%, transparent); }
      `}</style>
      <div
        className={cn(
          'rounded-md border border-input bg-background shadow-xs',
          'focus-within:ring-2 focus-within:ring-ring/40',
          disabled && 'opacity-60',
          className
        )}
      >
        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5"
          role="toolbar"
          aria-label="Formatting"
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            active={editor.isActive('paragraph')}
            label="Paragraph"
          >
            <Pilcrow className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor.isActive('heading', { level: 1 })}
            label="Heading 1"
          >
            <Heading1 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive('heading', { level: 2 })}
            label="Heading 2"
          >
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
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
          <ColorPopover editor={editor} />
          <HighlightPopover editor={editor} />
          <FontSizeControl editor={editor} />

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            label="Align left"
          >
            <AlignLeft className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            label="Align center"
          >
            <AlignCenter className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            label="Align right"
          >
            <AlignRight className="size-4" />
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
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            label="Task list"
          >
            <ListTodo className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            label="Quote"
          >
            <Quote className="size-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <LinkPopover editor={editor} />
          <ImageControl editor={editor} onImageUpload={onImageUpload} />
          <YoutubePopover editor={editor} />
          <TableControl editor={editor} />

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

        {/* Bubble menu on text selection */}
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top' }}
          shouldShow={({ editor, from, to }) =>
            from !== to &&
            !editor.isActive('image') &&
            !editor.isActive('table')
          }
        >
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-popover px-1 py-1 shadow-md">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              label="Bold"
            >
              <Bold className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              label="Italic"
            >
              <Italic className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              label="Underline"
            >
              <UnderlineIcon className="size-3.5" />
            </ToolbarButton>
            <LinkPopover editor={editor} />
          </div>
        </BubbleMenu>

        {/* Editor surface */}
        <div
          className="overflow-y-auto"
          style={{ minHeight }}
          onClick={handleClickSurface}
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
