'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';

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

  // Synchronous ref to prevent race conditions during rapid polling
  const notifiedRef = useRef<Set<string>>(new Set());

  // Initialize the ref from the state once on load
  useEffect(() => {
    notifiedIds.forEach(id => notifiedRef.current.add(id));
  }, []);

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
        const activityDate  = new Date(activity.scheduledAt).setHours(0, 0, 0, 0);
        
        const creatorId = activity.createdBy?._id || activity.createdBy;
        const currentUserId = user.id;

        // Recently due check (triggers if scheduled now or within the last 5 minutes)
        // We allow up to 5 minutes to catch up if computer was asleep or tab was inactive
        const isRecentlyDue = Math.abs(nowTime - scheduledTime) < 300000;

        if (
          isRecentlyDue && 
          !notifiedRef.current.has(activity._id) && 
          (activity.type === 'call' || activity.type === 'note') && 
          creatorId?.toString() === currentUserId?.toString() && 
          activityDate === todayStart
        ) {
          // MARK AS NOTIFIED IMMEDIATELY IN REF TO STOP NEXT TICK
          notifiedRef.current.add(activity._id);
          
          const priorityLabel = activity.priority ? ` [${activity.priority.toUpperCase()}]` : '';
          const leadIdRaw = activity.leadId?._id || activity.leadId;
          const leadId = leadIdRaw ? leadIdRaw.toString() : null;
          const leadLink = leadId ? `/leads/${leadId}` : undefined;
          
          showToast(
            activity.type === 'note' ? (activity.notes ? activity.notes : 'Reminder alert!') : `Follow-up with ${activity.leadId?.name || 'Lead'}`,
            'reminder',
            activity.type === 'note' ? `NOTE ALERT${priorityLabel}: ${activity.leadId?.name || 'Lead'}` : `SCHEDULED CALL${priorityLabel}`,
            activity.priority?.toLowerCase() as any,
            leadLink,
            activity.leadId?.name || 'Lead'
          );
          
          // Mark as notified in state/localStorage for persistence
          setNotifiedIds(prev => {
            const next = new Set(prev);
            next.add(activity._id);
            localStorage.setItem('crm_notified_active_reminders', JSON.stringify(Array.from(next)));
            return next;
          });
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
    // Check every 2 seconds for high accuracy
    checkInterval.current = setInterval(checkReminders, 2000);
    checkReminders(); // Initial check

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Re-run if user changes

  return null;
}
