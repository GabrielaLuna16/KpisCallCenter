'use client';
import * as XLSX from 'xlsx';
import type { RespuestaMonthData, RespuestaRegistro, Turno, TurnoMetrics } from '@/types/data';

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30)).getTime();

// Horario laboral: L-V de 09:40 a 17:00
const START_H = 9, START_M = 40;
const END_H = 17, END_M = 0;
const START_MINS = START_H * 60 + START_M; // 580
const END_MINS = END_H * 60 + END_M;       // 1020
const WORK_MINS_PER_DAY = END_MINS - START_MINS; // 440

function excelSerialToDate(serial: number): Date {
  const days = Math.floor(serial);
  const fraction = serial - days;
  return new Date(EXCEL_EPOCH + days * 86400000 + Math.round(fraction * 86400000));
}

function parseDateTime(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return excelSerialToDate(raw);
  if (typeof raw === 'string') {
    const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]));
    const d = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (d) return new Date(Date.UTC(+d[3], +d[2] - 1, +d[1]));
  }
  return null;
}

function formatDisplay(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function isNonWorking(d: Date, noLab: Set<string>): boolean {
  return isWeekend(d) || noLab.has(dateKey(d));
}

function nextWorkday(d: Date, noLab: Set<string>): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + 1);
  while (isNonWorking(next, noLab)) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function prevWorkday(d: Date, noLab: Set<string>): Date {
  const prev = new Date(d);
  prev.setUTCDate(prev.getUTCDate() - 1);
  while (isNonWorking(prev, noLab)) prev.setUTCDate(prev.getUTCDate() - 1);
  return prev;
}

function atStartOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), START_H, START_M, 0));
}

function atEndOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), END_H, END_M, 0));
}

function minutesOfDay(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// Ajusta el punto de inicio hacia adelante al próximo minuto hábil
function adjustStart(created: Date, noLab: Set<string>): Date {
  let c = new Date(created);
  // Día no laborable → siguiente día hábil 09:40
  if (isNonWorking(c, noLab)) {
    c = atStartOfDay(nextWorkday(c, noLab));
    return c;
  }
  // Día hábil después de 17:00 → siguiente día hábil 09:40
  if (minutesOfDay(c) >= END_MINS) {
    c = atStartOfDay(nextWorkday(c, noLab));
    return c;
  }
  // Día hábil antes de 09:40 → mismo día 09:40
  if (minutesOfDay(c) < START_MINS) {
    c = atStartOfDay(c);
  }
  return c;
}

// Ajusta el punto de cierre hacia atrás al último minuto hábil
function adjustEnd(closed: Date, noLab: Set<string>): Date {
  let e = new Date(closed);
  // Día no laborable → día hábil anterior 17:00
  if (isNonWorking(e, noLab)) {
    e = atEndOfDay(prevWorkday(e, noLab));
    return e;
  }
  // Antes de 09:40 → día hábil anterior 17:00
  if (minutesOfDay(e) < START_MINS) {
    e = atEndOfDay(prevWorkday(e, noLab));
    return e;
  }
  // Después de 17:00 → truncar a 17:00 del mismo día
  if (minutesOfDay(e) >= END_MINS) {
    e = atEndOfDay(e);
  }
  return e;
}

// Calcula minutos laborales entre c (inicio ajustado) y e (cierre ajustado)
function businessMinutes(created: Date, closed: Date, noLab: Set<string>): number {
  const c = adjustStart(created, noLab);
  const e = adjustEnd(closed, noLab);

  if (e <= c) return 0;

  let total = 0;
  let cur = new Date(c);

  while (true) {
    const curDay = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate()));
    const eDay = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));

    if (!isNonWorking(curDay, noLab)) {
      const dayStart = atStartOfDay(curDay);
      const dayEnd = atEndOfDay(curDay);
      const from = cur > dayStart ? cur : dayStart;

      if (curDay.getTime() < eDay.getTime()) {
        // Día completo hasta el fin de la jornada
        if (from < dayEnd) {
          total += (dayEnd.getTime() - from.getTime()) / 60000;
        }
      } else {
        // Último día: hasta e
        const to = e < dayEnd ? e : dayEnd;
        if (from < to) {
          total += (to.getTime() - from.getTime()) / 60000;
        }
        break;
      }
    }

    // Avanzar al siguiente día hábil 09:40
    const next = nextWorkday(curDay, noLab);
    cur = atStartOfDay(next);
    if (cur >= e) break;
  }

  return Math.max(0, Math.round(total));
}

