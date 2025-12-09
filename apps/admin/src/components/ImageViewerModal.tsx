import React, { useState } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Edit3,
  Save,
  Trash2
} from 'lucide-react';

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

interface ImageViewerModalProps {
  image: ImageFile | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (imageId: string, updates: { displayName?: string; altText?: string }) => void;
  onDelete?: (imageId: string) => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ 
  image, 
  isOpen, 
  onClose, 
  onUpdate, 
  onDelete 
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    altText: ''
  });

  if (!isOpen || !image) return null;

  const handleEditStart = () => {
    setEditData({
      displayName: image.displayName || image.originalName,
      altText: image.altText || ''
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate(image.id, editData);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({
      displayName: image.displayName || image.originalName,
      altText: image.altText || ''
    });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.originalUrl;
    link.download = image.displayName || image.originalName;
    link.click();
  };

  const handleDelete = () => {
    if (onDelete && confirm('Удалить это изображение?')) {
      onDelete(image.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editData.displayName}
                  onChange={(e) => setEditData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-lg font-semibold"
                  placeholder="Название изображения"
                />
                <input
                  type="text"
                  value={editData.altText}
                  onChange={(e) => setEditData(prev => ({ ...prev, altText: e.target.value }))}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-600"
                  placeholder="Описание для accessibility (alt-текст)"
                />
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold truncate">
                  {image.displayName || image.originalName}
                </h2>
                {image.altText && (
                  <p className="text-sm text-gray-600 truncate">
                    {image.altText}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  title="Сохранить"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                  title="Отменить"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditStart}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Редактировать название и описание"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  title="Скачать оригинал"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Удалить изображение"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="p-2 text-gray-600 hover:bg-white rounded-md transition-colors disabled:opacity-50"
              title="Уменьшить"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 5}
              className="p-2 text-gray-600 hover:bg-white rounded-md transition-colors disabled:opacity-50"
              title="Увеличить"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="mx-4 w-px h-6 bg-gray-300" />
            <button
              onClick={handleRotate}
              className="p-2 text-gray-600 hover:bg-white rounded-md transition-colors"
              title="Повернуть на 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-white rounded-md transition-colors"
            >
              Сбросить
            </button>
          </div>

          <div className="text-sm text-gray-500 space-x-4">
            <span>{image.dimensions.width} × {image.dimensions.height}</span>
            <span>{(image.size / 1024).toFixed(1)} KB</span>
            {image.optimized && image.tokenSavings && (
              <span className="text-green-600 font-medium">
                -{image.tokenSavings}% токенов ⚡
              </span>
            )}
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-hidden bg-gray-100 relative">
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={image.originalUrl}
              alt={image.altText || image.displayName || image.originalName}
              className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-grab active:cursor-grabbing"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
              draggable={false}
            />
          </div>
          
          {/* Zoom hint */}
          {zoom === 1 && (
            <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Колесико мыши или кнопки для масштабирования
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <div>
              Загружено: {new Date(image.uploadedAt).toLocaleString('ru-RU')}
            </div>
            <div className="flex items-center gap-4">
              <span>Формат: {image.mimeType}</span>
              <span>Файл: {image.filename}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;