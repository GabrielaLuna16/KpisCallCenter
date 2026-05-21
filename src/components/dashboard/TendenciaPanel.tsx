'use client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import type { TendenciaData } from '@/types/data';
import styles from './Panels.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props { data: TendenciaData; label: string }

export default function TendenciaPanel({ data, label }: Props) {
  const { kpis } = data;

  const chartData = {
    labels: data.data.map(d => d.date),
    datasets: [
      {
        label: 'Asignadas',
        data: data.data.map(d => d.asignadas),
        borderColor: '#d2262c',
        backgroundColor: 'rgba(210,38,44,.12)',
        tension: 0.3,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Realizadas',
        data: data.data.map(d => d.realizadas),
        borderColor: '#2d8a5e',
        backgroundColor: 'rgba(45,138,94,.12)',
        tension: 0.3,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Límite recomendado',
        data: data.data.map(() => kpis.limite_recomendado),
        borderColor: 'rgba(255,255,255,.3)',
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { font: { family: 'Heebo', size: 13 } } },
      tooltip: { callbacks: { title: (items: { label: string }[]) => items[0]?.label } },
    },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 45 }, grid: { color: 'rgba(0,0,0,.06)' } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { size: 12 } } },
    },
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.panelTitle}>Actividades por día</h2>
        <span className={styles.monthBadge}>{label}</span>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiDark}`}>
          <span className={styles.kpiVal}>{kpis.prom_asignadas}</span>
          <span className={styles.kpiLbl}>Prom. asignadas / día</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
          <span className={styles.kpiVal}>{kpis.prom_realizadas}</span>
          <span className={styles.kpiLbl}>Prom. realizadas / día</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiRed}`}>
          <span className={styles.kpiVal}>{kpis.max_realizadas}</span>
          <span className={styles.kpiLbl}>Máximo realizado</span>
          <span className={styles.kpiSub}>{kpis.max_real_fecha}</span>
        </div>
      </div>

      {/* Gráfica */}
      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>Tendencia diaria</div>
        <div className={styles.chartWrap}>
          <Line data={chartData} options={options} />
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableCard}>
        <div className={styles.chartTitle}>Detalle por día</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Día</th>
                <th>Fecha</th>
                <th className={styles.numCol}>Asignadas</th>
                <th className={styles.numCol}>Realizadas</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((d, i) => (
                <tr key={i}>
                  <td>{d.day}</td>
                  <td>{d.date}</td>
                  <td className={styles.numCol}>{d.asignadas}</td>
                  <td className={styles.numCol}>
                    <span className={d.realizadas >= d.asignadas ? styles.tagGreen : styles.tagOrange}>
                      {d.realizadas}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
