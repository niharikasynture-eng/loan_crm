'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Activity, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarProps {
  items: NavItem[];
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export function Sidebar({ items, isCollapsed, onToggle, className }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout, user } = useAuth();

  const isActive = (href: string) => {
    // If href has query params, we need to match them exactly
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      if (pathname !== path) return false;
      
      const params = new URLSearchParams(query);
      for (const [key, value] of params.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    
    return pathname === href || (pathname.startsWith(href) && href !== '/');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full relative transition-all duration-300 rounded-2xl',
        isCollapsed ? 'w-[68px]' : 'w-56',
        className
      )}
      style={{
        background: '#fff',
        borderRight: '1px solid #e9eaf0',
      }}
    >
      {/* Brand */}
      <div
        className={cn(
          'h-16 flex items-center shrink-0',
          isCollapsed ? 'justify-center px-0' : 'px-6 gap-3'
        )}
        style={{ borderBottom: '1px solid #e9eaf0' }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--brand)' }}
        >
          <Activity size={18} className="text-white" strokeWidth={2.5} />
        </div>
        {!isCollapsed && (
          <span className="text-[17px] font-extrabold tracking-tight whitespace-nowrap animate-fade-in"
            style={{ color: 'var(--text-primary)' }}
          >
            DealByte
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2.5 flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-150 group/item',
                isCollapsed ? 'justify-center' : '',
              )}
              style={{
                background: active ? 'var(--brand-soft)' : 'transparent',
                color: active ? 'var(--brand)' : 'var(--text-muted)',
                fontWeight: active ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = '#f5f3ff';
                  (e.currentTarget as HTMLElement).style.color = 'var(--brand)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                }
              }}
            >
              {/* Icon */}
              <div
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{
                  background: active ? 'var(--brand)' : 'transparent',
                  color: active ? '#fff' : 'var(--brand)',
                }}
              >
                <item.icon size={18} />
              </div>

              {!isCollapsed && (
                <span className="text-[14px] whitespace-nowrap animate-fade-in">
                  {item.label}
                </span>
              )}

              {/* Active left indicator when collapsed */}
              {active && isCollapsed && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: 'var(--brand)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sticky Sign Out */}
      <div
        className="shrink-0 p-2.5 border-t"
        style={{ borderColor: '#e9eaf0' }}
      >
        <button
          onClick={logout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-2.5 py-2.5 rounded-lg transition-all duration-150',
            isCollapsed ? 'justify-center' : ''
          )}
          style={{ color: '#ef4444' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#fef2f2';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
            style={{ background: '#fef2f2', color: '#ef4444' }}
          >
            <LogOut size={17} />
          </div>
          {!isCollapsed && (
            <span className="text-[14px] font-medium animate-fade-in">
              Sign Out
            </span>
          )}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full border flex items-center justify-center shadow-md transition-all z-50 hover:scale-110"
        style={{
          background: '#fff',
          borderColor: '#e9eaf0',
          color: 'var(--text-primary)',
        }}
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
      </button>
    </aside>
  );
}
