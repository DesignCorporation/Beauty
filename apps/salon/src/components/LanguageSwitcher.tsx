import React from 'react'
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@beauty-platform/ui'
import { Globe } from 'lucide-react'
import { changeLanguage, getCurrentLanguage, availableLanguages, type SupportedLanguage } from '../i18n'
import { debugLog } from '../utils/debug'

interface LanguageSwitcherProps {
  variant?: 'button' | 'compact'
  className?: string
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'button',
  className = '' 
}) => {
  const currentLanguage = getCurrentLanguage()

  const handleLanguageChange = async (languageCode: SupportedLanguage) => {
    try {
      await changeLanguage(languageCode)
      debugLog(`Language changed to: ${languageCode}`)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }


  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-muted ${className}`} aria-label="Change language">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{currentLanguage.toUpperCase()}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          {availableLanguages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code as SupportedLanguage)}
              className={currentLanguage === language.code ? 'font-medium' : ''}
            >
              <span className="mr-2 uppercase">{language.code}</span>
              <span className="text-muted-foreground">{language.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className={`flex gap-1 ${className}`}>
      {availableLanguages.map((language) => (
        <Button
          key={language.code}
          variant={currentLanguage === language.code ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleLanguageChange(language.code as SupportedLanguage)}
          className="min-w-[60px]"
          title={language.name}
        >
          {language.code.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}

export default LanguageSwitcher
