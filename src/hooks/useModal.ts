import { useModal as useModalContext } from '@/context/ModalContext';

export function useModal() {
  return useModalContext();
}
