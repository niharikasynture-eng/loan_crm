'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
import { NavigationProvider } from '@/context/NavigationContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <ModalProvider>
          <NavigationProvider>
            {children}
          </NavigationProvider>
        </ModalProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
