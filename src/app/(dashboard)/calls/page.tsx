'use client';

import * as React from 'react';
import { Phone, Download } from 'lucide-react';
import { useCalls } from '@/hooks/useCalls';
import { useToast } from '@/hooks/useToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { CallLogTable } from '@/components/features/CallLogTable';

export default function CallLogsPage() {
  const { toast } = useToast();
  const { calls, loading, error } = useCalls();

  React.useEffect(() => {
    if (error) toast('error', 'Failed to load call records');
  }, [error]);

  const totalSecs = React.useMemo(() => (calls ?? []).reduce((a, l) => a + (l.duration || 0), 0), [calls]);
  const totalMins = Math.floor(totalSecs / 60);

  const stats = [
    {
      label: 'Total Calls',
      value: calls.length,
      iconBg: 'var(--brand-soft)',
      iconColor: 'var(--brand)',
      icon: Phone,
    },
    {
      label: 'Total Duration',
      value: `${totalMins}m`,
      iconBg: '#ecfdf5',
      iconColor: 'var(--success)',
      icon: Phone,
    },
    {
      label: 'Sync Accuracy',
      value: '99.9%',
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      icon: Phone,
    },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader
        title="Call History"
        subtitle="Verified call records synced from your sales team"
        action={
          <button className="btn-secondary" style={{ fontSize: '14px' }}>
            <Download size={14} /> Export
          </button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: s.iconBg }}
            >
              <s.icon size={18} style={{ color: s.iconColor }} strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '4px' }}>
              {s.value}
            </p>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Call Log Table */}
      <CallLogTable logs={calls} isLoading={loading} />
    </div>
  );
}
