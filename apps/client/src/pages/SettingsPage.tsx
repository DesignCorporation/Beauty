import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@beauty-platform/ui'
import { Check, Globe, Loader2 } from 'lucide-react'
import ClientLayout from '../components/ClientLayout'

const LANGUAGE_CONFIG = [
  {
    code: 'en',
    labelKey: 'pages.settings.language.languages.en.label',
    nativeKey: 'pages.settings.language.languages.en.native'
  },
  {
    code: 'pl',
    labelKey: 'pages.settings.language.languages.pl.label',
    nativeKey: 'pages.settings.language.languages.pl.native'
  },
  {
    code: 'ru',
    labelKey: 'pages.settings.language.languages.ru.label',
    nativeKey: 'pages.settings.language.languages.ru.native'
  },
  {
    code: 'ua',
    labelKey: 'pages.settings.language.languages.ua.label',
    nativeKey: 'pages.settings.language.languages.ua.native'
  }
] as const

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const initialLanguage = useMemo<string>(() => {
    const [primary] = (i18n.language ?? 'en').split('-')
    return primary ?? 'en'
  }, [i18n.language])
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLanguage)
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const [primary] = (i18n.language ?? 'en').split('-')
    setSelectedLanguage(primary ?? 'en')
  }, [i18n.language])

  useEffect(() => {
    if (!feedback) return

    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleLanguageChange = async (languageCode: string) => {
    if (pendingLanguage || selectedLanguage === languageCode) {
      return
    }

    setPendingLanguage(languageCode)
    setFeedback(null)

    try {
      await i18n.changeLanguage(languageCode)
      localStorage.setItem('i18nextLng', languageCode)

      const nativeName = t(`pages.settings.language.languages.${languageCode}.native`)
      setFeedback({
        type: 'success',
        message: t('pages.settings.language.success', { language: nativeName })
      })
    } catch (error) {
      console.error('Failed to change language', error)
      setFeedback({
        type: 'error',
        message: t('pages.settings.language.error')
      })
    } finally {
      setPendingLanguage(null)
    }
  }

  return (
    <ClientLayout>
      <div className="mx-auto max-w-full px-4 py-8 space-y-6">
        {feedback ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Globe className="h-5 w-5 text-primary" />
              {t('pages.settings.language.title', { defaultValue: 'Язык интерфейса' })}
            </CardTitle>
            <CardDescription>
              {t('pages.settings.language.description', {
                defaultValue: 'Выберите язык интерфейса для клиентского портала.'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {LANGUAGE_CONFIG.map((language) => {
                const isActive = selectedLanguage.startsWith(language.code)
                const isPending = pendingLanguage === language.code
                const showIndicator = isActive || isPending

                return (
                  <button
                    key={language.code}
                    type="button"
                    className={`w-full rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary ${
                      isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'
                    }`}
                    onClick={() => handleLanguageChange(language.code)}
                    disabled={Boolean(pendingLanguage) && pendingLanguage !== language.code}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {t(language.nativeKey)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t(language.labelKey)}
                        </p>
                      </div>
                      {showIndicator ? (
                        <div className="rounded-full bg-primary/10 p-2 text-primary">
                          {isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Check className="h-5 w-5" />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-primary">
                          {t('pages.settings.language.select', { defaultValue: 'Выбрать' })}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('pages.settings.language.note', {
                defaultValue: 'Изменение применяется мгновенно и запоминается для следующих входов.'
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  )
}
