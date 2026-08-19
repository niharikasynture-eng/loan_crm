'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalConfig {
  title?: string;
  content: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
}

interface ModalContextType {
  open: (config: ModalConfig) => void;
  close: () => void;
  isOpen: boolean;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((newConfig: ModalConfig) => {
    setConfig(newConfig);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setConfig(null), 300);
  }, []);

  return (
    <ModalContext.Provider value={{ open, close, isOpen }}>
      {children}
      {config && (
        <ModalComponent 
          isOpen={isOpen} 
          close={close} 
          config={config} 
        />
      )}
    </ModalContext.Provider>
  );
}

function ModalComponent({ 
  isOpen, 
  close, 
  config 
}: { 
  isOpen: boolean; 
  close: () => void; 
  config: ModalConfig 
}) {
  const [mounted, setMounted] = useState(false);
  const { title, content, footer, size = 'md', showClose = true } = config;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  const portalContent = (
    <div 
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onKeyDown={(e) => e.key === 'Escape' && close()}
    >
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
        onClick={close}
      />
      <div 
        className={`relative w-full max-h-[85vh] flex flex-col my-auto shrink-0 z-10 pointer-events-auto ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-transform duration-200 ${isOpen ? 'scale-100' : 'scale-95'}`}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 bg-white shrink-0">
            {title && <h3 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h3>}
            {showClose && (
              <button 
                onClick={close}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>
        )}
        
        <div 
          className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {content}
        </div>

        {footer && (
          <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/80 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(portalContent, document.body);
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
