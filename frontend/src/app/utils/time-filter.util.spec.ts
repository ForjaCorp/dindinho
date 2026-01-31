import { describe, it, expect } from 'vitest';
import {
  computeDayRangeForPreset,
  formatIsoDayLocal,
  formatIsoMonthLocal,
  normalizeDateRange,
  parseIsoDayToLocalDate,
  parseIsoMonthToLocalDate,
  resolvePeriodSelectionToDayRange,
  resolveTimeFilterToTransactionsQuery,
} from './time-filter.util';

describe('time-filter.util', () => {
  it('deve formatar ISO day no formato YYYY-MM-DD', () => {
    expect(formatIsoDayLocal(new Date(2026, 0, 2))).toBe('2026-01-02');
    expect(formatIsoDayLocal(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('deve parsear ISO day para Date local', () => {
    const parsed = parseIsoDayToLocalDate('2026-01-02');
    expect(parsed).toBeTruthy();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(0);
    expect(parsed?.getDate()).toBe(2);
  });

  it('deve retornar null ao parsear ISO day inválido', () => {
    expect(parseIsoDayToLocalDate('2026-13-01')).toBeNull();
    expect(parseIsoDayToLocalDate('2026-01-32')).toBeNull();
    expect(parseIsoDayToLocalDate('2026-02-31')).toBeNull();
    expect(parseIsoDayToLocalDate('2026-04-31')).toBeNull();
    expect(parseIsoDayToLocalDate('2026-1-01')).toBeNull();
  });

  it('deve formatar ISO month no formato YYYY-MM', () => {
    expect(formatIsoMonthLocal(new Date(2026, 0, 2))).toBe('2026-01');
    expect(formatIsoMonthLocal(new Date(2026, 11, 31))).toBe('2026-12');
  });

  it('deve parsear ISO month para Date local no primeiro dia do mês', () => {
    const parsed = parseIsoMonthToLocalDate('2026-02');
    expect(parsed).toBeTruthy();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(1);
    expect(parsed?.getDate()).toBe(1);
  });

  it('deve retornar null ao parsear ISO month inválido', () => {
    expect(parseIsoMonthToLocalDate('2026-00')).toBeNull();
    expect(parseIsoMonthToLocalDate('2026-13')).toBeNull();
    expect(parseIsoMonthToLocalDate('20-01')).toBeNull();
  });

  it('deve normalizar intervalo invertido', () => {
    const a = new Date(2026, 0, 10);
    const b = new Date(2026, 0, 1);
    const normalized = normalizeDateRange(a, b);
    expect(normalized.start.getDate()).toBe(1);
    expect(normalized.end.getDate()).toBe(10);
  });

  it('deve clamp de horas ao normalizar intervalo', () => {
    const a = new Date(2026, 0, 10, 23, 59, 59);
    const b = new Date(2026, 0, 11, 1, 2, 3);
    const normalized = normalizeDateRange(a, b);
    expect(normalized.start.getHours()).toBe(0);
    expect(normalized.start.getMinutes()).toBe(0);
    expect(normalized.end.getHours()).toBe(0);
    expect(normalized.end.getMinutes()).toBe(0);
  });

  it('deve computar preset TODAY', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0);
    const range = computeDayRangeForPreset('TODAY', now);
    expect(range).toBeTruthy();
    expect(formatIsoDayLocal(range!.start)).toBe('2026-01-15');
    expect(formatIsoDayLocal(range!.end)).toBe('2026-01-15');
  });

  it('deve computar presets de semana e mês corretamente', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0);

    const yesterday = computeDayRangeForPreset('YESTERDAY', now);
    expect(yesterday).toBeTruthy();
    expect(formatIsoDayLocal(yesterday!.start)).toBe('2026-01-14');
    expect(formatIsoDayLocal(yesterday!.end)).toBe('2026-01-14');

    const thisWeek = computeDayRangeForPreset('THIS_WEEK', now);
    expect(thisWeek).toBeTruthy();
    expect(formatIsoDayLocal(thisWeek!.start)).toBe('2026-01-12');
    expect(formatIsoDayLocal(thisWeek!.end)).toBe('2026-01-15');

    const lastWeek = computeDayRangeForPreset('LAST_WEEK', now);
    expect(lastWeek).toBeTruthy();
    expect(formatIsoDayLocal(lastWeek!.start)).toBe('2026-01-05');
    expect(formatIsoDayLocal(lastWeek!.end)).toBe('2026-01-11');

    const thisMonth = computeDayRangeForPreset('THIS_MONTH', now);
    expect(thisMonth).toBeTruthy();
    expect(formatIsoDayLocal(thisMonth!.start)).toBe('2026-01-01');
    expect(formatIsoDayLocal(thisMonth!.end)).toBe('2026-01-15');

    const lastMonth = computeDayRangeForPreset('LAST_MONTH', now);
    expect(lastMonth).toBeTruthy();
    expect(formatIsoDayLocal(lastMonth!.start)).toBe('2025-12-01');
    expect(formatIsoDayLocal(lastMonth!.end)).toBe('2025-12-31');
  });

  it('deve resolver PeriodSelection por preset', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0);
    const resolved = resolvePeriodSelectionToDayRange(
      { preset: 'TODAY', tzOffsetMinutes: 180 },
      now,
    );
    expect(resolved).toBeTruthy();
    expect(resolved?.startDay).toBe('2026-01-15');
    expect(resolved?.endDay).toBe('2026-01-15');
    expect(resolved?.tzOffsetMinutes).toBe(180);
  });

  it('deve assumir tzOffsetMinutes local quando não informado', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0);
    const resolved = resolvePeriodSelectionToDayRange({ preset: 'TODAY' }, now);
    expect(resolved).toBeTruthy();
    expect(resolved?.tzOffsetMinutes).toBe(now.getTimezoneOffset());
  });

  it('deve resolver PeriodSelection custom com normalização', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0);
    const resolved = resolvePeriodSelectionToDayRange(
      {
        preset: 'CUSTOM',
        startDay: '2026-01-10',
        endDay: '2026-01-01',
        tzOffsetMinutes: 0,
      },
      now,
    );

    expect(resolved).toBeTruthy();
    expect(resolved?.startDay).toBe('2026-01-01');
    expect(resolved?.endDay).toBe('2026-01-10');
  });

  it('deve resolver filtro de transações por invoiceMonth', () => {
    const query = resolveTimeFilterToTransactionsQuery({
      mode: 'INVOICE_MONTH',
      invoiceMonth: '2026-01',
    });
    expect(query).toEqual({ invoiceMonth: '2026-01' });
  });

  it('deve resolver filtro de transações por período', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0);
    const query = resolveTimeFilterToTransactionsQuery(
      {
        mode: 'DAY_RANGE',
        period: { preset: 'TODAY', tzOffsetMinutes: 120 },
      },
      now,
    );
    expect(query).toEqual({
      startDay: '2026-01-15',
      endDay: '2026-01-15',
      tzOffsetMinutes: 120,
    });
  });

  it('deve retornar query vazia quando seleção custom estiver incompleta', () => {
    const query = resolveTimeFilterToTransactionsQuery({
      mode: 'DAY_RANGE',
      period: { preset: 'CUSTOM', tzOffsetMinutes: 0 },
    });
    expect(query).toEqual({});
  });
});
