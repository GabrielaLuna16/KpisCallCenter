'use client';
import type { ReactNode } from 'react';
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

// ─── helpers ────────────────────────────────────────────────────────────────

function pctOf(num: number, den: number): number {
  return den === 0 ? 0 : (num / den) * 100;
}

function relPct(prev: number, curr: number): number | null {
  return prev === 0 ? null : ((curr - prev) / prev) * 100;
}

type Dir = 'up' | 'down' | 'neutral';

function deltaColor(diff: number, dir: Dir): string {
  if (dir === 'neutral' || diff === 0) return '#767676';
  if (dir === 'up')   return diff > 0 ? '#2d8a5e' : '#d2262c';
  return diff < 0 ? '#2d8a5e' : '#d2262c';
}

// ─── MetricCard ──────────────────────────────────────────────────────────────

interface MCProps {
  label:      string;
  prev:       number | null;
  curr:       number | null;
  fmt:        (v: number) => string;
  dir:        Dir;
  prevLabel:  string;
  currLabel:  string;
  showRelPct?: boolean;
}

function MetricCard({ label, prev, curr, fmt, dir, prevLabel, currLabel, showRelPct = true }: MCProps) {
  const hasBoth = prev !== null && curr !== null;
  const diff    = hasBoth ? curr! - prev! : null;
  const rp      = hasBoth && showRelPct ? relPct(prev!, curr!) : null;
  const col     = diff !== null ? deltaColor(diff, dir) : '#767676';

  return (
    <div className={styles.insCard}>
      <span className={styles.insCardLbl}>{label}</span>
      <div className={styles.insCardBody}>
        <div className={styles.insCol}>
          <span className={styles.insNumPrev}>{prev !== null ? fmt(prev) : '—'}</span>
          <span className={styles.insMthLbl}>{prevLabel}</span>
        </div>
        <span className={styles.insArrw}>→</span>
        <div className={styles.insCol}>
          <span className={styles.insNumCurr}>{curr !== null ? fmt(curr) : '—'}</span>
          <span className={styles.insMthLbl}>{currLabel}</span>
        </div>
      </div>
      {diff !== null && (
        <span className={styles.insDelta} style={{ color: col }}>
          {diff === 0
            ? '= Sin cambio'
            : `${diff > 0 ? '▲ +' : '▼ '}${fmt(Math.abs(diff))}${rp !== null ? ` (${rp > 0 ? '+' : ''}${Math.round(rp)}%)` : ''}`
          }
        </span>
      )}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.insSection}>
      <div className={styles.insSectionTitle}>{title}</div>
      <div className={styles.insCardsGrid}>{children}</div>
    </div>
  );
}

// ─── Auto-highlights ─────────────────────────────────────────────────────────

interface HL { title: string; body: string; tone: 'good' | 'bad' | 'neutral' }

