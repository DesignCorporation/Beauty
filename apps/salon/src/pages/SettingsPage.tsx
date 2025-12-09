import { useState, useCallback, useEffect, useRef, DragEvent, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useAuthContext } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, PageContainer, SidebarTrigger } from '@beauty-platform/ui';
import { Upload, Trash2, Image as ImageIcon, Check, Loader2, Info, Clock, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import RoleManagementPanel from '../components/settings/RoleManagementPanel';
import { PageHeader } from '../components/layout/PageHeader';

interface GalleryImage {
  id: string;
  originalName: string;
  displayName?: string;
  url: string;
  originalUrl?: string;
  thumbnailUrl: string | null;
  uploadedAt: string;
}

const GALLERY_TYPE = 'salon_gallery';

export default function SettingsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings, loading, updateSettings, fetchSettings } = useSettings();
  const { refetch } = useAuthContext();

  const [salonName, setSalonName] = useState('');
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const resolveErrorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error ? error.message : fallback;

  const currentLogoUrl = settings?.logoUrl || null;

  useEffect(() => {
    if (settings) {
      setSalonName(settings.name);
    }
  }, [settings]);

  const fetchGalleryImages = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const response = await fetch(`/api/images?type=${GALLERY_TYPE}`, { credentials: 'include' });
      const data = await response.json();
      if (response.ok && data?.images) {
        setGalleryImages(data.images);
      } else {
        throw new Error(data?.error || t('settings.toasts.errorFetchGallery'));
      }
    } catch (error) {
      console.error('Error fetching gallery:', error);
      toast.error(t('settings.toasts.errorFetchGallery'));
    } finally {
      setGalleryLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchGalleryImages();
  }, [fetchGalleryImages]);

  const handleLogoUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('settings.validations.unsupportedFileType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.validations.maxSizeExceeded'));
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('images', file);
      const uploadRes = await fetch('/api/images/upload?type=salon_logo', { method: 'POST', credentials: 'include', body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success || !uploadData.images?.length) {
        throw new Error(uploadData?.error || t('settings.toasts.errorUploadLogo'));
      }

      const imageUrl = uploadData.images[0].url as string;
      const updateResult = await updateSettings({ logoUrl: imageUrl });
      if (!updateResult.success) {
        throw new Error(updateResult.error || t('settings.toasts.errorUploadLogo'));
      }

      toast.success(t('settings.toasts.logoUpdated'));
      await Promise.all([refetch(), fetchSettings()]);
    } catch (error: unknown) {
      console.error('Logo upload error:', error);
      toast.error(resolveErrorMessage(error, t('settings.toasts.errorUploadLogo')));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleGalleryUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setGalleryUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      const response = await fetch(`/api/images/upload?type=${GALLERY_TYPE}`, { method: 'POST', credentials: 'include', body: formData });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error || t('settings.toasts.errorUploadGallery'));
      }

      toast.success(t('settings.toasts.galleryUpdated', { count: data.uploaded }));
      await fetchGalleryImages();
    } catch (error: unknown) {
      console.error('Gallery upload error:', error);
      toast.error(resolveErrorMessage(error, t('settings.toasts.errorUploadGallery')));
    } finally {
      setGalleryUploading(false);
    }
  }, [fetchGalleryImages, t]);

  const handleGalleryDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
    if (files.length) void handleGalleryUpload(files);
  }, [handleGalleryUpload]);

  const handleGalleryFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    if (files.length) void handleGalleryUpload(files);
    event.target.value = '';
  };

  const handleLogoFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleLogoUpload(file);
    event.target.value = '';
  };

  const handleGalleryImageDelete = async (imageId: string) => {
    try {
      const response = await fetch(`/api/images/${imageId}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error(await response.text());
      toast.success(t('settings.toasts.galleryImageDeleted'));
      setGalleryImages((prev) => prev.filter((image) => image.id !== imageId));
    } catch (error) {
      console.error('Delete image error:', error);
      toast.error(t('settings.toasts.errorDeleteGalleryImage'));
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl) return;
    setLogoRemoving(true);
    try {
      const urlMatch = currentLogoUrl.match(/\/([a-f0-9-]+)_(?:optimized|original)/);
      const imageId = urlMatch ? urlMatch[1] : null;
      if (imageId) {
        try {
          await fetch(`/api/images/${imageId}`, { method: 'DELETE', credentials: 'include' });
        } catch (deleteError) {
          console.warn('Error deleting logo image:', deleteError);
        }
      }
      const result = await updateSettings({ logoUrl: null });
      if (result.success) {
        toast.success(t('settings.toasts.logoRemoved'));
        await Promise.all([refetch(), fetchSettings()]);
      }
    } catch (error) {
      console.error('Remove logo error:', error);
      toast.error(t('settings.toasts.errorRemoveLogo'));
    } finally {
      setLogoRemoving(false);
    }
  };

  const handleSaveName = async () => {
    if (salonName.trim().length < 3) {
      toast.error(t('settings.validations.requiredField'));
      return;
    }
    try {
      const result = await updateSettings({ name: salonName.trim() });
      if (result.success) {
        toast.success(t('settings.toasts.settingsSaved'));
        await refetch();
      } else {
        toast.error(result.error || t('settings.toasts.errorUpdateName'));
      }
    } catch (error) {
      toast.error(t('settings.toasts.errorGeneric'));
    }
  };

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  if (loading && !settings) {
    return (
      <PageContainer variant="full-width" className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-8">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <SettingsIcon className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('navigation.settings', 'Настройки')}</span>
              </div>
            </div>
          }
        />

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Clock className="h-5 w-5 text-primary" />
              {t('settings.sections.salon', 'Расширенные настройки салона')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t('settings.sections.salon_description', 'Управление рабочими часами, локализацией и контактной информацией салона')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void navigate('/settings/salon')} className="gap-2 bg-card shadow-none border border-border text-foreground hover:bg-muted">
              <Clock className="h-4 w-4" />
              {t('settings.buttons.salonSettings', 'Перейти к настройкам салона')}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base font-medium">{t('settings.sections.branding')}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{t('settings.sections.branding_description')}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-card flex items-center justify-center">
                {currentLogoUrl ? (
                  <img src={currentLogoUrl} alt={t('settings.sections.branding')} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => logoInputRef.current?.click()} disabled={logoUploading} className="flex items-center gap-2 bg-card shadow-none border-border hover:bg-muted">
                  {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>{currentLogoUrl ? t('settings.buttons.replaceLogo') : t('settings.buttons.uploadLogo')}</span>
                </Button>
                {currentLogoUrl && (
                  <Button variant="ghost" onClick={() => void handleRemoveLogo()} disabled={logoRemoving} className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                    {logoRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span>{t('settings.buttons.removeLogo')}</span>
                  </Button>
                )}
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/svg+xml,image/webp" className="hidden" onChange={(e) => handleLogoFileSelect(e)} />
            {!currentLogoUrl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>{t('settings.labels.noLogo')}</span>
              </div>
            )}
          </CardHeader>
        </Card>

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium">{t('settings.sections.profile')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t('settings.sections.profile_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input id="salon-name" value={salonName} onChange={(e) => setSalonName(e.target.value)} placeholder={t('settings.validations.salonName')} className="flex-1 rounded-none border-0 border-b border-border bg-transparent" />
              <Button onClick={() => void handleSaveName()} disabled={loading || salonName === settings?.name} className="bg-card shadow-none border border-border text-foreground hover:bg-muted">
                <Check className="h-4 w-4 mr-2" />
                {t('settings.buttons.saveChanges')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('settings.labels.nameHint')}</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium">{t('settings.sections.gallery')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t('settings.sections.gallery_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`border border-dashed rounded-none p-8 text-center transition-colors ${isDragOver ? 'border-primary bg-primary/10' : 'border-border'} ${galleryUploading ? 'opacity-60' : ''}`} onDragOver={(e) => handleDragOver(e)} onDragLeave={(e) => handleDragLeave(e)} onDrop={(e) => handleGalleryDrop(e)}>
              {galleryUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{t('settings.gallery.uploading')}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('settings.gallery.dragHint')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.gallery.orSelect')}</p>
                  </div>
                  <label className="cursor-pointer border border-border bg-card px-4 py-2 text-sm hover:border-primary/40 hover:text-primary">
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleGalleryFileSelect(e)} />
                    {t('settings.buttons.selectFiles')}
                  </label>
                </div>
              )}
            </div>

            {galleryLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('settings.gallery.loading')}</span>
              </div>
            ) : galleryImages.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span>{t('settings.gallery.emptyStateTitle')}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {galleryImages.map((image) => (
                  <div key={image.id} className="group border border-border bg-card relative">
                    <img src={image.thumbnailUrl || image.url} alt={image.originalName} className="w-full h-48 object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => window.open(image.originalUrl || image.url, '_blank')}>{t('settings.gallery.open')}</Button>
                      <Button size="sm" variant="destructive" onClick={() => void handleGalleryImageDelete(image.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="p-3 text-sm flex items-center justify-between bg-background/95">
                      <span className="truncate" title={image.originalName}>{image.displayName || image.originalName}</span>
                      <span className="text-xs text-muted-foreground">{new Date(image.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <RoleManagementPanel />
      </div>
    </PageContainer>
  );
}
