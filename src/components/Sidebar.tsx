'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, Users, Phone, CheckSquare, TrendingUp,
  Settings, LogOut, ChevronDown, Building2, BarChart2,
  Activity, Bell, Link2, Clock, CheckCircle, AlertCircle,
  UserCog, ShieldCheck, Briefcase, UserCircle,
} from 'lucide-react';

interface Notification {
  _id: string; title: string; message: string; read: boolean; link?: string; createdAt: string;
}

const CRM_NAV = [
  { href: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/leads',       label: 'Leads',      icon: Users },
  { href: '/activities',  label: 'Activities', icon: Phone },
  { href: '/tasks',       label: 'Tasks',      icon: CheckSquare },
  { href: '/deals',       label: 'Pipeline',   icon: TrendingUp },
  { href: '/reports',     label: 'Reports',    icon: BarChart2 },
];

const ADMIN_NAV = [
  { href: '/users',    label: 'Team Members', icon: UserCog },
  { href: '/settings', label: 'Settings',     icon: Settings },
];

const ROLE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  super_admin:  { label: 'Super Admin',  icon: ShieldCheck, color: '#7c3aed', bg: '#f3f0ff' },
  org_admin:    { label: 'Org Admin',    icon: Briefcase,   color: '#1a73e8', bg: '#e8f0fe' },
  manager:      { label: 'Manager',      icon: UserCog,     color: '#0f9d58', bg: '#e6f4ea' },
  sales_agent:  { label: 'Sales Person', icon: UserCircle,  color: '#f29900', bg: '#fef7e0' },
};

