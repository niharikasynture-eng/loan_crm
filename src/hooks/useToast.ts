import { useToast as useToastContext } from '@/context/ToastContext';

export function useToast() {
  return useToastContext();
}
