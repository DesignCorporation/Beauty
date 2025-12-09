import React from 'react'
import { Button } from '@beauty-platform/ui'
import { Globe } from 'lucide-react'
import { changeLanguage, getCurrentLanguage, availableLanguages, type SupportedLanguage } from '../i18n'

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
      console.log(`Language changed to: ${languageCode}`)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Globe className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1">
          {availableLanguages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code as SupportedLanguage)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                currentLanguage === language.code 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title={language.name}
            >
              {language.flag} {language.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
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
          <span className="mr-1">{language.flag}</span>
          {language.code.toUpperCase()}
        </Button>
      ))}
    </div>
  )
}

export default LanguageSwitcher