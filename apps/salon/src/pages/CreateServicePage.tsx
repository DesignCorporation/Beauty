import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Button, PageContainer } from '@beauty-platform/ui';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useCurrency } from '../currency';
import { useServices } from '../hooks/useServices';
import { useCategories } from '../hooks/useCategories';

export default function CreateServicePage(): JSX.Element {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { createService } = useServices();
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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

      await createService(payload);

      void navigate('/services');
    } catch (error) {
      console.error('Ошибка при создании услуги:', error);
      alert('Ошибка при создании услуги');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.name && formData.duration && formData.price;

  return (
    <PageContainer variant="standard" className="max-w-2xl">
        {/* Заголовок и навигация */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => void navigate('/services')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к услугам
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Создать услугу</h1>
              <p className="text-muted-foreground mt-1">Добавление новой услуги в каталог</p>
            </div>
          </div>
        </div>

        {/* Форма создания услуги */}
        <Card>
          <CardHeader>
            <CardTitle>Информация об услуге</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
              {/* Название услуги */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-2">
                  Название услуги *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                  placeholder="Например: Стрижка женская"
                />
              </div>

              {/* Описание */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-2">
                  Описание
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                  placeholder="Краткое описание услуги..."
                />
              </div>

              {/* Категория */}
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-muted-foreground mb-2">
                  Категория услуги
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                >
                  <option value="">Выберите категорию...</option>
                  {categories.filter(cat => cat.isActive).map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Подкатегория */}
              {formData.categoryId && (
                <div>
                  <label htmlFor="subcategoryId" className="block text-sm font-medium text-muted-foreground mb-2">
                    Подкатегория услуги
                  </label>
                  <select
                    id="subcategoryId"
                    name="subcategoryId"
                    value={formData.subcategoryId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                  >
                    <option value="">Выберите подкатегорию...</option>
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

              {/* Длительность и цена */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-muted-foreground mb-2">
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
                    className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                    placeholder="60"
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-muted-foreground mb-2">
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
                    className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                    placeholder="1500.00"
                  />
                </div>
              </div>

              {/* Предпросмотр */}
              {isFormValid && (
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Предпросмотр:</h3>
                  <div className="bg-card p-4 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-foreground">{formData.name}</h4>
                        {formData.description && (
                          <p className="text-sm text-muted-foreground mt-1">{formData.description}</p>
                        )}
                        {formData.categoryId && (
                          <div className="text-xs text-info mt-2">
                            Категория: {categories.find(c => c.id === formData.categoryId)?.name}
                            {formData.subcategoryId && (
                              <span> → {categories.find(c => c.id === formData.categoryId)?.subcategories.find(s => s.id === formData.subcategoryId)?.name}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Длительность:</span>
                        <span className="font-medium">{formData.duration} мин</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Стоимость:</span>
                        <span className="text-lg font-bold text-success">
                          {formatPrice(Number(formData.price))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Кнопки действий */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void navigate('/services')}
                  disabled={loading}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={!isFormValid || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Создание...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Создать услугу
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </PageContainer>
  );
}
