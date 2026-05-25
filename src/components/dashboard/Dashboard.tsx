'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAvailableMonths } from '@/hooks/useAvailableMonths';
import { useActividadesData, useRespuestaData } from '@/hooks/useDashboardData';
import TendenciaPanel from './TendenciaPanel';
import CumplimientoPanel from './CumplimientoPanel';
import HorariosPanel from './HorariosPanel';
import TiempoRespuestaPanel from './TiempoRespuestaPanel';
import InsightsPanel from './InsightsPanel';
import styles from './Dashboard.module.css';

type Tab = 'tendencia' | 'cumplimiento' | 'horarios' | 'respuesta' | 'insights';

const TABS: { id: Tab; label: string; needsAct: boolean; needsResp: boolean }[] = [
  { id: 'respuesta',    label: 'Tiempo de Respuesta', needsAct: false, needsResp: true  },
  { id: 'tendencia',    label: 'Actividades',         needsAct: true,  needsResp: false },
  { id: 'cumplimiento', label: 'Cumplimiento',        needsAct: true,  needsResp: false },
  { id: 'horarios',     label: 'Horarios',            needsAct: true,  needsResp: false },
  { id: 'insights',     label: 'Insights',            needsAct: false, needsResp: false },
];

export default function Dashboard() {
  const { months, loading: loadingIndex } = useAvailableMonths();
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('respuesta');
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  // Seleccionar el mes más reciente automáticamente
  useEffect(() => {
    if (months.length > 0 && !activeMonth) {
      setActiveMonth(months[0].key);
    }
  }, [months, activeMonth]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentEntry = months.find(m => m.key === activeMonth);

  const { data: actData, loading: loadingAct } = useActividadesData(
    currentEntry?.hasActividades ? activeMonth : null
  );
  const { data: respData, loading: loadingResp } = useRespuestaData(
    currentEntry?.hasRespuesta ? activeMonth : null
  );

  // Datos para Insights: siempre los 2 meses más recientes
  const ins0 = months.length > 0 ? months[0] : null;
  const ins1 = months.length > 1 ? months[1] : null;
  const { data: insAct0,  loading: loadInsAct0  } = useActividadesData(ins0?.hasActividades ? ins0.key : null);
  const { data: insResp0, loading: loadInsResp0 } = useRespuestaData(ins0?.hasRespuesta   ? ins0.key : null);
  const { data: insAct1,  loading: loadInsAct1  } = useActividadesData(ins1?.hasActividades ? ins1.key : null);
  const { data: insResp1, loading: loadInsResp1 } = useRespuestaData(ins1?.hasRespuesta   ? ins1.key : null);

  const currentLabel = currentEntry?.label ?? '';

  function selectMonth(key: string) {
    setActiveMonth(key);
    setDdOpen(false);
  }

  if (loadingIndex) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ color: 'rgba(255,255,255,.5)' }}>Cargando...</span>
      </div>
    );
  }

  if (months.length === 0) {
    return (
      <>
        <div className={styles.topBar}>
          <div className={styles.brand}>
            <span className={styles.brandText}>ATISA</span>
          </div>
          <Link href="/upload" className={styles.emptyLink}>Cargar datos</Link>
        </div>
        <div className={styles.emptyState}>
          <span className={styles.emptyTitle}>No hay datos cargados</span>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '.9rem' }}>Sube el primer Excel mensual para empezar.</p>
          <Link href="/upload" className={styles.emptyLink}>Ir a cargar datos →</Link>
        </div>
      </>
    );
  }

  const tabDisabled = (t: typeof TABS[0]) => {
    if (t.id === 'insights') return months.length < 2;
    return (t.needsAct && !currentEntry?.hasActividades) ||
           (t.needsResp && !currentEntry?.hasRespuesta);
  };

  return (
    <>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.brandText}>ATISA</span>
        </div>

        <div className={styles.rightControls}>
          <div ref={ddRef} className={`${styles.dropdown} ${ddOpen ? styles.dropdownOpen : ''}`}>
          <div className={styles.dropBtn} onClick={() => setDdOpen(v => !v)}>
            <span className={styles.ddLabel}>Mes</span>
            <span>{currentLabel}</span>
            <span className={styles.ddCaret}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4L6 8L10 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
          {ddOpen && (
            <div className={styles.dropMenu}>
              {months.map(m => (
                <div
                  key={m.key}
                  className={`${styles.ddItem} ${m.key === activeMonth ? styles.ddItemActive : ''}`}
                  onClick={() => selectMonth(m.key)}
                >
                  <span className={styles.ddDot} />
                  {m.label}
                </div>
              ))}
            </div>
          )}
          </div>
          <Link href="/upload" className={styles.uploadBtn}>+ Cargar mes</Link>
        </div>
      </div>

      {/* Outer tabs */}
      <div className={styles.outerNav}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.outerTab} ${tab === t.id ? styles.outerTabActive : ''}`}
            onClick={() => !tabDisabled(t) && setTab(t.id)}
            style={tabDisabled(t) ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
            title={tabDisabled(t) ? 'Sin datos para este mes' : undefined}
          >
            {t.label}
            {tabDisabled(t) && <span className={styles.noDataBadge} style={{ marginLeft: 6 }}>–</span>}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className={styles.panelWrap}>
        {tab === 'tendencia' && (
          loadingAct ? <LoadingPanel /> :
          actData ? <TendenciaPanel data={actData.tendencia} label={currentLabel} /> :
          <UnavailablePanel />
        )}
        {tab === 'cumplimiento' && (
          loadingAct ? <LoadingPanel /> :
          actData ? <CumplimientoPanel data={actData.cumplimiento} label={currentLabel} /> :
          <UnavailablePanel />
        )}
        {tab === 'horarios' && (
          loadingAct ? <LoadingPanel /> :
          actData ? <HorariosPanel data={actData.horarios} label={currentLabel} /> :
          <UnavailablePanel />
        )}
        {tab === 'respuesta' && (
          loadingResp ? <LoadingPanel /> :
          respData ? <TiempoRespuestaPanel data={respData} label={currentLabel} /> :
          <UnavailablePanel />
        )}
        {tab === 'insights' && (
          months.length < 2 ? <UnavailablePanel /> :
          (loadInsAct0 || loadInsResp0 || loadInsAct1 || loadInsResp1) ? <LoadingPanel /> :
          <InsightsPanel
            prevLabel={ins1?.label ?? ''}
            currLabel={ins0?.label ?? ''}
            prevAct={insAct1}
            currAct={insAct0}
            prevResp={insResp1}
            currResp={insResp0}
          />
        )}
      </div>
    </>
  );
}

function LoadingPanel() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, background: '#f5f5f5' }}>
      <span style={{ color: '#767676' }}>Cargando datos...</span>
    </div>
  );
}

function UnavailablePanel() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, background: '#f5f5f5' }}>
      <span style={{ color: '#767676' }}>No hay datos disponibles para este mes.</span>
    </div>
  );
}
