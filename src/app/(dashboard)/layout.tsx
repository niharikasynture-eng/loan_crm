'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Activity, Phone,
  CheckSquare, TrendingUp, BarChart2, Settings, UserCog, Menu, X,
  Clock, CheckCircle, Building2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar, NavItem } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ReminderChecker } from '@/components/ReminderChecker';
import { cn } from '@/lib/cn';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  React.useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-page)' }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }}
        />
      </div>
    );
  }
  if (!user) return null;

  const isSuperAdmin = user.role === 'super_admin';
  const isOnsiteVisitor = user.role === 'onsite_visitor';
  const isAdmin = ['org_admin', 'manager'].includes(user.role);

  const navItems: NavItem[] = isSuperAdmin
    ? [
      { label: 'Pending Approval', href: '/super-admin?tab=pending', icon: Clock },
      { label: 'Active Orgs', href: '/super-admin?tab=active', icon: CheckCircle },
      { label: 'All Organizations', href: '/super-admin?tab=all', icon: Building2 },
    ]
    : isOnsiteVisitor
      ? [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Leads', href: '/leads', icon: Users },
      ]
      : [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Leads', href: '/leads', icon: Users },
        { label: 'Timeline', href: '/activities', icon: Activity },
        { label: 'Calls', href: '/calls', icon: Phone },
        { label: 'Tasks', href: '/tasks', icon: CheckSquare },
        { label: 'Pipeline', href: '/deals', icon: TrendingUp },
        ...(isAdmin ? [{ label: 'Reports', href: '/reports', icon: BarChart2 }] : []),
        ...(isAdmin ? [{ label: 'Team', href: '/users', icon: UserCog }] : []),
        { label: 'Settings', href: '/settings', icon: Settings },
      ];

  return (
    <div className="flex h-screen overflow-hidden p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6 lg:gap-8" style={{ background: 'var(--bg-page)' }}>
      <ReminderChecker />

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:block shrink-0 rounded-2xl border border-gray-200/50 shadow-sm" style={{ zIndex: 20 }}>
        <Sidebar
          items={navItems}
          isCollapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar ── */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 sm:w-72 lg:hidden transition-transform duration-300 p-4 sm:p-6',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar items={navItems} isCollapsed={false} onToggle={() => setMobileOpen(false)} className="w-full shadow-2xl h-full border border-gray-200/50" />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white rounded-2xl border border-gray-200/50 shadow-sm">
        {/* Responsive Header */}
        <Topbar onMenuClick={() => setMobileOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
