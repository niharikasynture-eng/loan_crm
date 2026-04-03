'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from './Toast';

export function ReminderChecker() {
  const { showToast } = useToast();
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  const checkReminders = async () => {
    try {
      // Fetch recent activities (the API sorts by newest, so we'll get the latest)
      const res = await api.get<{ activities: any[] }>('/activities?limit=50');
      const now = new Date();

      res.activities.forEach((activity) => {
        if (
          activity.type === 'call' && 
          activity.scheduledAt && 
          new Date(activity.scheduledAt) <= now && 
          !notifiedIds.has(activity._id)
        ) {
          // Show toast
          showToast(
            `Reminder: Call with ${activity.leadId?.name || 'Lead'}`,
            'reminder',
            'Time to Follow-up!'
          );
          
          // Mark as notified so we don't show it again
          setNotifiedIds(prev => new Set(prev).add(activity._id));
        }
      });
    } catch (err) {
      console.error('Failed to check reminders:', err);
    }
  };

  useEffect(() => {
    // Check every 30 seconds
    checkInterval.current = setInterval(checkReminders, 30000);
    checkReminders(); // Initial check

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [notifiedIds]);

  return null;
}
