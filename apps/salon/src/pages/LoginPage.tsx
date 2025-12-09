import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Input, Label } from '@beauty-platform/ui';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuthContext } from '../contexts/AuthContext';
import { useDebugLogger, useEffectDebugger, useStateDebugger } from '../hooks/useDebugLogger';
import apiClient from '../utils/api-client';
import ENVIRONMENT from '../config/environment';
import TurnstileWidget from '../components/turnstile-widget';
import { debugLog } from '../utils/debug';
import AuthHero from '../components/auth/AuthHero';
import LanguageSwitcher from '../components/LanguageSwitcher';

interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

interface LoginError {
  message: string;
  code?: string;
}

interface ClientRegistrationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

type AuthMode = 'login' | 'signup';

function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { login, isAuthenticated, loading, refetch } = useAuthContext();

  const salonSlug = searchParams.get('salon');
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const turnstileSiteKey = ENVIRONMENT.getTurnstileSiteKey();

  const [mode, setMode] = useState<AuthMode>(() => (searchParams.get('signup') === '1' ? 'signup' : 'login'));

  const [loginData, setLoginData] = useState<LoginData>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [signupData, setSignupData] = useState<SignupData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // 🔍 DEBUG: Отслеживаем состояния LoginPage
  useDebugLogger('LoginPage', {
    mode,
    isAuthenticated,
    loading,
    isSubmitting,
    redirectTo,
    hasError: !!error
  });
  useStateDebugger('LoginPage.mode', mode);
  useStateDebugger('LoginPage.error', error);

  useEffect(() => {
    const paramsString = searchParams.toString();
    debugLog('🔄 LoginPage searchParams changed:', paramsString);

    if (searchParams.get('signup') === '1') {
      debugLog('✅ LoginPage switching to signup mode');
      setMode('signup');

      const urlEmail = searchParams.get('email');
      if (urlEmail) {
        debugLog('✉️ Prefilling signup email from URL');
        setSignupData(prev => ({
          ...prev,
          email: decodeURIComponent(urlEmail)
        }));
      }

      const urlError = searchParams.get('error');
      if (urlError) {
        debugLog('⚠️ Signup error from URL:', urlError);
        const errorMessages: Record<string, string> = {
          'must_register_salon_first': t('login.error.mustRegisterSalon', 'Сначала зарегистрируйте салон через Google'),
          'must_register_first': t('login.error.mustRegisterFirst', 'Сначала создайте аккаунт'),
          'email_conflict': t('login.error.emailConflict', 'Этот email уже привязан к другому Google аккаунту')
        };
        setError({
          message: errorMessages[urlError] || t('login.error.oauthFailed', 'Ошибка при входе через Google'),
          code: urlError
        });
      }
    } else {
      debugLog('ℹ️ LoginPage signup param not present, mode stays as', mode);
    }
  }, [mode, searchParams, t]);

  useEffect(() => {
    debugLog('🔍 LoginPage redirect effect:', { isAuthenticated, loading, redirectTo });
    if (isAuthenticated && !loading && window.location.pathname === '/login') {
      debugLog('🚀 LoginPage: Redirecting to', redirectTo);
      void navigate(redirectTo);
    }
  }, [isAuthenticated, loading, redirectTo, navigate]);
  void useEffectDebugger('LoginPage-redirect-effect', [isAuthenticated, loading, redirectTo, navigate]);

  useEffect(() => {
    if (mode !== 'login') {
      return;
    }
    const savedLoginData = localStorage.getItem('salonLoginData');
    if (savedLoginData) {
      try {
        const data = JSON.parse(savedLoginData);
        setLoginData(prev => ({
          ...prev,
          email: data.email || '',
          password: data.password || ''
        }));
      } catch (parseError) {
        console.error('Error parsing saved login data:', parseError);
      } finally {
        localStorage.removeItem('salonLoginData');
      }
    }
  }, [mode]);

  const handleModeChange = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setIsSubmitting(false);
  };

  const handleLoginInputChange = (field: keyof LoginData, value: string | boolean) => {
    setLoginData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSignupInputChange = (field: keyof SignupData, value: string) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleLoginSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!loginData.email || !loginData.password) {
      setError({ message: t('login.validation.required', 'Заполните все обязательные поля') });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const loginPayload = {
        email: loginData.email,
        password: loginData.password,
        ...(salonSlug ? { tenantSlug: salonSlug } : {})
      };

      const result = await login(loginPayload);

      if (!result.success) {
        setError({
          message: result.error || t('login.error.invalidCredentials', 'Неверный email или пароль'),
          code: 'LOGIN_FAILED'
        });
      } else {
        setTimeout(() => {
          void (async () => {
            await refetch(true, true);
            void navigate(redirectTo, { replace: true });
          })();
        }, 500);
      }
    } catch (loginError) {
      console.error('Login error:', loginError);
      setError({
        message: loginError instanceof Error ? loginError.message : t('login.error.generic', 'Ошибка входа'),
        code: 'LOGIN_FAILED'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (turnstileSiteKey) {
      if (!turnstileToken) {
        setError({
          message: t('login.error.turnstile', 'Подтвердите, что вы не робот, прежде чем продолжить.'),
          code: 'TURNSTILE_REQUIRED'
        });
        return;
      }
    }

    const authUrl = ENVIRONMENT.getAuthUrl();
    const params = new URLSearchParams();

    if (turnstileSiteKey && turnstileToken) {
      params.set('turnstileToken', turnstileToken);
    }

    // Add redirect URL parameter - ensure OAuth callback redirects to correct domain
    const redirectUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/dashboard`;
    params.set('redirectUrl', encodeURIComponent(redirectUrl));

    const queryString = params.toString();
    window.location.href = `${authUrl}/google-owner${queryString ? '?' + queryString : ''}`;
  };

  const handleSignupSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!signupData.firstName.trim() || !signupData.lastName.trim() || !signupData.email.trim() || !signupData.password.trim()) {
      setError({ message: t('login.validation.required', 'Заполните все обязательные поля') });
      return;
    }

    const password = signupData.password;
    const isStrongPassword =
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /\d/.test(password);

    if (!isStrongPassword) {
      setError({ message: t('login.validation.passwordLength', 'Пароль должен быть не короче 8 символов и содержать заглавную букву и цифру') });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        firstName: signupData.firstName.trim(),
        lastName: signupData.lastName.trim(),
        email: signupData.email.trim().toLowerCase(),
        password: signupData.password,
        phone: signupData.phone?.trim() || undefined
      };

      const response = await apiClient.post<ClientRegistrationResponse>('/auth/register-client', payload);

      if (!response?.success) {
        throw new Error(response?.error || 'Registration failed');
      }

      await refetch(true, true);
      void navigate(redirectTo, { replace: true });
    } catch (signupError) {
      console.error('Signup error:', signupError);
      const message = signupError instanceof Error ? signupError.message : t('login.error.generic', 'Ошибка входа');
      setError({ message, code: 'SIGNUP_FAILED' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignup = mode === 'signup';

  const heroStats = [
    { value: '1 200+', label: t('login.hero.stats.salons', 'Активных салонов') },
    { value: '32K', label: t('login.hero.stats.bookings', 'Записей в месяц') },
    { value: '18', label: t('login.hero.stats.countries', 'Стран') }
  ];
  const heroTitle = (
    <>
      <span className="block">
        {t('login.hero.titleLine1', 'Управляйте')}
      </span>
      <span className="block">
        {t('login.hero.titleLine2', 'салоном')}
      </span>
      <span className="block">
        {t('login.hero.titleLine3', 'без стресса')}
      </span>
    </>
  );

  const switchLabel = isSignup
    ? t('login.switch.haveAccount', 'У вас уже есть аккаунт?')
    : t('login.switch.needAccount', 'Впервые в Beauty Platform?');
  const switchAction = isSignup
    ? t('login.switch.login', 'Войти')
    : t('login.switch.signup', 'Создать аккаунт');

  const dividerLabel = isSignup
    ? t('login.divider.signup', 'Заполните форму регистрации')
    : t('login.divider.login', 'или продолжите с email');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,520px)_1fr]">
        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {t('login.tagline', 'Beauty Platform CRM')}
                </p>
                <h1 className="text-3xl font-semibold leading-tight">
                  {isSignup ? t('login.signup.title', 'Создайте аккаунт') : t('login.title', 'Вход в систему')}
                </h1>
                <p className="text-base text-muted-foreground">
                  {isSignup
                    ? t('login.signup.subtitle', '5 минут — и ваш салон готов к запуску онлайн.')
                    : t('login.subtitle', 'Войдите, чтобы продолжить работу с салоном.')}
                </p>
              </div>
              <LanguageSwitcher
                variant="compact"
                className="self-end rounded-full border border-border/60 bg-card/80 px-3 py-1 text-sm shadow-md shadow-primary/10 sm:self-start"
              />
            </div>

            <div className="rounded-3xl border border-border/50 bg-card/90 p-6 shadow-2xl shadow-primary/5 backdrop-blur">
              <div className="inline-flex w-full rounded-2xl bg-muted/70 p-1 text-sm font-medium">
                {(['login', 'signup'] as AuthMode[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => void handleModeChange(tab)}
                    className={clsx(
                      'flex-1 rounded-xl py-2 transition-colors',
                      mode === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    {tab === 'login'
                      ? t('login.tabs.login', 'Вход')
                      : t('login.tabs.signup', 'Регистрация')}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleGoogleSignIn()}
                  className="flex h-12 w-full items-center justify-center gap-3 text-base font-medium"
                >
                  <GoogleIcon className="h-5 w-5" />
                  {t('login.buttons.google', 'Продолжить через Google')}
                </Button>

                {turnstileSiteKey && (
                  <div className="rounded-2xl border border-border/60 bg-muted/60 p-3">
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      onSuccess={token => setTurnstileToken(token)}
                      onError={() => void setTurnstileToken(null)}
                      onExpire={() => void setTurnstileToken(null)}
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  {dividerLabel}
                  <div className="h-px flex-1 bg-border" />
                </div>

                {error && (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
                    <div className="flex gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">{t('login.error.title', 'Ошибка входа')}</p>
                        <p className="mt-1 text-sm text-destructive/90">{error.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {isSignup ? (
                  <form className="space-y-4" onSubmit={(e) => void handleSignupSubmit(e)}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="signup-first-name">{t('login.fields.firstName', 'Имя')}</Label>
                        <Input
                          id="signup-first-name"
                          autoComplete="given-name"
                          className="h-12 text-base"
                          value={signupData.firstName}
                          onChange={(event) => handleSignupInputChange('firstName', event.target.value)}
                          placeholder={t('login.fields.firstNamePlaceholder', 'Анна')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-last-name">{t('login.fields.lastName', 'Фамилия')}</Label>
                        <Input
                          id="signup-last-name"
                          autoComplete="family-name"
                          className="h-12 text-base"
                          value={signupData.lastName}
                          onChange={(event) => handleSignupInputChange('lastName', event.target.value)}
                          placeholder={t('login.fields.lastNamePlaceholder', 'Коваль')}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{t('login.fields.email', 'Email')}</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        className="h-12 text-base"
                        value={signupData.email}
                        onChange={(event) => handleSignupInputChange('email', event.target.value)}
                        placeholder="name@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{t('login.fields.password', 'Пароль')}</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? 'text' : 'password'}
                          className="h-12 text-base pr-12"
                          value={signupData.password}
                          onChange={(event) => handleSignupInputChange('password', event.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => void setShowSignupPassword(prev => !prev)}
                        >
                          {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('login.password.hint', 'Минимум 6 символов. Мы шифруем ваш пароль.')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">{t('login.fields.phone', 'Телефон')}</Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        autoComplete="tel"
                        className="h-12 text-base"
                        value={signupData.phone}
                        onChange={(event) => handleSignupInputChange('phone', event.target.value)}
                        placeholder="+48 600 000 000"
                      />
                    </div>
                    <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {t('login.signup.processing', 'Создаем аккаунт...')}
                        </>
                      ) : (
                        t('login.signup.cta', 'Зарегистрироваться')
                      )}
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={(e) => void handleLoginSubmit(e)}>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('login.fields.email', 'Email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        className="h-12 text-base"
                        value={loginData.email}
                        onChange={(event) => handleLoginInputChange('email', event.target.value)}
                        placeholder="name@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('login.fields.password', 'Пароль')}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          className="h-12 text-base pr-12"
                          value={loginData.password}
                          onChange={(event) => handleLoginInputChange('password', event.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => void setShowPassword(prev => !prev)}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <label htmlFor="remember-me" className="inline-flex items-center gap-2">
                        <Checkbox
                          id="remember-me"
                          checked={loginData.rememberMe}
                          onCheckedChange={(checked) => handleLoginInputChange('rememberMe', checked === true)}
                        />
                        {t('login.fields.rememberMe', 'Запомнить меня')}
                      </label>
                      <button
                        type="button"
                        className="text-primary hover:text-primary/90"
                        onClick={() => void navigate('/support', { replace: false })}
                      >
                        {t('login.actions.needHelp', 'Нужна помощь?')}
                      </button>
                    </div>

                    <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {t('login.processing', 'Входим...')}
                        </>
                      ) : (
                        t('login.cta', 'Войти')
                      )}
                    </Button>
                  </form>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  {switchLabel}{' '}
                  <button
                    type="button"
                    className="font-medium text-primary hover:text-primary/90"
                    onClick={() => void handleModeChange(isSignup ? 'login' : 'signup')}
                  >
                    {switchAction}
                  </button>
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {t('login.disclaimer', 'Продолжая, вы соглашаетесь с условиями и политикой конфиденциальности Beauty Platform.')}
            </p>
          </div>
        </section>

        <AuthHero
          highlight={t('login.hero.highlight', 'Beauty Platform • 2025')}
          title={heroTitle}
          subtitle={t('login.hero.subtitle', 'Планируйте расписание, управляйте командой и автоматизируйте маркетинг в одном окне.')}
          stats={heroStats}
          quote={t('login.hero.quote', 'Beauty Platform взяла на себя рутину — мы сосредоточились на гостях.')}
          author={t('login.hero.author', 'Анна, сеть ManiTime')}
          role={t('login.hero.role', 'Владелица студии')}
          backgroundVideoUrl="https://storage.googleapis.com/coverr-main/mp4/HairdresserBlowDryingHair.mp4"
          backgroundGallery={[
            'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80'
          ]}
        />
      </div>
    </div>
  );
}

export default LoginPage;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v4.07h5.68c-.25 1.34-1.02 2.48-2.16 3.24l3.49 2.71c2.04-1.89 3.22-4.68 3.22-7.95 0-.77-.07-1.51-.2-2.24H12z"
      />
      <path
        fill="#34A853"
        d="M5.27 14.32l-.83.64-2.78 2.16C3.32 20.9 7.33 23.5 12 23.5c3.24 0 5.95-1.07 7.94-2.91l-3.49-2.71c-.94.63-2.14 1-3.45 1-2.64 0-4.88-1.78-5.68-4.16z"
      />
      <path
        fill="#4A90E2"
        d="M2.45 6.88C1.53 8.72 1 10.79 1 13s.53 4.28 1.45 6.12l3.82-2.98c-.28-.84-.44-1.74-.44-2.68s.16-1.84.44-2.68z"
      />
      <path
        fill="#FBBC05"
        d="M12 4.5c1.76 0 3.34.61 4.58 1.8l3.42-3.42C17.95.96 15.24 0 12 0 7.33 0 3.32 2.6 1.46 6.88l3.83 2.96C6.12 6.28 8.36 4.5 12 4.5z"
      />
    </svg>
  );
}
