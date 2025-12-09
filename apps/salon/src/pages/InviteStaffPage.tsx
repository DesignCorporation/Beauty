import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent, CardHeader, CardTitle, PageContainer } from '@beauty-platform/ui';
import { ArrowLeft, UserPlus, Mail, Phone, User, MessageSquare, Shield, CheckCircle, Send } from 'lucide-react';
import { debugLog } from '../utils/debug';

const roles = [
  { value: 'STAFF_MEMBER', label: 'Мастер', description: 'Основная роль для оказания услуг', color: 'text-success' },
  { value: 'MANAGER', label: 'Менеджер', description: 'Управление операциями салона', color: 'text-info' },
  { value: 'RECEPTIONIST', label: 'Администратор', description: 'Работа с клиентами и записями', color: 'text-warning' },
  { value: 'ACCOUNTANT', label: 'Бухгалтер', description: 'Финансовый учет', color: 'text-muted-foreground' }
];

const defaultPermissions = {
  STAFF_MEMBER: ['calendar.view', 'appointments.manage'],
  MANAGER: ['calendar.view', 'calendar.edit', 'appointments.view', 'appointments.manage', 'clients.view', 'services.view'],
  RECEPTIONIST: ['calendar.view', 'appointments.view', 'appointments.manage', 'clients.view', 'clients.manage'],
  ACCOUNTANT: ['appointments.view', 'clients.view', 'finances.view']
};

const permissionLabels: Record<string, string> = {
  'calendar.view': 'Просмотр календаря',
  'calendar.edit': 'Редактирование календаря',
  'appointments.view': 'Просмотр записей',
  'appointments.manage': 'Управление записями',
  'clients.view': 'Просмотр клиентов',
  'clients.manage': 'Управление клиентами',
  'services.view': 'Просмотр услуг',
  'finances.view': 'Просмотр финансов'
};

