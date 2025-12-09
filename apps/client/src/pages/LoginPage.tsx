import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Input,
  Label
} from '@beauty-platform/ui'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { clientApi } from '../services'
import { useAuth } from '../hooks/useAuth'
import AuthHero from '../components/auth/AuthHero'
import GoogleIcon from '../components/auth/GoogleIcon'
import LanguageSwitcher from '../components/LanguageSwitcher'

const mapErrorMessage = (message: string | undefined, t: (key: string, options?: any) => string) => {
  if (!message) {
    return t('pages.login.errors.unknownError')
  }

  const normalized = message.toLowerCase()

  if (normalized.includes('invalid') || normalized.includes('credential')) {
    return t('pages.login.errors.invalidCredentials')
  }

  if (normalized.includes('network')) {
    return t('pages.login.errors.networkError')
  }

  return t('pages.login.errors.unknownError')
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { status, user, loginWithGoogle, refreshProfile } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await clientApi.loginClient({
        email: formData.email,
        password: formData.password
      })

      if (!response.success) {
        throw new Error(response.error || 'INVALID_CREDENTIALS')
      }

      return response
    }
  })

  const isAuthenticated = status === 'authenticated' && !!user

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.phoneVerified ? '/dashboard' : '/complete-profile', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const isLoading = loginMutation.isPending || status === 'loading'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    try {
      await loginMutation.mutateAsync()
      const refreshed = await refreshProfile()
      navigate(refreshed?.phoneVerified ? '/dashboard' : '/complete-profile', { replace: true })
    } catch (error: any) {
      console.error('Login error:', error)
      setErrorMessage(mapErrorMessage(error?.message, t))
    }
  }

  // Demo data filling helper available in i18n translations

  const emailLabel = useMemo(() => t('pages.login.email.label'), [t])
  const passwordLabel = useMemo(() => t('pages.login.password.label'), [t])
  const heroStats = [
    { value: '4.9/5', label: t('pages.login.hero.stats.rating') },
    { value: '120+', label: t('pages.login.hero.stats.salons') },
    { value: '35K', label: t('pages.login.hero.stats.rewards') }
  ]
  const heroTitle = (
    <>
      <span className="block">{t('pages.login.hero.titleLine1')}</span>
      <span className="block">{t('pages.login.hero.titleLine2')}</span>
      <span className="block">{t('pages.login.hero.titleLine3')}</span>
    </>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,520px)_1fr]">
        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {t('pages.login.tagline', 'Beauty Design Corp • Client Portal')}
                </p>
                <h1 className="text-3xl font-semibold leading-tight">{t('pages.login.title')}</h1>
                <p className="text-base text-muted-foreground">{t('pages.login.subtitle')}</p>
              </div>
              <LanguageSwitcher className="self-end sm:self-start" />
            </div>

            <div className="mt-8 rounded-3xl border border-border/60 bg-card/90 p-6 shadow-2xl shadow-primary/10 backdrop-blur">
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage ? (
                  <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full text-base font-medium"
                  onClick={loginWithGoogle}
                  disabled={isLoading}
                >
                  <GoogleIcon className="mr-3 h-5 w-5" />
                  {t('pages.login.googleButton')}
                </Button>

                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                  <span className="relative z-10 bg-card px-2 text-muted-foreground">
                    {t('pages.login.divider')}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{emailLabel}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder={t('pages.login.email.placeholder')}
                      value={formData.email}
                      onChange={event => setFormData({ ...formData, email: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{passwordLabel}</Label>
                      <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                        {t('pages.login.forgotPassword')}
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="pr-10"
                        placeholder={t('pages.login.password.placeholder')}
                        value={formData.password}
                        onChange={event => setFormData({ ...formData, password: event.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(previous => !previous)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('pages.login.loginButtonLoading')}
                    </>
                  ) : (
                    t('pages.login.loginButton')
                  )}
                </Button>

                <div className="text-center text-sm">
                  {t('pages.login.noAccount')}{' '}
                  <Link to="/register" className="font-medium text-primary hover:underline">
                    {t('pages.login.registerLink')}
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </section>

        <AuthHero
          highlight={t('pages.login.hero.highlight')}
          title={heroTitle}
          subtitle={t('pages.login.hero.subtitle')}
          stats={heroStats}
          quote={t('pages.login.hero.quote')}
          author={t('pages.login.hero.author')}
          role={t('pages.login.hero.role')}
          backgroundGallery={[
            'https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80'
          ]}
        />
      </div>
    </div>
  )
}
