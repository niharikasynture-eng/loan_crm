'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Phone,
  CheckSquare,
  TrendingUp,
  Settings,
  LogOut,
  ChevronRight,
  Building2,
  BarChart2,
  Activity,
  Bell,
  Link2,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

// Nav items per role
const CRM_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/activities', label: 'Activities', icon: Phone },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/deals', label: 'Pipeline', icon: TrendingUp },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
];

const ADMIN_NAV = [
  { href: '/users', label: 'Team', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, organization, logout, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.data.notifications || []);
      setUnreadCount(data.data.unreadCount || 0);
    } catch {}
  }, [token]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [loadNotifications]);

  async function markAllRead() {
    if (!token) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');

  const isActive = (href: string, tab?: string) => {
    if (tab) {
      return pathname === href && currentTab === tab;
    }
    return pathname === href || (pathname.startsWith(href + '/') && !pathname.includes('super-admin'));
  };

  const role = user?.role;
  const isSuperAdmin = role === 'super_admin';
  const isOrgAdmin = role === 'org_admin';
  const isManager = role === 'manager';
  const isSalesAgent = role === 'sales_agent';

  const roleLabel = {
    super_admin: 'Super Admin',
    org_admin: 'Admin',
    manager: 'Manager',
    sales_agent: 'Sales Agent',
  }[role || 'sales_agent'];

  // Show CRM nav except for super_admin
  const showCrmNav = !isSuperAdmin;
  const showAdminSection = isOrgAdmin;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="p-4 border-b border-[#334155]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center animate-pulse-glow">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">SalesCRM</p>
              <p className="text-xs text-[#64748b] truncate max-w-[130px]">
                {organization?.name || 'Platform'}
              </p>
            </div>
          </div>

          {/* Notification Bell */}
          {!isSuperAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-1.5 text-[#64748b] hover:text-white hover:bg-[#1e293b] rounded-lg transition-all"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute left-1/2 -translate-x-1/2 top-9 w-72 bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl z-50">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-[#334155]">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-[#64748b] text-sm py-6">No notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          className={`px-4 py-3 border-b border-[#334155]/50 hover:bg-[#0f172a] cursor-pointer transition-colors ${
                            !n.read ? 'bg-indigo-500/5' : ''
                          }`}
                          onClick={() => {
                            if (n.link) window.location.href = n.link;
                            setShowNotifs(false);
                          }}
                        >
                          <p className="text-sm font-medium text-white">
                            {!n.read && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full inline-block mr-2 mb-0.5" />}
                            {n.title}
                          </p>
                          <p className="text-xs text-[#64748b] mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-[#475569] mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* CRM Items — shown to org_admin, manager, sales_agent */}
        {showCrmNav && (
          <div className="mb-1">
            <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
              {isSalesAgent ? 'My Work' : 'CRM'}
            </p>
            {CRM_NAV.filter((item) => {
              // Sales agent: hide reports
              if (isSalesAgent && item.href === '/reports') return false;
              return true;
            }).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-link ${isActive(href) ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">
                  {isSalesAgent && href === '/leads' ? 'My Leads' : label}
                </span>
                {isActive(href) && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            ))}
          </div>
        )}

        {/* Admin section — org_admin only */}
        {showAdminSection && (
          <div className="mt-4">
            <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
              Administration
            </p>
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-link ${isActive(href) ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive(href) && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            ))}
          </div>
        )}

        {/* Lead Form URL — org_admin only */}
        {isOrgAdmin && (
          <div className="mt-4">
            <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
              Tools
            </p>
            <Link
              href="/settings#lead-form"
              className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`}
            >
              <Link2 className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Lead Form URL</span>
            </Link>
          </div>
        )}

        {/* Super Admin section */}
        {isSuperAdmin && (
          <div className="mt-1">
            <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
              Platform
            </p>
            <div className="space-y-1">
              <Link
                href="/super-admin"
                className={`sidebar-link ${isActive('/super-admin') && !pathname.includes('tab=') ? 'active' : ''}`}
              >
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">Organizations</span>
                {isActive('/super-admin') && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
              
              <div className="ml-4 pl-4 border-l border-[#334155] space-y-1 mt-1">
                <Link
                  href="/super-admin?tab=pending"
                  className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    isActive('/super-admin', 'pending')
                      ? 'bg-indigo-500/10 text-indigo-400' 
                      : 'text-[#64748b] hover:text-white hover:bg-[#1e293b]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  New Requests
                </Link>
                <Link
                  href="/super-admin?tab=active"
                  className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    isActive('/super-admin', 'active')
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'text-[#64748b] hover:text-white hover:bg-[#1e293b]'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Active
                </Link>
                <Link
                  href="/super-admin?tab=all"
                  className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    isActive('/super-admin', 'all')
                      ? 'bg-sky-500/10 text-sky-400' 
                      : 'text-[#64748b] hover:text-white hover:bg-[#1e293b]'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  All
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#334155] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-[#64748b]">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#94a3b8] hover:text-[#f87171] hover:bg-red-500/10 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
