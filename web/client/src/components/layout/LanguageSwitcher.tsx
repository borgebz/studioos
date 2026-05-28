import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const languages = [
  { code: 'pt' as const, labelKey: 'lang.pt' },
  { code: 'en' as const, labelKey: 'lang.en' },
] as const

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  const handleChange = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('i18nextLng', code)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-12 px-2 font-medium min-h-11 md:min-h-0"
          aria-label={t(`lang.${currentLang}`)}
        >
          {currentLang.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map(({ code, labelKey }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleChange(code)}
            className={
              currentLang === code ? 'bg-accent text-accent-foreground' : ''
            }
          >
            {t(labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
