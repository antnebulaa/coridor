'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface UserFeatures {
  planName: string;
  planDisplayName: string;
  maxProperties: number;
  features: Array<{
    key: string;
    label: string;
    category: string;
    included: boolean;
  }>;
}

export function useFeature(featureKey?: string) {
  const [data, setData] = useState<UserFeatures | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/subscription/status')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hasFeature = (key: string): boolean => {
    if (!data) return false;
    return data.features.some((f) => f.key === key && f.included);
  };

  return {
    loading,
    data,
    hasFeature: featureKey ? hasFeature(featureKey) : false,
    checkFeature: hasFeature,
    planName: data?.planName || 'FREE',
    planDisplayName: data?.planDisplayName || 'Gratuit',
    maxProperties: data?.maxProperties || 1,
  };
}
