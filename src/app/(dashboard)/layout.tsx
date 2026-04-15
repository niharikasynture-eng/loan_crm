'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import NotificationCenter from '@/components/NotificationCenter';
import { Calendar } from 'lucide-react';
import { ReminderChecker } from '@/components/ReminderChecker';

function TopHeader({ onToggleSidebar, isSidebarOpen }: { onToggleSidebar: () => void; isSidebarOpen: boolean }) {
  const { user } = useAuth();
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
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    super_admin: { label: 'Admin',  color: '#7c3aed', bg: '#f3f0ff' },
    org_admin:   { label: 'Admin',    color: '#1a73e8', bg: '#e8f0fe' },
    manager:     { label: 'Manager',      color: '#0f9d58', bg: '#e6f4ea' },
    sales_agent: { label: 'Sales', color: '#f29900', bg: '#fef7e0' },
  };

  const roleMeta = ROLE_LABELS[user?.role || ''] || { label: user?.role || '', color: '#718096', bg: '#f0f4f9' };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 z-30 sticky top-0">
      <div className="flex items-center gap-4">
        {/* Toggle Button - Visible on Mobile and when Sidebar is collapsed on Desktop */}
        <button 
          onClick={onToggleSidebar}
          className={`p-2 hover:bg-gray-50 rounded-xl transition-colors ${!isSidebarOpen ? 'block' : 'lg:hidden block'}`}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M4 6h16M4 12h16M4 18h16" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>

        <div>
           <h1 className="text-lg font-black text-gray-900 tracking-tighter uppercase leading-none md:text-xl">{pageTitle}</h1>
           <div className="flex items-center gap-1.5 mt-1">
             <Calendar size={10} className="text-gray-300" />
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{today}</span>
           </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationCenter />
        <div className="hidden sm:block text-right">
          <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{user?.name?.split(' ')[0]}</p>
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ color: roleMeta.color, background: roleMeta.bg }}>
            {roleMeta.label}
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg shadow-indigo-100 ring-2 ring-white" style={{ background: roleMeta.color }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!isLoading && user?.role === 'super_admin' && window.location.pathname === '/dashboard') {
      router.replace('/super-admin');
    }
  }, [user, isLoading, router]);

  // Mobile responsiveness check
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f0f4f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a73e8',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ fontSize: 14, color: '#718096', fontWeight: 500 }}>Loading Dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f9', position: 'relative' }}>
      <ReminderChecker />
      
      {/* Dynamic Sidebar Container */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 lg:h-screen transition-all duration-300 ease-in-out bg-white border-r border-gray-100 flex-shrink-0 overflow-hidden ${
          isSidebarOpen ? 'w-[280px] translate-x-0' : 'lg:w-[80px] -translate-x-full lg:translate-x-0'
        }`}
      >
        <Suspense fallback={null}>
          <Sidebar isCollapsed={!isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        </Suspense>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f0f4f9] min-h-screen">
        <Suspense fallback={null}>
          <TopHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        </Suspense>
        
        <div className="flex-1 overflow-x-hidden overflow-y-auto w-full">
          <div className="page-body p-4 md:p-6 lg:p-8 max-w-[1280px] mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
         <div 
           className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
           onClick={() => setIsSidebarOpen(false)}
         />
      )}
    </div>
  );
}
