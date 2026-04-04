'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './Toast';

export function ReminderChecker() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Load notified IDs from localStorage to ensure persistence across refreshes
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('crm_notified_active_reminders');
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch { return new Set(); }
    }
    return new Set();
  });

  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const mountTime = useRef(new Date().getTime());

  // Save notified IDs to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_notified_active_reminders', JSON.stringify(Array.from(notifiedIds)));
    }
  }, [notifiedIds]);

  const checkReminders = async () => {
    if (!user || user.role === 'super_admin') return;
    try {
      const res = await api.get<{ activities: any[] }>('/activities?limit=30&isScheduled=true');
      const now = new Date();
      const nowTime = now.getTime();
      const todayStart = new Date().setHours(0, 0, 0, 0);

      res.activities.forEach((activity) => {
        if (!activity.scheduledAt) return;

        const scheduledTime = new Date(activity.scheduledAt).getTime();
        const activityDate = new Date(activity.scheduledAt).setHours(0, 0, 0, 0);
        
        // creatorId could be an object (populated) or a string
        const creatorId = activity.createdBy?._id || activity.createdBy;
        const currentUserId = user.id;

        // Recently due check (triggers if scheduled now or within the last 2 minutes)
        const isRecentlyDue = scheduledTime <= nowTime && (nowTime - scheduledTime) < 120000;

        if (
          (activity.type === 'call' || activity.type === 'note') && 
          creatorId?.toString() === currentUserId?.toString() && 
          isRecentlyDue &&
          scheduledTime > mountTime.current && 
          activityDate === todayStart && 
          !notifiedIds.has(activity._id)
        ) {
          const priorityLabel = activity.priority ? ` [${activity.priority.toUpperCase()}]` : '';
          
          showToast(
            activity.type === 'note' ? (activity.notes ? activity.notes : 'Reminder alert!') : `Follow-up with ${activity.leadId?.name || 'Lead'}`,
            'reminder',
            activity.type === 'note' ? `NOTE ALERT${priorityLabel}: ${activity.leadId?.name || 'Lead'}` : `SCHEDULED CALL${priorityLabel}`
          );
          
          // Mark as notified so we don't show it again
          setNotifiedIds(prev => new Set(prev).add(activity._id));
        }
      });
    } catch (err) {
      // Background polling: suppress fatal overlay for network errors
      if (api.isNetworkError(err)) {
        console.warn('Reminder check skipped: Network unreachable');
      } else {
        console.error('Failed to check reminders:', err);
      }
    }
  };

  useEffect(() => {
    // Check every 10 seconds for more exact timing
    checkInterval.current = setInterval(checkReminders, 10000);
    checkReminders(); // Initial check

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Re-run if user changes

  return null;
}
