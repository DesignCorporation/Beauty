import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
  const { t } = useTranslation();

  const stepLabels = [
    t('registration.steps.owner', 'Владелец'),
    t('registration.steps.salon', 'Салон'),
    t('registration.steps.location', 'Локация'),
    t('registration.steps.services', 'Услуги'),
    t('registration.steps.pricing', 'Тариф'),
    t('registration.steps.activation', 'Активация')
  ];

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full">
      {/* Линия прогресса */}
      <div className="relative mb-6">
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-primary to-primary/60 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Шаги с иконками */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div 
              key={stepNumber}
              className={`flex flex-col items-center flex-1 min-w-0 ${
                isCurrent ? 'text-info' : isCompleted ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              {/* Иконка шага */}
              <div className={`relative mb-2 ${
                isCurrent ? 'scale-110' : ''
              } transition-all duration-300`}>
                {isCompleted ? (
                  <CheckCircle className="w-8 h-8 text-success" />
                ) : (
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    isCurrent 
                      ? 'border-info bg-info/10 text-info' 
                      : 'border-border text-muted-foreground'
                  }`}>
                    <span className="text-sm font-semibold">{stepNumber}</span>
                  </div>
                )}
                
                {/* Анимация текущего шага */}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full border-2 border-info/30 animate-pulse" />
                )}
              </div>

              {/* Название шага */}
              <span className={`text-xs text-center font-medium ${
                isCurrent ? 'text-info' : isCompleted ? 'text-success' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default ProgressBar;