function buildHighlights(
  prevAct:  ActividadesMonthData | null,
  currAct:  ActividadesMonthData | null,
  prevResp: RespuestaMonthData   | null,
  currResp: RespuestaMonthData   | null,
): HL[] {
  const hl: HL[] = [];

  if (prevAct && currAct) {
    // Puntualidad
    const pp = pctOf(prevAct.cumplimiento.kpis.a_tiempo, prevAct.cumplimiento.kpis.total);
    const cp = pctOf(currAct.cumplimiento.kpis.a_tiempo,  currAct.cumplimiento.kpis.total);
    const dp = cp - pp;
    if (Math.abs(dp) >= 1) {
      hl.push({
        title: 'Puntualidad',
        body:  `Las actividades a tiempo ${dp > 0 ? 'subieron' : 'bajaron'} de ${Math.round(pp)}% a ${Math.round(cp)}% (${dp > 0 ? '+' : ''}${Math.round(dp)} pp).`,
        tone:  dp > 0 ? 'good' : 'bad',
      });
    }

    // No realizadas
    const pnr = prevAct.cumplimiento.kpis.no_realizadas;
    const cnr = currAct.cumplimiento.kpis.no_realizadas;
    const dnr = cnr - pnr;
    if (pnr !== cnr) {
      hl.push({
        title: 'No realizadas',
        body:  `Las actividades no realizadas ${dnr < 0 ? 'bajaron' : 'subieron'} de ${pnr} a ${cnr} (${dnr > 0 ? '+' : ''}${dnr}).`,
        tone:  dnr < 0 ? 'good' : 'bad',
      });
    }

    // Productividad diaria
    const pr  = prevAct.tendencia.kpis.prom_realizadas;
    const cr  = currAct.tendencia.kpis.prom_realizadas;
    const rp2 = relPct(pr, cr);
    if (pr > 0 && rp2 !== null && Math.abs(rp2) >= 5) {
      hl.push({
        title: 'Productividad diaria',
        body:  `El promedio de actividades realizadas por día ${cr > pr ? 'subió' : 'bajó'} de ${pr} a ${cr} (${rp2 > 0 ? '+' : ''}${Math.round(rp2)}%).`,
        tone:  cr > pr ? 'good' : 'neutral',
      });
    }

    // Tardías
    const pt = prevAct.cumplimiento.kpis.tardio;
    const ct = currAct.cumplimiento.kpis.tardio;
    const dt = ct - pt;
    if (pt !== ct) {
      hl.push({
        title: 'Actividades tardías',
        body:  `Las actividades tardías ${dt < 0 ? 'bajaron' : 'subieron'} de ${pt} a ${ct} (${dt > 0 ? '+' : ''}${dt}).`,
        tone:  dt < 0 ? 'good' : 'bad',
      });
    }
  }

  if (prevResp && currResp) {
    // Tiempo respuesta horario laboral
    const pa = prevResp.metrics['Horario laboral'].avg;
    const ca = currResp.metrics['Horario laboral'].avg;
    const da = ca - pa;
    if (pa > 0 && Math.abs(da) >= 10) {
      hl.push({
        title: 'Tiempo de respuesta laboral',
        body:  `El tiempo promedio de respuesta en horario laboral ${da < 0 ? 'mejoró' : 'aumentó'} de ${fmtTime(pa)} a ${fmtTime(ca)} (${da < 0 ? '' : '+'}${fmtTime(Math.abs(da))}).`,
        tone:  da < 0 ? 'good' : 'bad',
      });
    }

    // Volumen tickets
    const pt2 = prevResp.records.length;
    const ct2 = currResp.records.length;
    if (pt2 !== ct2) {
      const rp3 = relPct(pt2, ct2);
      hl.push({
        title: 'Volumen de tickets',
        body:  `El total de tickets ${ct2 > pt2 ? 'aumentó' : 'disminuyó'} de ${pt2} a ${ct2}${rp3 !== null ? ` (${rp3 > 0 ? '+' : ''}${Math.round(rp3)}%)` : ''}.`,
        tone:  'neutral',
      });
    }
  }

  if (hl.length === 0) {
    hl.push({ title: 'Sin cambios notables', body: 'No se detectaron diferencias significativas entre los dos meses.', tone: 'neutral' });
  }

  return hl.slice(0, 6);
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export default function InsightsPanel({ prevLabel, currLabel, prevAct, currAct, prevResp, currResp }: Props) {
  const highlights = buildHighlights(prevAct, currAct, prevResp, currResp);

  const n   = (v: number) => String(Math.round(v));
  const pct = (v: number) => `${Math.round(v)}%`;
  const hrs = (v: number) => `${v.toFixed(1)}h`;
  const min = (v: number) => `${v}min`;

  const prevPctAT = prevAct && prevAct.cumplimiento.kpis.total > 0
    ? pctOf(prevAct.cumplimiento.kpis.a_tiempo, prevAct.cumplimiento.kpis.total) : null;
  const currPctAT = currAct && currAct.cumplimiento.kpis.total > 0
    ? pctOf(currAct.cumplimiento.kpis.a_tiempo, currAct.cumplimiento.kpis.total) : null;

  return (
    <div className={styles.panel}>

      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.panelTitle}>Insights</h2>
        <div className={styles.insCompareRow}>
          <span className={styles.insLblPrev}>{prevLabel}</span>
          <span className={styles.insLblArrow}>→</span>
          <span className={styles.insLblCurr}>{currLabel}</span>
        </div>
      </div>

      {/* Highlights automáticos */}
      <div className={styles.insHlGrid}>
        {highlights.map((hl, i) => (
          <div key={i} className={`${styles.insHlCard} ${
            hl.tone === 'good' ? styles.insHlGood :
            hl.tone === 'bad'  ? styles.insHlBad  : styles.insHlNeutral
          }`}>
            <div className={styles.insHlTitle}>{hl.title}</div>
            <div className={styles.insHlBody}>{hl.body}</div>
          </div>
        ))}
      </div>

      {/* ── ACTIVIDADES ── */}
      {(prevAct || currAct) && (
        <Section title="Actividades">
          <MetricCard label="Prom. asignadas / día"  prev={prevAct?.tendencia.kpis.prom_asignadas  ?? null} curr={currAct?.tendencia.kpis.prom_asignadas  ?? null} fmt={n} dir="neutral" prevLabel={prevLabel} currLabel={currLabel} />
          <MetricCard label="Prom. realizadas / día" prev={prevAct?.tendencia.kpis.prom_realizadas ?? null} curr={currAct?.tendencia.kpis.prom_realizadas ?? null} fmt={n} dir="up"      prevLabel={prevLabel} currLabel={currLabel} />
        </Section>
      )}

      {/* ── CUMPLIMIENTO ── */}
      {(prevAct || currAct) && (
        <Section title="Cumplimiento">
          <MetricCard label="Total actividades" prev={prevAct?.cumplimiento.kpis.total          ?? null} curr={currAct?.cumplimiento.kpis.total          ?? null} fmt={n}   dir="neutral" prevLabel={prevLabel} currLabel={currLabel} />
          <MetricCard label="A tiempo"          prev={prevPctAT}                                        curr={currPctAT}                                        fmt={pct} dir="up"      prevLabel={prevLabel} currLabel={currLabel} showRelPct={false} />
          <MetricCard label="Tardías"           prev={prevAct?.cumplimiento.kpis.tardio         ?? null} curr={currAct?.cumplimiento.kpis.tardio         ?? null} fmt={n}   dir="down"   prevLabel={prevLabel} currLabel={currLabel} />
          <MetricCard label="No realizadas"     prev={prevAct?.cumplimiento.kpis.no_realizadas  ?? null} curr={currAct?.cumplimiento.kpis.no_realizadas  ?? null} fmt={n}   dir="down"   prevLabel={prevLabel} currLabel={currLabel} />
        </Section>
      )}

      {/* ── HORARIOS ── */}
      {(prevAct || currAct) && (
        <Section title="Horarios">
          <MetricCard label="Prom. horas activas"           prev={prevAct?.horarios.kpis.prom_horas_activas        ?? null} curr={currAct?.horarios.kpis.prom_horas_activas        ?? null} fmt={hrs} dir="neutral" prevLabel={prevLabel} currLabel={currLabel} />
          <MetricCard label="Intervalo prom. entre cierres" prev={prevAct?.horarios.kpis.tiempo_prom_entre_cierres ?? null} curr={currAct?.horarios.kpis.tiempo_prom_entre_cierres ?? null} fmt={min} dir="neutral" prevLabel={prevLabel} currLabel={currLabel} />
        </Section>
      )}

      {/* ── TIEMPO DE RESPUESTA ── */}
      {(prevResp || currResp) && (
        <Section title="Tiempo de Respuesta">
          <MetricCard label="Horario laboral — Promedio"  prev={prevResp?.metrics['Horario laboral'].avg         ?? null} curr={currResp?.metrics['Horario laboral'].avg         ?? null} fmt={fmtTime} dir="down"    prevLabel={prevLabel} currLabel={currLabel} />
          <MetricCard label="Horario laboral — Mediana"   prev={prevResp?.metrics['Horario laboral'].median      ?? null} curr={currResp?.metrics['Horario laboral'].median      ?? null} fmt={fmtTime} dir="down"    prevLabel={prevLabel} currLabel={currLabel} />
          <MetricCard label="Fuera de horario — Promedio" prev={prevResp?.metrics['Fuera de horario L-V'].avg    ?? null} curr={currResp?.metrics['Fuera de horario L-V'].avg    ?? null} fmt={fmtTime} dir="down"    prevLabel={prevLabel} currLabel={currLabel} />
          <MetricCard label="Fuera de horario — Mediana"  prev={prevResp?.metrics['Fuera de horario L-V'].median ?? null} curr={currResp?.metrics['Fuera de horario L-V'].median ?? null} fmt={fmtTime} dir="down"    prevLabel={prevLabel} currLabel={currLabel} />
          <MetricCard label="Fin de semana — Promedio"    prev={prevResp?.metrics['Fin de semana'].avg           ?? null} curr={currResp?.metrics['Fin de semana'].avg           ?? null} fmt={fmtTime} dir="down"    prevLabel={prevLabel} currLabel={currLabel} />
          <MetricCard label="Total tickets"               prev={prevResp?.records.length                         ?? null} curr={currResp?.records.length                         ?? null} fmt={n}       dir="neutral" prevLabel={prevLabel} currLabel={currLabel} />
        </Section>
      )}

    </div>
  );
}
