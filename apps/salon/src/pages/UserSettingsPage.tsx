import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Switch,
  PageContainer,
  SidebarTrigger
} from '@beauty-platform/ui'
import { Globe, Bell, Loader2, Settings as SettingsIcon, Check } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../components/layout/PageHeader'

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'ua', name: 'Ukrainian', nativeName: 'Українська' },
]

export default function UserSettingsPage(): JSX.Element {
  const { t, i18n } = useTranslation()
  const notificationsSupported = import.meta.env.VITE_NOTIFICATIONS_SETTINGS_ENABLED === 'true'
  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'ru')
  const [languageLoading, setLanguageLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // Notification preferences state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsUnavailable, setNotificationsUnavailable] = useState(false)

  // Handle language change
  const handleLanguageChange = async (languageCode: string) => {
    setLanguageLoading(true)
    setSelectedLanguage(languageCode)

    try {
      await i18n.changeLanguage(languageCode)
      localStorage.setItem('salon-crm-language', languageCode)
      toast.success(`${t('userSettings.languageChanged')} ${AVAILABLE_LANGUAGES.find(l => l.code === languageCode)?.nativeName}`)
    } catch (error) {
      console.error('Error changing language:', error)
      toast.error(t('userSettings.languageChangeFailed'))
    } finally {
      setLanguageLoading(false)
    }
  }

  // Handle notification preferences save
  const handleNotificationsSave = async () => {
    if (notificationsUnavailable) {
      toast.info(t('userSettings.notificationsUnavailable', 'Настройки уведомлений недоступны'))
      return
    }

    setNotificationsSaving(true)

    try {
      const response = await fetch('/api/notifications/settings/me', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailEnabled: emailNotifications,
          smsEnabled: smsNotifications,
          pushEnabled: pushNotifications,
        }),
      })

      if (response.status === 404) {
        setNotificationsUnavailable(true)
        toast.info(t('userSettings.notificationsUnavailable', 'Настройки уведомлений недоступны'))
        return
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.message || `HTTP ${response.status}`)
      }

      const payload = await response.json()
      const updatedSettings = payload.data

      if (updatedSettings) {
        setEmailNotifications(updatedSettings.emailEnabled)
        setSmsNotifications(updatedSettings.smsEnabled)
        setPushNotifications(updatedSettings.pushEnabled)
      }

      toast.success(t('userSettings.notificationsSaved'))
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      toast.error(t('userSettings.notificationsSaveFailed'))
    } finally {
      setNotificationsSaving(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadNotificationSettings = async () => {
      if (!notificationsSupported) {
        setNotificationsUnavailable(true)
        setSettingsLoading(false)
        return
      }
      try {
        setSettingsLoading(true)

        const response = await fetch('/api/notifications/settings/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        })

        if (response.status === 404) {
          if (!cancelled) {
            setNotificationsUnavailable(true)
          }
          return
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}))
          throw new Error(errorBody.message || `HTTP ${response.status}`)
        }

        const payload = await response.json()
        if (cancelled) {
          return
        }

        const settings = payload.data
        if (settings) {
          setEmailNotifications(settings.emailEnabled)
          setSmsNotifications(settings.smsEnabled)
          setPushNotifications(settings.pushEnabled)
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : ''
          if (message.includes('not found')) {
            setNotificationsUnavailable(true)
          } else {
            console.error('Failed to load notification settings:', error)
            toast.error(t('userSettings.notificationsLoadFailed'))
          }
        }
      } finally {
        if (!cancelled) {
          setSettingsLoading(false)
        }
      }
    }

    void loadNotificationSettings()

    return () => {
      cancelled = true
    }
  }, [t, notificationsSupported])

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-8">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <SettingsIcon className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('navigation.settings', 'Настройки')}</span>
              </div>
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Language Settings */}
          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Globe className="h-5 w-5" />
                {t('userSettings.languageTitle')}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {t('userSettings.languageDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {AVAILABLE_LANGUAGES.map((language) => (
                  <button
                    key={language.code}
                    className={`w-full text-left p-4 border rounded-none transition ${
                      selectedLanguage === language.code
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-border hover:border-primary/40 hover:text-primary'
                    }`}
                    onClick={() => void handleLanguageChange(language.code)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{language.nativeName}</p>
                        <p className="text-xs text-muted-foreground">{language.name}</p>
                      </div>
                      {selectedLanguage === language.code && (
                        <div className="flex items-center gap-2">
                          {languageLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                {t('userSettings.languageNote')}
              </p>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Bell className="h-5 w-5" />
                {t('userSettings.notificationsTitle')}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {t('userSettings.notificationsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {notificationsUnavailable && (
                  <div className="border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    {t('userSettings.notificationsUnavailable', 'Настройки уведомлений недоступны в этой среде')}
                  </div>
                )}
                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications" className="text-sm font-medium">
                      {t('userSettings.emailNotifications')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('userSettings.emailNotificationsDescription')}
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                    disabled={settingsLoading || notificationsSaving || notificationsUnavailable}
                  />
                </div>

                {/* SMS Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-notifications" className="text-sm font-medium">
                      {t('userSettings.smsNotifications')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('userSettings.smsNotificationsDescription')}
                    </p>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={smsNotifications}
                    onCheckedChange={setSmsNotifications}
                    disabled={settingsLoading || notificationsSaving || notificationsUnavailable}
                  />
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications" className="text-sm font-medium">
                      {t('userSettings.pushNotifications')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('userSettings.pushNotificationsDescription')}
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                    disabled={settingsLoading || notificationsSaving || notificationsUnavailable}
                  />
                </div>

                <Button
                  onClick={() => void handleNotificationsSave()}
                  disabled={notificationsSaving || settingsLoading || notificationsUnavailable}
                  className="w-full"
                >
                  {notificationsSaving || settingsLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('userSettings.saving')}
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {t('userSettings.saveNotifications')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Settings (Placeholder) */}
        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <SettingsIcon className="h-5 w-5" />
              {t('userSettings.additionalSettingsTitle')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t('userSettings.additionalSettingsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {t('userSettings.additionalSettingsPlaceholder')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
