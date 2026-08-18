'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

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
    // Let animation finish before clearing config
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

// Internal Modal component to handle animations and layout
function ModalComponent({ 
  isOpen, 
  close, 
  config 
}: { 
  isOpen: boolean; 
  close: () => void; 
  config: ModalConfig 
}) {
  const { title, content, footer, size = 'md', showClose = true } = config;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onKeyDown={(e) => e.key === 'Escape' && close()}
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={close}
      />
      <div 
        className={`relative w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[85vh] flex flex-col my-auto ${sizeClasses[size]} bg-white rounded-2xl shadow-modal overflow-hidden transform transition-transform duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-surface-100 shrink-0">
            {title && <h3 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h3>}
            {showClose && (
              <button 
                onClick={close}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>
        )}
        
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain touch-pan-y">
          {content}
        </div>

        {footer && (
          <div className="p-4 sm:p-6 border-t border-surface-100 bg-surface-50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
