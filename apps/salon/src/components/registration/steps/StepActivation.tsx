import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Label } from '@beauty-platform/ui'
import { toast } from 'sonner'
import { CheckCircle, Mail, Smartphone, Shield, AlertCircle, Sparkles } from 'lucide-react'
import { RegistrationData } from '../MultiStepRegistration'
import { useAuthContext } from '../../../contexts/AuthContext'
import apiClient from '../../../utils/api-client'

interface StepActivationProps {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onPrevious: () => void;
}

interface FormErrors {
  smsCode?: string;
  acceptTerms?: string;
}

const StepActivation: React.FC<StepActivationProps> = ({ data, updateData, onPrevious }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, refetch, user } = useAuthContext()
  const isInternalFlow = Boolean(isAuthenticated)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(isInternalFlow)
  const [smsSent, setSmsSent] = useState(false)
  const [smsCountdown, setSmsCountdown] = useState(0)
  const [step, setStep] = useState<'email' | 'sms' | 'terms' | 'creating' | 'success'>(isInternalFlow ? 'terms' : 'email')

  useEffect(() => {
    if (isInternalFlow && user?.email && data.email !== user.email) {
      void updateData({ email: user.email })
    }
  }, [isInternalFlow, user?.email, data.email, updateData])

  // Таймер для повторной отправки SMS
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (smsCountdown > 0) {
      timer = setTimeout(() => setSmsCountdown(smsCountdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [smsCountdown])

  useEffect(() => {
    if (!isInternalFlow && !emailSent) {
      void sendEmailVerification()
    }
  }, [isInternalFlow, emailSent])

  const sendEmailVerification = async () => {
    try {
      // Имитируем отправку email
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEmailSent(true);
      // Пропускаем SMS и сразу переходим к условиям
      setTimeout(() => setStep('terms'), 2000);
    } catch (error) {
      console.error('Ошибка отправки email:', error);
    }
  };

  const sendSMSVerification = async () => {
    try {
      setIsLoading(true);
      // Имитируем отправку SMS
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSmsSent(true);
      setSmsCountdown(60);
    } catch (error) {
      console.error('Ошибка отправки SMS:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateSMSCode = (): boolean => {
    const newErrors: FormErrors = {};

    if (!data.smsCode || data.smsCode.length !== 6) {
      newErrors.smsCode = t('registration.validation.smsCodeRequired', 'Введите 6-значный код из SMS');
    } else if (!/^\d{6}$/.test(data.smsCode)) {
      newErrors.smsCode = t('registration.validation.smsCodeInvalid', 'Код должен содержать только цифры');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateTerms = (): boolean => {
    const newErrors: FormErrors = {};

    if (!data.acceptTerms) {
      newErrors.acceptTerms = t('registration.validation.termsRequired', 'Необходимо принять условия использования');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSMSVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSMSCode()) {
      return;
    }

    // Имитируем проверку SMS кода
    if (data.smsCode === '123456' || data.smsCode === '000000') {
      setStep('terms');
    } else {
      setErrors({ smsCode: t('registration.validation.smsCodeWrong', 'Неверный код. Попробуйте еще раз.') });
    }
  };

  type OwnerSalonResponse = {
    success: boolean
    message?: string
    error?: string
    data?: {
      salon?: { name: string }
      redirectUrl?: string
    }
  }

  const submitPublicRegistration = async (payload: Partial<RegistrationData>) => {
    const csrfResponse = await fetch('/api/auth/salon-registration/csrf-token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })

    if (!csrfResponse.ok) {
      throw new Error('Failed to obtain CSRF token')
    }

    const csrfData = await csrfResponse.json()
    const csrfToken = csrfData.csrfToken

    const response = await fetch('/api/auth/salon-registration/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create salon')
    }

    if (!result.success) {
      throw new Error(result.error || 'Unknown error occurred')
    }

    toast.success(
      t('registration.activation.successPublic', 'Салон успешно создан'),
      { description: t('registration.activation.checkEmail', 'Проверьте почту, чтобы установить пароль и войти') }
    )
    setIsLoading(false)
    setStep('success')
  }

  const submitAuthenticatedRegistration = async (payload: Partial<RegistrationData>) => {
    const body = {
      ...payload,
      email: user?.email ?? payload.email
    }

    const response = await apiClient.post<OwnerSalonResponse>('/auth/owner/salons', body)

    if (!response?.success) {
      throw new Error(response?.error || t('registration.activation.genericError', 'Не удалось создать салон'))
    }

    await refetch()
    setIsLoading(false)

    toast.success(
      t('registration.activation.successAuthenticated', 'Салон успешно создан'),
      {
        description: response?.data?.salon?.name ?? undefined
      }
    )

    navigate('/dashboard', { replace: true })
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateTerms()) {
      return
    }

    setIsLoading(true)
    setStep('creating')

    try {
      const {
        firstName,
        lastName,
        email,
        password,
        phone,
        language,
        salonName,
        website,
        businessType,
        salonType,
        country,
        currency,
        address,
        serviceCategories,
        selectedServiceKeys,
        customServices,
        teamSize,
        planType,
        trialPeriod,
        acceptTerms,
        subscribeNewsletter
      } = data

      const payload: Partial<RegistrationData> = {
        firstName,
        lastName,
        email: user?.email ?? email,
        password,
        phone,
        language,
        salonName,
        businessType,
        salonType,
        country,
        currency,
        serviceCategories,
        selectedServiceKeys,
        customServices,
        teamSize,
        planType,
        trialPeriod,
        acceptTerms,
        subscribeNewsletter
      }

      if (website) {
        payload.website = website
      }

      if (address) {
        payload.address = address
      }

      if (isInternalFlow) {
        await submitAuthenticatedRegistration(payload)
      } else {
        await submitPublicRegistration(payload)
      }
    } catch (error) {
      console.error('Ошибка создания аккаунта:', error)
      setIsLoading(false)
      setStep('terms')

      const message =
        error instanceof Error
          ? error.message
          : t('registration.activation.genericError', 'Не удалось создать салон')

      toast.error(message)
    }
  }

  const activationErrorFields: ReadonlyArray<keyof FormErrors> = ['smsCode', 'acceptTerms'];
  const isActivationErrorField = (field: keyof RegistrationData): field is keyof FormErrors =>
    activationErrorFields.includes(field as keyof FormErrors);

  const handleInputChange = (field: keyof RegistrationData, value: string | boolean) => {
    void updateData({ [field]: value })

    if (isActivationErrorField(field)) {
      if (errors[field]) {
        setErrors(prev => {
          const { [field]: _removed, ...rest } = prev;
          return rest;
        })
      }
    }
  }

  const formatPhone = (phone: string) => {
    // Форматируем телефон для отображения
    return phone.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  };

  // Шаг 1: Отправка email
  if (step === 'email') {
    return (
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Левая колонка - Форма */}
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-lg space-y-8">
            {/* Заголовок */}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Beauty Platform
              </h1>
              <h2 className="mt-6 text-2xl font-semibold text-foreground">
                {t('registration.activation.emailTitle', 'Проверяем ваш email')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('registration.activation.emailSubtitle', 'Мы отправили письмо на')} <strong>{data.email}</strong>
              </p>
            </div>

            <div className="bg-muted rounded-lg p-6 border border-border">
              <div className="flex items-center justify-center space-x-2 mb-4">
                {emailSent ? (
                  <CheckCircle className="w-6 h-6 text-foreground" />
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                )}
                <span className="font-medium text-foreground">
                  {emailSent 
                    ? t('registration.activation.emailSent', 'Email отправлен!')
                    : t('registration.activation.emailSending', 'Отправляем email...')
                  }
                </span>
              </div>
              
              {emailSent && (
                <p className="text-muted-foreground text-sm text-center">
                  {t('registration.activation.emailInstructions', 'Проверьте папку "Спам", если письмо не пришло')}
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <Button
                type="button"
                onClick={onPrevious}
                className="bg-card text-foreground border border-border hover:bg-muted focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 px-6 py-2 rounded-md font-medium transition-colors"
              >
                {t('registration.back', 'Назад')}
              </Button>
            </div>
          </div>
        </div>

        {/* Правая колонка - Изображение/Контент */}
        <div className="hidden lg:block relative">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700">
            <div className="flex items-center justify-center h-full p-12">
              <div className="text-center text-white">
                <Mail className="w-24 h-24 mx-auto mb-6 opacity-80" />
                <h3 className="text-3xl font-bold mb-4">
                  {t('registration.activation.emailHero.title', 'Проверка email')}
                </h3>
                <p className="text-lg opacity-90 mb-8">
                  {t('registration.activation.emailHero.subtitle', 'Мы отправили ссылку для подтверждения на ваш email адрес')}
                </p>
                <div className="space-y-3 text-left max-w-sm mx-auto">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-success" />
                    <span>{t('registration.activation.emailHero.feature1', 'Быстрое подтверждение')}</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-success" />
                    <span>{t('registration.activation.emailHero.feature2', 'Защищенная верификация')}</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-success" />
                    <span>{t('registration.activation.emailHero.feature3', 'Автоматический переход')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Шаг 2: SMS верификация
  if (step === 'sms') {
    return (
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Левая колонка - Форма */}
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-lg space-y-8">
            {/* Заголовок */}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Beauty Platform
              </h1>
              <h2 className="mt-6 text-2xl font-semibold text-foreground">
                {t('registration.activation.smsTitle', 'Подтвердите номер телефона')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('registration.activation.smsSubtitle', 'Мы отправили код на')} <strong>{formatPhone(data.phone)}</strong>
              </p>
            </div>

            {!smsSent ? (
              <div className="text-center">
                <Button
                  onClick={sendSMSVerification}
                  disabled={isLoading}
                  className="bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 px-6 py-3 rounded-md font-medium transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {t('registration.activation.smsSending', 'Отправляем SMS...')}
                    </div>
                  ) : (
                    t('registration.activation.sendSMS', 'Отправить SMS код')
                  )}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSMSVerification} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="smsCode" className="text-center block text-sm font-medium text-muted-foreground">
                    {t('registration.activation.enterCode', 'Введите код из SMS')}
                  </Label>
                  <Input
                    id="smsCode"
                    type="text"
                    value={data.smsCode || ''}
                    onChange={(e) => handleInputChange('smsCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className={`text-center text-2xl font-mono tracking-widest border-border focus:ring-gray-900 focus:border-gray-900 ${errors.smsCode ? 'border-error' : ''}`}
                    maxLength={6}
                    autoFocus
                    autoComplete="one-time-code"
                  />
                  {errors.smsCode && (
                    <p className="text-sm text-error text-center">{errors.smsCode}</p>
                  )}
                </div>

                <div className="text-center">
                  {smsCountdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('registration.activation.resendIn', 'Повторная отправка через')} {smsCountdown} {t('registration.activation.seconds', 'сек')}
                    </p>
                  ) : (
                    <Button
                      type="button"
                      onClick={sendSMSVerification}
                      disabled={isLoading}
                      className="bg-card text-foreground border border-border hover:bg-muted focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 px-4 py-2 rounded-md font-medium text-sm transition-colors"
                    >
                      {t('registration.activation.resendSMS', 'Отправить код повторно')}
                    </Button>
                  )}
                </div>

                <div className="bg-muted rounded-lg p-4 border border-border">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-foreground">
                      <p className="font-medium mb-1">
                        {t('registration.activation.testCode', 'Для тестирования используйте код:')}
                      </p>
                      <p className="font-mono text-lg">123456</p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="button"
                    onClick={onPrevious}
                    className="bg-card text-foreground border border-border hover:bg-muted focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 px-6 py-2 rounded-md font-medium transition-colors"
                  >
                    {t('registration.back', 'Назад')}
                  </Button>
                  
                  <Button
                    type="submit"
                    className="flex-1 bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 px-6 py-2 rounded-md font-medium transition-colors"
                    disabled={!data.smsCode || data.smsCode.length !== 6}
                  >
                    {t('registration.activation.verifyCode', 'Подтвердить код')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Правая колонка - Изображение/Контент */}
        <div className="hidden lg:block relative">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700">
            <div className="flex items-center justify-center h-full p-12">
              <div className="text-center text-white">
                <Smartphone className="w-24 h-24 mx-auto mb-6 opacity-80" />
                <h3 className="text-3xl font-bold mb-4">
                  {t('registration.activation.smsHero.title', 'SMS подтверждение')}
                </h3>
                <p className="text-lg opacity-90 mb-8">
                  {t('registration.activation.smsHero.subtitle', 'Введите код из SMS для завершения регистрации')}
                </p>
                <div className="space-y-3 text-left max-w-sm mx-auto">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-success" />
                    <span>{t('registration.activation.smsHero.feature1', 'Двухфакторная аутентификация')}</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-success" />
                    <span>{t('registration.activation.smsHero.feature2', 'Защита от мошенничества')}</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-success" />
                    <span>{t('registration.activation.smsHero.feature3', 'Безопасный доступ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Шаг 3: Принятие условий
  if (step === 'terms') {
    return (
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Левая колонка - Форма */}
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-lg space-y-8">
            {/* Заголовок */}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Beauty Platform
              </h1>
              <h2 className="mt-6 text-2xl font-semibold text-foreground">
                {t('registration.activation.termsTitle', 'Последний шаг!')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('registration.activation.termsSubtitle', 'Ознакомьтесь с условиями использования')}
              </p>
            </div>

            <form onSubmit={(e) => void handleFinalSubmit(e)} className="space-y-6">
              <div className="bg-muted rounded-lg p-6 max-h-64 overflow-y-auto border border-border">
                <h3 className="font-semibold mb-4 text-foreground">
                  {t('registration.activation.termsOfService', 'Условия использования Beauty Platform')}
                </h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>1. {t('registration.activation.term1', 'Вы получаете доступ к системе управления салоном красоты')}</p>
                  <p>2. {t('registration.activation.term2', 'Персональные данные защищены согласно GDPR')}</p>
                  <p>3. {t('registration.activation.term3', 'Оплата производится ежемесячно согласно выбранному тарифу')}</p>
                  <p>4. {t('registration.activation.term4', 'Отмена подписки возможна в любое время')}</p>
                  <p>5. {t('registration.activation.term5', 'Техническая поддержка доступна в рабочие часы')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.acceptTerms}
                    onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                    className="mt-1 w-4 h-4 text-foreground border-border rounded focus:ring-gray-900"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('registration.activation.acceptTerms', 'Я принимаю')} 
                    <a href="/terms" target="_blank" className="text-foreground hover:underline mx-1 font-medium">
                      {t('registration.activation.termsLink', 'условия использования')}
                    </a>
                    {t('registration.activation.and', 'и')}
                    <a href="/privacy" target="_blank" className="text-foreground hover:underline ml-1 font-medium">
                      {t('registration.activation.privacyLink', 'политику конфиденциальности')}
                    </a>
                    <span className="text-error ml-1">*</span>
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.subscribeNewsletter}
                    onChange={(e) => handleInputChange('subscribeNewsletter', e.target.checked)}
                    className="mt-1 w-4 h-4 text-foreground border-border rounded focus:ring-gray-900"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('registration.activation.subscribe', 'Подписаться на новости о новых функциях и обновлениях')}
                  </span>
                </label>

                {errors.acceptTerms && (
                  <p className="text-sm text-error">{errors.acceptTerms}</p>
                )}
              </div>

              <div className="flex space-x-4">
                <Button
                  type="button"
                  onClick={onPrevious}
                  className="bg-card text-foreground border border-border hover:bg-muted focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 px-6 py-2 rounded-md font-medium transition-colors"
                >
                  {t('registration.back', 'Назад')}
                </Button>
                
                <Button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 px-6 py-2 rounded-md font-medium transition-colors"
                  disabled={!data.acceptTerms}
                >
                  {t('registration.activation.createSalon', 'Создать салон!')}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Правая колонка - Изображение/Контент */}
        <div className="hidden lg:block relative">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700">
            <div className="flex items-center justify-center h-full p-12">
              <div className="text-center text-white">
                <Shield className="w-24 h-24 mx-auto mb-6 opacity-80" />
                <h3 className="text-3xl font-bold mb-4">
                  {t('registration.activation.termsHero.title', 'Безопасность и конфиденциальность')}
                </h3>
                <p className="text-lg opacity-90 mb-8">
                  {t('registration.activation.termsHero.subtitle', 'Ваши данные надежно защищены согласно международным стандартам')}
                </p>
                <div className="space-y-3 text-left max-w-sm mx-auto">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-success" />
                    <span>{t('registration.activation.termsHero.feature1', 'GDPR соответствие')}</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-success" />
                    <span>{t('registration.activation.termsHero.feature2', 'Шифрование данных')}</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-success" />
                    <span>{t('registration.activation.termsHero.feature3', 'Прозрачные условия')}</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-3 text-success" />
                    <span>{t('registration.activation.termsHero.feature4', 'Отмена в любое время')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Шаг 4: Создание аккаунта
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Левая колонка - Форма */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-8">
          {/* Заголовок */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Beauty Platform
            </h1>
            <h2 className="mt-6 text-2xl font-semibold text-foreground">
              {t('registration.activation.creating', 'Создаем ваш салон...')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('registration.activation.creatingSubtitle', 'Настраиваем систему под ваши потребности')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-6 border border-border">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-foreground" />
                  </div>
                  <span className="text-foreground font-medium">
                    {t('registration.activation.step1', 'Создание пользователя')}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-foreground" />
                  </div>
                  <span className="text-foreground font-medium">
                    {t('registration.activation.step2', 'Настройка салона')}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  <span className="text-foreground font-medium">
                    {t('registration.activation.step3', 'Подготовка рабочего места')}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t('registration.activation.waitMessage', 'Это займет всего несколько секунд...')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Правая колонка - Изображение/Контент */}
      <div className="hidden lg:block relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700">
          <div className="flex items-center justify-center h-full p-12">
            <div className="text-center text-white">
              <Sparkles className="w-24 h-24 mx-auto mb-6 opacity-80 animate-pulse" />
              <h3 className="text-3xl font-bold mb-4">
                {t('registration.activation.creatingHero.title', 'Почти готово!')}
              </h3>
              <p className="text-lg opacity-90 mb-8">
                {t('registration.activation.creatingHero.subtitle', 'Последние штрихи... Ваш салон будет готов через несколько секунд!')}
              </p>
              <div className="space-y-3 text-left max-w-sm mx-auto">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-3 text-success" />
                  <span>{t('registration.activation.creatingHero.feature1', 'Настройка интерфейса')}</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-3 text-success" />
                  <span>{t('registration.activation.creatingHero.feature2', 'Создание календаря')}</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-3 text-success" />
                  <span>{t('registration.activation.creatingHero.feature3', 'Подготовка данных')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 mr-3 border-2 border-success border-t-transparent rounded-full animate-spin" />
                  <span>{t('registration.activation.creatingHero.feature4', 'Финальная настройка')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepActivation;
