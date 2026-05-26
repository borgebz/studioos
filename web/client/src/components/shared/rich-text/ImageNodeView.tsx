import { useCallback, useEffect, useRef, useState } from 'react'
import { Image as BaseImage } from '@tiptap/extension-image'
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from '@tiptap/react'
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ImageAlign = 'left' | 'center' | 'right'

interface ImageAttrs {
  src: string
  alt?: string
  title?: string
  width?: string | number | null
  align?: ImageAlign
  caption?: string
}

/**
 * Custom Image extension that adds `width`, `align`, and `caption` attributes
 * and renders via a React NodeView with drag-to-resize and inline controls.
 */
export const ResizableImage = BaseImage.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width') || el.style.width || null,
        renderHTML: (attrs) => {
          if (!attrs.width) return {}
          return { width: String(attrs.width).replace(/px$/, '') }
        },
      },
      align: {
        default: 'center',
        parseHTML: (el) =>
          (el.getAttribute('data-align') as ImageAlign | null) ?? 'center',
        renderHTML: (attrs) => ({
          'data-align': attrs.align ?? 'center',
        }),
      },
      caption: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-caption') ?? '',
        renderHTML: (attrs) =>
          attrs.caption ? { 'data-caption': attrs.caption } : {},
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})

function ImageNodeView({
  node,
  updateAttributes,
  selected,
  deleteNode,
  editor,
}: ReactNodeViewProps) {
  const attrs = node.attrs as ImageAttrs
  const align = (attrs.align ?? 'center') as ImageAlign
  const wrapperRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [resizing, setResizing] = useState(false)
  const [captionDraft, setCaptionDraft] = useState(attrs.caption ?? '')

  // Keep the caption draft in sync if the node changes externally
  useEffect(() => {
    setCaptionDraft(attrs.caption ?? '')
  }, [attrs.caption])

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      if (!editor.isEditable) return
      e.preventDefault()
      e.stopPropagation()
      setResizing(true)
      const startX = e.clientX
      const startWidth = imgRef.current?.offsetWidth ?? 0
      const parentWidth =
        wrapperRef.current?.parentElement?.offsetWidth ??
        wrapperRef.current?.offsetWidth ??
        startWidth

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX
        const next = Math.max(80, Math.min(parentWidth, startWidth + delta))
        updateAttributes({ width: `${Math.round(next)}px` })
      }
      const onUp = () => {
        setResizing(false)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [editor.isEditable, updateAttributes],
  )

  const commitCaption = useCallback(() => {
    if (captionDraft !== (attrs.caption ?? '')) {
      updateAttributes({ caption: captionDraft })
    }
  }, [captionDraft, attrs.caption, updateAttributes])

  const widthStyle = attrs.width
    ? String(attrs.width).match(/^\d+$/)
      ? `${attrs.width}px`
      : String(attrs.width)
    : undefined

  const alignClass =
    align === 'left'
      ? 'mr-auto ml-0'
      : align === 'right'
        ? 'ml-auto mr-0'
        : 'mx-auto'

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      data-image-wrapper
      className={cn('my-3 flex flex-col', {
        'items-start': align === 'left',
        'items-center': align === 'center',
        'items-end': align === 'right',
      })}
    >
      <div
        className={cn(
          'relative inline-block max-w-full overflow-hidden rounded-md',
          alignClass,
          selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
          resizing && 'select-none',
        )}
        style={widthStyle ? { width: widthStyle } : undefined}
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img
          ref={imgRef}
          src={attrs.src}
          alt={attrs.alt ?? ''}
          title={attrs.title ?? undefined}
          draggable={false}
          className="block h-auto w-full max-h-[640px] object-contain"
        />

        {/* Right-edge resize handle, visible when selected */}
        {selected && editor.isEditable && (
          <button
            type="button"
            aria-label="Resize image"
            onPointerDown={startResize}
            className="absolute top-1/2 right-0 z-10 h-12 w-2 -translate-y-1/2 cursor-ew-resize rounded-l bg-primary/80 transition hover:bg-primary"
          />
        )}

        {/* Floating toolbar above the image when selected */}
        {selected && editor.isEditable && (
          <div
            contentEditable={false}
            className="absolute -top-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-border bg-popover px-1 py-1 shadow-md"
          >
            <AlignBtn
              active={align === 'left'}
              onClick={() => updateAttributes({ align: 'left' })}
              label="Align left"
            >
              <AlignLeft className="size-3.5" />
            </AlignBtn>
            <AlignBtn
              active={align === 'center'}
              onClick={() => updateAttributes({ align: 'center' })}
              label="Align center"
            >
              <AlignCenter className="size-3.5" />
            </AlignBtn>
            <AlignBtn
              active={align === 'right'}
              onClick={() => updateAttributes({ align: 'right' })}
              label="Align right"
            >
              <AlignRight className="size-3.5" />
            </AlignBtn>
            <span className="mx-1 h-4 w-px bg-border" />
            <AlignBtn onClick={deleteNode} label="Delete image" destructive>
              <Trash2 className="size-3.5" />
            </AlignBtn>
          </div>
        )}
      </div>

      {/* Caption */}
      {(editor.isEditable || captionDraft) && (
        <input
          type="text"
          value={captionDraft}
          onChange={(e) => setCaptionDraft(e.target.value)}
          onBlur={commitCaption}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          placeholder={editor.isEditable ? 'Add a caption…' : ''}
          readOnly={!editor.isEditable}
          className={cn(
            'mt-2 max-w-full bg-transparent text-center text-xs text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none',
            !captionDraft && !editor.isEditable && 'hidden',
            widthStyle ? '' : 'w-auto',
          )}
          style={widthStyle ? { width: widthStyle } : undefined}
        />
      )}
    </NodeViewWrapper>
  )
}

interface AlignBtnProps {
  active?: boolean
  destructive?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}
function AlignBtn({
  active,
  destructive,
  onClick,
  label,
  children,
}: AlignBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground',
        active && 'bg-accent text-foreground',
        destructive && 'hover:bg-destructive/10 hover:text-destructive',
      )}
    >
      {children}
    </button>
  )
}
