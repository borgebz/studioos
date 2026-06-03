import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  placeholder?: string
  disabled?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export function TimePicker({
  value,
  onChange,
  placeholder = '--:--',
  disabled,
}: TimePickerProps) {
  const { t } = useTranslation()
  const [selectedHour, selectedMinute] = value ? value.split(':') : ['', '']

  const selectTime = (hour: string, minute: string) => {
    onChange(`${hour}:${minute}`)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x divide-border">
          <ScrollArea className="h-56 w-16">
            <div className="flex flex-col p-1">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-label={t('timePicker.selectHour', { hour: h })}
                  onClick={() => selectTime(h, selectedMinute || '00')}
                  className={cn(
                    'min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent',
                    selectedHour === h &&
                      'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea className="h-56 w-16">
            <div className="flex flex-col p-1">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-label={t('timePicker.selectMinute', { minute: m })}
                  onClick={() => selectTime(selectedHour || '09', m)}
                  className={cn(
                    'min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent',
                    selectedMinute === m &&
                      'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