export default function InviteStaffPage(): JSX.Element {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    masterName: '',
    masterEmail: '',
    masterPhone: '',
    role: 'STAFF_MEMBER',
    personalMessage: 'Приглашаю работать в нашем салоне! У нас дружный коллектив и постоянный поток клиентов.'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const invitationData = {
        ...formData,
        permissions: defaultPermissions[formData.role as keyof typeof defaultPermissions],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 дней
      };

      debugLog('Отправка приглашения:', invitationData);

      // Симулируем успешную отправку на время разработки
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // const response = await fetch('/api/invitations', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   credentials: 'include',
      //   body: JSON.stringify(invitationData)
      // });

      // const data = await response.json();

      // if (!response.ok) {
      //   throw new Error(data.message || `HTTP ${response.status}`);
      // }

      // Симулируем успех
      setSuccess(true);
      
    } catch (err) {
      console.error('Error creating invitation:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при отправке приглашения');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roles.find(r => r.value === formData.role);

  if (success) {
    return (
      <PageContainer variant="standard" className="max-w-2xl">
          <Card className="border-2 border-success/30 bg-success/10">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <CardTitle className="text-xl text-success">
                Приглашение отправлено! 🎉
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-success">
                Мастер <strong>{formData.masterName}</strong> получит email-приглашение на адрес:
              </p>
              <div className="bg-card border border-success/30 rounded-lg p-3">
                <div className="font-mono text-sm text-success">
                  {formData.masterEmail}
                </div>
              </div>
              
              <div className="bg-info/10 border border-info/30 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-info mb-2">Что дальше?</h4>
                <div className="text-sm text-info space-y-1">
                  <div>• Мастер получит email с приглашением и ссылкой</div>
                  <div>• Срок действия приглашения: 7 дней</div>
                  <div>• После принятия приглашения мастер появится в разделе &quot;Команда&quot;</div>
                  <div>• Вы можете отслеживать статус приглашений в настройках</div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => void navigate('/team')}
                  className="flex-1"
                >
                  К списку команды
                </Button>
                <Button 
                  onClick={() => {
                    setSuccess(false);
                    setFormData({
                      masterName: '',
                      masterEmail: '',
                      masterPhone: '',
                      role: 'STAFF_MEMBER',
                      personalMessage: 'Приглашаю работать в нашем салоне! У нас дружный коллектив и постоянный поток клиентов.'
                    });
                  }}
                  className="flex-1"
                >
                  Пригласить еще
                </Button>
              </div>
            </CardContent>
          </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="standard" className="max-w-full">
        {/* Заголовок с кнопкой назад */}
        <div className="flex items-center mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void navigate('/team')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-primary" />
              Пригласить мастера
            </h1>
            <p className="text-muted-foreground mt-1">Отправьте приглашение для работы в салоне</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Форма приглашения */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Данные мастера</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
                  {error && (
                    <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Имя мастера */}
                    <div>
                      <Label htmlFor="masterName" className="text-sm font-medium flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Имя мастера *
                      </Label>
                      <Input
                        id="masterName"
                        name="masterName"
                        type="text"
                        value={formData.masterName}
                        onChange={handleInputChange}
                        placeholder="Анна Мастерова"
                        required
                        disabled={loading}
                        className="mt-1"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <Label htmlFor="masterEmail" className="text-sm font-medium flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        Email *
                      </Label>
                      <Input
                        id="masterEmail"
                        name="masterEmail"
                        type="email"
                        value={formData.masterEmail}
                        onChange={handleInputChange}
                        placeholder="anna@example.com"
                        required
                        disabled={loading}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Телефон */}
                    <div>
                      <Label htmlFor="masterPhone" className="text-sm font-medium flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        Телефон
                      </Label>
                      <Input
                        id="masterPhone"
                        name="masterPhone"
                        type="tel"
                        value={formData.masterPhone}
                        onChange={handleInputChange}
                        placeholder="+48 123 456 789"
                        disabled={loading}
                        className="mt-1"
                      />
                    </div>

                    {/* Роль */}
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        Роль в салоне *
                      </Label>
                      <Select value={formData.role} onValueChange={(value) => handleRoleChange(value)} disabled={loading}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div>
                                <div className={`font-medium ${role.color}`}>{role.label}</div>
                                <div className="text-xs text-muted-foreground">{role.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Личное сообщение */}
                  <div>
                    <Label htmlFor="personalMessage" className="text-sm font-medium flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      Личное сообщение
                    </Label>
                    <textarea
                      id="personalMessage"
                      name="personalMessage"
                      value={formData.personalMessage}
                      onChange={handleInputChange}
                      placeholder="Добавьте личное сообщение для приглашения..."
                      disabled={loading}
                      className="mt-1 min-h-[120px] flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Это сообщение будет включено в email приглашение
                    </p>
                  </div>

                  {/* Кнопка отправки */}
                  <Button
                    type="submit"
                    disabled={loading || !formData.masterName || !formData.masterEmail}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Отправляем приглашение...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Отправить приглашение
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar с информацией */}
          <div className="space-y-6">
            {/* Права доступа для выбранной роли */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Права доступа
                </CardTitle>
                {selectedRole && (
                  <p className={`text-sm ${selectedRole.color}`}>
                    Роль: {selectedRole.label}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {defaultPermissions[formData.role as keyof typeof defaultPermissions].map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center text-sm bg-info/10 text-info px-3 py-2 rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4 mr-2 text-info" />
                      {permissionLabels[permission] || permission}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Информация о системе приглашений */}
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg text-primary">
                  🚀 Система приглашений
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-primary space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>Мастер получит email с приглашением и сможет присоединиться к вашему салону</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>Если у него уже есть аккаунт, он сможет работать в нескольких салонах</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>Приглашение действует 7 дней</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>Мастер работает бесплатно (оплачивает салон)</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </PageContainer>
  );
}
