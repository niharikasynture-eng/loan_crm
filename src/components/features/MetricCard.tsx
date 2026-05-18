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
      className={`card p-6 flex flex-col gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-[#f1f5f9] bg-white overflow-hidden rounded-2xl ${className ?? ''}`}
      style={{ boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.04)' }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={20} style={{ color: iconColor }} strokeWidth={1.8} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
            style={{
              background: trend.isPositive ? '#ecfdf5' : '#fef2f2',
              color: trend.isPositive ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </p>
        <p
          className="text-2xl font-bold leading-none mb-1 tabular-nums"
          style={{ color: 'var(--text-primary)' }}
        >
          {value}
        </p>
        {subValue && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}
