import * as React from 'react';
import { cn } from '@/lib/cn';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
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
    <div className={cn("w-full overflow-x-auto rounded-card border border-gray-100 my-6 shadow-sm", className)}>
      <table className="w-full text-left border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key.toString()}
                className={cn(
                  "px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-500",
                  col.sortable && "cursor-pointer hover:text-brand-600 transition-colors",
                  col.className
                )}
                onClick={() => col.sortable && onSort?.(col.key.toString(), sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                <div className="flex items-center gap-2">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <span className="text-brand-500">
                      {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                {columns.map((col) => (
                  <td key={col.key.toString()} className="px-8 py-5">
                    <div className="h-4 bg-gray-100 rounded-md w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length > 0 ? (
            data.map((item, i) => (
              <tr 
                key={(item as any)._id || (item as any).id || i}
                className="hover:bg-gray-50/50 transition-colors"
              >
                {columns.map((col) => (
                  <td 
                    key={col.key.toString()} 
                    className={cn("px-8 py-5 text-sm font-semibold text-gray-700", col.className)}
                  >
                    {col.render ? col.render(item) : (item[col.key as keyof T] as any)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                {emptyState || (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <p className="text-sm font-bold">No data found</p>
                  </div>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
