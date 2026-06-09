'use client';
import { useState, useRef, useCallback } from 'react';
import styles from './UploadSection.module.css';

type Status = 'idle' | 'parsing' | 'confirming' | 'uploading' | 'success' | 'error';

interface Props {
  title: string;
  subtitle: string;
  endpoint: string;
  parser: (buffer: ArrayBuffer, nonWorkingDays?: string[]) => Promise<{ month: string; [k: string]: unknown }>;
  previewSummary: (data: Record<string, unknown>) => string;
  showHolidays?: boolean;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function UploadSection({ title, subtitle, endpoint, parser, previewSummary, showHolidays }: Props) {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [month, setMonth] = useState(
    `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
  );
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [holidayInput, setHolidayInput] = useState('');
  const [vacations, setVacations] = useState<{ start: string; end: string }[]>([]);
  const [vacStart, setVacStart] = useState('');
  const [vacEnd, setVacEnd] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  function fmtDate(iso: string) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  function handleFile(f: File) {
    if (!f.name.endsWith('.xlsx')) {
      setMsg('Solo se aceptan archivos .xlsx');
      setStatus('error');
      return;
    }
    setFile(f);
    setStatus('idle');
    setMsg('');
    setPreview('');
    setParsedData(null);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  async function handleProcesar(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus('parsing');
    setMsg('Procesando Excel...');
    try {
      const buffer = await file.arrayBuffer();
      const data = await parser(buffer, getAllNonWorkingDays()) as Record<string, unknown>;
      // Sobreescribir el mes detectado automáticamente con el seleccionado
      data.month = month;
      setParsedData(data);
      setPreview(previewSummary(data));
      setStatus('confirming');
      setMsg('');
    } catch (err) {
      setStatus('error');
      setMsg(err instanceof Error ? err.message : 'Error al procesar');
    }
  }

  async function handleConfirmar() {
    if (!parsedData) return;
    setStatus('uploading');
    setMsg('Guardando en el repositorio...');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, data: parsedData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error del servidor');
      const label = `${MESES[parseInt(month.split('-')[1]) - 1]} ${month.split('-')[0]}`;
      setStatus('success');
      setMsg(`¡Listo! Datos de ${label} guardados. El sitio actualizará en ~45 segundos.`);
      setFile(null);
      setParsedData(null);
    } catch (err) {
      setStatus('error');
      setMsg(err instanceof Error ? err.message : 'Error al guardar');
    }
  }

  function reset() {
    setStatus('idle');
    setMsg('');
    setFile(null);
    setParsedData(null);
    setPreview('');
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <p className={styles.cardSub}>{subtitle}</p>
      </div>

      <form onSubmit={handleProcesar} className={styles.form}>
        {/* Selector de mes */}
        <div className={styles.field}>
          <label className={styles.label}>Mes</label>
          <div className={styles.monthRow}>
            <select className={styles.select}
              value={month.split('-')[1]}
              onChange={e => setMonth(`${month.split('-')[0]}-${e.target.value}`)}>
              {MESES.map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
              ))}
            </select>
            <select className={styles.select}
              value={month.split('-')[0]}
              onChange={e => setMonth(`${e.target.value}-${month.split('-')[1]}`)}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Drag & Drop */}
        <div className={styles.field}>
          <label className={styles.label}>Archivo Excel (.xlsx)</label>
          <div
            className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${file ? styles.hasFile : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".xlsx" className={styles.hiddenInput}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <div className={styles.fileSelected}>
                <span className={styles.fileIcon}>📄</span>
                <div>
                  <div className={styles.fileName}>{file.name}</div>
                  <div className={styles.fileSize}>{(file.size / 1024).toFixed(0)} KB</div>
                </div>
              </div>
            ) : (
              <div className={styles.dropPlaceholder}>
                <span className={styles.dropIcon}>📁</span>
                <span>Arrastra el archivo aquí o haz clic</span>
                <span className={styles.dropHint}>Solo .xlsx de Zoho</span>
              </div>
            )}
          </div>
        </div>

        {/* Días no laborables — solo para Actividades */}
        {showHolidays && (
          <>
            {/* Sección 1: días festivos / días sueltos */}
            <div className={styles.field}>
              <label className={styles.label}>Días no laborables <span className={styles.labelHint}>(festivos o días sueltos)</span></label>
              <div className={styles.holidayRow}>
                <input type="date" className={styles.dateInput} value={holidayInput}
                  onChange={e => setHolidayInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHoliday())} />
                <button type="button" className={styles.btnAdd} onClick={addHoliday}>+ Agregar</button>
              </div>
              {holidays.length > 0 && (
                <div className={styles.holidayList}>
                  {holidays.map(d => (
                    <span key={d} className={styles.holidayTag}>
                      {fmtDate(d)}
                      <button type="button" onClick={() => setHolidays(prev => prev.filter(x => x !== d))}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sección 2: vacaciones (rango) */}
            <div className={styles.field}>
              <label className={styles.label}>Vacaciones <span className={styles.labelHint}>(rango de días)</span></label>
              <div className={styles.vacRow}>
                <div className={styles.vacGroup}>
                  <span className={styles.vacLabel}>Inicio</span>
                  <input type="date" className={styles.dateInput} value={vacStart}
                    onChange={e => setVacStart(e.target.value)} />
                </div>
                <div className={styles.vacGroup}>
                  <span className={styles.vacLabel}>Fin</span>
                  <input type="date" className={styles.dateInput} value={vacEnd}
                    onChange={e => setVacEnd(e.target.value)} />
                </div>
                <button type="button" className={styles.btnAdd}
                  onClick={addVacation} disabled={!vacStart || !vacEnd || vacStart > vacEnd}>
                  + Agregar
                </button>
              </div>
              {vacations.length > 0 && (
                <div className={styles.holidayList}>
                  {vacations.map((v, i) => (
                    <span key={i} className={styles.holidayTag}>
                      {fmtDate(v.start)} — {fmtDate(v.end)}
                      <button type="button" onClick={() => setVacations(prev => prev.filter((_, j) => j !== i))}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {status !== 'confirming' && status !== 'uploading' && status !== 'success' && (
          <button type="submit" className={styles.btn} disabled={!file || status === 'parsing'}>
            {status === 'parsing' ? 'Procesando...' : 'Procesar Excel'}
          </button>
        )}
      </form>

      {/* Preview y confirmación */}
      {status === 'confirming' && preview && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>Vista previa</div>
          <div className={styles.previewText}>{preview}</div>
          <div className={styles.previewActions}>
            <button className={styles.btnSecondary} onClick={reset}>Cancelar</button>
            <button className={styles.btn} onClick={handleConfirmar}>Confirmar y guardar</button>
          </div>
        </div>
      )}

      {/* Estados */}
      {status === 'uploading' && (
        <div className={styles.statusBox}>
          <div className={styles.spinner} />
          <span>{msg}</span>
        </div>
      )}
      {status === 'success' && (
        <div className={`${styles.statusBox} ${styles.success}`}>
          <span>✅ {msg}</span>
          <button className={styles.btnSecondary} onClick={reset}>Cargar otro</button>
        </div>
      )}
      {status === 'error' && (
        <div className={`${styles.statusBox} ${styles.error}`}>
          <span>❌ {msg}</span>
          <button className={styles.btnSecondary} onClick={reset}>Reintentar</button>
        </div>
      )}
    </div>
  );
}
