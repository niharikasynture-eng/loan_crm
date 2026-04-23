'use client';

import { useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';

// How often to check (ms) — 30s is enough; scheduled times are set in advance
const POLL_INTERVAL_MS = 30_000;
// How long after scheduled time we still fire (catchup window — handles tab sleep, deploys)
const CATCHUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function ReminderChecker() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // In-memory set for this session — avoids stale localStorage entries across days
  const firedRef = useRef<Set<string>>(new Set());

  // Seed from localStorage on mount (so page refresh doesn't re-fire today's alerts)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const today = new Date().toDateString();
      const raw = localStorage.getItem('crm_reminders_fired');
      if (raw) {
        const { date, ids } = JSON.parse(raw) as { date: string; ids: string[] };
        // Only restore if the stored date is today — prevents carrying over old IDs
        if (date === today) {
          ids.forEach(id => firedRef.current.add(id));
        } else {
          // New day — clear stale entries
          localStorage.removeItem('crm_reminders_fired');
        }
      }
    } catch { /* ignore */ }
  }, []);

  const markFired = useCallback((id: string) => {
    firedRef.current.add(id);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        const today = new Date().toDateString();
        const raw = localStorage.getItem('crm_reminders_fired');
        let ids: string[] = [];
        if (raw) {
          const parsed = JSON.parse(raw) as { date: string; ids: string[] };
          if (parsed.date === today) ids = parsed.ids;
        }
        ids.push(id);
        localStorage.setItem('crm_reminders_fired', JSON.stringify({ date: today, ids }));
      } catch { /* ignore */ }
    }
  }, []);

  const checkReminders = useCallback(async () => {
    if (!user || user.role === 'super_admin') return;

    try {
      const res = await api.get<{ activities: any[] }>('/activities?remindersOnly=true');
      const activities = res.activities || [];

      const nowMs = Date.now();

      for (const activity of activities) {
        if (!activity.scheduledAt) continue;
        if (firedRef.current.has(activity._id)) continue;

        const scheduledMs = new Date(activity.scheduledAt).getTime();

        // Only fire if:
        //   1. The scheduled time has already passed (scheduledMs <= nowMs)
        //   2. But not more than CATCHUP_WINDOW_MS ago (prevents firing very old reminders)
        const isPast = scheduledMs <= nowMs;
        const isWithinCatchup = (nowMs - scheduledMs) <= CATCHUP_WINDOW_MS;

        if (!isPast || !isWithinCatchup) continue;

        // Mark fired BEFORE showing toast to prevent double-fire on rapid re-renders
        markFired(activity._id);

        const priority = (activity.priority || 'medium') as 'high' | 'medium' | 'low';
        const leadName = activity.leadId?.name || 'Lead';
        const leadIdRaw = activity.leadId?._id || activity.leadId;
        const leadLink = leadIdRaw ? `/leads/${leadIdRaw.toString()}` : undefined;

        const title =
          activity.type === 'note'
            ? `📝 NOTE REMINDER — ${leadName}`
            : `📞 CALL REMINDER — ${leadName}`;

        const message =
          activity.notes?.trim()
            ? activity.notes.trim()
            : activity.type === 'note'
            ? `You have a note reminder for ${leadName}`
            : `Time to follow up with ${leadName}`;

        showToast(message, 'reminder', title, priority, leadLink, leadName);
      }
    } catch (err) {
      if (api.isNetworkError(err)) {
        console.warn('[ReminderChecker] Skipped: network unreachable');
      } else {
        console.error('[ReminderChecker] Failed:', err);
      }
    }
  }, [user, showToast, markFired]);

  useEffect(() => {
    if (!user) return;

    // Run immediately on mount, then on interval
    checkReminders();
    const timer = setInterval(checkReminders, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [user, checkReminders]);

  return null;
}
