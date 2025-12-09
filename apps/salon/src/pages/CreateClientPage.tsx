import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Button, PageContainer } from '@beauty-platform/ui';
import { ArrowLeft, Save, Loader2, User, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { useClients } from '../hooks/useClients';

export default function CreateClientPage(): JSX.Element {
  const navigate = useNavigate();
  const { createClient } = useClients();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
    birthday: ''
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const previewFullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fullName = [formData.firstName.trim(), formData.lastName.trim()]
        .filter(Boolean)
        .join(' ');

      const payload = {
        name: fullName,
        ...(formData.email.trim() ? { email: formData.email.trim() } : {}),
        ...(formData.phone.trim() ? { phone: formData.phone.trim() } : {}),
        ...(formData.notes.trim() ? { notes: formData.notes.trim() } : {}),
        ...(formData.birthday ? { birthday: formData.birthday } : {})
      };

      await createClient(payload);

      void navigate('/clients');
    } catch (error) {
      console.error('Ошибка при создании клиента:', error);
      alert('Ошибка при создании клиента');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.firstName.trim() !== '';

  return (
    <PageContainer variant="standard" className="max-w-2xl">
        {/* Заголовок и навигация */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => void navigate('/clients')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к клиентам
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Добавить клиента</h1>
              <p className="text-muted-foreground mt-1">Создание профиля нового клиента</p>
            </div>
          </div>
        </div>

        {/* Форма создания клиента */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Информация о клиенте
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
              {/* Основная информация */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground border-b pb-2">Основная информация</h3>
                
                {/* Имя и фамилия */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-muted-foreground mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Имя *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                      placeholder="Анна"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-muted-foreground mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Фамилия
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                      placeholder="Иванова"
                    />
                  </div>
                </div>

                {/* Email и телефон */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                      placeholder="anna@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Телефон
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                </div>

                {/* День рождения */}
                <div>
                  <label htmlFor="birthday" className="block text-sm font-medium text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    День рождения
                  </label>
                  <input
                    type="date"
                    id="birthday"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                  />
                </div>
              </div>

              {/* Дополнительная информация */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground border-b pb-2">Дополнительная информация</h3>
                
                {/* Заметки */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Заметки
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-info focus:border-transparent"
                    placeholder="Предпочтения, аллергии, особые пожелания..."
                  />
                </div>
              </div>

              {/* Предпросмотр */}
              {isFormValid && (
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Предпросмотр:</h3>
                  <div className="bg-card p-4 rounded border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{previewFullName}</h4>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {formData.email && (
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-2" />
                              {formData.email}
                            </div>
                          )}
                          {formData.phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-2" />
                              {formData.phone}
                            </div>
                          )}
                          {formData.birthday && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              {new Date(formData.birthday).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                        </div>
                        {formData.notes && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <strong>Заметки:</strong> {formData.notes}
                          </div>
                        )}
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
                  onClick={() => void navigate('/clients')}
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
                      Создать клиента
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
