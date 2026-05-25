'use client';
import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  Tooltip, Legend, Filler,
} from 'chart.js';
import type { MonthEntry, ActividadesMonthData, RespuestaMonthData } from '@/types/data';
import { fmtTime } from '@/lib/processors/respuesta';
import styles from './Panels.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

interface Props { months: MonthEntry[] }

// ─── helpers ─────────────────────────────────────────────────────────────────

const MESES: Record<string, string> = {
  Enero:'Ene', Febrero:'Feb', Marzo:'Mar', Abril:'Abr',
  Mayo:'May',  Junio:'Jun',   Julio:'Jul', Agosto:'Ago',
  Septiembre:'Sep', Octubre:'Oct', Noviembre:'Nov', Diciembre:'Dic',
};
const shortLbl = (label: string) => MESES[label.split(' ')[0]] ?? label;
const pctOf    = (a: number, b: number) => b === 0 ? 0 : Math.round((a / b) * 100);

// ─── carga todos los meses ───────────────────────────────────────────────────

function useAllData(months: MonthEntry[]) {
  const [actMap,  setActMap]  = useState<Map<string, ActividadesMonthData>>(new Map());
  const [respMap, setRespMap] = useState<Map<string, RespuestaMonthData>>(new Map());
  const [loading, setLoading] = useState(true);

  const keys = months.map(m => m.key).join(',');

  useEffect(() => {
    if (!keys) { setLoading(false); return; }
    setLoading(true);

    const actF  = months.filter(m => m.hasActividades).map(m =>
      fetch(`/data/${m.key}-actividades.json`).then(r => r.ok ? r.json() : null)
        .then(d  => ({ t: 'act'  as const, k: m.key, d }))
        .catch(() => ({ t: 'act'  as const, k: m.key, d: null }))
    );
    const respF = months.filter(m => m.hasRespuesta).map(m =>
      fetch(`/data/${m.key}-respuesta.json`).then(r => r.ok ? r.json() : null)
        .then(d  => ({ t: 'resp' as const, k: m.key, d }))
        .catch(() => ({ t: 'resp' as const, k: m.key, d: null }))
    );

    Promise.all([...actF, ...respF]).then(results => {
      const am = new Map<string, ActividadesMonthData>();
      const rm = new Map<string, RespuestaMonthData>();
      for (const r of results) {
        if (!r.d) continue;
        if (r.t === 'act')  am.set(r.k, r.d as ActividadesMonthData);
        else                rm.set(r.k, r.d as RespuestaMonthData);
      }
      setActMap(am); setRespMap(rm); setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);

  return { actMap, respMap, loading };
}

// ─── opciones base Chart.js ───────────────────────────────────────────────────

const base = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { font: { family: 'Poppins', size: 12 }, boxWidth: 12, padding: 16 } },
  },
  scales: {
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { size: 11 } } },
    x: { grid: { display: false },                              ticks: { font: { size: 12 } } },
  },
};

