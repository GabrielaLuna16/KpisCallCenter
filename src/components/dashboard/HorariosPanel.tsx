'use client';
import { useState } from 'react';
import type { HorariosData } from '@/types/data';
import DeltaBadge from './DeltaBadge';
import styles from './Panels.module.css';

interface Props { data: HorariosData; label: string; prevData?: HorariosData }

export default function HorariosPanel({ data, label, prevData }: Props) {
  const { kpis } = data;
  const [expanded, setExpanded] = useState<number | null>(null);

  function toggle(i: number) {
    setExpanded(prev => (prev === i ? null : i));
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.panelTitle}>Horarios de actividad</h2>
        <span className={styles.monthBadge}>{label}</span>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid4}>
        <div className={`${styles.kpiCard} ${styles.kpiDark}`}>
          <span className={styles.kpiVal}>{kpis.prom_horas_activas}h</span>
          <span className={styles.kpiLbl}>Prom. horas activas / día</span>
          <DeltaBadge curr={kpis.prom_horas_activas} prev={prevData?.kpis.prom_horas_activas} positiveIsGood />
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiDark}`}>
          <span className={styles.kpiVal}>{kpis.tiempo_prom_entre_cierres}m</span>
          <span className={styles.kpiLbl}>Tiempo prom. entre cierres</span>
          <DeltaBadge curr={kpis.tiempo_prom_entre_cierres} prev={prevData?.kpis.tiempo_prom_entre_cierres} positiveIsGood={false} />
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
          <span className={styles.kpiVal}>{kpis.dia_mas_largo.horas}h</span>
          <span className={styles.kpiLbl}>Día más largo</span>
          <span className={styles.kpiSub}>{kpis.dia_mas_largo.fecha}</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiOrange}`}>
          <span className={styles.kpiVal}>{kpis.dia_mas_corto.horas}h</span>
          <span className={styles.kpiLbl}>Día más corto</span>
          <span className={styles.kpiSub}>{kpis.dia_mas_corto.fecha}</span>
        </div>
      </div>

      {/* Tabla expandible */}
      <div className={styles.tableCard}>
        <div className={styles.chartTitle}>Detalle por día (clic para ver tareas)</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Día</th>
                <th>Fecha</th>
                <th className={styles.numCol}>Asignadas</th>
                <th>1ª Actividad</th>
                <th>Última</th>
                <th className={styles.numCol}>Prom. entre cierres</th>
                <th className={styles.numCol}>Horas activas</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((d, i) => (
                <>
                  <tr
                    key={`row-${i}`}
                    className={d.tasks.length > 0 ? styles.expandableRow : ''}
                    onClick={() => d.tasks.length > 0 && toggle(i)}
                  >
                    <td>{d.dia}</td>
                    <td>{d.fecha}</td>
                    <td className={styles.numCol}>{d.asignadas}</td>
                    <td>{d.primera || '—'}</td>
                    <td>{d.ultima || '—'}</td>
                    <td className={styles.numCol}>{d.prom_entre_cierres ? `${d.prom_entre_cierres}m` : '—'}</td>
                    <td className={styles.numCol}>
                      {d.horas_activas > 0
                        ? <span className={styles.tagGreen}>{d.horas_activas}h</span>
                        : '—'}
                    </td>
                  </tr>
                  {expanded === i && d.tasks.length > 0 && (
                    <tr key={`exp-${i}`} className={styles.expandedRow}>
                      <td colSpan={7}>
                        <table className={styles.subtable}>
                          <thead>
                            <tr>
                              <th>Lead</th>
                              <th>Actividad</th>
                              <th>Hora cierre</th>
                            </tr>
                          </thead>
                          <tbody>
                            {d.tasks.map((t, j) => (
                              <tr key={j}>
                                <td>{t.related_to}</td>
                                <td>{t.subject}</td>
                                <td>{t.closed_time}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
