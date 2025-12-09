import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, PageContainer, SidebarTrigger } from '@beauty-platform/ui';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useCurrency } from '../currency';
import { useServices } from '../hooks/useServices';
import { useCategories } from '../hooks/useCategories';
import { PageHeader } from '../components/layout/PageHeader';

export default function EditServicePage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { formatPrice } = useCurrency();
  const { services, updateService, loading: servicesLoading } = useServices();
  const { categories } = useCategories();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    categoryId: '',
    subcategoryId: ''
  });

  // Найти услугу по ID и заполнить форму
  useEffect(() => {
    if (id && services.length > 0) {
      const service = services.find(s => s.id === id);
      if (service) {
        setFormData({
          name: service.name,
          description: service.description || '',
          duration: service.duration.toString(),
          price: service.price.toString(),
          categoryId: service.categoryId || '',
          subcategoryId: service.subcategoryId || ''
        });
      }
    }
  }, [id, services]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        duration: Number.parseInt(formData.duration, 10),
        price: Number.parseFloat(formData.price),
        ...(formData.categoryId ? { categoryId: formData.categoryId } : {}),
        ...(formData.subcategoryId ? { subcategoryId: formData.subcategoryId } : {})
      };

      await updateService(id, payload);

      void navigate('/services');
    } catch (error) {
      console.error('Ошибка при обновлении услуги:', error);
      alert('Ошибка при обновлении услуги');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.name && formData.duration && formData.price;
  const service = services.find(s => s.id === id);

  if (servicesLoading) {
    return (
      <PageContainer variant="full-width" className="bg-background min-h-screen">
        <div className="mx-auto max-w-[960px] px-8 py-16 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Загрузка услуги...</span>
        </div>
      </PageContainer>
    );
  }

  if (!service) {
    return (
      <PageContainer variant="full-width" className="bg-background min-h-screen">
        <div className="mx-auto max-w-[960px] px-8 py-16 text-center space-y-4">
          <p className="text-error">❌ Услуга не найдена</p>
          <Button onClick={() => void navigate('/services')} variant="outline" className="bg-card shadow-none border-border hover:bg-muted">
            Вернуться к услугам
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[960px] px-8 py-10 space-y-10">
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <div>
                <p className="text-sm text-muted-foreground">Услуги</p>
                <h1 className="text-2xl font-medium text-foreground">Редактировать услугу</h1>
              </div>
            </div>
          }
          actions={
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => void navigate('/services')} className="h-9 px-3">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <Button type="submit" form="edit-service-form" disabled={!isFormValid || loading} className="h-9 px-4">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                  </>
                )}
              </Button>
            </div>
          }
        />

        <form
          id="edit-service-form"
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-10"
        >
          <section className="space-y-4 border-0 border-t border-border/70 pt-6">
            <h2 className="text-base font-medium text-foreground">Основная информация</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm text-muted-foreground">
                  Название услуги *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full border-0 border-b border-border/80 bg-transparent px-0 py-2 text-base focus-visible:outline-none focus-visible:ring-0 rounded-none"
                  placeholder="Стрижка женская"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm text-muted-foreground">
                  Описание
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border-0 border-b border-border/80 bg-transparent px-0 py-2 text-base focus-visible:outline-none focus-visible:ring-0 rounded-none"
                  placeholder="Краткое описание услуги..."
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-0 border-t border-border/70 pt-6">
            <h2 className="text-base font-medium text-foreground">Категория</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="categoryId" className="text-sm text-muted-foreground">
                  Категория услуги
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="w-full border-0 border-b border-border/80 bg-transparent px-0 py-2 text-base focus-visible:outline-none focus-visible:ring-0 rounded-none"
                >
                  <option value="">Выберите категорию</option>
                  {categories.filter(cat => cat.isActive).map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.categoryId && (
                <div className="space-y-2">
                  <label htmlFor="subcategoryId" className="text-sm text-muted-foreground">
                    Подкатегория услуги
                  </label>
                  <select
                    id="subcategoryId"
                    name="subcategoryId"
                    value={formData.subcategoryId}
                    onChange={handleInputChange}
                    className="w-full border-0 border-b border-border/80 bg-transparent px-0 py-2 text-base focus-visible:outline-none focus-visible:ring-0 rounded-none"
                  >
                    <option value="">Выберите подкатегорию</option>
                    {categories
                      .find(cat => cat.id === formData.categoryId)
                      ?.subcategories.filter(sub => sub.isActive)
                      .map(subcategory => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6 border-0 border-t border-border/70 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="duration" className="text-sm text-muted-foreground">
                  Длительность (мин) *
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full border-0 border-b border-border/80 bg-transparent px-0 py-2 text-base focus-visible:outline-none focus-visible:ring-0 rounded-none"
                  placeholder="60"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="price" className="text-sm text-muted-foreground">
                  Цена *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full border-0 border-b border-border/80 bg-transparent px-0 py-2 text-base focus-visible:outline-none focus-visible:ring-0 rounded-none"
                  placeholder="1500.00"
                />
              </div>
            </div>

            {isFormValid && (
              <div className="space-y-3 border border-border/60 bg-muted/30 px-4 py-3 rounded-none">
                <h3 className="text-sm font-medium text-muted-foreground">Предпросмотр изменений</h3>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-base font-medium text-foreground truncate">{formData.name}</p>
                    <span className="text-lg font-medium text-success">
                      {formatPrice(Number(formData.price))}
                    </span>
                  </div>
                  {formData.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground">{formData.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border/60 pt-2">
                    <span>Длительность</span>
                    <span className="text-foreground font-medium">{formData.duration} мин</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="flex justify-end gap-3 border-0 border-t border-border/70 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigate('/services')}
              disabled={loading}
              className="h-9 px-4 bg-card shadow-none border-border hover:bg-muted"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || loading}
              className="h-9 px-4"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить изменения
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
