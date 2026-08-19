import * as React from 'react';
import { cn } from '@/lib/cn';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  className?: string;
}

export function Table<T>({
  columns,
  data,
  isLoading,
  emptyState,
  onSort,
  sortKey,
  sortDirection,
  className,
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border border-slate-200/80 shadow-xs bg-white">
      <table className={cn('w-full border-collapse text-left text-xs', className)}>
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
            {columns.map((col) => {
              const isSorted = sortKey === col.key;

              return (
                <th
                  key={String(col.key)}
                  className={cn(
                    'py-3.5 px-4 select-none',
                    col.sortable && 'cursor-pointer hover:bg-slate-100/80 transition-colors',
                    col.className
                  )}
                  onClick={() => {
                    if (!col.sortable || !onSort) return;
                    const nextDir = isSorted && sortDirection === 'asc' ? 'desc' : 'asc';
                    onSort(String(col.key), nextDir);
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="flex flex-col text-slate-400">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp size={14} className="text-indigo-600 font-bold" />
                          ) : (
                            <ChevronDown size={14} className="text-indigo-600 font-bold" />
                          )
                        ) : (
                          <ChevronDown size={14} className="opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs font-semibold">Loading records...</span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                {emptyState || <span className="text-xs font-medium">No records found</span>}
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={(item as any)._id?.toString() || rowIdx}
                className="hover:bg-slate-50/70 transition-colors"
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className={cn('py-3.5 px-4 text-slate-700', col.className)}>
                    {col.render ? col.render(item) : String((item as any)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
