'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import { Calendar } from 'lucide-react';

function TopHeader() {
  const { user, organization } = useAuth();
  const pathname = usePathname();

  // Derive page title from pathname
  const PAGE_TITLES: Record<string, string> = {
    '/dashboard':    'Dashboard',
    '/leads':        'Leads',
    '/activities':   'Activities',
    '/tasks':        'Tasks',
    '/deals':        'Pipeline',
    '/reports':      'Reports',
    '/users':        'Team Members',
    '/settings':     'Settings',
    '/super-admin':  'Organizations',
  };

  const segment = '/' + pathname.split('/')[1];
  const pageTitle = PAGE_TITLES[segment] || 'DealByte CRM';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    super_admin: { label: 'Super Admin',  color: '#7c3aed', bg: '#f3f0ff' },
    org_admin:   { label: 'Org Admin',    color: '#1a73e8', bg: '#e8f0fe' },
    manager:     { label: 'Manager',      color: '#0f9d58', bg: '#e6f4ea' },
    sales_agent: { label: 'Sales Person', color: '#f29900', bg: '#fef7e0' },
  };

  const roleMeta = ROLE_LABELS[user?.role || ''] || { label: user?.role || '', color: '#718096', bg: '#f0f4f9' };

  return (
    <header className="page-header">
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c', lineHeight: 1.2 }}>
          {pageTitle}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <Calendar size={12} style={{ color: '#a0aec0' }} />
          <span style={{ fontSize: 12, color: '#a0aec0' }}>{today}</span>
        </div>
      </div>

      {/* Right side: Welcome + Role Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a202c' }}>
            Welcome, {user?.name?.split(' ')[0]}
          </p>
          <span style={{
            display: 'inline-block',
            fontSize: 11, fontWeight: 700,
            color: roleMeta.color,
            background: roleMeta.bg,
            padding: '2px 8px', borderRadius: 100,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {roleMeta.label}
          </span>
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: roleMeta.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0,
        }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!isLoading && user?.role === 'super_admin' && window.location.pathname === '/dashboard') {
      router.replace('/super-admin');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f0f4f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a73e8',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ fontSize: 14, color: '#718096', fontWeight: 500 }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f9' }}>
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={null}>
          <TopHeader />
        </Suspense>
        <div className="page-body" style={{ flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
