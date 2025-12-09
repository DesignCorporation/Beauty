import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label } from '@beauty-platform/ui';
import { Building2, Globe, Car, Home, Monitor } from 'lucide-react';
import { RegistrationData } from '../MultiStepRegistration';

interface StepSalonDataProps {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface FormErrors {
  salonName?: string;
  website?: string;
}

const StepSalonData: React.FC<StepSalonDataProps> = ({ data, updateData, onNext, onPrevious }) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const businessTypes = [
    {
      id: 'salon',
      icon: Building2,
      title: t('registration.salon.businessTypes.salon.title', 'Клиенты приходят в салон'),
      description: t('registration.salon.businessTypes.salon.description', 'Стационарный салон с постоянным адресом'),
      emoji: '🏢'
    },
    {
      id: 'mobile',
      icon: Car,
      title: t('registration.salon.businessTypes.mobile.title', 'Мобильный мастер'),
      description: t('registration.salon.businessTypes.mobile.description', 'Выезжаю к клиентам на дом'),
      emoji: '🚗'
    },
    {
      id: 'home',
      icon: Home,
      title: t('registration.salon.businessTypes.home.title', 'Работаю на дому'),
      description: t('registration.salon.businessTypes.home.description', 'Принимаю клиентов у себя дома'),
      emoji: '🏠'
    },
    {
      id: 'online',
      icon: Monitor,
      title: t('registration.salon.businessTypes.online.title', 'Онлайн консультации'),
      description: t('registration.salon.businessTypes.online.description', 'Видеоконсультации и онлайн услуги'),
      emoji: '💻'
    }
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Валидация названия салона
    if (!data.salonName.trim()) {
      newErrors.salonName = t('registration.validation.salonNameRequired', 'Название салона обязательно');
    } else if (data.salonName.trim().length < 3) {
      newErrors.salonName = t('registration.validation.salonNameTooShort', 'Название должно содержать минимум 3 символа');
    }

    // Валидация сайта (если указан)
    if (data.website && data.website.trim()) {
      const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlRegex.test(data.website)) {
        newErrors.website = t('registration.validation.websiteInvalid', 'Введите корректный URL сайта');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Имитируем сохранение данных
      await new Promise(resolve => setTimeout(resolve, 800));
      onNext();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const salonErrorFields: ReadonlyArray<keyof FormErrors> = ['salonName', 'website'];
  const isSalonErrorField = (field: keyof RegistrationData): field is keyof FormErrors =>
    salonErrorFields.includes(field as keyof FormErrors);

  const handleInputChange = (field: keyof RegistrationData, value: string) => {
    void updateData({ [field]: value });
    
    // Очищаем ошибку при изменении поля
    if (isSalonErrorField(field)) {
      if (errors[field]) {
        setErrors(prev => {
          const { [field]: _removed, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleBusinessTypeChange = (businessType: 'salon' | 'mobile' | 'home' | 'online') => {
    void updateData({ businessType });
  };

  const formatWebsiteUrl = (url: string): string => {
    if (!url) return '';
    
    // Автоматически добавляем https:// если протокол не указан
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

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
              {t('registration.salon.title', 'Расскажите о вашем бизнесе')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('registration.salon.subtitle', 'Название, которое увидят ваши клиенты')}
            </p>
          </div>

          {/* Форма */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            {/* Название салона */}
            <div>
              <Label htmlFor="salonName" className="block text-sm font-medium text-muted-foreground">
                {t('registration.salon.salonName', 'Название салона')} <span className="text-error">*</span>
              </Label>
              <div className="mt-1 relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="salonName"
                  type="text"
                  value={data.salonName}
                  onChange={(e) => handleInputChange('salonName', e.target.value)}
                  placeholder={t('registration.salon.salonNamePlaceholder', 'Beauty Studio "Красота"')}
                  className={`pl-10 block w-full border-border rounded-md shadow-sm focus:ring-gray-900 focus:border-gray-900 ${errors.salonName ? 'border-error focus:ring-error focus:border-error' : ''}`}
                  autoFocus
                />
              </div>
              {errors.salonName && (
                <p className="mt-1 text-sm text-error">{errors.salonName}</p>
              )}
            </div>

            {/* Веб-сайт */}
            <div>
              <Label htmlFor="website" className="block text-sm font-medium text-muted-foreground">
                {t('registration.salon.website', 'Веб-сайт')} 
                <span className="text-muted-foreground text-sm ml-1">
                  ({t('registration.optional', 'необязательно')})
                </span>
              </Label>
              <div className="mt-1 relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="website"
                  type="url"
                  value={data.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder={t('registration.salon.websitePlaceholder', 'www.your-salon.com')}
                  className={`pl-10 block w-full border-border rounded-md shadow-sm focus:ring-gray-900 focus:border-gray-900 ${errors.website ? 'border-error focus:ring-error focus:border-error' : ''}`}
                  onBlur={(e) => {
                    if (e.target.value) {
                      handleInputChange('website', formatWebsiteUrl(e.target.value));
                    }
                  }}
                />
              </div>
              {errors.website && (
                <p className="mt-1 text-sm text-error">{errors.website}</p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {t('registration.salon.websiteNote', 'Если у вас нет сайта, мы поможем создать красивую страницу')}
              </p>
            </div>

            {/* Тип работы */}
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-3">
                {t('registration.salon.businessType', 'Как вы работаете с клиентами?')}
              </Label>
              
              <div className="space-y-3">
                {businessTypes.map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = data.businessType === type.id;
                  
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleBusinessTypeChange(type.id as any)}
                      className={`w-full p-3 rounded-md border text-left transition-colors ${
                        isSelected
                          ? 'border-gray-900 bg-muted'
                          : 'border-border hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <IconComponent className={`w-5 h-5 ${
                          isSelected ? 'text-foreground' : 'text-muted-foreground'
                        }`} />
                        <div className="flex-1">
                          <span className={`font-medium ${
                            isSelected ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {type.title}
                          </span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-card rounded-full" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Кнопки навигации */}
            <div className="flex space-x-4">
              <Button
                type="button"
                onClick={onPrevious}
                className="bg-card text-foreground border border-border py-2 px-4 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors duration-200"
              >
                {t('registration.back', 'Назад')}
              </Button>
              
              <Button
                type="submit"
                className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('registration.saving', 'Сохраняем...')}
                  </div>
                ) : (
                  t('registration.continue', 'Продолжить')
                )}
              </Button>
            </div>
          </form>

          {/* Подсказка */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {t('registration.salon.help', 'Не знаете, что выбрать? Вы всегда сможете изменить настройки позже')}
            </p>
          </div>
        </div>
      </div>

      {/* Правая колонка - Контент */}
      <div className="hidden lg:block relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700">
          <div className="flex items-center justify-center h-full p-12">
            <div className="text-center text-white">
              <Building2 className="w-24 h-24 mx-auto mb-6 opacity-80" />
              <h3 className="text-3xl font-bold mb-4">
                {t('registration.salon.hero.title', 'Создайте профиль вашего бизнеса')}
              </h3>
              <p className="text-lg opacity-90 mb-8">
                {t('registration.salon.hero.subtitle', 'Помогите клиентам найти именно ваш салон')}
              </p>
              <div className="space-y-3 text-left max-w-sm mx-auto">
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 mr-3 text-success" />
                  <span>{t('registration.salon.hero.feature1', 'Стационарный салон красоты')}</span>
                </div>
                <div className="flex items-center">
                  <Car className="w-5 h-5 mr-3 text-success" />
                  <span>{t('registration.salon.hero.feature2', 'Мобильные услуги на выезд')}</span>
                </div>
                <div className="flex items-center">
                  <Home className="w-5 h-5 mr-3 text-success" />
                  <span>{t('registration.salon.hero.feature3', 'Работа на дому')}</span>
                </div>
                <div className="flex items-center">
                  <Monitor className="w-5 h-5 mr-3 text-success" />
                  <span>{t('registration.salon.hero.feature4', 'Онлайн консультации')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepSalonData;
