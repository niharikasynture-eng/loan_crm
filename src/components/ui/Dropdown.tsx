'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
  showChevron?: boolean;
}

export function Dropdown({ 
  trigger, 
  items, 
  align = 'left', 
  className,
  showChevron = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick?.();
    setIsOpen(false);
  };

  return (
    <div className={cn("relative inline-block", className)} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="cursor-pointer flex items-center gap-1"
      >
        {trigger}
        {showChevron && (
          <ChevronDown 
            size={14} 
            className={cn("text-gray-400 transition-transform duration-200", isOpen && "rotate-180")} 
          />
        )}
      </div>

      {isOpen && (
        <div 
          className={cn(
            "absolute top-full mt-2 z-50 min-w-[200px] bg-white rounded-card shadow-modal border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200",
            align === 'right' ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                item.variant === 'danger' 
                  ? "text-danger-600 hover:bg-danger-50" 
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              {item.icon && <span className="shrink-0 opacity-70">{item.icon}</span>}
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
