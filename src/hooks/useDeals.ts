'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { IDeal } from '@/models/Deal';

export function useDeals(options: { stage?: string; pipelineId?: string } = {}) {
  const [deals, setDeals] = useState<IDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (options.stage) query.append('stage', options.stage);
      if (options.pipelineId) query.append('pipelineId', options.pipelineId);

      const data = await api.get<{ deals: IDeal[] }>(`/deals?${query.toString()}`);
      setDeals(data.deals);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  }, [options.stage, options.pipelineId]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return { deals, loading, error, refresh: fetchDeals };
}
