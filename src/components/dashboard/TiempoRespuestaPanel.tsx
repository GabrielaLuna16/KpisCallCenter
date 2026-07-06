'use client';
import { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import type { RespuestaMonthData, Turno } from '@/types/data';
import { fmtTime } from '@/lib/processors/respuesta';
import DeltaBadge from './DeltaBadge';
import styles from './Panels.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props { data: RespuestaMonthData; label: string; prevData?: RespuestaMonthData }

const TURNOS: Turno[] = ['Horario laboral', 'Fuera de horario L-V', 'Fin de semana'];
const TURNO_COLORS: Record<Turno, string> = {
  'Horario laboral': '#2d8a5e',
  'Fuera de horario L-V': '#c45c1a',
  'Fin de semana': '#5b3fa0',
};

type Filter = 'Todos' | Turno;

export default function TiempoRespuestaPanel({ data, label, prevData }: Props) {
  const [filter, setFilter] = useState<Filter>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [sortCol, setSortCol] = useState<'r' | 'c' | 'cl' | 'm'>('m');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  // Gráfica 1: Registros por turno
  const barCountData = {
    labels: TURNOS,
    datasets: [{
      label: 'Registros',
      data: TURNOS.map(t => data.metrics[t]?.count ?? 0),
      backgroundColor: TURNOS.map(t => TURNO_COLORS[t]),
    }],
  };

  // Gráfica 2: Tiempo de respuesta por turno (promedio + mediana)
  const barTimeData = {
    labels: TURNOS,
    datasets: [
      {
        label: 'Promedio',
        data: TURNOS.map(t => data.metrics[t]?.avg ?? 0),
        backgroundColor: TURNOS.map(t => TURNO_COLORS[t]),
      },
      {
        label: 'Mediana',
        data: TURNOS.map(t => data.metrics[t]?.median ?? 0),
        backgroundColor: TURNOS.map(t => TURNO_COLORS[t] + '88'),
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { font: { family: 'Heebo', size: 13 } } },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `${ctx.dataset.label}: ${fmtTime(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 12 } }, grid: { color: 'rgba(0,0,0,.06)' } },
      x: { ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.06)' } },
    },
  };

  // Filtrado y ordenamiento de la tabla
  const filtered = useMemo(() => {
    let rows = data.records;
    if (filter !== 'Todos') rows = rows.filter(r => r.s === filter);
    if (busqueda) rows = rows.filter(r => r.r.toLowerCase().includes(busqueda.toLowerCase()));
    return [...rows].sort((a, b) => {
      let va: string | number = a[sortCol];
      let vb: string | number = b[sortCol];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
  }, [data.records, filter, busqueda, sortCol, sortDir]);

  function handleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortCol(col); setSortDir(1); }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.panelTitle}>Tiempo de respuesta</h2>
        <span className={styles.monthBadge}>{label}</span>
      </div>

      {/* KPI cards por turno */}
      <div className={styles.kpiGrid3}>
        {TURNOS.map(t => {
          const m = data.metrics[t];
          return (
            <div key={t} className={styles.kpiCardTurno}
              style={{ borderTop: `4px solid ${TURNO_COLORS[t]}` }}>
              <div className={styles.kpiTurnoLabel}>{t}</div>
              <div className={styles.kpiTurnoMetrics}>
                <div>
                  <span className={styles.kpiVal}>{fmtTime(m?.avg ?? 0)}</span>
                  <span className={styles.kpiLbl}>Promedio</span>
                  <DeltaBadge curr={m?.avg ?? 0} prev={prevData?.metrics[t]?.avg} positiveIsGood={false} variant="light" format={fmtTime} />
                </div>
                <div>
                  <span className={styles.kpiVal}>{fmtTime(m?.median ?? 0)}</span>
                  <span className={styles.kpiLbl}>Mediana</span>
                  <DeltaBadge curr={m?.median ?? 0} prev={prevData?.metrics[t]?.median} positiveIsGood={false} variant="light" format={fmtTime} />
                </div>
                <div>
                  <span className={styles.kpiVal}>{m?.count ?? 0}</span>
                  <span className={styles.kpiLbl}>Registros</span>
                  <DeltaBadge curr={m?.count ?? 0} prev={prevData?.metrics[t]?.count} variant="light" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficas */}
      <div className={styles.twoCol}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Registros por turno</div>
          <div className={styles.chartWrap}>
            <Bar data={barCountData} options={{ ...barOptions, plugins: { ...barOptions.plugins,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tooltip: { callbacks: { label: (ctx: any) => `${ctx.parsed.y} registros` } }
            }}} />
          </div>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Tiempo de respuesta por turno</div>
          <div className={styles.chartWrap}>
            <Bar data={barTimeData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className={styles.tableCard}>
        <div className={styles.tableControls}>
          <div className={styles.filterBtns}>
            {(['Todos', ...TURNOS] as Filter[]).map(f => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
                onClick={() => setFilter(f)}
              >{f}</button>
            ))}
          </div>
          <input
            className={styles.searchInput}
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.sortable} onClick={() => handleSort('r')}>
                  Related To {sortCol === 'r' ? (sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th className={styles.sortable} onClick={() => handleSort('c')}>
                  Creado {sortCol === 'c' ? (sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th className={styles.sortable} onClick={() => handleSort('cl')}>
                  Cerrado {sortCol === 'cl' ? (sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th>Turno</th>
                <th className={`${styles.numCol} ${styles.sortable}`} onClick={() => handleSort('m')}>
                  Tiempo {sortCol === 'm' ? (sortDir === 1 ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i}>
                  <td>{r.r}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '.85em' }}>{r.c}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '.85em' }}>{r.cl || '—'}</td>
                  <td>
                    <span className={styles.turnoBadge}
                      style={{ background: TURNO_COLORS[r.s] + '22', color: TURNO_COLORS[r.s], border: `1px solid ${TURNO_COLORS[r.s]}55` }}>
                      {r.s}
                    </span>
                  </td>
                  <td className={styles.numCol}>
                    <div className={styles.timeCell}>
                      <span>{fmtTime(r.m)}</span>
                      <div className={styles.timeBar}
                        style={{ width: `${data.maxMins > 0 ? Math.round((r.m / data.maxMins) * 100) : 0}%`, background: TURNO_COLORS[r.s] }} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>Sin registros</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.tableFooter}>{filtered.length} de {data.records.length} registros</div>
      </div>
    </div>
  );
}
