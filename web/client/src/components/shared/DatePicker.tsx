import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  disabled,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {value ? format(value, 'PPP', { locale: pt }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={pt}
        />
      </PopoverContent>
    </Popover>
  )
}
