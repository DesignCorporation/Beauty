import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StepOwnerData from './steps/StepOwnerData';
import StepSalonData from './steps/StepSalonData';
import StepLocation from './steps/StepLocation';
import StepServices from './steps/StepServices';
import StepPricing from './steps/StepPricing';
import StepActivation from './steps/StepActivation';

export interface CustomServiceInput {
  name: string;
  price: number;
  duration: number;
  description?: string | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
}

export interface RegistrationData {
  // Шаг 1: Данные владельца
  firstName: string;
  lastName: string;
  email: string;
  password: string; // НОВОЕ: пароль для владельца салона
  phone: string;
  language: 'en' | 'pl' | 'ua' | 'ru';

  // Шаг 2: Данные салона
  salonName: string;
  website?: string;
  businessType:
    | 'salon'
    | 'mobile'
    | 'home'
    | 'online'
    | 'hair_salon'
    | 'nail_salon'
    | 'massage_spa'
    | 'barbershop'
    | 'pet_grooming'
    | 'wellness'
    | 'cosmetology'
    | 'brow_lash'
    | 'custom';
  salonType: string | null;

  // Шаг 3: Локация и валюта
  country: string;
  currency: 'PLN' | 'EUR' | 'USD' | 'UAH';
  address?: {
    street: string;
    city: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
  };

  // Шаг 4: Услуги и команда
  serviceCategories: string[];
  selectedServiceKeys: string[];
  customServices: CustomServiceInput[];
  teamSize: 'solo' | 'small' | 'medium' | 'large';

  // Шаг 5: Тарифный план
  planType: 'starter' | 'team' | 'business' | 'enterprise';
  trialPeriod: boolean;

  // Шаг 6: Активация
  emailToken?: string;
  smsCode?: string;
  acceptTerms: boolean;
  subscribeNewsletter: boolean;
  csrfToken?: string; // НОВОЕ: CSRF токен для регистрации
}

const MultiStepRegistration: React.FC = () => {
  const { step } = useParams<{ step: string }>();
  const navigate = useNavigate();
  // Translation hook available if needed for localization
  
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '', // Поле пароля
    phone: '',
    language: 'en',
    salonName: '',
    businessType: 'salon',
    salonType: null,
    country: '',
    currency: 'EUR',
    serviceCategories: [],
    selectedServiceKeys: [],
    customServices: [],
    teamSize: 'solo',
    planType: 'starter',
    trialPeriod: true,
    acceptTerms: false,
    subscribeNewsletter: true,
    csrfToken: '', // CSRF токен
  });

  // Маппинг URL названий на номера шагов
  const stepMapping = {
    'owner': 1,
    'salon': 2, 
    'location': 3,
    'services': 4,
    'pricing': 5,
    'activation': 6
  };

  const stepNames = ['', 'owner', 'salon', 'location', 'services', 'pricing', 'activation'];

  // Парсинг шага из URL
  useEffect(() => {
    if (step) {
      const stepNumber = stepMapping[step as keyof typeof stepMapping];
      if (stepNumber) {
        setCurrentStep(stepNumber);
      } else {
        // Попробуем парсить как цифру для обратной совместимости
        const numStep = parseInt(step);
        if (numStep >= 1 && numStep <= 6) {
          setCurrentStep(numStep);
          navigate(`/register/${stepNames[numStep]}`, { replace: true });
        } else {
          navigate('/register/owner', { replace: true });
        }
      }
    } else {
      navigate('/register/owner', { replace: true });
    }
  }, [step, navigate]);

  const updateRegistrationData = (data: Partial<RegistrationData>) => {
    setRegistrationData(prev => ({ ...prev, ...data }));
  };

  const goToNextStep = () => {
    if (currentStep < 6) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      navigate(`/register/${stepNames[nextStep]}`);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      navigate(`/register/${stepNames[prevStep]}`);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepOwnerData
            data={registrationData}
            updateData={updateRegistrationData}
            onNext={goToNextStep}
          />
        );
      case 2:
        return (
          <StepSalonData
            data={registrationData}
            updateData={updateRegistrationData}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
          />
        );
      case 3:
        return (
          <StepLocation
            data={registrationData}
            updateData={updateRegistrationData}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
          />
        );
      case 4:
        return (
          <StepServices
            data={registrationData}
            updateData={updateRegistrationData}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
          />
        );
      case 5:
        return (
          <StepPricing
            data={registrationData}
            updateData={updateRegistrationData}
            onNext={goToNextStep}
            onPrevious={goToPreviousStep}
          />
        );
      case 6:
        return (
          <StepActivation
            data={registrationData}
            updateData={updateRegistrationData}
            onPrevious={goToPreviousStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Прогресс-бар временно убран */}
      {/* <div className="mb-8">
        <ProgressBar currentStep={currentStep} totalSteps={6} />
      </div> */}

      {/* Основной контент на всю ширину */}
      {renderCurrentStep()}
    </div>
  );
};

export default MultiStepRegistration;
