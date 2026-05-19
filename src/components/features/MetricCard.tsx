'use client';

import * as React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: { value: number; isPositive: boolean; label?: string };
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  icon: Icon,
  iconColor = 'var(--brand)',
  iconBg = 'var(--brand-soft)',
  className,
}: MetricCardProps) {
  return (
    <div
      className={`card flex flex-col gap-3 ${className ?? ''}`}
      style={{ padding: '16px 20px' }}
    >
      <div className="flex items-center justify-between">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor }} strokeWidth={1.8} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
            style={{
              fontSize: '11px',
              fontWeight: 600,
              background: trend.isPositive ? '#ecfdf5' : '#fef2f2',
              color: trend.isPositive ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {trend.isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.value}%
          </div>
        )}
      </div>

      <div>
        <p
          className="uppercase tracking-wider mb-1"
          style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}
        >
          {label}
        </p>
        <p
          className="leading-none tabular-nums"
          style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}
        >
          {value}
        </p>
        {subValue && (
          <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}