function line(label: string, data: (number|null)[], color: string) {
  return { label, data, borderColor: color, backgroundColor: color + '15',
           pointBackgroundColor: color, pointRadius: 5, pointHoverRadius: 7,
           tension: 0.35, fill: false, spanGaps: true };
}
function bar(label: string, data: (number|null)[], color: string) {
  return { label, data, backgroundColor: color + 'cc', borderRadius: 4, spanGaps: true };
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function InsightsPanel({ months }: Props) {
  // ordenar de más antiguo a más reciente (izq → der en gráficas)
  const sorted = [...months].reverse();
  const labels = sorted.map(m => shortLbl(m.label));

  const { actMap, respMap, loading } = useAllData(sorted);

  if (loading) return (
    <div className={styles.panel} style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <span style={{ color:'#767676' }}>Cargando datos...</span>
    </div>
  );

  const actS  = sorted.map(m => actMap.get(m.key)  ?? null);
  const respS = sorted.map(m => respMap.get(m.key) ?? null);

  const hasAct  = actS.some(Boolean);
  const hasResp = respS.some(Boolean);

  // series actividades
  const realizadas = actS.map(d => d?.tendencia.kpis.prom_realizadas ?? null);
  const asignadas  = actS.map(d => d?.tendencia.kpis.prom_asignadas  ?? null);

  // series cumplimiento
  const aTiempo = actS.map(d => d ? pctOf(d.cumplimiento.kpis.a_tiempo, d.cumplimiento.kpis.total) : null);
  const tardias = actS.map(d => d?.cumplimiento.kpis.tardio        ?? null);
  const noReal  = actS.map(d => d?.cumplimiento.kpis.no_realizadas ?? null);

  // series tiempo de respuesta
  const respLab   = respS.map(d => d?.metrics['Horario laboral'].avg      ?? null);
  const respFuera = respS.map(d => d?.metrics['Fuera de horario L-V'].avg ?? null);
  const tickets   = respS.map(d => d?.records.length ?? null);

  return (
    <div className={styles.panel}>

      {/* ── ACTIVIDADES ── */}
      {hasAct && <>
        <div className={styles.insGroupTitle}>Actividades</div>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>
            Realizadas vs Asignadas por día (prom.)
            <span className={styles.insInfo} title="Compara cuántas actividades se asignaron versus cuántas se completaron cada mes. Lo ideal es que ambas líneas estén cerca.">ⓘ</span>
          </div>
          <div style={{ height: 240, position: 'relative' }}>
            <Line data={{ labels, datasets: [
              line('Realizadas', realizadas, '#2d8a5e'),
              line('Asignadas',  asignadas,  '#767676'),
            ]}} options={base} />
          </div>
        </div>
      </>}

      {/* ── CUMPLIMIENTO ── */}
      {hasAct && <>
        <div className={styles.insGroupTitle}>Cumplimiento</div>
        <div className={styles.twoCol}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              % A tiempo
              <span className={styles.insInfo} title="Porcentaje de actividades cerradas antes o en la fecha límite. Cuanto más alto y estable, mejor.">ⓘ</span>
            </div>
            <div className={styles.chartWrap}>
              <Line data={{ labels, datasets: [line('% A tiempo', aTiempo, '#2d8a5e')] }}
                options={{ ...base, scales: { ...base.scales, y: { ...base.scales.y, max: 100 } } }} />
            </div>
          </div>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              Tardías y no realizadas
              <span className={styles.insInfo} title="Actividades cerradas después del plazo (tardías) y actividades que quedaron sin cerrar. Lo ideal es que ambas bajen.">ⓘ</span>
            </div>
            <div className={styles.chartWrap}>
              <Bar data={{ labels, datasets: [
                bar('Tardías',       tardias, '#c45c1a'),
                bar('No realizadas', noReal,  '#d2262c'),
              ]}} options={base} />
            </div>
          </div>
        </div>
      </>}

      {/* ── TIEMPO DE RESPUESTA ── */}
      {hasResp && <>
        <div className={styles.insGroupTitle}>Tiempo de Respuesta</div>
        <div className={styles.twoCol}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              Tiempo promedio de respuesta
              <span className={styles.insInfo} title="Minutos laborales promedio desde que se abre un ticket hasta que se cierra, separado por horario. Cuanto más bajo, mejor.">ⓘ</span>
            </div>
            <div className={styles.chartWrap}>
              <Line data={{ labels, datasets: [
                line('Horario laboral',    respLab,   '#2d8a5e'),
                line('Fuera de horario',   respFuera, '#c45c1a'),
              ]}} options={{ ...base, plugins: { ...base.plugins, tooltip: { callbacks: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label: (ctx: any) => `${ctx.dataset.label}: ${fmtTime(ctx.parsed.y)}`,
              }}}}} />
            </div>
          </div>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              Total tickets
              <span className={styles.insInfo} title="Número total de tickets recibidos por mes. Útil para detectar meses con mayor carga de trabajo.">ⓘ</span>
            </div>
            <div className={styles.chartWrap}>
              <Bar data={{ labels, datasets: [bar('Tickets', tickets, '#5b3fa0')] }}
                options={base} />
            </div>
          </div>
        </div>
      </>}

    </div>
  );
}
