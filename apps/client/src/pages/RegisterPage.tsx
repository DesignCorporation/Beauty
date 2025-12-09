import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Input, Label } from '@beauty-platform/ui'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { clientApi } from '../services'
import { useAuth } from '../hooks/useAuth'
import AuthHero from '../components/auth/AuthHero'
import GoogleIcon from '../components/auth/GoogleIcon'
import LanguageSwitcher from '../components/LanguageSwitcher'

interface RegisterFormState {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

const mapRegisterError = (message: string | undefined, t: (key: string, options?: any) => string) => {
  if (!message) {
    return t('pages.register.errors.unknownError')
  }

  const normalized = message.toLowerCase()

  if (normalized.includes('exists') || normalized.includes('already')) {
    return t('pages.register.errors.emailExists')
  }

  if (normalized.includes('password') && normalized.includes('weak')) {
    return t('pages.register.errors.weakPassword')
  }

  if (normalized.includes('network')) {
    return t('pages.register.errors.networkError')
  }

  return t('pages.register.errors.unknownError')
}

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { loginWithGoogle } = useAuth()

  const [formData, setFormData] = useState<RegisterFormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await clientApi.registerClient({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      })

      if (!response.success) {
        throw new Error(response.error || 'UNKNOWN_ERROR')
      }

      return response
    }
  })

  const isLoading = registerMutation.isPending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage(t('pages.register.errors.nameRequired'))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage(t('pages.register.errors.passwordMismatch'))
      return
    }

    const password = formData.password
    const isStrongPassword =
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /\d/.test(password)

    if (!isStrongPassword) {
      setErrorMessage(t('pages.register.errors.weakPassword'))
      return
    }

    if (!acceptedTerms) {
      setErrorMessage(t('pages.register.errors.termsRequired'))
      return
    }

    try {
      await registerMutation.mutateAsync()
      navigate(`/login?message=${encodeURIComponent(t('pages.register.successMessage'))}`)
    } catch (error: any) {
      console.error('Registration error:', error)
      setErrorMessage(mapRegisterError(error?.message, t))
    }
  }

  const firstNameLabel = useMemo(() => t('pages.register.firstName.label'), [t])
  const lastNameLabel = useMemo(() => t('pages.register.lastName.label'), [t])
  const emailLabel = useMemo(() => t('pages.register.email.label'), [t])
  const passwordLabel = useMemo(() => t('pages.register.password.label'), [t])
  const confirmPasswordLabel = useMemo(() => t('pages.register.confirmPassword.label'), [t])

  const terms = t('pages.register.terms', { returnObjects: true }) as {
    text: string
    termsLink: string
    privacyLink: string
  }

  const heroStats = [
    { value: '18K', label: t('pages.register.hero.stats.members') },
    { value: '540K', label: t('pages.register.hero.stats.rituals') },
    { value: '€1.2M', label: t('pages.register.hero.stats.rewards') }
  ]
  const heroTitle = (
    <>
      <span className="block">{t('pages.register.hero.titleLine1')}</span>
      <span className="block">{t('pages.register.hero.titleLine2')}</span>
      <span className="block">{t('pages.register.hero.titleLine3')}</span>
    </>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,560px)_1fr]">
        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-lg">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {t('pages.register.tagline', 'Beauty Design Corp • Client Portal')}
                </p>
                <h1 className="text-3xl font-semibold leading-tight">{t('pages.register.title')}</h1>
                <p className="text-base text-muted-foreground">{t('pages.register.subtitle')}</p>
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
                  {t('pages.register.googleButton')}
                </Button>

                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                  <span className="relative z-10 bg-card px-2 text-muted-foreground">
                    {t('pages.register.divider')}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{firstNameLabel}</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      placeholder={t('pages.register.firstName.placeholder')}
                      value={formData.firstName}
                      onChange={event => setFormData({ ...formData, firstName: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{lastNameLabel}</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      placeholder={t('pages.register.lastName.placeholder')}
                      value={formData.lastName}
                      onChange={event => setFormData({ ...formData, lastName: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email">{emailLabel}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder={t('pages.register.email.placeholder')}
                      value={formData.email}
                      onChange={event => setFormData({ ...formData, email: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">{passwordLabel}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        className="pr-10"
                        placeholder={t('pages.register.password.placeholder')}
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{confirmPasswordLabel}</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        className="pr-10"
                        placeholder={t('pages.register.confirmPassword.placeholder')}
                        value={formData.confirmPassword}
                        onChange={event => setFormData({ ...formData, confirmPassword: event.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(previous => !previous)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    checked={acceptedTerms}
                    onChange={event => setAcceptedTerms(event.target.checked)}
                  />
                  <span>
                    {terms.text}{' '}
                    <Link to="/terms" className="text-primary hover:underline">
                      {terms.termsLink}
                    </Link>{' '}
                    {t('pages.register.terms.connector', 'и')}{' '}
                    <Link to="/privacy" className="text-primary hover:underline">
                      {terms.privacyLink}
                    </Link>
                  </span>
                </label>

                <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('pages.register.creating')}
                    </>
                  ) : (
                    t('pages.register.createButton')
                  )}
                </Button>

                <div className="text-center text-sm">
                  {t('pages.register.haveAccount')}{' '}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    {t('pages.register.loginLink')}
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </section>

        <AuthHero
          highlight={t('pages.register.hero.highlight')}
          title={heroTitle}
          subtitle={t('pages.register.hero.subtitle')}
          stats={heroStats}
          quote={t('pages.register.hero.quote')}
          author={t('pages.register.hero.author')}
          role={t('pages.register.hero.role')}
          backgroundGallery={[
            'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1600&q=80'
          ]}
        />
      </div>
    </div>
  )
}
