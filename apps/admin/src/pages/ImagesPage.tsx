import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@beauty-platform/ui';
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Search,
  Grid,
  List,
  X,
  Check,
  Eye
} from 'lucide-react';
import ImageViewerModal from '../components/ImageViewerModal';
import { sdkClient } from '@/services/sdkClient';

interface ImageFile {
  id: string;
  filename: string;
  originalName: string;
  displayName?: string;
  altText?: string;
  size: number;
  mimeType: string;
  url: string;
  originalUrl: string;
  thumbnailUrl: string;
  uploadedAt: string;
  optimized: boolean;
  tokenSavings?: number;
  dimensions: {
    width: number;
    height: number;
  };
}

const ImagesPage: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // API base URL (используем прокси Vite для /api/images и /uploads)
  const ADMIN_TENANT_ID = 'global-admin';
  const ADMIN_IMAGE_TYPE = 'admin_gallery';

  // Загрузка списка изображений с сервера
  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const data = await sdkClient.request<{ images: any[] }>(`/images?type=${ADMIN_IMAGE_TYPE}`, {
        headers: {
          'X-Tenant-ID': ADMIN_TENANT_ID
        }
      });
      if (data.images) {
        const imagesWithFullUrls = data.images.map((img: any) => ({
          ...img,
          url: img.url,
          originalUrl: img.originalUrl,
          thumbnailUrl: img.thumbnailUrl
        }));
        setImages(imagesWithFullUrls);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      handleFileUpload(imageFiles);
    }
  }, []);

  // File upload handler
  const handleFileUpload = async (files: File[]) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      const data = await sdkClient.request<{ success: boolean; uploaded?: number; error?: string }>(
        `/images/upload?type=${ADMIN_IMAGE_TYPE}`,
        {
          method: 'POST',
          headers: { 'X-Tenant-ID': ADMIN_TENANT_ID },
          data: formData
        }
      );
      
      if (data.success) {
        // Обновляем список изображений
        await fetchImages();
        console.log(`✅ Uploaded ${data.uploaded} images with optimization`);
      } else {
        console.error('Upload failed:', data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  // Image selection handlers
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const selectAllImages = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.id)));
    }
  };

  // Delete handlers
  const deleteSelectedImages = async () => {
    if (selectedImages.size === 0) return;
    
    try {
      const data = await sdkClient.request<{ success: boolean; deleted: number }>(`/images/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': ADMIN_TENANT_ID
        },
        data: {
          imageIds: Array.from(selectedImages)
        }
      });
      
      if (data.success) {
        await fetchImages();
        setSelectedImages(new Set());
        console.log(`🗑️ Deleted ${data.deleted} images`);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  };

  const deleteImage = async (imageId: string) => {
    try {
      const data = await sdkClient.request<{ success: boolean; deletedImage: string }>(`/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'X-Tenant-ID': ADMIN_TENANT_ID
        }
      });
      
      if (data.success) {
        await fetchImages();
        console.log(`🗑️ Deleted: ${data.deletedImage}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Update image metadata
  const updateImageMetadata = async (imageId: string, updates: { displayName?: string; altText?: string }) => {
    try {
      const data = await sdkClient.request<{ success: boolean; image: any }>(`/images/${imageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': ADMIN_TENANT_ID
        },
        data: updates
      });
      
      if (data.success) {
        await fetchImages(); // Обновляем список изображений
        console.log(`📝 Updated: ${data.image.displayName}`);
      }
    } catch (error) {
      console.error('Update metadata error:', error);
    }
  };

  // Modal handlers
  const openImageModal = (image: ImageFile) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setIsModalOpen(false);
  };

  // Filter images based on search
  const filteredImages = images.filter(img => 
    (img.displayName || img.originalName).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Изображения</h1>
          <p className="text-muted-foreground">
            Галерея для визуального общения • Автооптимизация для экономии токенов Claude
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {images.length} изображений • {selectedImages.size} выбрано
          </span>
        </div>
      </div>

      {/* Upload Zone */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          dragOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
        } ${uploading ? 'opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          {uploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-lg font-medium">Загрузка и оптимизация изображений...</p>
              <p className="text-sm text-muted-foreground">
                Ресайз до 1092px • Сжатие JPEG 90% • Экономия ~70% токенов Claude
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Перетащите изображения сюда</p>
                <p className="text-sm text-muted-foreground">
                  Поддерживаются JPG, PNG, WebP, GIF • Автооптимизация включена
                </p>
              </div>
              <label className="cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      handleFileUpload(files);
                    }
                  }}
                />
                Выбрать файлы
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      {images.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск изображений..."
                className="pl-10 pr-4 py-2 border border-muted-foreground/25 rounded-md w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedImages.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedImages.size} выбрано
                </span>
                <button
                  onClick={deleteSelectedImages}
                  className="bg-destructive text-destructive-foreground px-3 py-1 rounded-md text-sm hover:bg-destructive/90 flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </button>
              </div>
            )}
            
            <div className="flex items-center border border-muted-foreground/25 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            
            <button
              onClick={selectAllImages}
              className="px-3 py-2 border border-muted-foreground/25 rounded-md text-sm hover:bg-muted"
            >
              {selectedImages.size === images.length ? 'Снять выделение' : 'Выбрать все'}
            </button>
          </div>
        </div>
      )}

      {/* Images Grid/List */}
      {filteredImages.length > 0 ? (
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' 
            : 'grid-cols-1'
        }`}>
          {filteredImages.map((image) => (
            <Card 
              key={image.id}
              className={`relative overflow-hidden cursor-pointer transition-all ${
                selectedImages.has(image.id) ? 'ring-2 ring-primary' : ''
              } hover:shadow-md`}
            >
              {viewMode === 'grid' ? (
                <div className="aspect-square relative">
                  <img
                    src={image.thumbnailUrl}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Action overlay */}
                  <div 
                    className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    {/* View button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageModal(image);
                      }}
                      className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                      title="Увеличить"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {/* Selection checkbox */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleImageSelection(image.id);
                      }}
                      className={`w-8 h-8 border-2 border-white rounded flex items-center justify-center cursor-pointer ${
                        selectedImages.has(image.id) ? 'bg-primary' : 'bg-black/20 hover:bg-black/40'
                      }`}
                    >
                      {selectedImages.has(image.id) && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(image.id);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity hover:bg-destructive/90"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Optimized badge */}
                  {image.optimized && (
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Optimized
                    </div>
                  )}
                </div>
              ) : (
                <CardContent className="flex items-center gap-4 p-4">
                  <img
                    src={image.thumbnailUrl}
                    alt={image.originalName}
                    className="w-16 h-16 object-cover rounded"
                    loading="lazy"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium">{image.displayName || image.originalName}</h3>
                    {image.altText && (
                      <p className="text-sm text-muted-foreground italic">"{image.altText}"</p>
                    )}
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{(image.size / 1024).toFixed(1)} KB</span>
                      <span>{image.dimensions.width}×{image.dimensions.height}</span>
                      {image.tokenSavings && (
                        <span className="text-green-600 font-medium">-{image.tokenSavings}% токенов</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(image.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openImageModal(image)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Увеличить"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <input
                      type="checkbox"
                      checked={selectedImages.has(image.id)}
                      onChange={() => toggleImageSelection(image.id)}
                      className="w-4 h-4"
                    />
                    <button
                      onClick={() => deleteImage(image.id)}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет загруженных изображений</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'По вашему запросу ничего не найдено' : 'Загрузите первые изображения для визуального общения'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal for image viewing and editing */}
      <ImageViewerModal
        image={selectedImage}
        isOpen={isModalOpen}
        onClose={closeImageModal}
        onUpdate={updateImageMetadata}
        onDelete={deleteImage}
      />
    </div>
  );
};

export default ImagesPage;