// ─── CLASIFICACIÓN DE TURNO ───────────────────────────────────────────────────

export function clasificarTurno(created: Date): Turno {
  const day = created.getUTCDay();
  if (day === 0 || day === 6) return 'Fin de semana';
  const mins = minutesOfDay(created);
  if (mins >= START_MINS && mins < END_MINS) return 'Horario laboral';
  return 'Fuera de horario L-V';
}

// ─── PARSER PRINCIPAL ─────────────────────────────────────────────────────────

export function parseRespuestaToData(buffer: ArrayBuffer, nonWorkingDays: string[] = []): RespuestaMonthData {
  const noLab = new Set(nonWorkingDays);
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames.find(n =>
    n.toLowerCase().includes('respuesta') || n.toLowerCase().includes('tiempo')
  ) ?? wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Encontrar fila de encabezados
  const headerIdx = raw.findIndex(r =>
    r.some(c => typeof c === 'string' && c.toLowerCase().includes('created'))
  );
  if (headerIdx === -1) throw new Error('No se encontró la columna "Created Time" en el archivo.');

  const headers = raw[headerIdx] as string[];
  const iCreated = headers.findIndex(h => h?.toLowerCase?.()?.includes('created'));
  const iClosed = headers.findIndex(h => h?.toLowerCase?.()?.includes('closed'));
  const iRelated = headers.findIndex(h => h?.toLowerCase?.()?.includes('related'));

  const dataRows = raw.slice(headerIdx + 1).filter(r => r.some(c => c !== ''));

  const records: RespuestaRegistro[] = [];
  const byTurno: Record<string, number[]> = {
    'Horario laboral': [],
    'Fuera de horario L-V': [],
    'Fin de semana': [],
  };

  for (const row of dataRows) {
    const createdRaw = row[iCreated];
    if (createdRaw === '' || createdRaw === null || createdRaw === undefined) continue;

    const createdDate = parseDateTime(createdRaw);
    if (!createdDate) continue;

    const closedRaw = row[iClosed];
    const closedDate = (closedRaw !== '' && closedRaw !== null && closedRaw !== undefined)
      ? parseDateTime(closedRaw)
      : null;

    const turno = clasificarTurno(createdDate);
    const mins = closedDate ? businessMinutes(createdDate, closedDate, noLab) : 0;

    records.push({
      r: String(row[iRelated] ?? ''),
      s: turno,
      c: formatDisplay(createdDate),
      cl: closedDate ? formatDisplay(closedDate) : '',
      m: mins,
    });

    if (closedDate) byTurno[turno].push(mins);
  }

  // Métricas por turno
  const turnos: Turno[] = ['Horario laboral', 'Fuera de horario L-V', 'Fin de semana'];
  const metrics = {} as Record<Turno, TurnoMetrics>;
  for (const t of turnos) {
    const arr = byTurno[t];
    if (arr.length === 0) {
      metrics[t] = { avg: 0, median: 0, count: 0 };
    } else {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const med = sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
      metrics[t] = {
        avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        median: Math.round(med),
        count: arr.length,
      };
    }
  }

  // Detectar mes desde los registros
  let monthKey = '';
  if (records.length > 0) {
    const m = records[0].c.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) monthKey = `${m[3]}-${m[2]}`;
  }

  const allMins = records.filter(r => r.m > 0).map(r => r.m);
  const maxMins = allMins.length > 0 ? Math.max(...allMins) : 0;

  return { month: monthKey, records, metrics, maxMins };
}

// Formatea minutos para display
export function fmtTime(m: number): string {
  if (m === 0) return '0 min';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mn = m % 60;
  if (mn === 0) return `${h}h`;
  return `${h}h ${mn}m`;
}

export { WORK_MINS_PER_DAY };
