'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Clock, CheckCircle2, MessageSquare, UserPlus, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api-client';
import Link from 'next/link';

interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  type?: string;
  link?: string;
  createdAt: string;
}

export default function NotificationCenter() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const prevUnreadCount = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async (isInitial = false) => {
    if (!token) return;
    try {
      const data = await api.get<{ notifications: Notification[], unreadCount: number }>('/notifications?limit=10');
      const newNotifs = data.notifications || [];
      const newCount = data.unreadCount || 0;

      // Trigger Toast for new notifications
      if (!isInitial && newCount > prevUnreadCount.current) {
        const latest = newNotifs.find(n => !n.read);
        if (latest) {
          const isLead = latest.type === 'new_lead' || latest.type === 'lead_assigned';
          showToast(
            latest.message, 
            isLead ? 'success' : 'info', 
            isLead ? '🚀 New Lead Opportunity' : latest.title
          );
        }
      }

      setNotifications(newNotifs);
      setUnreadCount(newCount);
      prevUnreadCount.current = newCount;
    } catch (err) {
      if (api.isNetworkError(err)) {
        console.warn('Notification sync skipped: Network unreachable');
      } else {
        console.error('Failed to load notifications:', err);
      }
    }
  }, [token, showToast]);

  useEffect(() => {
    loadNotifications(true);
    const interval = setInterval(() => loadNotifications(), 30000); // 30s polling
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    if (!token || unreadCount === 0) return;
    try {
      setLoading(true);
      await api.patch('/notifications', { markAllRead: true });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await api.patch('/notifications', { notificationId: id });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-300 group shadow-sm active:scale-95"
      >
        <Bell size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Modern Popover UI */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-[2rem] shadow-2xl border border-gray-100 z-50 overflow-hidden animate-slide-down origin-top-right">
          {/* Header */}
          <div className="bg-gradient-to-br from-gray-900 to-indigo-950 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <Zap size={14} className="text-indigo-400" />
                 Alert Stream
              </h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-300 hover:text-white transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            <p className="text-[11px] text-indigo-200/60 font-medium">You have {unreadCount} unread transmissions pending.</p>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto custom-scrollbar bg-gray-50/50">
            {notifications.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-gray-50 flex items-center justify-center mx-auto text-gray-200">
                  <Bell size={32} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Horizon Clear</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link 
                  key={n._id}
                  href={n.link || '#'}
                  onClick={() => { markAsRead(n._id); setIsOpen(false); }}
                  className={`group relative flex items-start gap-6 p-6 transition-all border-b border-gray-100 hover:bg-white ${!n.read ? 'bg-indigo-50/10' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110 group-hover:shadow-lg ${!n.read ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-gray-100 text-gray-400 opacity-60'}`}>
                    {n.type === 'new_lead' || n.type === 'lead_assigned' ? <UserPlus size={22} /> : <MessageSquare size={22} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className={`text-sm font-black uppercase tracking-wide leading-none ${!n.read ? 'text-gray-900' : 'text-gray-500'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] font-black text-gray-400 uppercase flex-shrink-0 bg-gray-100 px-2 py-0.5 rounded-md">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${!n.read ? 'text-gray-700 font-bold' : 'text-gray-500 font-medium'} line-clamp-2`}>
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-600 shadow-[0_0_12px_#4f46e5] rounded-l-full" />
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-gray-50 text-center">
             <Link href="/activities" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline" onClick={() => setIsOpen(false)}>
               View All Operation Activity
             </Link>
          </div>
        </div>
      )}
    </div>
  );
}
