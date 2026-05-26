import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { Extension, type Editor, type Range } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import { Suggestion, type SuggestionProps } from '@tiptap/suggestion'
import {
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Table as TableIcon,
  Youtube as YoutubeIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SlashItem {
  title: string
  description: string
  keywords: string[]
  icon: React.ReactNode
  command: (ctx: { editor: Editor; range: Range }) => void
}

const ITEMS: SlashItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section title',
    keywords: ['h1', 'title'],
    icon: <Heading1 className="size-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Section heading',
    keywords: ['h2'],
    icon: <Heading2 className="size-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Smaller heading',
    keywords: ['h3'],
    icon: <Heading3 className="size-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Bullet list',
    description: 'Unordered list',
    keywords: ['ul', 'list', 'bullet'],
    icon: <List className="size-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered list',
    description: 'Ordered list',
    keywords: ['ol', 'list', 'numbered'],
    icon: <ListOrdered className="size-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Task list',
    description: 'Checklist with checkboxes',
    keywords: ['todo', 'check', 'task'],
    icon: <ListTodo className="size-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: 'Quote',
    description: 'Pull-out blockquote',
    keywords: ['blockquote', 'cite'],
    icon: <Quote className="size-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    keywords: ['hr', 'separator', 'divider', 'line'],
    icon: <Minus className="size-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: 'Table',
    description: '3×3 table with header row',
    keywords: ['table', 'grid'],
    icon: <TableIcon className="size-4" />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: 'Image',
    description: 'Insert image from URL',
    keywords: ['image', 'picture', 'photo'],
    icon: <ImageIcon className="size-4" />,
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL')
      if (!url) {
        editor.chain().focus().deleteRange(range).run()
        return
      }
      editor.chain().focus().deleteRange(range).setImage({ src: url, alt: '' }).run()
    },
  },
  {
    title: 'YouTube',
    description: 'Embed a YouTube video',
    keywords: ['youtube', 'video', 'embed'],
    icon: <YoutubeIcon className="size-4" />,
    command: ({ editor, range }) => {
      const url = window.prompt('YouTube URL')
      if (!url) {
        editor.chain().focus().deleteRange(range).run()
        return
      }
      editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: url }).run()
    },
  },
]

interface SlashListHandle {
  onKeyDown: (e: KeyboardEvent) => boolean
}

const SlashList = forwardRef<SlashListHandle, SuggestionProps<SlashItem>>(
  (props, ref) => {
    const [selected, setSelected] = useState(0)

    useEffect(() => setSelected(0), [props.items])

    useImperativeHandle(ref, () => ({
      onKeyDown(e) {
        if (e.key === 'ArrowDown') {
          setSelected((i) => (i + 1) % props.items.length)
          return true
        }
        if (e.key === 'ArrowUp') {
          setSelected((i) => (i + props.items.length - 1) % props.items.length)
          return true
        }
        if (e.key === 'Enter') {
          const item = props.items[selected]
          if (item) props.command(item)
          return true
        }
        return false
      },
    }))

    if (!props.items.length) {
      return (
        <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
          No matching block
        </div>
      )
    }

    return (
      <div className="max-h-72 w-72 overflow-y-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
        {props.items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            onClick={() => props.command(item)}
            onMouseEnter={() => setSelected(i)}
            className={cn(
              'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent',
              i === selected && 'bg-accent',
            )}
          >
            <span className="flex size-7 items-center justify-center rounded border border-border bg-background text-muted-foreground">
              {item.icon}
            </span>
            <span className="flex-1">
              <span className="block text-xs font-medium text-foreground">
                {item.title}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {item.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    )
  },
)
SlashList.displayName = 'SlashList'

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor
          range: Range
          props: SlashItem
        }) => props.command({ editor, range }),
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }) => {
          const q = query.toLowerCase().trim()
          if (!q) return ITEMS
          return ITEMS.filter((item) => {
            if (item.title.toLowerCase().includes(q)) return true
            if (item.description.toLowerCase().includes(q)) return true
            if (item.keywords.some((k) => k.includes(q))) return true
            return false
          })
        },
        render: () => {
          let component: ReactRenderer<SlashListHandle, SuggestionProps<SlashItem>> | null = null
          let popup: HTMLDivElement | null = null

          const position = (props: SuggestionProps<SlashItem>) => {
            if (!popup) return
            const rect = props.clientRect?.()
            if (!rect) {
              popup.style.display = 'none'
              return
            }
            popup.style.display = ''
            popup.style.top = `${rect.bottom + window.scrollY + 4}px`
            popup.style.left = `${rect.left + window.scrollX}px`
          }

          return {
            onStart(props) {
              component = new ReactRenderer(SlashList, {
                props,
                editor: props.editor,
              })
              popup = document.createElement('div')
              popup.style.position = 'absolute'
              popup.style.zIndex = '50'
              popup.appendChild(component.element)
              document.body.appendChild(popup)
              position(props)
            },
            onUpdate(props) {
              component?.updateProps(props)
              position(props)
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup?.remove()
                return true
              }
              return component?.ref?.onKeyDown(props.event) ?? false
            },
            onExit() {
              popup?.remove()
              component?.destroy()
              popup = null
              component = null
            },
          }
        },
      }),
    ]
  },
})
