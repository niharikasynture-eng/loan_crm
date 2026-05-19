'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  dividerBefore?: boolean;
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
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Brand */}
      <div
        className={cn(
          'h-16 flex items-center shrink-0',
          isCollapsed ? 'justify-center px-0' : 'px-6 gap-3'
        )}
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <div className="w-8 h-8 flex items-center justify-center shrink-0">
          <img src="/R-life.png" alt="R-Life Logo" className="w-full h-full object-cover rounded-lg" />
        </div>
        {!isCollapsed && (
          <span
            className="text-[15px] font-bold tracking-tight whitespace-nowrap animate-fade-in"
            style={{ color: 'var(--text-primary)' }}
          >
            R-Life
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-4 flex flex-col gap-2 overflow-y-auto no-scrollbar">
        {items.map((item, idx) => {
          const active = isActive(item.href);
          const showDivider = item.dividerBefore && idx > 0;
          return (
            <React.Fragment key={item.href}>
              {showDivider && (
                <div
                  className="my-1 border-t animate-fade-in"
                  style={{ borderColor: 'var(--sidebar-border)' }}
                />
              )}
              <Link
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group/item',
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
                  <span className="text-[13px] whitespace-nowrap animate-fade-in">
                    {item.label}
                  </span>
                )}

                {active && isCollapsed && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: '#6C5CE7' }}
                  />
                )}
              </Link>
            </React.Fragment>
          );
        })}
    </nav>

      {/* Sign Out */ }
  <div
    className="shrink-0 px-2 pb-3 pt-2 border-t"
    style={{ borderColor: 'var(--sidebar-border)' }}
  >
    <button
      onClick={logout}
      title={isCollapsed ? 'Sign Out' : undefined}
      className={cn(
        'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[8px] transition-all duration-150 text-[#ef4444]',
        isCollapsed ? 'justify-center' : '',
        'hover:bg-[#fef2f2]'
      )}
    >
      <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
        style={{ background: '#fef2f2', color: '#ef4444' }}
      >
        <LogOut size={15} />
      </div>
      {!isCollapsed && (
        <span className="text-[13px] font-medium animate-fade-in">
          Sign Out
        </span>
      )}
    </button>
  </div>

  {/* Collapse toggle */ }
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
    </aside >
  );
}
