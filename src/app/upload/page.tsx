'use client';
import { useState } from 'react';
import Link from 'next/link';
import UploadSection from '@/components/upload/UploadSection';
import { parseActividadesToData } from '@/lib/processors/actividades';
import { parseRespuestaToData } from '@/lib/processors/respuesta';
import styles from './upload.module.css';

function actSummary(data: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const act = data as any;
  const total = act?.cumplimiento?.kpis?.total ?? 0;
  const promAsig = act?.tendencia?.kpis?.prom_asignadas ?? '—';
  const promReal = act?.tendencia?.kpis?.prom_realizadas ?? '—';
  return `${total} tareas totales · Prom. asignadas/día: ${promAsig} · Prom. realizadas/día: ${promReal}`;
}

function respSummary(data: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp = data as any;
  const total = (resp?.records as unknown[])?.length ?? 0;
  return `${total} registros · Tiempo máximo: ${resp?.maxMins ?? 0} min`;
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function UploadPage() {
  const [anySuccess, setAnySuccess] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [holidayInput, setHolidayInput] = useState('');
  const [vacations, setVacations] = useState<{ start: string; end: string }[]>([]);
  const [vacStart, setVacStart] = useState('');
  const [vacEnd, setVacEnd] = useState('');

  function addHoliday() {
    if (!holidayInput || holidays.includes(holidayInput)) return;
    setHolidays(prev => [...prev, holidayInput].sort());
    setHolidayInput('');
  }

  function addVacation() {
    if (!vacStart || !vacEnd || vacStart > vacEnd) return;
    setVacations(prev => [...prev, { start: vacStart, end: vacEnd }]);
    setVacStart(''); setVacEnd('');
  }

  function getAllNonWorkingDays(): string[] {
    const days = new Set(holidays);
    for (const v of vacations) {
      const d = new Date(v.start + 'T00:00:00Z');
      const end = new Date(v.end + 'T00:00:00Z');
      while (d <= end) {
        days.add(d.toISOString().split('T')[0]);
        d.setUTCDate(d.getUTCDate() + 1);
      }
    }
    return Array.from(days);
  }

  const nonWorkingDays = getAllNonWorkingDays();

  return (
    <>
      <div className={styles.topBar}>
        <span className={styles.brand}>ATISA</span>
        <Link href="/" className={styles.backLink}>← Volver al dashboard</Link>
      </div>

      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Cargar datos mensuales</h1>
          <p className={styles.pageSub}>Sube los archivos Excel de Zoho para agregar un nuevo mes al dashboard.</p>
        </div>

        {/* ── Filtro compartido de días no laborables ── */}
        <div className={styles.nlCard}>
          <div className={styles.nlCardHeader}>
            <h2 className={styles.nlCardTitle}>Días no laborables del mes</h2>
            <p className={styles.nlCardSub}>
              Estos días se excluyen del cálculo de ambos archivos. Configúralos antes de procesar.
            </p>
          </div>

          <div className={styles.nlGrid}>
            {/* Festivos / días sueltos */}
            <div className={styles.nlField}>
              <label className={styles.nlLabel}>
                Festivos o días sueltos
                <span className={styles.nlLabelHint}> · cierra al siguiente día hábil</span>
              </label>
              <div className={styles.nlRow}>
                <input
                  type="date"
                  className={styles.nlDateInput}
                  value={holidayInput}
                  onChange={e => setHolidayInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHoliday())}
                />
                <button type="button" className={styles.nlBtnAdd} onClick={addHoliday}>
                  + Agregar
                </button>
              </div>
              {holidays.length > 0 && (
                <div className={styles.nlTags}>
                  {holidays.map(d => (
                    <span key={d} className={styles.nlTag}>
                      {fmtDate(d)}
                      <button type="button" onClick={() => setHolidays(prev => prev.filter(x => x !== d))}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Vacaciones (rango) */}
            <div className={styles.nlField}>
              <label className={styles.nlLabel}>
                Vacaciones
                <span className={styles.nlLabelHint}> · cierra al primer día hábil tras el rango</span>
              </label>
              <div className={styles.nlVacRow}>
                <div className={styles.nlVacGroup}>
                  <span className={styles.nlVacLabel}>Inicio</span>
                  <input type="date" className={styles.nlDateInput} value={vacStart}
                    onChange={e => setVacStart(e.target.value)} />
                </div>
                <div className={styles.nlVacGroup}>
                  <span className={styles.nlVacLabel}>Fin</span>
                  <input type="date" className={styles.nlDateInput} value={vacEnd}
                    onChange={e => setVacEnd(e.target.value)} />
                </div>
                <button
                  type="button"
                  className={styles.nlBtnAdd}
                  onClick={addVacation}
                  disabled={!vacStart || !vacEnd || vacStart > vacEnd}
                >
                  + Agregar
                </button>
              </div>
              {vacations.length > 0 && (
                <div className={styles.nlTags}>
                  {vacations.map((v, i) => (
                    <span key={i} className={`${styles.nlTag} ${styles.nlTagVac}`}>
                      {fmtDate(v.start)} — {fmtDate(v.end)}
                      <button type="button" onClick={() => setVacations(prev => prev.filter((_, j) => j !== i))}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {nonWorkingDays.length > 0 && (
            <div className={styles.nlSummary}>
              <span className={styles.nlSummaryDot} />
              {nonWorkingDays.length} día{nonWorkingDays.length !== 1 ? 's' : ''} no laborable{nonWorkingDays.length !== 1 ? 's' : ''} configurado{nonWorkingDays.length !== 1 ? 's' : ''} — se aplicarán a los dos archivos
            </div>
          )}
        </div>

        <div className={styles.sections}>
          <UploadSection
            title="Actividades por día"
            subtitle="Genera las pestañas: Actividades, Cumplimiento y Horarios"
            endpoint="/api/upload-actividades"
            parser={async (buf, days) => parseActividadesToData(buf, days) as unknown as { month: string; [k: string]: unknown }}
            previewSummary={actSummary}
            nonWorkingDays={nonWorkingDays}
            onSuccess={() => setAnySuccess(true)}
          />

          <UploadSection
            title="Tiempo de respuesta"
            subtitle="Genera la pestaña: Tiempo de Respuesta"
            endpoint="/api/upload-respuesta"
            parser={async (buf, days) => parseRespuestaToData(buf, days) as unknown as { month: string; [k: string]: unknown }}
            previewSummary={respSummary}
            nonWorkingDays={nonWorkingDays}
            onSuccess={() => setAnySuccess(true)}
          />
        </div>

        {anySuccess && (
          <div className={styles.successBanner}>
            <div className={styles.successBannerText}>
              <span className={styles.successBannerCheck}>✓</span>
              Archivo guardado correctamente. El dashboard se actualizará en ~45 segundos.
            </div>
            <Link href="/" className={styles.backBtn}>
              Volver a Dashboards
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
