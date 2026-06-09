'use client';
import * as XLSX from 'xlsx';
import type {
  ActividadesMonthData,
  TendenciaData,
  CumplimientoData,
  HorariosData,
  CumplimientoDetalle,
  CumplimientoFila,
  HorariosFila,
  HorariosTarea,
} from '@/types/data';

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30)).getTime();

function excelSerialToDate(serial: number): Date {
  const days = Math.floor(serial);
  const fraction = serial - days;
  return new Date(EXCEL_EPOCH + days * 86400000 + Math.round(fraction * 86400000));
}

function parseDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return excelSerialToDate(raw);
  if (typeof raw === 'string') {
    const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    const [, dd, mm, yyyy] = m;
    const timeM = raw.match(/(\d{2}):(\d{2})/);
    if (timeM) {
      return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +timeM[1], +timeM[2]));
    }
    return new Date(Date.UTC(+yyyy, +mm - 1, +dd));
  }
  return null;
}

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Devuelve el primer día hábil a partir de `date` (inclusive si ya es hábil)
function efectivoDue(date: Date, noLaborables: Set<string>): Date {
  const d = new Date(date);
  while (true) {
    const dow = d.getUTCDay(); // 0=Dom, 6=Sáb
    const key = toDateKey(d);
    if (dow !== 0 && dow !== 6 && !noLaborables.has(key)) return d;
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

function formatDateDisplay(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTimeDisplay(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

function isWeekday(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

function workdaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (isWeekday(cur)) days.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

interface RawRow {
  dueGroup: Date | null;
  asignadas: number;
  closedDate: Date | null;
  closedDateTime: Date | null;
  subject: string;
  relatedTo: string;
  status: string;
}

// ─── PARSER PRINCIPAL ────────────────────────────────────────────────────────

export function parseActividadesToData(buffer: ArrayBuffer, nonWorkingDays: string[] = []): ActividadesMonthData {
  const noLaborables = new Set(nonWorkingDays);
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames.find(n =>
    n.toLowerCase().includes('actividades') || n.toLowerCase().includes('día') || n.toLowerCase().includes('dia')
  ) ?? wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Encontrar fila de encabezados
  const headerIdx = raw.findIndex(r =>
    r.some(c => typeof c === 'string' && c.toLowerCase().includes('due date'))
  );
  if (headerIdx === -1) throw new Error('No se encontró la columna "Due Date" en el archivo Excel.');

  const headers = raw[headerIdx] as string[];
  const iDue = headers.findIndex(h => h?.toLowerCase?.()?.includes('due date'));
  const iClosed = headers.findIndex(h => h?.toLowerCase?.()?.includes('closed time'));
  const iSubject = headers.findIndex(h => h?.toLowerCase?.()?.includes('subject'));
  const iRelated = headers.findIndex(h => h?.toLowerCase?.()?.includes('related'));
  const iStatus = headers.findIndex(h => h?.toLowerCase?.()?.includes('status'));

  const dataRows = raw.slice(headerIdx + 1).filter(r => r.some(c => c !== ''));

  // Forward-fill Due Date y extraer cantidad asignada
  let lastDueDate: Date | null = null;
  let lastAsignadas = 0;
  const rows: RawRow[] = [];

  for (const row of dataRows) {
    const dueRaw = row[iDue];
    if (dueRaw !== '' && dueRaw !== null && dueRaw !== undefined) {
      // Este campo puede ser "DD/MM/YYYY ( N )" (texto) o serial numérico
      if (typeof dueRaw === 'string') {
        const m = dueRaw.match(/(\d{2})\/(\d{2})\/(\d{4})\s*\(\s*(\d+)\s*\)/);
        if (m) {
          const [, dd, mm, yyyy, n] = m;
          lastDueDate = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
          lastAsignadas = parseInt(n);
        } else {
          const d = parseDate(dueRaw);
          if (d) { lastDueDate = d; lastAsignadas = 0; }
        }
      } else if (typeof dueRaw === 'number') {
        lastDueDate = excelSerialToDate(dueRaw);
        // La cantidad asignada viene del patrón de texto – si es número puro,
        // intentamos contar filas con el mismo due date más adelante
        lastAsignadas = 0;
      }
    }

    const closedRaw = row[iClosed];
    const closedDateTime = closedRaw !== '' && closedRaw !== null && closedRaw !== undefined
      ? parseDate(closedRaw)
      : null;
    const closedDate = closedDateTime
      ? new Date(Date.UTC(
          closedDateTime.getUTCFullYear(),
          closedDateTime.getUTCMonth(),
          closedDateTime.getUTCDate()
        ))
      : null;

    rows.push({
      dueGroup: lastDueDate ? new Date(Date.UTC(
        lastDueDate.getUTCFullYear(),
        lastDueDate.getUTCMonth(),
        lastDueDate.getUTCDate()
      )) : null,
      asignadas: lastAsignadas,
      closedDate,
      closedDateTime,
      subject: String(row[iSubject] ?? ''),
      relatedTo: String(row[iRelated] ?? ''),
      status: String(row[iStatus] ?? ''),
    });
  }

  // Si las cantidades asignadas son 0 (porque el due date vino como número),
  // contarlas por agrupación
  const needsCount = rows.every(r => r.asignadas === 0);
  if (needsCount) {
    const countByDue = new Map<string, number>();
    for (const r of rows) {
      if (!r.dueGroup) continue;
      const k = toDateKey(r.dueGroup);
      countByDue.set(k, (countByDue.get(k) ?? 0) + 1);
    }
    for (const r of rows) {
      if (r.dueGroup) r.asignadas = countByDue.get(toDateKey(r.dueGroup)) ?? 0;
    }
  }

  // Determinar rango de fechas (solo días hábiles)
  const dueDates = rows.filter(r => r.dueGroup).map(r => r.dueGroup!);
  if (dueDates.length === 0) throw new Error('El archivo no contiene filas con fechas.');

  const minDate = new Date(Math.min(...dueDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dueDates.map(d => d.getTime())));
  const workdays = workdaysInRange(minDate, maxDate);

  // Detectar mes automáticamente
  const monthKey = `${minDate.getUTCFullYear()}-${String(minDate.getUTCMonth() + 1).padStart(2, '0')}`;

  return {
    month: monthKey,
    tendencia: buildTendencia(rows, workdays, noLaborables),
    cumplimiento: buildCumplimiento(rows, workdays, noLaborables),
    horarios: buildHorarios(rows, workdays),
  };
}

// ─── CLASIFICACIÓN DE TAREA ───────────────────────────────────────────────────

type Clasificacion = 'a_tiempo' | 'tardio' | 'no_realizada';

function clasificar(row: RawRow, noLaborables: Set<string>): Clasificacion {
  if (!row.closedDate) return 'no_realizada';
  if (!row.dueGroup) return 'no_realizada';

  const subject = row.subject;

  // Excepción fija 30/04 → 04/05 para "Actividad Contactar Inmediato"
  const dueIsApr30 = row.dueGroup.getUTCMonth() === 3 && row.dueGroup.getUTCDate() === 30;
  const closedIsMay4 = row.closedDate.getUTCMonth() === 4 && row.closedDate.getUTCDate() === 4;
  if (dueIsApr30 && closedIsMay4 && subject === 'Actividad Contactar Inmediato') return 'a_tiempo';

  // Plazo efectivo: si due date es no laborable, avanzar al primer día hábil
  const plazo = efectivoDue(row.dueGroup, noLaborables);

  if (row.closedDate.getTime() <= plazo.getTime()) return 'a_tiempo';
  if (subject === 'Actividad Contactar Inmediato') return 'a_tiempo';
  return 'tardio';
}

// ─── TENDENCIA ────────────────────────────────────────────────────────────────

function buildTendencia(rows: RawRow[], workdays: Date[], noLaborables: Set<string>): TendenciaData {
  // Asignadas por due date (primer valor encontrado)
  const asignadasByDue = new Map<string, number>();
  for (const r of rows) {
    if (!r.dueGroup) continue;
    const k = toDateKey(r.dueGroup);
    if (!asignadasByDue.has(k)) asignadasByDue.set(k, r.asignadas);
  }

  // Realizadas = cerradas (a_tiempo o tardio), agrupadas por Closed Date
  const realizadasByClose = new Map<string, number>();
  for (const r of rows) {
    const cl = clasificar(r, noLaborables);
    if ((cl === 'a_tiempo' || cl === 'tardio') && r.closedDate) {
      const k = toDateKey(r.closedDate);
      realizadasByClose.set(k, (realizadasByClose.get(k) ?? 0) + 1);
    }
  }

  const data = workdays.map(d => {
    const k = toDateKey(d);
    return {
      date: formatDateDisplay(d),
      day: d.getUTCDate(),
      asignadas: asignadasByDue.get(k) ?? 0,
      realizadas: realizadasByClose.get(k) ?? 0,
    };
  });

  const totalDays = data.length;
  const sumAsig = data.reduce((s, d) => s + d.asignadas, 0);
  const sumReal = data.reduce((s, d) => s + d.realizadas, 0);
  const maxReal = Math.max(...data.map(d => d.realizadas));
  const maxDay = data.find(d => d.realizadas === maxReal);

  // Convertir fecha DD/MM/YYYY → YYYY-MM-DD para max_real_fecha
  let maxRealFecha = '';
  if (maxDay) {
    const m = maxDay.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) maxRealFecha = `${m[3]}-${m[2]}-${m[1]}`;
  }

  return {
    kpis: {
      prom_asignadas: totalDays > 0 ? Math.round(sumAsig / totalDays) : 0,
      prom_realizadas: totalDays > 0 ? Math.round(sumReal / totalDays) : 0,
      max_realizadas: maxReal,
      max_real_fecha: maxRealFecha,
      limite_recomendado: totalDays > 0 ? Math.round(sumAsig / totalDays) : 0,
    },
    data,
  };
}

// ─── CUMPLIMIENTO ─────────────────────────────────────────────────────────────

function buildCumplimiento(rows: RawRow[], workdays: Date[], noLaborables: Set<string>): CumplimientoData {
  let total = 0, aTiempo = 0, tardio = 0, noReal = 0;
  const tardioDetail: CumplimientoDetalle[] = [];
  const noRealDetail: CumplimientoDetalle[] = [];

  for (const r of rows) {
    if (!r.dueGroup) continue;
    total++;
    const cl = clasificar(r, noLaborables);
    const dueStr = formatDateDisplay(r.dueGroup);
    const closedStr = r.closedDateTime ? formatDateDisplay(r.closedDateTime) + ' ' + formatTimeDisplay(r.closedDateTime) : '';

    if (cl === 'a_tiempo') {
      aTiempo++;
    } else if (cl === 'tardio') {
      tardio++;
      tardioDetail.push({ lead: r.relatedTo, due_date: dueStr, closed_time: closedStr });
    } else {
      noReal++;
      noRealDetail.push({ lead: r.relatedTo, due_date: dueStr, closed_time: '' });
    }
  }

  // Tabla diaria: asignadas por due date, realizadas por closed date
  const asignadasByDue = new Map<string, number>();
  for (const r of rows) {
    if (!r.dueGroup) continue;
    const k = toDateKey(r.dueGroup);
    if (!asignadasByDue.has(k)) asignadasByDue.set(k, r.asignadas);
  }

  const realizadasByClose = new Map<string, number>();
  for (const r of rows) {
    const cl = clasificar(r, noLaborables);
    if ((cl === 'a_tiempo' || cl === 'tardio') && r.closedDate) {
      const k = toDateKey(r.closedDate);
      realizadasByClose.set(k, (realizadasByClose.get(k) ?? 0) + 1);
    }
  }

  const detailTable: CumplimientoFila[] = workdays.map(d => ({
    dia: d.getUTCDate(),
    fecha: formatDateDisplay(d),
    asignadas: asignadasByDue.get(toDateKey(d)) ?? 0,
    realizadas: realizadasByClose.get(toDateKey(d)) ?? 0,
  }));

  return {
    kpis: { total, a_tiempo: aTiempo, tardio, no_realizadas: noReal },
    tardio_detail: tardioDetail,
    no_real_detail: noRealDetail,
    detail_table: detailTable,
  };
}

// ─── HORARIOS ─────────────────────────────────────────────────────────────────

function buildHorarios(rows: RawRow[], workdays: Date[]): HorariosData {
  // Agrupar tareas cerradas por fecha de cierre
  const tasksByDay = new Map<string, { dt: Date; r: RawRow }[]>();
  for (const r of rows) {
    if (!r.closedDateTime) continue;
    const k = toDateKey(r.closedDate!);
    if (!tasksByDay.has(k)) tasksByDay.set(k, []);
    tasksByDay.get(k)!.push({ dt: r.closedDateTime, r });
  }

  const asignadasByDue = new Map<string, number>();
  for (const r of rows) {
    if (!r.dueGroup) continue;
    const k = toDateKey(r.dueGroup);
    if (!asignadasByDue.has(k)) asignadasByDue.set(k, r.asignadas);
  }

  const data: HorariosFila[] = [];
  const horasActivasList: number[] = [];
  const tiemposEntreCierres: number[] = [];

  for (const d of workdays) {
    const k = toDateKey(d);
    const dayTasks = (tasksByDay.get(k) ?? []).sort((a, b) => a.dt.getTime() - b.dt.getTime());

    if (dayTasks.length === 0) {
      data.push({
        dia: d.getUTCDate(), fecha: formatDateDisplay(d),
        asignadas: asignadasByDue.get(k) ?? 0,
        primera: '', ultima: '', prom_entre_cierres: 0, horas_activas: 0, tasks: [],
      });
      continue;
    }

    const firstDt = dayTasks[0].dt;
    const lastDt = dayTasks[dayTasks.length - 1].dt;
    const horasActivas = (lastDt.getTime() - firstDt.getTime()) / 3600000;

    // Intervalos entre cierres consecutivos
    const intervals: number[] = [];
    for (let i = 1; i < dayTasks.length; i++) {
      const diffMin = (dayTasks[i].dt.getTime() - dayTasks[i - 1].dt.getTime()) / 60000;
      intervals.push(diffMin);
    }
    const promEntreCierres = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : 0;

    horasActivasList.push(horasActivas);
    tiemposEntreCierres.push(...intervals);

    const tasks: HorariosTarea[] = dayTasks.map(({ dt, r }) => ({
      related_to: r.relatedTo,
      subject: r.subject,
      closed_time: formatTimeDisplay(dt),
    }));

    data.push({
      dia: d.getUTCDate(),
      fecha: formatDateDisplay(d),
      asignadas: asignadasByDue.get(k) ?? 0,
      primera: formatTimeDisplay(firstDt),
      ultima: formatTimeDisplay(lastDt),
      prom_entre_cierres: promEntreCierres,
      horas_activas: Math.round(horasActivas * 100) / 100,
      tasks,
    });
  }

  // KPIs globales
  const promHorasActivas = horasActivasList.length > 0
    ? Math.round((horasActivasList.reduce((a, b) => a + b, 0) / horasActivasList.length) * 100) / 100
    : 0;
  const promEntreCierresGlobal = tiemposEntreCierres.length > 0
    ? Math.round(tiemposEntreCierres.reduce((a, b) => a + b, 0) / tiemposEntreCierres.length)
    : 0;

  const daysWithTasks = data.filter(d => d.horas_activas > 0);
  const masLargo = daysWithTasks.length > 0
    ? daysWithTasks.reduce((max, d) => d.horas_activas > max.horas_activas ? d : max)
    : null;
  const masCorto = daysWithTasks.length > 0
    ? daysWithTasks.reduce((min, d) => d.horas_activas < min.horas_activas ? d : min)
    : null;

  return {
    kpis: {
      prom_horas_activas: promHorasActivas,
      tiempo_prom_entre_cierres: promEntreCierresGlobal,
      dia_mas_largo: masLargo
        ? { horas: masLargo.horas_activas, fecha: masLargo.fecha, ultimo_cierre: masLargo.ultima }
        : { horas: 0, fecha: '', ultimo_cierre: '' },
      dia_mas_corto: masCorto
        ? { horas: masCorto.horas_activas, fecha: masCorto.fecha, ultimo_cierre: masCorto.ultima }
        : { horas: 0, fecha: '', ultimo_cierre: '' },
    },
    data,
  };
}

// ─── EXPORT AUXILIAR ─────────────────────────────────────────────────────────

export { median };
