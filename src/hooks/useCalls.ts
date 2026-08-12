'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { ICallLog } from '@/models/CallLog';

export interface UseCallsOptions {
  leadId?: string;
  salesPersonId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function useCalls(options: UseCallsOptions = {}) {
  const [calls, setCalls] = useState<ICallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (options.leadId) query.append('leadId', options.leadId);
      if (options.salesPersonId) query.append('salesPersonId', options.salesPersonId);
      if (options.startDate) query.append('startDate', options.startDate);
      if (options.endDate) query.append('endDate', options.endDate);
      if (options.limit) query.append('limit', options.limit.toString());

      const data = await api.get<{ callLogs?: ICallLog[]; calls?: ICallLog[] }>(`/calls?${query.toString()}`);
      setCalls(data.callLogs ?? data.calls ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch calls');
    } finally {
      setLoading(false);
    }
  }, [options.leadId, options.salesPersonId, options.startDate, options.endDate, options.limit]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  return { calls, loading, error, refresh: fetchCalls };
}
