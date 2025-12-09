import { useState, useCallback, useEffect, useMemo, FormEvent } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useCsrf } from '../hooks/useCsrf';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label, PageContainer } from '@beauty-platform/ui';
import { Loader2, User, Lock } from 'lucide-react';
import { toast } from 'sonner';
import AvatarUploader from '../components/AvatarUploader';
import clsx from 'clsx';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  tenantId: string | null;
}

export default function UserProfilePage(): JSX.Element {
  const { refetch, updateUser } = useAuthContext();
  const { fetchWithCsrf } = useCsrf();

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Avatar state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const resolveErrorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error ? error.message : fallback;

  // Current user data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const textFieldClass =
    'border-0 border-b border-transparent px-0 bg-transparent shadow-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:outline-none focus-visible:border-b-2 focus-visible:border-primary placeholder:text-muted-foreground/60';
  const roleLabels: Record<string, string> = {
    SALON_OWNER: 'Владелец салона',
    SALON_MANAGER: 'Менеджер салона',
    SALON_STAFF: 'Сотрудник салона',
    ADMIN: 'Администратор',
  };
  const currentAvatarUrl = profile?.avatar || null;
  const avatarInitials = useMemo(() => {
    const parts = [firstName, lastName].filter(Boolean);
    if (parts.length) {
      return parts.map((value) => value.charAt(0).toUpperCase()).join('');
    }
    return profile?.email?.charAt(0).toUpperCase() ?? 'U';
  }, [firstName, lastName, profile?.email]);

  // Fetch user profile on mount
  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const response = await fetch('/api/auth/users/profile', {
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && data?.user) {
        setProfile(data.user);
        setFirstName(data.user.firstName || '');
        setLastName(data.user.lastName || '');
        setPhone(data.user.phone || '');
      } else {
        throw new Error(data?.error || 'Не удалось загрузить профиль');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Не удалось загрузить профиль пользователя');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  // Avatar upload handler
  const handleAvatarUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Неподдерживаемый тип файла. Разрешены: JPG, PNG, SVG, WebP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимальный размер: 5MB');
      return;
    }

    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append('images', file);

      const uploadUrl = `/api/images/upload?type=user_avatar${profile?.id ? `&entityId=${profile.id}` : ''}`;

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success || !uploadData.images?.length) {
        throw new Error(uploadData?.error || 'Не удалось загрузить аватар');
      }

      const imageUrl = uploadData.images[0].url as string;

      // Update profile with new avatar (using CSRF protection)
      const updateRes = await fetchWithCsrf('/api/auth/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: imageUrl }),
      });

      const updateData = await updateRes.json();

      if (!updateRes.ok || !updateData.success) {
        throw new Error(updateData?.error || 'Не удалось сохранить аватар');
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar: imageUrl } : null);

      // Refetch auth context to update avatar globally
      const updatedUser = await refetch(true);
      const resolvedAvatar = updatedUser?.avatar ?? imageUrl;
      void updateUser({ avatar: resolvedAvatar });

      toast.success('Аватар успешно обновлен');
    } catch (error: unknown) {
      console.error('Error uploading avatar:', error);
      toast.error(resolveErrorMessage(error, 'Не удалось загрузить аватар'));
    } finally {
      setAvatarUploading(false);
    }
  };

  // Avatar remove handler
  const handleAvatarRemove = async () => {
    if (!currentAvatarUrl) return;

    setAvatarRemoving(true);

    try {
      if (profile?.id) {
        try {
          await fetch(`/api/images/entity?type=user_avatar&entityId=${profile.id}`, {
            method: 'DELETE',
            credentials: 'include'
          })
        } catch (deleteError) {
          console.warn('Failed to delete avatar files:', deleteError)
        }
      }

      const updateRes = await fetchWithCsrf('/api/auth/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: null }),
      });

      const updateData = await updateRes.json();

      if (!updateRes.ok || !updateData.success) {
        throw new Error(updateData?.error || 'Не удалось удалить аватар');
      }

      setProfile(prev => prev ? { ...prev, avatar: null } : null);
      const updatedUser = await refetch(true);
      const resolvedAvatar = updatedUser?.avatar ?? null;
      void updateUser({ avatar: resolvedAvatar });

      toast.success('Аватар успешно удален');
    } catch (error: unknown) {
      console.error('Error removing avatar:', error);
      toast.error(resolveErrorMessage(error, 'Не удалось удалить аватар'));
    } finally {
      setAvatarRemoving(false);
    }
  };

  // Profile update handler
  const hasProfileChanges = useMemo(() => {
    if (!profile) return false;
    return (
      firstName.trim() !== (profile.firstName || '') ||
      lastName.trim() !== (profile.lastName || '') ||
      (phone.trim() || '') !== (profile.phone || '')
    );
  }, [firstName, lastName, phone, profile]);

  const handleProfileUpdate = useCallback(async () => {
    if (!profile || profileSaving) {
      return;
    }

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirst || !trimmedLast) {
      toast.error('Имя и фамилия обязательны');
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      return;
    }

    if (!hasProfileChanges) {
      return;
    }

    setProfileSaving(true);

    try {
      const response = await fetchWithCsrf('/api/auth/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: trimmedFirst,
          lastName: trimmedLast,
          phone: trimmedPhone || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Не удалось обновить профиль');
      }

      setProfile(data.user);
      setFirstName(data.user.firstName || '');
      setLastName(data.user.lastName || '');
      setPhone(data.user.phone || '');

      const updatedUser = await refetch(true);
      updateUser({
        firstName: updatedUser?.firstName ?? data.user.firstName,
        lastName: updatedUser?.lastName ?? data.user.lastName,
        phone: updatedUser?.phone ?? data.user.phone ?? undefined
      });

      toast.success('Изменения сохранены');
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      toast.error(resolveErrorMessage(error, 'Не удалось обновить профиль'));
    } finally {
      setProfileSaving(false);
    }
  }, [fetchWithCsrf, firstName, hasProfileChanges, lastName, phone, profile, profileSaving, refetch, updateUser]);

  useEffect(() => {
    if (!profile || !hasProfileChanges || profileSaving) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleProfileUpdate();
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [handleProfileUpdate, hasProfileChanges, profile, profileSaving]);

  // Password change handler
  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Заполните все поля пароля');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Новый пароль должен содержать минимум 8 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Новый пароль и подтверждение не совпадают');
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetchWithCsrf('/api/auth/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Не удалось изменить пароль');
      }

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast.success('Пароль успешно изменен');
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      toast.error(resolveErrorMessage(error, 'Не удалось изменить пароль'));
    } finally {
      setPasswordSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <PageContainer variant="full-width" className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="standard" className="max-w-full">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Avatar Section */}
        <Card className="h-full border-none shadow-none bg-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <AvatarUploader
                avatarUrl={currentAvatarUrl}
                initials={avatarInitials}
                uploading={avatarUploading}
                deleting={avatarRemoving}
                onUpload={(file) => handleAvatarUpload(file)}
                onDelete={() => void handleAvatarRemove()}
              />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleProfileUpdate();
                }}
                className="flex-1 w-full flex flex-col gap-2"
              >
                {(profileSaving || hasProfileChanges) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {profileSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Сохраняем изменения...
                      </>
                    ) : (
                      <>
                        <User className="h-3.5 w-3.5" />
                        Есть несохраненные изменения
                      </>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="firstName" className="sr-only">
                    Имя
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    aria-label="Имя"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Имя"
                    required
                    className={clsx(textFieldClass, 'h-16 text-[3rem] font-normal leading-none')}
                  />
                </div>

                <div>
                  <Label htmlFor="lastName" className="sr-only">
                    Фамилия
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    aria-label="Фамилия"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Фамилия"
                    required
                    className={clsx(textFieldClass, 'h-16 text-[3rem] font-normal leading-none')}
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="sr-only">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    aria-label="Email"
                    value={profile?.email || ''}
                    disabled
                    className={clsx(textFieldClass, 'h-8 text-[1.5rem] font-thin leading-none text-muted-foreground')}
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="sr-only">
                    Телефон
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    aria-label="Телефон"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+48 600 000 000"
                    className={clsx(textFieldClass, 'h-8 text-[1.5rem] font-thin leading-none')}
                  />
                </div>

                <div>
                  <Label htmlFor="role" className="sr-only">
                    Роль
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="role"
                      type="text"
                      aria-label="Роль"
                      value={profile ? (roleLabels[profile.role] ?? profile.role) : ''}
                      disabled
                      className={clsx(textFieldClass, 'h-6 text-base font-thin leading-none text-muted-foreground')}
                    />
                  </div>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card className="h-full border-none shadow-none bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Изменить пароль
            </CardTitle>
            <CardDescription>
              Обновите пароль для обеспечения безопасности аккаунта
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={(e) => void handlePasswordChange(e)} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Текущий пароль *</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Введите текущий пароль"
                  required
                />
              </div>

              <div>
                <Label htmlFor="newPassword">Новый пароль *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Подтвердите новый пароль *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  required
                />
              </div>

              <Button type="submit" disabled={passwordSaving} className="w-full">
                {passwordSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Изменение пароля...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Изменить пароль
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
