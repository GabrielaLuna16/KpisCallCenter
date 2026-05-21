export type Turno = 'Horario laboral' | 'Fuera de horario L-V' | 'Fin de semana';

// ─── ACTIVIDADES: TENDENCIA ───────────────────────────────────────────────────

export interface TendenciaKpis {
  prom_asignadas: number;
  prom_realizadas: number;
  max_realizadas: number;
  max_real_fecha: string;
  limite_recomendado: number;
}

export interface TendenciaDia {
  date: string;
  day: number;
  asignadas: number;
  realizadas: number;
}

export interface TendenciaData {
  kpis: TendenciaKpis;
  data: TendenciaDia[];
}

// ─── ACTIVIDADES: CUMPLIMIENTO ────────────────────────────────────────────────

export interface CumplimientoKpis {
  total: number;
  a_tiempo: number;
  tardio: number;
  no_realizadas: number;
}

export interface CumplimientoDetalle {
  lead: string;
  due_date: string;
  closed_time: string;
}

export interface CumplimientoFila {
  dia: number;
  fecha: string;
  asignadas: number;
  realizadas: number;
}

export interface CumplimientoData {
  kpis: CumplimientoKpis;
  tardio_detail: CumplimientoDetalle[];
  no_real_detail: CumplimientoDetalle[];
  detail_table: CumplimientoFila[];
}

// ─── ACTIVIDADES: HORARIOS ────────────────────────────────────────────────────

export interface HorariosTarea {
  related_to: string;
  subject: string;
  closed_time: string;
}

export interface HorariosKpis {
  prom_horas_activas: number;
  tiempo_prom_entre_cierres: number;
  dia_mas_largo: { horas: number; fecha: string; ultimo_cierre: string };
  dia_mas_corto: { horas: number; fecha: string; ultimo_cierre: string };
}

export interface HorariosFila {
  dia: number;
  fecha: string;
  asignadas: number;
  primera: string;
  ultima: string;
  prom_entre_cierres: number;
  horas_activas: number;
  tasks: HorariosTarea[];
}

export interface HorariosData {
  kpis: HorariosKpis;
  data: HorariosFila[];
}

// ─── ACTIVIDADES JSON MENSUAL ─────────────────────────────────────────────────

export interface ActividadesMonthData {
  month: string;
  tendencia: TendenciaData;
  cumplimiento: CumplimientoData;
  horarios: HorariosData;
}

// ─── TIEMPO DE RESPUESTA: REGISTRO ───────────────────────────────────────────

export interface RespuestaRegistro {
  r: string;
  s: Turno;
  c: string;
  cl: string;
  m: number;
}

export interface TurnoMetrics {
  avg: number;
  median: number;
  count: number;
}

// ─── TIEMPO DE RESPUESTA JSON MENSUAL ────────────────────────────────────────

export interface RespuestaMonthData {
  month: string;
  records: RespuestaRegistro[];
  metrics: Record<Turno, TurnoMetrics>;
  maxMins: number;
}

// ─── ÍNDICE DE MESES ─────────────────────────────────────────────────────────

export interface MonthEntry {
  key: string;
  label: string;
  hasActividades: boolean;
  hasRespuesta: boolean;
}

export interface MonthIndex {
  months: MonthEntry[];
}