export default function Sidebar() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const { user, organization, logout, token } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [showNotifs, setShowNotifs]       = useState(false);
  const [counts, setCounts]               = useState({ pending: 0, active: 0, all: 0 });
  const [isOrgsOpen, setIsOrgsOpen]       = useState(pathname.startsWith('/super-admin'));

  useEffect(() => {
    if (pathname.startsWith('/super-admin')) setIsOrgsOpen(true);
  }, [pathname]);

  const role         = user?.role ?? 'sales_agent';
  const isSuperAdmin = role === 'super_admin';
  const isOrgAdmin   = role === 'org_admin';
  const isManager    = role === 'manager';
  const isSalesAgent = role === 'sales_agent';

  const roleMeta = ROLE_META[role] ?? ROLE_META['sales_agent'];
  const RoleIcon = roleMeta.icon;

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch('/api/notifications?limit=10', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.data.notifications || []);
      setUnreadCount(data.data.unreadCount || 0);
    } catch {}
  }, [token]);

  const loadCounts = useCallback(async () => {
    if (!token || !isSuperAdmin) return;
    try {
      const res  = await fetch('/api/admin/organizations?summary=true', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const orgs = data.organizations || [];
      setCounts({
        pending: orgs.filter((o: any) => o.status === 'pending').length,
        active:  orgs.filter((o: any) => o.status === 'active' || o.status === 'approved').length,
        all:     orgs.filter((o: any) => o.status !== 'deleted').length,
      });
    } catch {}
  }, [token, isSuperAdmin]);

  useEffect(() => {
    loadNotifications();
    if (isSuperAdmin) loadCounts();
    const interval = setInterval(() => { loadNotifications(); if (isSuperAdmin) loadCounts(); }, 60000);
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
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  const currentTab = searchParams.get('tab');
  const isActive   = (href: string, tab?: string) => {
    if (tab) return pathname === href && currentTab === tab;
    return pathname === href || (pathname.startsWith(href + '/') && !pathname.includes('super-admin'));
  };

  const showCrmNav      = !isSuperAdmin;
  const showAdminSection = isOrgAdmin;

  // Sidebar section label style
  const sectionLabel: React.CSSProperties = {
    padding: '0 16px',
    marginBottom: 6,
    marginTop: 4,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#a0aec0',
  };

  return (
    <aside className="sidebar">
      {/* ── Brand Header ── */}
      <div style={{ padding: '18px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Activity size={16} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1a202c', letterSpacing: '-0.3px' }}>DealByte CRM</p>
            <p style={{ fontSize: 10, color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {isSuperAdmin ? 'Platform Admin' : (organization?.name || 'CRM System')}
            </p>
          </div>
        </div>

        {/* Bell */}
        {!isSuperAdmin && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              style={{ position: 'relative', padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#718096', borderRadius: 8, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f7f8fc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 14, height: 14,
                  background: '#d93025', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #fff',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div style={{
                position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 44,
                width: 300, background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 50, overflow: 'hidden',
              }} className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a202c' }}>Notifications</p>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 12, color: '#1a73e8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#a0aec0' }}>
                      <Bell size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                      <p style={{ fontSize: 13 }}>No new notifications</p>
                    </div>
                  ) : notifications.map(n => (
                    <div
                      key={n._id}
                      style={{
                        padding: '12px 16px', borderBottom: '1px solid #f0f4f9',
                        cursor: 'pointer', background: !n.read ? '#f0f7ff' : 'transparent',
                        transition: 'background 0.12s',
                      }}
                      onClick={() => { if (n.link) window.location.href = n.link; setShowNotifs(false); }}
                    >
                      <div style={{ display: 'flex', gap: 10 }}>
                        {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1a73e8', flexShrink: 0, marginTop: 5 }} />}
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a202c' }}>{n.title}</p>
                          <p style={{ fontSize: 12, color: '#718096', marginTop: 2, lineHeight: 1.5 }}>{n.message}</p>
                          <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>
                            {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>

        {/* CRM Navigation */}
        {showCrmNav && (
          <div style={{ marginBottom: 8 }}>
            <p style={sectionLabel}>Main Menu</p>
            {CRM_NAV.filter(item => {
              if (isSalesAgent && item.href === '/reports') return false;
              return true;
            }).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-link ${isActive(href) ? 'active' : ''}`}
              >
                <Icon size={17} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  {isSalesAgent && href === '/leads' ? 'My Leads' : label}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Administration */}
        {showAdminSection && (
          <div style={{ marginBottom: 8, marginTop: 12 }}>
            <p style={sectionLabel}>Administration</p>
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`sidebar-link ${isActive(href) ? 'active' : ''}`}>
                <Icon size={17} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Tools */}
        {isOrgAdmin && (
          <div style={{ marginBottom: 8 }}>
            <p style={sectionLabel}>Tools</p>
            <Link href="/settings#lead-form" className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`}>
              <Link2 size={17} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Public Lead Form</span>
            </Link>
          </div>
        )}

        {/* Super Admin */}
        {isSuperAdmin && (
          <div style={{ marginBottom: 8 }}>
            <p style={sectionLabel}>Platform</p>
            <div>
              <button
                onClick={() => setIsOrgsOpen(!isOrgsOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: 'calc(100% - 16px)', margin: '1px 8px',
                  padding: '9px 12px', borderRadius: 8,
                  background: isOrgsOpen ? '#e8f0fe' : 'none',
                  border: 'none', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isOrgsOpen) e.currentTarget.style.background = '#f7f8fc'; }}
                onMouseLeave={e => { if (!isOrgsOpen) e.currentTarget.style.background = 'none'; }}
              >
                <Building2 size={17} style={{ color: isOrgsOpen ? '#1a73e8' : '#718096', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: isOrgsOpen ? 600 : 500, color: isOrgsOpen ? '#1a73e8' : '#4a5568', textAlign: 'left' }}>
                  Organizations
                </span>
                {counts.pending > 0 && (
                  <span style={{ background: '#fef7e0', color: '#f29900', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 100, marginRight: 4 }}>
                    {counts.pending}
                  </span>
                )}
                <ChevronDown size={15} style={{ color: '#a0aec0', transform: isOrgsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {isOrgsOpen && (
                <div style={{ marginLeft: 16, paddingLeft: 20, borderLeft: '2px solid #e2e8f0', marginRight: 8 }} className="animate-slide-down">
                  {[
                    { tab: 'pending', label: 'Pending Requests', icon: Clock,         badge: counts.pending },
                    { tab: 'active',  label: 'Active Orgs',      icon: CheckCircle,   badge: 0 },
                    { tab: 'all',     label: 'Global View',      icon: AlertCircle,   badge: 0 },
                  ].map(({ tab, label, icon: Icon, badge }) => (
                    <Link
                      key={tab}
                      href={`/super-admin?tab=${tab}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 6, margin: '2px 0',
                        fontSize: 13, fontWeight: isActive('/super-admin', tab) ? 600 : 400,
                        color: isActive('/super-admin', tab) ? '#1a73e8' : '#718096',
                        background: isActive('/super-admin', tab) ? '#e8f0fe' : 'none',
                        textDecoration: 'none', transition: 'all 0.12s',
                      }}
                    >
                      <Icon size={14} />
                      <span style={{ flex: 1 }}>{label}</span>
                      {badge > 0 && (
                        <span style={{ background: '#fef7e0', color: '#f29900', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 100 }}>
                          {badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── User Footer ── */}
      <div style={{ padding: '12px 12px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 10px', borderRadius: 10,
          background: roleMeta.bg, marginBottom: 8,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: roleMeta.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14, fontWeight: 700,
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a202c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <RoleIcon size={10} style={{ color: roleMeta.color, flexShrink: 0 }} />
              <p style={{ fontSize: 11, fontWeight: 600, color: roleMeta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {roleMeta.label}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '9px 12px',
            background: '#fff', color: '#718096',
            border: '1px solid #e2e8f0', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fce8e6'; e.currentTarget.style.color = '#d93025'; e.currentTarget.style.borderColor = 'rgba(217,48,37,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#718096'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
