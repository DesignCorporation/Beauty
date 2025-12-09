import { useToast as useToastContext } from '../contexts/ToastContext';

export const useToast = (): ReturnType<typeof useToastContext> => useToastContext();
