import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@beauty-platform/ui';
import { Crown, Users, Building2, Factory, Check } from 'lucide-react';
import { RegistrationData } from '../MultiStepRegistration';

interface StepPricingProps {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const StepPricing: React.FC<StepPricingProps> = ({ data, updateData, onNext, onPrevious }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const currencySymbol = data.currency === 'PLN' ? 'zł' : 
                        data.currency === 'USD' ? '$' : 
                        data.currency === 'UAH' ? '₴' : '€';

  const pricingPlans = [
    {
      id: 'starter',
      icon: Crown,
      name: t('registration.pricing.plans.starter.name', 'STARTER'),
      subtitle: t('registration.pricing.plans.starter.subtitle', 'Для начинающих'),
      price: t('registration.pricing.plans.starter.price', 'Бесплатно'),
      priceAfterTrial: `20${currencySymbol}`,
      trialDays: 7,
      popular: false,
      recommended: false,
      features: [
        t('registration.pricing.plans.starter.features.team', '1 владелец + до 2 мастеров'),
        t('registration.pricing.plans.starter.features.calendar', 'Базовый календарь записей'),
        t('registration.pricing.plans.starter.features.clients', 'До 50 клиентов'),
        t('registration.pricing.plans.starter.features.support', 'Email поддержка')
      ]
    },
    {
      id: 'team',
      icon: Users,
      name: t('registration.pricing.plans.team.name', 'TEAM'),
      subtitle: t('registration.pricing.plans.team.subtitle', 'Для команд'),
      price: `20${currencySymbol}`,
      trialDays: 7,
      popular: true,
      recommended: false,
      features: [
        t('registration.pricing.plans.team.features.team', 'До 5 сотрудников'),
        t('registration.pricing.plans.team.features.calendar', 'Полный календарь'),
        t('registration.pricing.plans.team.features.clients', 'Неограниченно клиентов'),
        t('registration.pricing.plans.team.features.sms', 'SMS уведомления'),
        t('registration.pricing.plans.team.features.analytics', 'Базовая аналитика'),
        t('registration.pricing.plans.team.features.support', 'Приоритетная поддержка')
      ]
    },
    {
      id: 'business',
      icon: Building2,
      name: t('registration.pricing.plans.business.name', 'BUSINESS'),
      subtitle: t('registration.pricing.plans.business.subtitle', 'Для салонов'),
      price: `50${currencySymbol}`,
      trialDays: 7,
      popular: false,
      recommended: true,
      features: [
        t('registration.pricing.plans.business.features.team', 'До 10 сотрудников'),
        t('registration.pricing.plans.business.features.analytics', 'Продвинутая аналитика'),
        t('registration.pricing.plans.business.features.social', 'Интеграции с соцсетями'),
        t('registration.pricing.plans.business.features.booking', 'Онлайн запись для клиентов'),
        t('registration.pricing.plans.business.features.multi', 'Многофилиальность'),
        t('registration.pricing.plans.business.features.crm', 'Расширенная CRM')
      ]
    },
    {
      id: 'enterprise',
      icon: Factory,
      name: t('registration.pricing.plans.enterprise.name', 'ENTERPRISE'),
      subtitle: t('registration.pricing.plans.enterprise.subtitle', 'Для сетей'),
      price: `70${currencySymbol}`,
      trialDays: 7,
      popular: false,
      recommended: false,
      features: [
        t('registration.pricing.plans.enterprise.features.team', 'До 25 сотрудников'),
        t('registration.pricing.plans.enterprise.features.api', 'API доступ'),
        t('registration.pricing.plans.enterprise.features.manager', 'Персональный менеджер'),
        t('registration.pricing.plans.enterprise.features.integrations', 'Кастомные интеграции'),
        t('registration.pricing.plans.enterprise.features.whitelabel', 'White-label решения'),
        t('registration.pricing.plans.enterprise.features.priority', 'Приоритетная поддержка 24/7')
      ]
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onNext();
    } catch (error) {
      console.error('Ошибка сохранения тарифа:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (planType: 'starter' | 'team' | 'business' | 'enterprise') => {
    void updateData({ planType, trialPeriod: true });
  };

  const getRecommendedPlan = () => {
    switch (data.teamSize) {
      case 'solo':
        return 'starter';
      case 'small':
        return 'team';
      case 'medium':
        return 'business';
      case 'large':
        return 'enterprise';
      default:
        return 'team';
    }
  };

  const recommendedPlan = getRecommendedPlan();

  return (
    <div className="min-h-screen">
      {/* Форма на всю ширину */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl space-y-8">
          {/* Заголовок */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Beauty Platform
            </h1>
            <h2 className="mt-6 text-2xl font-semibold text-foreground">
              {t('registration.pricing.title', 'Выберите тарифный план')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('registration.pricing.subtitle', 'Начните с бесплатного периода 7 дней')}
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            {/* Тарифные планы в сетке */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pricingPlans.map((plan) => {
                const IconComponent = plan.icon;
                const isSelected = data.planType === plan.id;
                const isRecommended = plan.id === recommendedPlan;
                
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-lg border-2 transition-all duration-200 cursor-pointer h-full ${
                      isSelected
                        ? 'border-gray-900 bg-muted shadow-sm'
                        : 'border-border hover:border-gray-400'
                    }`}
                    onClick={() => handlePlanSelect(plan.id as any)}
                  >
                    {/* Бейджи */}
                    {(plan.popular || isRecommended) && (
                      <div className="absolute -top-2 left-4">
                        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded">
                          {plan.popular && t('registration.pricing.popular', 'Популярный')}
                          {isRecommended && !plan.popular && t('registration.pricing.recommended', 'Рекомендуем')}
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <IconComponent className="w-6 h-6 text-foreground" />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground">
                              {plan.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {plan.subtitle}
                            </p>
                            <div className="mt-2">
                              <span className="text-2xl font-bold text-foreground">
                                {plan.price}
                              </span>
                              {plan.id !== 'starter' && (
                                <span className="text-muted-foreground text-sm ml-1">
                                  / {t('registration.pricing.month', 'мес')}
                                </span>
                              )}
                              {plan.id === 'starter' && (
                                <div className="text-sm text-muted-foreground">
                                  {t('registration.pricing.thenPrice', 'потом')} {plan.priceAfterTrial}/{t('registration.pricing.month', 'мес')}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {t('registration.pricing.freeTrial', '7 дней бесплатно')}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-card rounded-full" />
                          </div>
                        )}
                      </div>

                      {/* Функции */}
                      <div className="mt-4 space-y-2">
                        {plan.features.slice(0, 3).map((feature, index) => (
                          <div key={index} className="flex items-center text-sm text-muted-foreground">
                            <Check className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span>{feature}</span>
                          </div>
                        ))}
                        {plan.features.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{plan.features.length - 3} {t('registration.pricing.additionalFeatures', 'дополнительных функций')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Информация о выбранном плане */}
            {data.planType && (
              <div className="bg-muted rounded-lg p-4 border border-border">
                <h3 className="font-medium text-foreground mb-1">
                  {t('registration.pricing.selectedPlan', 'Выбран план')}: {pricingPlans.find(p => p.id === data.planType)?.name}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('registration.pricing.planInfo', '7 дней бесплатно. Отмена в любое время.')}
                </p>
              </div>
            )}

            {/* Кнопки навигации */}
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
                disabled={isLoading || !data.planType}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('registration.processing', 'Обрабатываем...')}
                  </div>
                ) : (
                  t('registration.pricing.startTrial', 'Начать бесплатный период')
                )}
              </Button>
            </div>
          </form>

          {/* Дополнительная информация */}
          <div className="text-center text-xs text-muted-foreground">
            {t('registration.pricing.noCommitment', 'Никаких обязательств. Отмена в один клик.')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepPricing;
