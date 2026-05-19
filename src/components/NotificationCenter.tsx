'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, UserPlus, MessageSquare, CheckCheck } from 'lucide-react';
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

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationCenter() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  const prevUnreadCount = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async (isInitial = false) => {
    if (!token) return;
    try {
      const data = await api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications?limit=10');
      const newNotifs = data.notifications || [];
      const newCount = data.unreadCount || 0;

      if (!isInitial && newCount > prevUnreadCount.current) {
        const latest = newNotifs.find(n => !n.read);
        if (latest) {
          const isLead = latest.type === 'new_lead' || latest.type === 'lead_assigned';
          showToast(
            latest.type === 'lead_assigned'
              ? `A manager has assigned a new lead to you: "${latest.message.split(': "')[1]?.replace('"', '') || 'New Lead'}"`
              : latest.message,
            isLead ? 'success' : 'info',
            isLead ? '🚀 Lead Assigned' : latest.title
          );
        }
        setHasNew(true);
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
    const interval = setInterval(() => loadNotifications(), 10000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Stop new indicator after opening
  useEffect(() => {
    if (isOpen) setHasNew(false);
  }, [isOpen]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95"
        style={{
          background: isOpen
            ? 'var(--brand-soft)'
            : hasUnread
            ? 'rgba(108,92,231,0.08)'
            : 'transparent',
          color: isOpen || hasUnread ? 'var(--brand)' : 'var(--text-muted)',
        }}
        onMouseEnter={e => {
          if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'var(--brand-soft)';
          (e.currentTarget as HTMLElement).style.color = 'var(--brand)';
        }}
        onMouseLeave={e => {
          if (!isOpen) {
            (e.currentTarget as HTMLElement).style.background = hasUnread ? 'rgba(108,92,231,0.08)' : 'transparent';
            (e.currentTarget as HTMLElement).style.color = isOpen || hasUnread ? 'var(--brand)' : 'var(--text-muted)';
          }
        }}
      >
        {/* Outer glow ring when new notifications */}
        {hasNew && (
          <span
            className="absolute inset-0 rounded-xl animate-ping"
            style={{ background: 'rgba(108,92,231,0.2)' }}
          />
        )}

        <Bell
          size={18}
          strokeWidth={hasUnread ? 2.4 : 2}
          className={cn(hasNew ? 'animate-[wiggle_0.6s_ease-in-out_3]' : '')}
        />

        {/* Badge */}
        {hasUnread && (
          <span
            className={cn(
              'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-white border-2 border-white font-bold',
              hasNew ? 'animate-bounce' : ''
            )}
            style={{
              fontSize: '10px',
              background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
              boxShadow: '0 2px 8px rgba(108,92,231,0.5)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 md:w-[360px] rounded-2xl z-50 overflow-hidden animate-slide-down"
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--brand-soft)' }}
              >
                <Bell size={14} style={{ color: 'var(--brand)' }} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {hasUnread && (
                <span
                  className="px-2 py-0.5 rounded-full font-bold"
                  style={{ fontSize: '11px', background: 'var(--brand-soft)', color: 'var(--brand)' }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {hasUnread && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="flex items-center gap-1.5 transition-colors"
                style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--bg-page)' }}
                >
                  <Bell size={22} style={{ color: 'var(--text-disabled)' }} />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  You're all caught up!
                </p>
              </div>
            ) : (
              notifications.map((n, idx) => (
                <Link
                  key={n._id}
                  href={n.link || '#'}
                  onClick={() => { markAsRead(n._id); setIsOpen(false); }}
                  className="flex items-start gap-3 px-5 py-3.5 transition-colors"
                  style={{
                    borderBottom: idx < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                    background: !n.read ? 'rgba(108,92,231,0.03)' : 'transparent',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = !n.read ? 'rgba(108,92,231,0.03)' : 'transparent')}
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: !n.read ? 'var(--brand-soft)' : 'var(--bg-page)',
                      color: !n.read ? 'var(--brand)' : 'var(--text-disabled)',
                    }}
                  >
                    {n.type === 'new_lead' || n.type === 'lead_assigned'
                      ? <UserPlus size={14} />
                      : <MessageSquare size={14} />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className="truncate"
                        style={{
                          fontSize: '13px',
                          fontWeight: !n.read ? 600 : 400,
                          color: !n.read ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}
                      >
                        {n.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-disabled)', whiteSpace: 'nowrap' }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p
                      className="line-clamp-2"
                      style={{
                        fontSize: '12px',
                        color: !n.read ? 'var(--text-secondary)' : 'var(--text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {n.message}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-2"
                      style={{ background: 'var(--brand)' }}
                    />
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <Link
            href="/activities"
            className="flex items-center justify-center gap-2 w-full py-3 transition-colors"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border)',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--brand)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-row-hover)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
            onClick={() => setIsOpen(false)}
          >
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}
