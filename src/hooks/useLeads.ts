'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { ILead } from '@/models/Lead';

interface UseLeadsOptions {
  status?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

export function useLeads(options: UseLeadsOptions = {}) {
  const [leads, setLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (options.status) query.append('status', options.status);
      if (options.search) query.append('search', options.search);
      if (options.limit) query.append('limit', options.limit.toString());
      if (options.skip) query.append('skip', options.skip.toString());

      const data = await api.get<{ leads: ILead[]; total: number }>(`/leads?${query.toString()}`);
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [options.status, options.search, options.limit, options.skip]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, loading, error, total, refresh: fetchLeads };
}
