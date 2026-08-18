'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-[95vw]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Content */}
      <div 
        className={cn(
          "relative w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[85vh] bg-white rounded-2xl sm:rounded-card shadow-modal overflow-hidden flex flex-col my-auto transform transition-all animate-in zoom-in-95 slide-in-from-bottom-4 duration-300",
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
          {title ? (
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">{title}</h3>
          ) : (
            <div />
          )}
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain touch-pan-y">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 sm:p-6 bg-gray-50/50 border-t border-gray-100 flex flex-wrap items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
