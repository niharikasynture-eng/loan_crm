'use client';

import * as React from 'react';
import { Phone, Mail, MessageCircle, StickyNote, CalendarCheck } from 'lucide-react';
import Link from 'next/link';

interface Activity {
  _id: string;
  type: string;
  notes: string;
  createdAt: string;
  createdBy: { name: string; avatar?: string };
  leadId: { _id: string; name: string };
}

interface RecentActivityListProps {
  activities: Activity[];
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  call:     { icon: Phone,         color: '#7c3aed', bg: '#f3f1ff', label: 'Call'      },
  email:    { icon: Mail,          color: '#2563eb', bg: '#eff6ff', label: 'Email'     },
  whatsapp: { icon: MessageCircle, color: '#059669', bg: '#ecfdf5', label: 'WhatsApp'  },
  note:     { icon: StickyNote,    color: '#d97706', bg: '#fffbeb', label: 'Note'      },
  meeting:  { icon: CalendarCheck, color: '#7c3aed', bg: '#f3f1ff', label: 'Meeting'   },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getInitials(name: string) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

const AVATAR_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#7c3aed', '#16a34a', '#9333ea', '#0284c7',
];

function avatarColor(name: string) {
  const code = name?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export function RecentActivityList({ activities }: RecentActivityListProps) {
  if (activities.length === 0) {
    return (
      <div
        className="py-14 text-center rounded-xl border-2 border-dashed"
        style={{ borderColor: '#e9eaf0' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-disabled)' }}>No activity yet today</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid #e9eaf0', background: '#fff' }}
    >
      {activities.map((act, idx) => {
        const cfg = TYPE_CONFIG[act.type?.toLowerCase()] ?? TYPE_CONFIG.note;
        const Icon = cfg.icon;
        const initials = getInitials(act.createdBy?.name ?? '?');
        const color = avatarColor(act.createdBy?.name ?? '');

        return (
          <div
            key={act._id}
            className="flex items-start gap-5 px-6 py-5 transition-colors"
            style={{
              borderBottom: idx < activities.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5"
              style={{ background: color, letterSpacing: '0.02em' }}
            >
              {initials}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap leading-tight mb-0.5">
                <span
                  className="text-[13px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {act.createdBy?.name}
                </span>

                {/* Type chip */}
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  <Icon size={9} />
                  {cfg.label}
                </span>

                <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>→</span>

                <Link
                  href={`/leads/${act.leadId?._id}`}
                  className="text-[14px] font-medium hover:underline decoration-2 underline-offset-4"
                  style={{ color: 'var(--brand)' }}
                >
                  {act.leadId?.name}
                </Link>
              </div>

              {act.notes && (
                <p
                  className="text-[13px] leading-snug line-clamp-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {act.notes}
                </p>
              )}
            </div>

            {/* Time */}
            <span
              className="text-[11px] whitespace-nowrap shrink-0"
              style={{ color: 'var(--text-disabled)' }}
            >
              {timeAgo(act.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
