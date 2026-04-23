'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Clock, CheckCircle2, MessageSquare, UserPlus, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
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
  const [isBlinking, setIsBlinking] = useState(false);
  
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
            latest.type === 'lead_assigned' ? `A manager has assigned a new lead to you: "${latest.message.split(': "')[1]?.replace('"', '') || 'New Lead'}"` : latest.message, 
            isLead ? 'success' : 'info', 
            isLead ? '🚀 Lead Assigned' : latest.title
          );
        }
      }

      setNotifications(newNotifs);
      setUnreadCount(newCount);
      
      if (!isInitial && newCount > prevUnreadCount.current) {
        setIsBlinking(true);
      }
      
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
    const interval = setInterval(() => loadNotifications(), 10000); // Poll every 10s for immediate feedback
    return () => clearInterval(interval);
  }, [loadNotifications]);
  
  // Stop blinking after 8 seconds
  useEffect(() => {
    if (isBlinking) {
      const timer = setTimeout(() => setIsBlinking(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [isBlinking]);
  
  // Open panel stops blinking
  useEffect(() => {
    if (isOpen) setIsBlinking(false);
  }, [isOpen]);

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
      {/* Clean Bell Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-lg transition-all duration-200",
          isOpen ? "text-blue-600 bg-blue-50 shadow-sm" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 active:scale-95"
        )}
      >
        <Bell 
          size={20} 
          strokeWidth={2.2} 
          className={cn(isBlinking ? "animate-bounce" : "")}
          style={isBlinking ? { animationDuration: '1.2s' } : {}}
        />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white shadow-sm transition-transform",
            isBlinking ? "animate-pulse-blink scale-110" : ""
          )}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Minimalist Square Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
          {/* Simple Header */}
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                disabled={loading}
                className="text-[10px] font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Activity List */}
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-200 mb-3">
                  <Bell size={24} />
                </div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No activities</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link 
                  key={n._id}
                  href={n.link || '#'}
                  onClick={() => { markAsRead(n._id); setIsOpen(false); }}
                  className={`flex items-start gap-4 p-5 transition-all border-b border-gray-50 hover:bg-gray-50/50 ${!n.read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${!n.read ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                    {n.type === 'new_lead' || n.type === 'lead_assigned' ? <UserPlus size={16} /> : <MessageSquare size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[12px] font-bold truncate ${!n.read ? 'text-gray-900' : 'text-gray-500'}`}>
                        {n.title}
                      </span>
                      <span className="text-[9px] font-bold text-gray-300 whitespace-nowrap uppercase">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${!n.read ? 'text-gray-600 font-medium' : 'text-gray-400 font-normal'} line-clamp-2`}>
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Footer View All */}
          <Link 
            href="/activities" 
            className="block w-full py-3 text-center text-[10px] font-bold text-gray-400 hover:text-blue-600 hover:bg-gray-50 transition-all border-t border-gray-50 uppercase tracking-widest"
            onClick={() => setIsOpen(false)}
          >
            History Preview
          </Link>
        </div>
      )}
    </div>
  );
}
