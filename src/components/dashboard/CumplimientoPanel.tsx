'use client';
import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { CumplimientoData, CumplimientoDetalle } from '@/types/data';
import styles from './Panels.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props { data: CumplimientoData; label: string }

export default function CumplimientoPanel({ data, label }: Props) {
  const { kpis } = data;
  const [modal, setModal] = useState<null | 'tardio' | 'no_real'>(null);
  const [busqueda, setBusqueda] = useState('');

  const total = kpis.total || 1;
  const pAT = Math.round((kpis.a_tiempo / total) * 100);
  const pTard = Math.round((kpis.tardio / total) * 100);
  const pNoReal = Math.round((kpis.no_realizadas / total) * 100);

  const doughnutData = {
    labels: ['A tiempo', 'Tardío', 'No realizadas'],
    datasets: [{
      data: [kpis.a_tiempo, kpis.tardio, kpis.no_realizadas],
      backgroundColor: ['#2d8a5e', '#c45c1a', '#5b3fa0'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { font: { family: 'Heebo', size: 13 } } },
    },
  };

  const modalItems: CumplimientoDetalle[] = modal === 'tardio'
    ? data.tardio_detail
    : data.no_real_detail;

  const filtered = modalItems.filter(i =>
    i.lead.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.due_date.includes(busqueda) ||
    (i.subject ?? '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const zohoUrl = (id?: string) =>
    id ? `https://crm.zoho.com/crm/org666606221/tab/Tasks/${id}` : null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.panelTitle}>Cumplimiento de actividades</h2>
        <span className={styles.monthBadge}>{label}</span>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid4}>
        <div className={`${styles.kpiCard} ${styles.kpiDark}`}>
          <span className={styles.kpiVal}>{kpis.total}</span>
          <span className={styles.kpiLbl}>Total tareas</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
          <span className={styles.kpiVal}>{kpis.a_tiempo}</span>
          <span className={styles.kpiLbl}>A tiempo</span>
          <span className={styles.kpiSub}>{pAT}%</span>
        </div>
        <div
          className={`${styles.kpiCard} ${styles.kpiOrange} ${styles.clickable}`}
          onClick={() => { setModal('tardio'); setBusqueda(''); }}
          title="Ver detalle"
        >
          <span className={styles.kpiVal}>{kpis.tardio}</span>
          <span className={styles.kpiLbl}>Tardío</span>
          <span className={styles.kpiSub}>{pTard}%</span>
        </div>
        <div
          className={`${styles.kpiCard} ${styles.kpiPurple} ${styles.clickable}`}
          onClick={() => { setModal('no_real'); setBusqueda(''); }}
          title="Ver detalle"
        >
          <span className={styles.kpiVal}>{kpis.no_realizadas}</span>
          <span className={styles.kpiLbl}>No realizadas</span>
          <span className={styles.kpiSub}>{pNoReal}%</span>
        </div>
      </div>

      <div className={styles.twoCol}>
        {/* Dona */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Distribución</div>
          <div className={styles.donaWrap}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>

        {/* Barras de eficiencia */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Eficiencia</div>
          <div className={styles.eficiencia}>
            <BarEficiencia label="A tiempo" value={pAT} color="var(--green)" />
            <BarEficiencia label="Tardío" value={pTard} color="var(--orange)" />
            <BarEficiencia label="No realizadas" value={pNoReal} color="var(--purple)" />
          </div>
        </div>
      </div>

      {/* Tabla detalle diario */}
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
              {data.detail_table.map((d, i) => (
                <tr key={i}>
                  <td>{d.dia}</td>
                  <td>{d.fecha}</td>
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

      {/* Modal */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{modal === 'tardio' ? 'Tareas tardías' : 'Tareas no realizadas'}</h3>
              <button className={styles.modalClose} onClick={() => setModal(null)}>✕</button>
            </div>
            <input
              className={styles.searchInput}
              placeholder="Buscar por nombre, subject o fecha..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <div className={styles.modalTableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Subject</th>
                    <th>Due Date</th>
                    {modal === 'tardio' && <th>Closed Time</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => {
                    const url = zohoUrl(item.record_id);
                    return (
                      <tr
                        key={i}
                        className={url ? styles.zohoRow : ''}
                        onClick={() => url && window.open(url, '_blank')}
                        title={url ? 'Abrir tarea en Zoho CRM' : undefined}
                      >
                        <td>{item.lead}</td>
                        <td>{item.subject ?? '—'}</td>
                        <td>{item.due_date}</td>
                        {modal === 'tardio' && <td>{item.closed_time}</td>}
                        <td className={styles.zohoLinkCell}>
                          {url && <span className={styles.zohoIcon}>↗</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>Sin resultados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className={styles.modalFooter}>{filtered.length} de {modalItems.length} registros</div>
          </div>
        </div>
      )}
    </div>
  );
}

function BarEficiencia({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={styles.barRow}>
      <div className={styles.barLabel}>{label}</div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${value}%`, background: color }} />
      </div>
      <span className={styles.barPct}>{value}%</span>
    </div>
  );
}
