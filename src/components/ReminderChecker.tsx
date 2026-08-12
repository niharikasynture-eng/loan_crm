'use client';

import { useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';

// Poll every 30 seconds — accurate enough for reminders set in advance
const POLL_INTERVAL_MS = 30_000;

// How long AFTER the scheduled time we still fire the reminder.
// Handles: page refresh, tab sleep, Vercel cold starts, 30s polling gap.
const CATCHUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function ReminderChecker() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Ref-based fired set — prevents double-fire across rapid re-renders
  const firedRef = useRef<Set<string>>(new Set());

  // On mount: request Desktop Notification permission & seed from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.error);
    }

    try {
      const today = new Date().toDateString(); // e.g. "Mon Apr 28 2025"
      const raw = localStorage.getItem('crm_reminders_fired');
      if (raw) {
        const parsed = JSON.parse(raw) as { date: string; ids: string[] };
        if (parsed.date === today) {
          // Restore today's fired IDs
          parsed.ids.forEach((id: string) => firedRef.current.add(id));
        } else {
          // New day — wipe old entries
          localStorage.removeItem('crm_reminders_fired');
        }
      }
    } catch { /* ignore parse errors */ }
  }, []);

  const markFired = useCallback((id: string) => {
    firedRef.current.add(id);
    if (typeof window === 'undefined') return;
    try {
      const today = new Date().toDateString();
      const raw = localStorage.getItem('crm_reminders_fired');
      let ids: string[] = [];
      if (raw) {
        const parsed = JSON.parse(raw) as { date: string; ids: string[] };
        if (parsed.date === today) ids = parsed.ids;
      }
      if (!ids.includes(id)) ids.push(id);
      localStorage.setItem('crm_reminders_fired', JSON.stringify({ date: today, ids }));
    } catch { /* ignore */ }
  }, []);

  const checkReminders = useCallback(async () => {
    if (!user || user.role === 'super_admin') return;

    let activities: any[] = [];
    try {
      const res = await api.get<{ activities: any[] }>('/activities?remindersOnly=true');
      activities = res.activities || [];
    } catch (err) {
      if (api.isNetworkError(err)) {
        console.warn('[ReminderChecker] Skipped: network unreachable');
      } else {
        console.error('[ReminderChecker] Failed to fetch reminders:', err);
      }
      return;
    }

    const nowMs = Date.now();

    for (const activity of activities) {
      if (!activity.scheduledAt) continue;

      // Already fired this session or persisted from localStorage
      if (firedRef.current.has(String(activity._id))) continue;

      const scheduledMs = new Date(activity.scheduledAt).getTime();

      // STRICT timing: the reminder time must have passed (not future)
      if (scheduledMs > nowMs) continue;

      // But not more than CATCHUP_WINDOW_MS ago (don't fire very old reminders)
      if ((nowMs - scheduledMs) > CATCHUP_WINDOW_MS) continue;

      // Mark as fired BEFORE showing toast to prevent duplicate on next tick
      markFired(String(activity._id));

      // Determine priority — default to medium if not set
      const priority = (['high', 'medium', 'low'].includes(activity.priority)
        ? activity.priority
        : 'medium') as 'high' | 'medium' | 'low';

      const leadName = activity.leadId?.name || 'Lead';
      const leadIdStr = activity.leadId?._id
        ? String(activity.leadId._id)
        : activity.leadId
        ? String(activity.leadId)
        : null;
      const leadLink = leadIdStr ? `/leads/${leadIdStr}` : undefined;

      const title =
        activity.type === 'note'
          ? `📝 NOTE REMINDER — ${leadName}`
          : `📞 CALL REMINDER — ${leadName}`;

      const message =
        activity.notes?.trim()
          ? activity.notes.trim().slice(0, 120) // cap length for readability
          : activity.type === 'note'
          ? `You have a note reminder for ${leadName}`
          : `Time to follow up with ${leadName}`;

      showToast(message, 'reminder', title, priority, leadLink, leadName);

      // Desktop Push Notification Alert
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`🔔 CRM REMINDER — ${leadName}`, {
            body: message,
            icon: '/favicon.ico',
          });
        } catch { /* ignore push error */ }
      }
    }
  }, [user, showToast, markFired]);

  useEffect(() => {
    if (!user) return;

    // Immediate check on mount, then poll
    checkReminders();
    const timer = setInterval(checkReminders, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [user, checkReminders]);

  return null;
}
