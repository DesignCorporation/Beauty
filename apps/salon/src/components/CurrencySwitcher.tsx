import React from 'react'
import { Button } from '@beauty-platform/ui'
import { DollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCurrency, type SupportedCurrency } from '../currency'
import { debugLog } from '../utils/debug'

interface CurrencySwitcherProps {
  variant?: 'button' | 'compact'
  className?: string
}

export const CurrencySwitcher: React.FC<CurrencySwitcherProps> = ({ 
  variant = 'button',
  className = '' 
}) => {
  const { t } = useTranslation()
  const { currency, changeCurrency, supportedCurrencies } = useCurrency()

  const handleCurrencyChange = (newCurrency: SupportedCurrency) => {
    changeCurrency(newCurrency)
    debugLog(`Currency changed to: ${newCurrency}`)
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <DollarSign className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1">
          {supportedCurrencies.map((curr) => (
            <button
              key={curr.code}
              onClick={() => handleCurrencyChange(curr.code as SupportedCurrency)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                currency === curr.code 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title={t(`currency.currencies.${curr.code}` as any)}
            >
              {curr.flag} {curr.code}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-1 ${className}`}>
      {supportedCurrencies.map((curr) => (
        <Button
          key={curr.code}
          variant={currency === curr.code ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleCurrencyChange(curr.code as SupportedCurrency)}
          className="min-w-[65px]"
          title={curr.name}
        >
          <span className="mr-1">{curr.flag}</span>
          {curr.code}
        </Button>
      ))}
    </div>
  )
}

export default CurrencySwitcher
