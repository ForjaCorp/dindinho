import { ParamMap, Params } from '@angular/router';
import { PeriodPreset, TimeFilterSelectionDTO } from '@dindinho/shared';
import { parseIsoDayToLocalDate, resolveTimeFilterToTransactionsQuery } from './time-filter.util';

/**
 * Converte a seleção de contas para Params da URL.
 * Garante que accountId legado seja limpo.
 */
export function accountSelectionToParams(ids: string[]): Params {
  return {
    accountIds: ids.length > 0 ? ids : null,
    accountId: null,
  };
}

/**
 * Converte a seleção de filtro de tempo para Params da URL.
 * Retorna todos os campos possíveis com null explícito para limpar valores antigos.
 */
export function timeSelectionToParams(
  selection: TimeFilterSelectionDTO,
  now: Date = new Date(),
): Params {
  const params: Params = {
    invoiceMonth: null,
    month: null, // Limpa parâmetro legado
    periodPreset: null,
    startDay: null,
    endDay: null,
    tzOffsetMinutes: null,
  };

  if (selection.mode === 'INVOICE_MONTH') {
    params['invoiceMonth'] = selection.invoiceMonth;
  } else {
    // DAY_RANGE
    const { preset, tzOffsetMinutes } = selection.period;

    if (preset && preset !== 'CUSTOM') {
      params['periodPreset'] = preset;
      params['tzOffsetMinutes'] = typeof tzOffsetMinutes === 'number' ? tzOffsetMinutes : null;
    } else {
      params['periodPreset'] = 'CUSTOM';

      // Resolve datas para modo CUSTOM (ou fallback)
      const query = resolveTimeFilterToTransactionsQuery(selection, now);
      params['startDay'] = query.startDay ?? null;
      params['endDay'] = query.endDay ?? null;
      params['tzOffsetMinutes'] =
        typeof query.tzOffsetMinutes === 'number' ? query.tzOffsetMinutes : null;
    }
  }

  return params;
}

/**
 * Faz o parsing dos parâmetros de URL para TimeFilterSelectionDTO.
 * Contém a lógica de validação e precedência.
 */
export function paramsToTimeSelection(params: ParamMap): TimeFilterSelectionDTO {
  const invoiceMonth = parseInvoiceMonthParam(params.get('invoiceMonth') ?? params.get('month'));
  const periodPreset = parsePeriodPresetParam(params.get('periodPreset'));
  const startDay = parseIsoDayParam(params.get('startDay'));
  const endDay = parseIsoDayParam(params.get('endDay'));
  const tzOffsetMinutes =
    parseTzOffsetMinutesParam(params.get('tzOffsetMinutes')) ?? new Date().getTimezoneOffset();

  if (invoiceMonth) {
    return { mode: 'INVOICE_MONTH', invoiceMonth };
  }

  if (periodPreset && periodPreset !== 'CUSTOM') {
    return {
      mode: 'DAY_RANGE',
      period: { preset: periodPreset, tzOffsetMinutes },
    };
  }

  if (startDay || endDay || (periodPreset === 'CUSTOM' && startDay && endDay)) {
    return {
      mode: 'DAY_RANGE',
      period: {
        preset: 'CUSTOM',
        startDay: startDay ?? endDay ?? '1970-01-01',
        endDay: endDay ?? startDay ?? '1970-01-01',
        tzOffsetMinutes,
      },
    };
  }

  return {
    mode: 'DAY_RANGE',
    period: { preset: 'THIS_MONTH', tzOffsetMinutes },
  };
}

export function parseInvoiceMonthParam(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}$/.test(normalized)) return null;
  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(5, 7));
  if (!Number.isFinite(year) || year < 1970 || year > 2100) return null;
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseIsoDayParam(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  // Valida formato e validade da data usando utilitário existente
  return parseIsoDayToLocalDate(normalized) ? normalized : null;
}

export function parsePeriodPresetParam(value: string | null): PeriodPreset | null {
  if (!value) return null;
  const normalized = value.trim();
  const allowed: PeriodPreset[] = [
    'TODAY',
    'YESTERDAY',
    'THIS_WEEK',
    'LAST_WEEK',
    'THIS_MONTH',
    'LAST_MONTH',
    'CUSTOM',
  ];
  return (allowed as string[]).includes(normalized) ? (normalized as PeriodPreset) : null;
}

export function parseTzOffsetMinutesParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < -840) return -840;
  if (parsed > 840) return 840;
  return parsed;
}
