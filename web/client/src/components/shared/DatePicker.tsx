import { format } from 'date-fns'
import { pt } from 'date-fns/locale/pt'
import { enUS } from 'date-fns/locale/en-US'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const DATE_LOCALES = { pt, en: enUS } as const

interface DatePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const locale = DATE_LOCALES[i18n.language as keyof typeof DATE_LOCALES] ?? pt

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {value
            ? format(value, 'PPP', { locale })
            : (placeholder ?? t('coachings.selectDate'))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  )
}
