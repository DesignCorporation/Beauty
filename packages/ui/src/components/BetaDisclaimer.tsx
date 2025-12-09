import React, { useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { X, AlertTriangle, TestTube } from 'lucide-react';

interface BetaDisclaimerProps {
  version?: string;
  onDismiss?: () => void;
}

export const BetaDisclaimer: React.FC<BetaDisclaimerProps> = ({ 
  version = "Beta 1.0", 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(() => {
    // Проверяем, был ли disclaimer уже закрыт
    return !localStorage.getItem('beta-disclaimer-dismissed');
  });

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('beta-disclaimer-dismissed', 'true');
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <div className="flex items-start gap-3">
        <TestTube className="w-5 h-5 text-orange-600 mt-0.5" />
        <div className="flex-1">
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>🧪 Beauty Platform {version}</strong>
                <p className="text-sm mt-1">
                  Вы используете beta-версию системы. Возможны временные сбои и изменения функций. 
                  Ваши данные сохранены и защищены. 
                  <br />
                  <span className="text-orange-600 font-medium">
                    📧 Сообщайте о проблемах: support@beauty.designcorp.eu
                  </span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-orange-600 hover:text-orange-800 hover:bg-orange-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

export default BetaDisclaimer;