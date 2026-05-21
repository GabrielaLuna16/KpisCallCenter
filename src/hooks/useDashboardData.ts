'use client';
import { useState, useEffect } from 'react';
import type { ActividadesMonthData, RespuestaMonthData } from '@/types/data';

const cacheAct = new Map<string, ActividadesMonthData>();
const cacheResp = new Map<string, RespuestaMonthData>();

export function useActividadesData(month: string | null) {
  const [data, setData] = useState<ActividadesMonthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!month) { setData(null); return; }
    if (cacheAct.has(month)) { setData(cacheAct.get(month)!); return; }
    setLoading(true);
    setError(null);
    fetch(`/data/${month}-actividades.json`)
      .then(r => { if (!r.ok) throw new Error('Sin datos de actividades'); return r.json(); })
      .then(d => { cacheAct.set(month, d); setData(d); })
      .catch(e => { setError(e.message); setData(null); })
      .finally(() => setLoading(false));
  }, [month]);

  return { data, loading, error };
}

export function useRespuestaData(month: string | null) {
  const [data, setData] = useState<RespuestaMonthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!month) { setData(null); return; }
    if (cacheResp.has(month)) { setData(cacheResp.get(month)!); return; }
    setLoading(true);
    setError(null);
    fetch(`/data/${month}-respuesta.json`)
      .then(r => { if (!r.ok) throw new Error('Sin datos de tiempo de respuesta'); return r.json(); })
      .then(d => { cacheResp.set(month, d); setData(d); })
      .catch(e => { setError(e.message); setData(null); })
      .finally(() => setLoading(false));
  }, [month]);

  return { data, loading, error };
}
