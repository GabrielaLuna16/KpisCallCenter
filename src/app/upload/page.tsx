'use client';
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

export default function UploadPage() {
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

        <div className={styles.sections}>
          <UploadSection
            title="Actividades por día"
            subtitle="Genera las pestañas: Actividades, Cumplimiento y Horarios"
            endpoint="/api/upload-actividades"
            parser={async (buf, days) => parseActividadesToData(buf, days) as unknown as { month: string; [k: string]: unknown }}
            previewSummary={actSummary}
            showHolidays
          />

          <UploadSection
            title="Tiempo de respuesta"
            subtitle="Genera la pestaña: Tiempo de Respuesta"
            endpoint="/api/upload-respuesta"
            parser={async (buf, days) => parseRespuestaToData(buf, days) as unknown as { month: string; [k: string]: unknown }}
            previewSummary={respSummary}
            showHolidays
          />
        </div>
      </div>
    </>
  );
}
