import { cn } from '@/lib/utils'

export interface ColorOption {
  id: number
  name: string
  hex_code: string
}

interface ColorSwatchPickerProps {
  colors: ColorOption[]
  selectedIds: number[]
  onToggle: (colorId: number) => void
}

export function ColorSwatchPicker({
  colors,
  selectedIds,
  onToggle,
}: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color.id}
          type="button"
          onClick={() => onToggle(color.id)}
          className={cn(
            'flex min-h-[36px] items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
            selectedIds.includes(color.id)
              ? 'border-primary bg-muted text-primary'
              : 'border-border bg-background text-foreground hover:bg-accent',
          )}
        >
          <span
            className="h-3 w-3 rounded-full border border-border"
            style={{ backgroundColor: color.hex_code }}
          />
          {color.name}
        </button>
      ))}
    </div>
  )
}
