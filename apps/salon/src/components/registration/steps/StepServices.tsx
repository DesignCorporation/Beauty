import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from '@beauty-platform/ui';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  Factory,
  Heart,
  Loader2,
  PawPrint,
  Plus,
  Scissors,
  Sparkles,
  Syringe,
  Trash2,
  User,
  Users,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { sdkClient } from '../../../services/sdkClient';
import { CustomServiceInput, RegistrationData } from '../MultiStepRegistration';

interface StepServicesProps {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

type SalonTypeOption = {
  id: string;
  salonType: string;
  label: string;
  description: string;
  icon: string;
  defaultCategories: number;
  defaultServices: number;
};

type ServicePreset = {
  key: string;
  selectionKey: string;
  name: string;
  price: number;
  duration: number;
  default: boolean;
  categoryName: string;
  subcategoryName: string;
};

type ServicePresetCategory = {
  id: string;
  name: string;
  icon: string | null;
  services: ServicePreset[];
  subcategories: Array<{
    id: string;
    name: string;
    services: ServicePreset[];
  }>;
};

type IconComponent = React.ComponentType<{ className?: string }>;

const toIcon = (icon: LucideIcon): IconComponent => icon as IconComponent;

const SALON_TYPE_ICON_MAP: Record<string, IconComponent> = {
  HAIR_SALON: toIcon(Scissors),
  NAIL_SALON: toIcon(Sparkles),
  MASSAGE_SPA: toIcon(Waves),
  BARBERSHOP: toIcon(Scissors),
  PET_GROOMING: toIcon(PawPrint),
  WELLNESS_CENTER: toIcon(Heart),
  BEAUTY_CLINIC: toIcon(Syringe),
  BROW_LASH_STUDIO: toIcon(Eye),
  CUSTOM: toIcon(Sparkles),
};

const TEAM_SIZES: Array<{
  id: RegistrationData['teamSize'];
  icon: IconComponent;
  titleKey: string;
  descriptionKey: string;
  fallbackTitle: string;
  fallbackDescription: string;
  emoji: string;
}> = [
  {
    id: 'solo',
    icon: toIcon(User),
    titleKey: 'registration.services.teamSizes.solo.title',
    descriptionKey: 'registration.services.teamSizes.solo.description',
    fallbackTitle: 'Я работаю один',
    fallbackDescription: 'Индивидуальный предприниматель',
    emoji: '👤',
  },
  {
    id: 'small',
    icon: toIcon(Users),
    titleKey: 'registration.services.teamSizes.small.title',
    descriptionKey: 'registration.services.teamSizes.small.description',
    fallbackTitle: 'Команда 2-5 человек',
    fallbackDescription: 'Небольшая команда мастеров',
    emoji: '👥',
  },
  {
    id: 'medium',
    icon: toIcon(Building2),
    titleKey: 'registration.services.teamSizes.medium.title',
    descriptionKey: 'registration.services.teamSizes.medium.description',
    fallbackTitle: 'Салон 6-15 человек',
    fallbackDescription: 'Полноценный салон красоты',
    emoji: '🏢',
  },
  {
    id: 'large',
    icon: toIcon(Factory),
    titleKey: 'registration.services.teamSizes.large.title',
    descriptionKey: 'registration.services.teamSizes.large.description',
    fallbackTitle: 'Крупный салон 16+ человек',
    fallbackDescription: 'Сеть салонов или большой центр',
    emoji: '🏭',
  },
];

const StepServices: React.FC<StepServicesProps> = ({ data, updateData, onNext, onPrevious }) => {
  const { t } = useTranslation();

  const [salonTypes, setSalonTypes] = useState<SalonTypeOption[]>([]);
  const [salonTypesLoading, setSalonTypesLoading] = useState(true);
  const [salonTypesError, setSalonTypesError] = useState<string | null>(null);

  const [categoryPresets, setCategoryPresets] = useState<ServicePresetCategory[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [customServiceForm, setCustomServiceForm] = useState<{
    name: string;
    price: string;
    duration: string;
    categoryName: string;
    subcategoryName: string;
  }>({
    name: '',
    price: '',
    duration: '',
    categoryName: '',
    subcategoryName: '',
  });
  const [customServiceError, setCustomServiceError] = useState<string | null>(null);

  const serviceBySelectionKey = useMemo(() => {
    const map = new Map<string, ServicePreset>();
    categoryPresets.forEach((category) => {
      category.services.forEach((service) => map.set(service.selectionKey, service));
    });
    return map;
  }, [categoryPresets]);

  useEffect(() => {
    const fetchSalonTypes = async () => {
      setSalonTypesLoading(true);
      setSalonTypesError(null);
      try {
        const payload = await sdkClient.get<{ salonTypes: SalonTypeOption[] }>('/salon-types');
        setSalonTypes(payload.salonTypes || []);
      } catch (error) {
        console.error('Salon type fetch error:', error);
        setSalonTypesError(
          t('registration.services.errors.loadSalonTypes', 'Не удалось загрузить типы салонов')
        );
      } finally {
        setSalonTypesLoading(false);
      }
    };

    void fetchSalonTypes();
  }, [t]);

  useEffect(() => {
    if (!data.salonType) {
      setCategoryPresets([]);
      return;
    }

    const fetchPresets = async () => {
      setPresetsLoading(true);
      setPresetsError(null);
      try {
        const payload = await sdkClient.get<{ categories: ServicePresetCategory[] }>(`/crm/service-presets/${encodeURIComponent(data.salonType as any)}`);
        const categories: ServicePresetCategory[] = payload.categories || [];

        setCategoryPresets(categories);

        const initialExpanded = categories.reduce<Record<string, boolean>>((acc, category, index) => {
          acc[category.id] = index === 0;
          return acc;
        }, {});
        setExpandedCategories(initialExpanded);

        const hasExistingSelection =
          (data.selectedServiceKeys && data.selectedServiceKeys.length > 0) ||
          (data.customServices && data.customServices.length > 0);

        if (!hasExistingSelection) {
          const defaultKeys = categories
            .flatMap((category) => category.services.filter((service) => service.default))
            .map((service) => service.selectionKey);

          if (defaultKeys.length > 0) {
            const localMap = new Map<string, ServicePreset>();
            categories.forEach((category) =>
              category.services.forEach((service) => localMap.set(service.selectionKey, service))
            );
            const uniqueCategories = computeCategories(
              defaultKeys,
              data.customServices || [],
              localMap
            );
            updateData({
              selectedServiceKeys: defaultKeys,
              serviceCategories: uniqueCategories,
            });
          }
        }
      } catch (error) {
        console.error('Service presets fetch error:', error);
        setPresetsError(
          t('registration.services.errors.loadServicePresets', 'Не удалось загрузить список услуг')
        );
        setCategoryPresets([]);
      } finally {
        setPresetsLoading(false);
      }
    };

    void fetchPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.salonType, t]);

  useEffect(() => {
    if (!categoryPresets.length) return;

    setExpandedCategories((prev) => {
      const updated: Record<string, boolean> = {};
      categoryPresets.forEach((category, index) => {
        updated[category.id] = prev[category.id] ?? index === 0;
      });
      return updated;
    });
  }, [categoryPresets]);

  const computeCategories = (
    selectedKeys: string[],
    customServices: CustomServiceInput[],
    map: Map<string, ServicePreset>
  ): string[] => {
    const categorySet = new Set<string>();
    selectedKeys.forEach((key) => {
      const service = map.get(key);
      if (service) {
        categorySet.add(service.categoryName);
      }
    });

    customServices.forEach((service) => {
      if (service.categoryName) {
        categorySet.add(service.categoryName);
      }
    });

    return Array.from(categorySet);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleSelectSalonType = (type: SalonTypeOption) => {
    setSubmitError(null);
    const allowedBusinessTypes: RegistrationData['businessType'][] = ['salon', 'mobile', 'home', 'online'];
    const fallbackBusinessType = allowedBusinessTypes.includes(data.businessType)
      ? data.businessType
      : 'salon';

    updateData({
      salonType: type.id,
      businessType: fallbackBusinessType,
      selectedServiceKeys: [],
      customServices: [],
      serviceCategories: [],
    });
  };

  const handleToggleService = (selectionKey: string) => {
    const currentKeys = new Set(data.selectedServiceKeys || []);
    if (currentKeys.has(selectionKey)) {
      currentKeys.delete(selectionKey);
    } else {
      currentKeys.add(selectionKey);
    }

    const updatedKeys = Array.from(currentKeys);
    const categories = computeCategories(updatedKeys, data.customServices || [], serviceBySelectionKey);

    updateData({
      selectedServiceKeys: updatedKeys,
      serviceCategories: categories,
    });

    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleTeamSizeChange = (teamSize: RegistrationData['teamSize']) => {
    void updateData({ teamSize });
  };

  const handleCustomServiceFormChange = (field: keyof typeof customServiceForm, value: string) => {
    setCustomServiceForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setCustomServiceError(null);
  };

  const handleAddCustomService = (event: React.FormEvent) => {
    event.preventDefault();
    setCustomServiceError(null);

    const { name, price, duration, categoryName, subcategoryName } = customServiceForm;

    if (!name.trim()) {
      setCustomServiceError(t('registration.services.validation.customName', 'Укажите название услуги'));
      return;
    }

    const priceNumber = Number(price);
    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      setCustomServiceError(t('registration.services.validation.customPrice', 'Введите корректную цену'));
      return;
    }

    const durationNumber = Number(duration);
    if (Number.isNaN(durationNumber) || durationNumber <= 0) {
      setCustomServiceError(
        t('registration.services.validation.customDuration', 'Введите длительность в минутах')
      );
      return;
    }

    const newService: CustomServiceInput = {
      name: name.trim(),
      price: priceNumber,
      duration: durationNumber,
      categoryName: categoryName.trim() ? categoryName.trim() : null,
      subcategoryName: subcategoryName.trim() ? subcategoryName.trim() : null,
    };

    const updatedCustomServices = [...(data.customServices || []), newService];
    const categories = computeCategories(data.selectedServiceKeys || [], updatedCustomServices, serviceBySelectionKey);

    updateData({
      customServices: updatedCustomServices,
      serviceCategories: categories,
    });

    setCustomServiceForm({
      name: '',
      price: '',
      duration: '',
      categoryName: '',
      subcategoryName: '',
    });
    setSubmitError(null);
  };

  const handleRemoveCustomService = (index: number) => {
    const updated = (data.customServices || []).filter((_, idx) => idx !== index);
    const categories = computeCategories(data.selectedServiceKeys || [], updated, serviceBySelectionKey);
    updateData({
      customServices: updated,
      serviceCategories: categories,
    });
  };

  const hasSelectedServices = (data.selectedServiceKeys?.length || 0) > 0;
  const hasCustomServices = (data.customServices?.length || 0) > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!data.salonType) {
      setSubmitError(t('registration.services.validation.salonType', 'Выберите тип салона'));
      return;
    }

    if (!hasSelectedServices && !hasCustomServices) {
      setSubmitError(
        t('registration.services.validation.services', 'Выберите хотя бы одну услугу или добавьте свою')
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      onNext();
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSalonType = salonTypes.find((type) => type.id === data.salonType) ?? null;
  const selectedKeysSet = useMemo(() => new Set(data.selectedServiceKeys || []), [data.selectedServiceKeys]);

  return (
    <div className="min-h-screen bg-background">
      <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto flex max-w-6xl flex-col gap-8 py-10 px-4 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Beauty Platform</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  'registration.services.subtitle',
                  'Выберите тип салона и настройте услуги, с которых начнете работу в системе'
                )}
              </p>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  {t('registration.services.salonTypeTitle', 'Тип салона')}
                </h2>
                {salonTypesLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              </div>

              {salonTypesError && (
                <div className="flex items-center gap-2 rounded-lg border border-error/40 bg-error/10 p-4 text-sm text-error">
                  <AlertCircle className="h-4 w-4" />
                  <span>{salonTypesError}</span>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                {salonTypes.map((type) => {
                  const Icon = SALON_TYPE_ICON_MAP[type.id] ?? Sparkles;
                  const isSelected = selectedSalonType?.id === type.id;

                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleSelectSalonType(type)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-foreground bg-muted'
                          : 'border-border hover:border-foreground/40 hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-inner">
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{type.label}</h3>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {t('registration.services.salonTypeStats.categories', '{{count}} категорий', {
                            count: type.defaultCategories,
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          {t('registration.services.salonTypeStats.services', '{{count}} услуг', {
                            count: type.defaultServices,
                          })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  {t('registration.services.configureTitle', 'Настройте ваши услуги')}
                </h2>
                {presetsLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              </div>

              {presetsError && (
                <div className="flex items-center gap-2 rounded-lg border border-error/40 bg-error/10 p-4 text-sm text-error">
                  <AlertCircle className="h-4 w-4" />
                  <span>{presetsError}</span>
                </div>
              )}

              {!presetsLoading && !categoryPresets.length && selectedSalonType && (
                <div className="rounded-lg border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                  {t(
                    'registration.services.emptyPresets',
                    'Для выбранного типа салона пока нет готовых пресетов. Добавьте свои услуги ниже.'
                  )}
                </div>
              )}

              <div className="space-y-3">
                {categoryPresets.map((category) => {
                  const isExpanded = expandedCategories[category.id];
                  return (
                    <Card key={category.id} className="border-border">
                      <CardHeader
                        onClick={() => toggleCategory(category.id)}
                        className="flex cursor-pointer flex-row items-center justify-between"
                      >
                        <div>
                          <CardTitle className="text-base font-semibold text-foreground">
                            {category.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {t('registration.services.categoryServiceCount', '{{count}} услуг', {
                              count: category.services.length,
                            })}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {isExpanded ? t('common.hide', 'Скрыть') : t('common.show', 'Показать')}
                        </span>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="space-y-4">
                          {category.subcategories.map((subcategory) => (
                            <div key={subcategory.id} className="space-y-2">
                              <h3 className="text-sm font-semibold text-foreground">{subcategory.name}</h3>
                              <div className="grid gap-2 md:grid-cols-2">
                                {subcategory.services.map((service) => {
                                  const isChecked = selectedKeysSet.has(service.selectionKey);
                                  return (
                                    <label
                                      key={service.selectionKey}
                                      className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                                        isChecked
                                          ? 'border-foreground bg-muted'
                                          : 'border-border hover:border-foreground/30 hover:bg-muted/40'
                                      }`}
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => handleToggleService(service.selectionKey)}
                                        className="mt-1 border-border"
                                      />
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium text-foreground">{service.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {t('registration.services.serviceMeta', '{{duration}} мин • {{price}} zł', {
                                            duration: service.duration,
                                            price: service.price,
                                          })}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                {t('registration.services.customTitle', 'Добавьте свои услуги')}
              </h2>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="custom-service-name">
                      {t('registration.services.customNameLabel', 'Название')}
                    </Label>
                    <Input
                      id="custom-service-name"
                      value={customServiceForm.name}
                      onChange={(event) => handleCustomServiceFormChange('name', event.target.value)}
                      placeholder={t('registration.services.customNamePlaceholder', 'Например, Premium Styling')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-service-price">
                      {t('registration.services.customPriceLabel', 'Цена (PLN)')}
                    </Label>
                    <Input
                      id="custom-service-price"
                      type="number"
                      min="0"
                      value={customServiceForm.price}
                      onChange={(event) => handleCustomServiceFormChange('price', event.target.value)}
                      placeholder="120"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-service-duration">
                      {t('registration.services.customDurationLabel', 'Длительность (мин)')}
                    </Label>
                    <Input
                      id="custom-service-duration"
                      type="number"
                      min="5"
                      value={customServiceForm.duration}
                      onChange={(event) => handleCustomServiceFormChange('duration', event.target.value)}
                      placeholder="60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-service-category">
                      {t('registration.services.customCategoryLabel', 'Категория (опционально)')}
                    </Label>
                    <Input
                      id="custom-service-category"
                      value={customServiceForm.categoryName}
                      onChange={(event) => handleCustomServiceFormChange('categoryName', event.target.value)}
                      placeholder={t('registration.services.customCategoryPlaceholder', 'Услуги волос')}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="custom-service-subcategory">
                      {t('registration.services.customSubcategoryLabel', 'Подкатегория (опционально)')}
                    </Label>
                    <Input
                      id="custom-service-subcategory"
                      value={customServiceForm.subcategoryName}
                      onChange={(event) => handleCustomServiceFormChange('subcategoryName', event.target.value)}
                      placeholder={t('registration.services.customSubcategoryPlaceholder', 'Окрашивание')}
                    />
                  </div>
                </div>

                {customServiceError && (
                  <p className="mt-3 text-sm text-error">{customServiceError}</p>
                )}

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCustomService}
                    className="inline-flex items-center gap-2 border-border"
                  >
                    <Plus className="h-4 w-4" />
                    {t('registration.services.customAddButton', 'Добавить услугу')}
                  </Button>
                </div>
              </div>

              {hasCustomServices && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('registration.services.customListTitle', 'Ваши услуги')}
                  </h3>
                  <div className="space-y-2">
                    {data.customServices?.map((service, index) => (
                      <div
                        key={`${service.name}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('registration.services.serviceMeta', '{{duration}} мин • {{price}} zł', {
                              duration: service.duration,
                              price: service.price,
                            })}
                            {service.categoryName ? ` • ${service.categoryName}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomService(index)}
                          className="text-muted-foreground transition hover:text-error"
                          aria-label={t('registration.services.removeCustomService', 'Удалить услугу')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  {t('registration.services.summaryTitle', 'Итоги выбора')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t('registration.services.summarySelected', 'Выбрано услуг')}
                  </span>
                  <span className="font-semibold text-foreground">
                    {(data.selectedServiceKeys?.length || 0) + (data.customServices?.length || 0)}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t('registration.services.summaryCategories', 'Категории')}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(data.serviceCategories || []).map((category) => (
                      <span
                        key={category}
                        className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                      >
                        {category}
                      </span>
                    ))}
                    {!data.serviceCategories?.length && (
                      <span className="text-xs text-muted-foreground">
                        {t('registration.services.summaryCategoriesEmpty', 'Категории появятся после выбора услуг')}
                      </span>
                    )}
                  </div>
                </div>
                {selectedSalonType && (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-foreground" />
                    <span>
                      {t('registration.services.summarySelection', 'Тип салона: {{label}}', {
                        label: selectedSalonType.label,
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  {t('registration.services.teamSizeTitle', 'Размер команды')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {TEAM_SIZES.map((team) => {
                  const Icon = team.icon;
                  const isSelected = data.teamSize === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => handleTeamSizeChange(team.id)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? 'border-foreground bg-muted'
                          : 'border-border hover:border-foreground/40 hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background shadow-inner">
                          <Icon className="h-4 w-4 text-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {t(team.titleKey, team.fallbackTitle)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t(team.descriptionKey, team.fallbackDescription)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </aside>
        </div>

        {submitError && (
          <div className="flex items-center gap-2 rounded-lg border border-error/40 bg-error/10 p-4 text-sm text-error">
            <AlertCircle className="h-4 w-4" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            className="border-border"
            disabled={isSubmitting}
          >
            {t('registration.back', 'Назад')}
          </Button>

          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {t(
                'registration.services.progress',
                'Шаг 4 из 6 — услуги и команда'
              )}
            </p>
            <Button type="submit" disabled={isSubmitting || presetsLoading}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('registration.next', 'Далее')
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StepServices;
