import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Button } from '@beauty-platform/ui'
import { Globe } from 'lucide-react'
import clsx from 'clsx'
import { availableLanguages, changeLanguage, getCurrentLanguage, type SupportedLanguage } from '../i18n'

interface LanguageSwitcherProps {
  className?: string
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const currentCode = getCurrentLanguage()

  const handleChange = async (code: SupportedLanguage) => {
    if (code === currentCode) return
    await changeLanguage(code)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={clsx(
            'h-9 rounded-full border border-border/60 px-4 text-xs font-semibold uppercase tracking-[0em]',
            className
          )}
          aria-label="Change language"
        >
          <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
          {currentCode.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        {availableLanguages.map(language => (
          <DropdownMenuItem
            key={language.code}
            className={clsx('flex items-center gap-3 text-sm', {
              'font-semibold text-foreground': language.code === currentCode
            })}
            onClick={() => handleChange(language.code)}
          >
            <span className="uppercase tracking-[0em]">{language.code}</span>
            <span className="text-muted-foreground">{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
