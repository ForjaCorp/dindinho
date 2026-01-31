import { PeriodPreset, PeriodSelectionDTO, TimeFilterSelectionDTO } from '@dindinho/shared';

/**
 * Utilitários para resolver presets e normalizar filtros de tempo.
 */

/**
 * Converte uma data local para ISO day (YYYY-MM-DD).
 */
export const formatIsoDayLocal = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converte um ISO day (YYYY-MM-DD) em Date local.
 */
export const parseIsoDayToLocalDate = (value: string): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day);
  if (!Number.isFinite(d.getTime())) return null;
  if (d.getFullYear() !== year) return null;
  if (d.getMonth() !== month - 1) return null;
  if (d.getDate() !== day) return null;
  return d;
};

/**
 * Converte uma Date local em ISO month (YYYY-MM).
 */
export const formatIsoMonthLocal = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Converte um ISO month (YYYY-MM) em Date local no primeiro dia do mês.
 */
export const parseIsoMonthToLocalDate = (value: string): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (year < 1970 || year > 2100 || month < 1 || month > 12) return null;

  const d = new Date(year, month - 1, 1);
  return Number.isFinite(d.getTime()) ? d : null;
};

const clampToLocalDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const addDaysLocal = (value: Date, days: number): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);

const getIsoWeekStartLocal = (value: Date): Date => {
  const day = value.getDay();
  const diffToMonday = (day + 6) % 7;
  return addDaysLocal(clampToLocalDay(value), -diffToMonday);
};

const getMonthStartLocal = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), 1);

const getMonthEndLocal = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth() + 1, 0);

export const computeDayRangeForPreset = (
  preset: PeriodPreset,
  now: Date = new Date(),
): { start: Date; end: Date } | null => {
  const today = clampToLocalDay(now);

  if (preset === 'TODAY') {
    return { start: today, end: today };
  }

  if (preset === 'YESTERDAY') {
    const y = addDaysLocal(today, -1);
    return { start: y, end: y };
  }

  if (preset === 'THIS_WEEK') {
    return { start: getIsoWeekStartLocal(today), end: today };
  }

  if (preset === 'LAST_WEEK') {
    const thisWeekStart = getIsoWeekStartLocal(today);
    const lastWeekStart = addDaysLocal(thisWeekStart, -7);
    const lastWeekEnd = addDaysLocal(thisWeekStart, -1);
    return { start: lastWeekStart, end: lastWeekEnd };
  }

  if (preset === 'THIS_MONTH') {
    return { start: getMonthStartLocal(today), end: today };
  }

  if (preset === 'LAST_MONTH') {
    const thisMonthStart = getMonthStartLocal(today);
    const lastMonthEnd = addDaysLocal(thisMonthStart, -1);
    const lastMonthStart = getMonthStartLocal(lastMonthEnd);
    return { start: lastMonthStart, end: getMonthEndLocal(lastMonthEnd) };
  }

  return null;
};

export const normalizeDateRange = (start: Date, end: Date): { start: Date; end: Date } => {
  const a = clampToLocalDay(start);
  const b = clampToLocalDay(end);
  return a.getTime() <= b.getTime() ? { start: a, end: b } : { start: b, end: a };
};

/**
 * Resolve um PeriodSelection em intervalo de dias efetivo.
 */
export const resolvePeriodSelectionToDayRange = (
  period: PeriodSelectionDTO,
  now: Date = new Date(),
): { start: Date; end: Date; tzOffsetMinutes: number; startDay: string; endDay: string } | null => {
  const tzOffsetMinutes =
    typeof period.tzOffsetMinutes === 'number' && Number.isFinite(period.tzOffsetMinutes)
      ? period.tzOffsetMinutes
      : now.getTimezoneOffset();

  const preset = typeof period.preset === 'string' ? period.preset : null;
  if (preset && preset !== 'CUSTOM') {
    const range = computeDayRangeForPreset(preset, now);
    if (!range) return null;
    return {
      ...range,
      tzOffsetMinutes,
      startDay: formatIsoDayLocal(range.start),
      endDay: formatIsoDayLocal(range.end),
    };
  }

  if (typeof period.startDay !== 'string' || typeof period.endDay !== 'string') return null;

  const start = parseIsoDayToLocalDate(period.startDay);
  const end = parseIsoDayToLocalDate(period.endDay);
  if (!start || !end) return null;

  const normalized = normalizeDateRange(start, end);
  return {
    ...normalized,
    tzOffsetMinutes,
    startDay: formatIsoDayLocal(normalized.start),
    endDay: formatIsoDayLocal(normalized.end),
  };
};

export const resolveTimeFilterToTransactionsQuery = (
  selection: TimeFilterSelectionDTO,
  now: Date = new Date(),
): { startDay?: string; endDay?: string; tzOffsetMinutes?: number; invoiceMonth?: string } => {
  if (selection.mode === 'INVOICE_MONTH') {
    return { invoiceMonth: selection.invoiceMonth };
  }

  const resolved = resolvePeriodSelectionToDayRange(selection.period, now);
  if (!resolved) return {};

  return {
    startDay: resolved.startDay,
    endDay: resolved.endDay,
    tzOffsetMinutes: resolved.tzOffsetMinutes,
  };
};
