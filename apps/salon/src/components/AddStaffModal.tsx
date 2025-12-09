import React, { useState } from 'react';
import { Button, Input, Label } from '@beauty-platform/ui';
import { X, User, Mail, Phone, Palette } from 'lucide-react';
import { sdkClient } from '../services/sdkClient';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const predefinedColors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
  '#6c5ce7', '#a29bfe', '#fd79a8', '#e17055',
  '#00b894', '#0984e3', '#6c5ce7', '#e84393'
];

export const AddStaffModal: React.FC<AddStaffModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    color: '#6366f1'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await sdkClient.post<{ success: boolean; error?: string }>('/crm/staff', formData);

      if (data.success) {
        // Успешно создано
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          color: '#6366f1'
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error || 'Не удалось создать мастера');
      }
    } catch (err) {
      console.error('Error creating staff:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при создании мастера');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        color: '#6366f1'
      });
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Добавить нового мастера
            </h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-muted-foreground hover:text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Имя */}
          <div>
            <Label htmlFor="firstName" className="text-sm font-medium">
              Имя *
            </Label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Введите имя мастера"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>

          {/* Фамилия */}
          <div>
            <Label htmlFor="lastName" className="text-sm font-medium">
              Фамилия *
            </Label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Введите фамилию мастера"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1">
              <Mail className="w-4 h-4" />
              Email *
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="email@example.com"
              required
              disabled={loading}
              className="mt-1"
            />
          </div>

          {/* Телефон */}
          <div>
            <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1">
              <Phone className="w-4 h-4" />
              Телефон
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+7 (999) 123-45-67"
              disabled={loading}
              className="mt-1"
            />
          </div>

          {/* Персональный цвет */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1 mb-2">
              <Palette className="w-4 h-4" />
              Персональный цвет
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`w-8 h-8 rounded-full transition-all duration-200 hover:scale-110 ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={loading}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Этот цвет будет отображаться в календаре для записей мастера
            </p>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.firstName || !formData.lastName || !formData.email}
              className="flex-1"
            >
              {loading ? 'Создание...' : 'Создать мастера'}
            </Button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};