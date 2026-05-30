import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyAmountInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
  /** Whole euros by default — matches marketplace listing create UX. */
  step?: string
}

export function CurrencyAmountInput({
  id,
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  disabled,
  step = '1',
}: CurrencyAmountInputProps) {
  const { t } = useTranslation()

  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {t('common.currencySymbol')}
      </span>
      <Input
        id={id}
        type="number"
        min="0"
        step={step}
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder ?? '0'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'pl-7 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          inputClassName
        )}
      />
    </div>
  )
}

/** Format a numeric price — whole numbers without trailing decimals. */
export function formatMarketplacePrice(
  value: string | number | null | undefined,
  currencySymbol = '€'
): string | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return String(value)
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2)
  return `${currencySymbol} ${formatted}`
}
