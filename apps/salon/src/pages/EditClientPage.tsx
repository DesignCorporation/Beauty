import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, PageContainer, SidebarTrigger, Input, Textarea, Label } from '@beauty-platform/ui';
import { ArrowLeft, Save, Loader2, User, Phone, Mail, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClients } from '../hooks/useClients';
import type { ClientFormData } from '../hooks/useClients';
import { PageHeader } from '../components/layout/PageHeader';

interface EditClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  birthday: string;
}

export default function EditClientPage(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { clients, updateClient, loading: clientsLoading } = useClients();
  const { t: translate } = useTranslation();

  const getInitials = (name: string) => {
    if (!name) return '—';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '—';
    if (parts.length === 1) {
      const [onlyPart] = parts;
      return (onlyPart?.slice(0, 2) || '—').toUpperCase();
    }
    const first = parts[0];
    const last = parts[parts.length - 1];
    if (!first || !last) {
      return '—';
    }
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  const splitName = (fullName?: string | null): { firstName: string; lastName: string } => {
    if (!fullName) {
      return { firstName: '', lastName: '' };
    }

    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return { firstName: '', lastName: '' };
    }

    const first = parts[0] ?? '';
    const rest = parts.slice(1);

    return {
      firstName: first,
      lastName: rest.join(' ')
    };
  };

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EditClientFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
    birthday: ''
  });

  // Найти клиента по ID и заполнить форму
  useEffect(() => {
    if (id && clients.length > 0) {
      const client = clients.find(c => c.id === id);
      if (client) {
        const profileFirstName = client.profileFirstName ?? '';
        const profileLastName = client.profileLastName ?? '';
        const { firstName: fallbackFirstName, lastName: fallbackLastName } = splitName(client.name);

        const cleanedProfileFirst = profileFirstName.trim();
        const cleanedProfileLast = profileLastName.trim();
        const firstNameValue = (cleanedProfileFirst.length > 0 ? cleanedProfileFirst : fallbackFirstName).trim();
        const lastNameValue = (cleanedProfileLast.length > 0 ? cleanedProfileLast : fallbackLastName).trim();
        const emailValue = typeof client.email === 'string' ? client.email : '';
        const phoneValue = typeof client.phone === 'string' ? client.phone : '';
        const notesValue = typeof client.notes === 'string' ? client.notes : '';
        let birthdayValue = '';
        if (client.birthday) {
          const parsedBirthday = new Date(client.birthday);
          if (!Number.isNaN(parsedBirthday.getTime())) {
            const [datePart] = parsedBirthday.toISOString().split('T');
            if (datePart) {
              birthdayValue = datePart;
            }
          }
        }

        setFormData({
          firstName: firstNameValue || '',
          lastName: lastNameValue || '',
          email: emailValue || '',
          phone: phoneValue || '',
          notes: notesValue || '',
          birthday: birthdayValue || ''
        } as EditClientFormData);
      }
    }
  }, [id, clients]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const updatePayload: Partial<ClientFormData> = {};

      if (!isPortalClient) {
        const fullName = [formData.firstName.trim(), formData.lastName.trim()]
          .filter(Boolean)
          .join(' ');
        updatePayload.name = fullName || formData.firstName.trim() || formData.lastName.trim() || '';

        const trimmedEmail = formData.email.trim();
        if (trimmedEmail) {
          updatePayload.email = trimmedEmail;
        }

        const trimmedPhone = formData.phone.trim();
        if (trimmedPhone) {
          updatePayload.phone = trimmedPhone;
        }
      }

      if (formData.birthday) {
        updatePayload.birthday = formData.birthday;
      }

      const trimmedNotes = formData.notes.trim();
      if (trimmedNotes) {
        updatePayload.notes = trimmedNotes;
      }

      await updateClient(id, updatePayload);

      void navigate('/clients');
    } catch (error) {
      console.error('Ошибка при обновлении клиента:', error);
      const message = error instanceof Error ? error.message : 'Ошибка при обновлении клиента';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.firstName.trim() !== '';
  const client = clients.find(c => c.id === id);
  const clientAvatarUrl = client?.avatarUrl ?? null;
  const isPortalClient = Boolean(client?.isPortalClient);
  const clientDisplayName = client
    ? ([client.profileFirstName, client.profileLastName].filter(Boolean).join(' ') || client.name)
    : '';
  const previewFullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim();

  if (clientsLoading) {
    return (
      <PageContainer variant="full-width" className="bg-background min-h-screen">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Загрузка клиента...</span>
        </div>
      </PageContainer>
    );
  }

  if (!client) {
    return (
      <PageContainer variant="full-width" className="bg-background min-h-screen">
        <div className="text-center py-20 space-y-4">
          <p className="text-error">❌ Клиент не найден</p>
          <Button onClick={() => void navigate('/clients')} variant="outline" className="bg-card shadow-none border-border hover:bg-muted">Вернуться к клиентам</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[960px] px-8 py-10 space-y-8">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{translate('clients.edit', 'Редактировать клиента')}</span>
              </div>
            </div>
          }
          actions={
            <div className="flex gap-2">
              <Button variant="outline" className="bg-card shadow-none border-border hover:bg-muted" onClick={() => void navigate('/clients')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {translate('clients.backToClients')}
              </Button>
            </div>
          }
        />

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">{translate('clients.edit', 'Редактировать клиента')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{translate('clients.editDescription', 'Изменение информации о клиенте')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden bg-muted text-lg font-medium uppercase text-muted-foreground rounded-full">
                {clientAvatarUrl ? (
                  <img src={clientAvatarUrl} alt={clientDisplayName || client.name} className="h-full w-full object-cover rounded-full" />
                ) : (
                  getInitials(clientDisplayName || client.name)
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="break-all">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {isPortalClient && (
              <div className="border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                Этот клиент управляет профилем через Client Portal. Здесь можно изменить только заметки.
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground border-t border-border pt-4">{translate('clients.basicInfo', 'Основная информация')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm text-foreground">
                      {translate('clients.firstName', 'Имя')} *
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      disabled={isPortalClient}
                      className="rounded-none border-0 border-b border-border bg-transparent"
                      placeholder="Анна"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-sm text-foreground">
                      {translate('clients.lastName', 'Фамилия')}
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      disabled={isPortalClient}
                      className="rounded-none border-0 border-b border-border bg-transparent"
                      placeholder="Иванова"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm text-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isPortalClient}
                      className="rounded-none border-0 border-b border-border bg-transparent"
                      placeholder="anna@example.com"
                      title={isPortalClient ? 'Email изменяется клиентом в личном кабинете' : undefined}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm text-foreground">
                      {translate('clients.phone', 'Телефон')}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={isPortalClient}
                      className="rounded-none border-0 border-b border-border bg-transparent"
                      placeholder="+48 123 456 789"
                      title={isPortalClient ? 'Телефон изменяется клиентом в личном кабинете' : undefined}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="birthday" className="text-sm text-foreground">
                    {translate('clients.birthday', 'День рождения')}
                  </Label>
                  <Input
                    id="birthday"
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleInputChange}
                    disabled={isPortalClient}
                    className="rounded-none border-0 border-b border-border bg-transparent"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground border-t border-border pt-4">{translate('clients.additionalInfo', 'Дополнительная информация')}</p>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-sm text-foreground">
                    {translate('clients.notes', 'Заметки')}
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="rounded-none border border-border bg-transparent"
                    placeholder="Предпочтения, аллергии, особые пожелания..."
                  />
                </div>
              </div>

              {isFormValid && (
                <div className="border border-border bg-muted/40 p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">{translate('clients.preview', 'Предпросмотр изменений')}</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="text-foreground font-medium">{previewFullName || clientDisplayName}</p>
                    {formData.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {formData.email}
                      </div>
                    )}
                    {formData.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {formData.phone}
                      </div>
                    )}
                    {formData.birthday && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(formData.birthday).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                    {formData.notes && (
                      <div className="p-2 border border-border text-sm text-foreground">
                        <strong>{translate('clients.notes')}</strong>: {formData.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void navigate('/clients')}
                  disabled={loading}
                  className="bg-card shadow-none border-border hover:bg-muted"
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={!isFormValid || loading}
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить изменения
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
