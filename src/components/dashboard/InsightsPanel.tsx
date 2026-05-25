'use client';
import type { ActividadesMonthData, RespuestaMonthData } from '@/types/data';
import { fmtTime } from '@/lib/processors/respuesta';
import styles from './Panels.module.css';

interface Props {
  prevLabel: string;
  currLabel: string;
  prevAct:  ActividadesMonthData | null;
  currAct:  ActividadesMonthData | null;
  prevResp: RespuestaMonthData   | null;
  currResp: RespuestaMonthData   | null;
}

type Dir = 'up' | 'down' | 'neutral';

function pctOf(num: number, den: number) {
  return den === 0 ? 0 : (num / den) * 100;
}

// ─── Tarjeta delta ───────────────────────────────────────────────────────────

interface CardProps {
  label: string;
  prev:  number | null;
  curr:  number | null;
  fmt:   (v: number) => string;
  dir:   Dir;
}

function DeltaCard({ label, prev, curr, fmt, dir }: CardProps) {
  const hasBoth = prev !== null && curr !== null;
  const diff    = hasBoth ? curr! - prev! : null;

  let tone: 'good' | 'bad' | 'neutral' = 'neutral';
  if (diff !== null && diff !== 0) {
    if (dir === 'up')   tone = diff > 0 ? 'good' : 'bad';
    if (dir === 'down') tone = diff < 0 ? 'good' : 'bad';
  }

  const theme = {
    good:    { border: '#2d8a5e', text: '#2d8a5e', bg: '#f0faf5' },
    bad:     { border: '#d2262c', text: '#d2262c', bg: '#fef5f5' },
    neutral: { border: '#d0d0d0', text: '#767676', bg: '#fff'    },
  }[tone];

  const diffStr =
    diff === null ? '—' :
    diff === 0    ? '=' :
    (diff > 0 ? '▲ +' : '▼ ') + fmt(Math.abs(diff));

  return (
    <div className={styles.insDeltaCard} style={{ background: theme.bg, borderTop: `3px solid ${theme.border}` }}>
      <span className={styles.insDeltaCardLbl}>{label}</span>
      <span className={styles.insDeltaCardNum} style={{ color: theme.text }}>{diffStr}</span>
      {hasBoth && (
        <span className={styles.insDeltaCardSub}>{fmt(prev!)} → {fmt(curr!)}</span>
      )}
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function InsightsPanel({ prevLabel, currLabel, prevAct, currAct, prevResp, currResp }: Props) {
  const n   = (v: number) => String(Math.round(v));
  const pct = (v: number) => `${Math.round(v)}%`;
  const min = (v: number) => fmtTime(v);

  const prevPct = prevAct && prevAct.cumplimiento.kpis.total > 0
    ? pctOf(prevAct.cumplimiento.kpis.a_tiempo, prevAct.cumplimiento.kpis.total) : null;
  const currPct = currAct && currAct.cumplimiento.kpis.total > 0
    ? pctOf(currAct.cumplimiento.kpis.a_tiempo, currAct.cumplimiento.kpis.total) : null;

  return (
    <div className={styles.panel}>

      {/* Header */}
      <div className={styles.insCompareRow}>
        <span className={styles.insLblPrev}>{prevLabel}</span>
        <span className={styles.insLblArrow}>→</span>
        <span className={styles.insLblCurr}>{currLabel}</span>
      </div>

      {/* Grid de deltas */}
      <div className={styles.insDeltaGrid}>

        {/* Actividades */}
        {(prevAct || currAct) && <>
          <DeltaCard label="% A tiempo"        prev={prevPct}                                         curr={currPct}                                         fmt={pct} dir="up"      />
          <DeltaCard label="No realizadas"     prev={prevAct?.cumplimiento.kpis.no_realizadas ?? null} curr={currAct?.cumplimiento.kpis.no_realizadas ?? null} fmt={n}   dir="down"   />
          <DeltaCard label="Tardías"           prev={prevAct?.cumplimiento.kpis.tardio        ?? null} curr={currAct?.cumplimiento.kpis.tardio        ?? null} fmt={n}   dir="down"   />
          <DeltaCard label="Realizadas / día"  prev={prevAct?.tendencia.kpis.prom_realizadas  ?? null} curr={currAct?.tendencia.kpis.prom_realizadas  ?? null} fmt={n}   dir="up"     />
          <DeltaCard label="Asignadas / día"   prev={prevAct?.tendencia.kpis.prom_asignadas   ?? null} curr={currAct?.tendencia.kpis.prom_asignadas   ?? null} fmt={n}   dir="neutral"/>
        </>}

        {/* Tiempo de respuesta */}
        {(prevResp || currResp) && <>
          <DeltaCard label="Resp. laboral (prom.)"    prev={prevResp?.metrics['Horario laboral'].avg      ?? null} curr={currResp?.metrics['Horario laboral'].avg      ?? null} fmt={min} dir="down" />
          <DeltaCard label="Resp. fuera horario (prom.)" prev={prevResp?.metrics['Fuera de horario L-V'].avg ?? null} curr={currResp?.metrics['Fuera de horario L-V'].avg ?? null} fmt={min} dir="down" />
          <DeltaCard label="Total tickets"            prev={prevResp?.records.length                      ?? null} curr={currResp?.records.length                      ?? null} fmt={n}   dir="neutral" />
        </>}

      </div>
    </div>
  );
}
