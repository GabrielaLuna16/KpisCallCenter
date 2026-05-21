'use client';
import { useState, useEffect } from 'react';
import type { MonthEntry } from '@/types/data';

export function useAvailableMonths() {
  const [months, setMonths] = useState<MonthEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/index.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setMonths(d.months ?? []))
      .catch(() => setMonths([]))
      .finally(() => setLoading(false));
  }, []);

  return { months, loading };
}
