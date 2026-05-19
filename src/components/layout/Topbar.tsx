'use client';

import * as React from 'react';
import { Search, Settings, Building2, User, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import NotificationCenter from '@/components/NotificationCenter';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, organization } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Click-outside to close
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header
      className="h-[64px] flex items-center shrink-0 sticky top-0 z-30"
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="w-full max-w-6xl mx-auto px-6 lg:px-8 flex items-center justify-between h-full">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Menu size={20} />
            </button>
          )}

          {/* Brand - mobile only */}
          <div className="lg:hidden flex items-center">
            <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--brand)' }}>
              R-Life
            </span>
          </div>
        </div>

        {/* Org badge */}
        <div className="flex items-center gap-3 flex-1">
        {organization && (
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: '12px', fontWeight: 600 }}
          >
            <Building2 size={13} />
            <span className="truncate max-w-[140px] uppercase tracking-wide">{organization.name}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 ml-auto">
        <NotificationCenter />

        {/* Profile Name & Role */}
        <div className="hidden sm:flex flex-col text-right leading-tight min-w-0">
          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {user?.name?.split(' ')[0]}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide opacity-50" style={{ color: 'var(--text-primary)' }}>
            {user?.role?.replace('_', ' ')}
          </span>
        </div>

        {/* Profile Avatar */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shrink-0 shadow-sm transition-transform active:scale-95"
            style={{ background: 'var(--brand)' }}
          >
            {initials[0]}
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl border shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden z-50 animate-slide-down"
              style={{ background: '#fff', borderColor: 'var(--border)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                <p className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
              </div>
              <div className="py-1">
                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <User size={15} /> Profile
                </button>
                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Settings size={15} /> Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
