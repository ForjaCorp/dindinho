import { Params } from '@angular/router';
import { TimeFilterSelectionDTO } from '@dindinho/shared';
import { resolveTimeFilterToTransactionsQuery } from './time-filter.util';

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
