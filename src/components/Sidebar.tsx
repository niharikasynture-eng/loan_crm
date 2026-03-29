'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
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
  const searchParams = useSearchParams();
  const { user, organization, logout, token } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [counts, setCounts] = useState({ pending: 0, active: 0, all: 0 });
  const [isOrgsOpen, setIsOrgsOpen] = useState(pathname.startsWith('/super-admin'));

  useEffect(() => {
    if (pathname.startsWith('/super-admin')) {
      setIsOrgsOpen(true);
    }
  }, [pathname]);

  const role = user?.role;
  const isSuperAdmin = role === 'super_admin';
  const isOrgAdmin = role === 'org_admin';
  const isManager = role === 'manager';
  const isSalesAgent = role === 'sales_agent';

  const roleLabel = useMemo(() => ({
    super_admin: 'Super Admin',
    org_admin: 'Admin',
    manager: 'Manager',
    sales_agent: 'Sales Agent',
  }[role || 'sales_agent']), [role]);

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

  const loadCounts = useCallback(async () => {
    if (!token || !isSuperAdmin) return;
    try {
      const res = await fetch('/api/admin/organizations?summary=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const orgs = data.organizations || [];
      setCounts({
        pending: orgs.filter((o: any) => o.status === 'pending').length,
        active: orgs.filter((o: any) => o.status === 'active' || o.status === 'approved').length,
        all: orgs.filter((o: any) => o.status !== 'deleted').length,
      });
    } catch (err) {
      console.error('Failed to load counts:', err);
    }
  }, [token, isSuperAdmin]);

  useEffect(() => {
    loadNotifications();
    if (isSuperAdmin) loadCounts();
    
    const interval = setInterval(() => {
      loadNotifications();
      if (isSuperAdmin) loadCounts();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [loadNotifications, loadCounts, isSuperAdmin]);

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

  const currentTab = searchParams.get('tab');

  const isActive = (href: string, tab?: string) => {
    if (tab) {
      return pathname === href && currentTab === tab;
    }
    return pathname === href || (pathname.startsWith(href + '/') && !pathname.includes('super-admin'));
  };

  const showCrmNav = !isSuperAdmin;
  const showAdminSection = isOrgAdmin;

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group hover:scale-105 transition-transform duration-300">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-white tracking-tight">SalesCRM</p>
              <p className="text-[11px] text-[#64748b] font-medium truncate uppercase tracking-widest mt-0.5">
                {isSuperAdmin ? 'PLATFORM ADMIN' : (organization?.name || 'CRM SYSTEM')}
              </p>
            </div>
          </div>

          {/* Notification Bell */}
          {!isSuperAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 text-[#64748b] hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#1e293b]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute left-1/2 -translate-x-1/2 top-12 w-80 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                  <div className="flex justify-between items-center px-5 py-4 border-b border-white/5 bg-white/2">
                    <p className="text-sm font-bold text-white">Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-10 px-6">
                        <Bell className="w-8 h-8 text-[#334155] mx-auto mb-3 opacity-20" />
                        <p className="text-[#64748b] text-sm">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          className={`px-5 py-4 border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors ${
                            !n.read ? 'bg-indigo-500/5' : ''
                          }`}
                          onClick={() => {
                            if (n.link) window.location.href = n.link;
                            setShowNotifs(false);
                          }}
                        >
                          <div className="flex gap-3">
                            {!n.read && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />}
                            <div>
                              <p className="text-sm font-semibold text-white leading-tight">{n.title}</p>
                              <p className="text-xs text-[#64748b] mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                              <p className="text-[10px] text-[#475569] mt-2 font-medium">
                                {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
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

      {/* Navigation Scroll Area */}
      <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
        {/* CRM Section */}
        {showCrmNav && (
          <div className="mb-8">
            <p className="px-7 mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#475569]">
              Main Navigation
            </p>
            <div className="space-y-1">
              {CRM_NAV.filter((item) => {
                if (isSalesAgent && item.href === '/reports') return false;
                return true;
              }).map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`sidebar-link ${isActive(href) ? 'active' : ''}`}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="flex-1">
                    {isSalesAgent && href === '/leads' ? 'My Leads' : label}
                  </span>
                  {isActive(href) && <div className="w-1 h-1 rounded-full bg-indigo-400 mr-1" />}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Administration Section */}
        {showAdminSection && (
          <div className="mb-8">
            <p className="px-7 mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#475569]">
              Administration
            </p>
            <div className="space-y-1">
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`sidebar-link ${isActive(href) ? 'active' : ''}`}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tools Section */}
        {isOrgAdmin && (
          <div className="mb-8">
            <p className="px-7 mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#475569]">
              System Tools
            </p>
            <Link
              href="/settings#lead-form"
              className={`sidebar-link ${isActive('/settings') && pathname.includes('lead-form') ? 'active' : ''}`}
            >
              <Link2 className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="flex-1">Public Lead Form</span>
            </Link>
          </div>
        )}

        {/* Super Admin / Platform Section */}
        {isSuperAdmin && (
          <div className="mb-8 px-4">
            <p className="px-3 mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#475569]">
              Platform System
            </p>
            <div className="space-y-1">
              <div
                onClick={() => setIsOrgsOpen(!isOrgsOpen)}
                className={`flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition-all duration-300 ${
                  isOrgsOpen || (isActive('/super-admin') && !currentTab) 
                    ? 'bg-white/[0.04] shadow-sm' 
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isOrgsOpen || (isActive('/super-admin') && !currentTab) 
                    ? 'bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/10' 
                    : 'bg-white/5 text-[#64748b]'
                }`}>
                  <Building2 className="w-5 h-5 flex-shrink-0" />
                </div>
                <span className={`flex-1 font-bold text-sm tracking-tight ${
                  isOrgsOpen || (isActive('/super-admin') && !currentTab) ? 'text-white' : 'text-[#94a3b8]'
                }`}>Organizations</span>
                <div className={`p-1 rounded-lg transition-transform duration-300 ${isOrgsOpen ? 'rotate-180' : ''}`}>
                  <ChevronRight className={`w-4 h-4 ${isOrgsOpen ? 'text-indigo-400' : 'text-[#475569]'}`} />
                </div>
              </div>
              
              {isOrgsOpen && (
                <div className="ml-5 mt-1 border-l-2 border-white/[0.03] space-y-1 animate-slide-down">
                  <Link
                    href="/super-admin?tab=pending"
                    className={`flex items-center gap-3 ml-6 mr-1 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                      isActive('/super-admin', 'pending')
                        ? 'bg-indigo-500/10 text-indigo-400 shadow-sm' 
                        : 'text-[#64748b] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Pending Requests
                    {counts.pending > 0 && (
                      <span className="ml-auto bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[9px] font-black">
                        {counts.pending}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/super-admin?tab=active"
                    className={`flex items-center gap-3 ml-6 mr-1 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                      isActive('/super-admin', 'active')
                        ? 'bg-indigo-500/10 text-indigo-400 shadow-sm' 
                        : 'text-[#64748b] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Active Orgs
                  </Link>
                  <Link
                    href="/super-admin?tab=all"
                    className={`flex items-center gap-3 ml-6 mr-1 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                      isActive('/super-admin', 'all')
                        ? 'bg-indigo-500/10 text-indigo-400 shadow-sm' 
                        : 'text-[#64748b] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    Global View
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* User Footer Section */}
      <div className="p-6 bg-white/[0.02] border-t border-white/5">
        <div className="flex items-center gap-4 mb-5 p-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-base font-black shadow-lg shadow-indigo-500/10 ring-1 ring-white/10">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mt-0.5">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-xs font-bold text-[#94a3b8] hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-xl transition-all duration-300 group"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          SIGN OUT
        </button>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </aside>
  );
}
