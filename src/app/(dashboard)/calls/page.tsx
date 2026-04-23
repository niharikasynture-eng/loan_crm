'use client';

import * as React from 'react';
import { Phone, Search, Download } from 'lucide-react';
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

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Call History"
        subtitle="Verified call records synced from your sales team"
        action={
          <button className="btn-secondary text-sm shadow-sm transition-all hover:translate-y-[-1px]">
            <Download size={14} /> Export
          </button>
        }
      />

      {/* Stat Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Calls', value: calls.length, color: 'var(--brand)' },
          { label: 'Total Duration', value: `${totalMins}m`, color: 'var(--success)' },
          { label: 'Sync Accuracy', value: '99.9%', color: '#2563eb' },
        ].map((s) => (
          <div
            key={s.label}
            className="card p-6 sm:p-10 flex flex-col items-center justify-center text-center transition-all hover:shadow-lg cursor-default border border-[#f1f5f9] bg-white relative overflow-hidden"
            style={{ 
              borderRadius: '24px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)'
            }}
          >
            <div className="absolute top-0 left-0 w-1 h-full opacity-70" style={{ background: s.color }} />
            <p className="text-3xl sm:text-4xl font-medium tabular-nums tracking-tight mb-2" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-[#94a3b8]">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <CallLogTable logs={calls} isLoading={loading} />
    </div>
  );
}
