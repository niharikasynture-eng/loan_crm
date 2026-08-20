'use client';

import * as React from 'react';
import { Search, Settings, Building2, User, ChevronDown, Menu, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/context/NavigationContext';
import NotificationCenter from '@/components/NotificationCenter';
import { cn } from '@/lib/cn';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, organization } = useAuth();
  const { goBack, canGoBack, previousPage } = useNavigation();
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
      className="h-16 flex items-center px-6 gap-4 shrink-0 sticky top-0 z-30"
      style={{
        background: '#fff',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Mobile Menu Toggle */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 -ml-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Brand - hidden on desktop */}
      <div className="lg:hidden flex items-center ">
        <span className="text-base font-extrabold tracking-tight" style={{ color: 'var(--brand)' }}>
          DealByte
        </span>
      </div>

      {/* Back Button & Org Info (Left aligned) */}
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          title={canGoBack ? `Go back to ${previousPage}` : 'No previous page in memory'}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-150 active:scale-95',
            canGoBack
              ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 shadow-sm cursor-pointer'
              : 'bg-slate-50/50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
          )}
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Org badge - desktop only */}
        {organization && (
          <div
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent"
            style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: '11px', fontWeight: 600 }}
          >
            <Building2 size={12} />
            <span className="truncate max-w-[120px] uppercase font-bold">{organization.name}</span>
          </div>
        )}
      </div>

      {/* Profile & Notifications (Absolute Right) */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <NotificationCenter />

        {/* Profile Name & Role */}
        <div className="flex flex-col text-right leading-tight min-w-0">
          <span className="text-[12px] sm:text-[13px] font-bold uppercase truncate" style={{ color: 'var(--text-primary)' }}>
            {user?.name?.split(' ')[0]}
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--text-primary)' }}>
            {user?.role?.replace('_', ' ')}
          </span>
        </div>

        {/* Profile Avatar */}
        <div ref={menuRef} className="relative pr-1 sm:pr-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm transition-transform active:scale-95"
            style={{ background: 'var(--brand)' }}
          >
            {initials[0]}
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-xl border shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden z-50 animate-slide-down"
              style={{ background: '#fff', borderColor: 'var(--border)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-bold text-gray-900 uppercase">{user?.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors uppercase tracking-wider">
                  <User size={14} /> Profile
                </button>
                <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors uppercase tracking-wider">
                  <Settings size={14} /> Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
