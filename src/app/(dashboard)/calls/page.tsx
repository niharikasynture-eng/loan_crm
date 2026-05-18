'use client';

import * as React from 'react';
import { Phone, Search, Download, Clock, Shield } from 'lucide-react';
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {[
          { label: 'Total Calls', value: calls.length, color: 'var(--brand)', icon: Phone },
          { label: 'Total Duration', value: `${totalMins}m`, color: 'var(--success)', icon: Clock },
          { label: 'Sync Accuracy', value: '99.9%', color: '#2563eb', icon: Shield },
        ].map((s) => (
          <div
            key={s.label}
            className="card p-14 flex flex-col items-start gap-8 transition-all hover:shadow-xl hover:-translate-y-1 cursor-default border border-[#f1f5f9] bg-white group overflow-hidden rounded-2xl"
            style={{ 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.04), 0 4px 6px -4px rgb(0 0 0 / 0.04)'
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors group-hover:scale-110 duration-300"
                style={{ background: `${s.color}15`, color: s.color }}
              >
                <s.icon size={26} strokeWidth={2.5} />
              </div>
              <span className="text-3xl font-bold tracking-tight" style={{ color: s.color }}>
                {s.value}
              </span>
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-sm font-bold uppercase tracking-widest text-[#94a3b8]">
                {s.label}
              </p>
              <p className="text-xs text-[#64748b] leading-relaxed">Real-time field activity</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <CallLogTable logs={calls} isLoading={loading} />
      </div>
    </div>
  );
}
