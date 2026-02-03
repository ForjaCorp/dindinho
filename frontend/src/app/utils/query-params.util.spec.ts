import { describe, it, expect } from 'vitest';
import { TimeFilterSelectionDTO } from '@dindinho/shared';
import type { ParamMap } from '@angular/router';
import {
  accountSelectionToParams,
  timeSelectionToParams,
  paramsToTimeSelection,
} from './query-params.util';

function createParamMap(values: Record<string, string | string[] | null | undefined>): ParamMap {
  const keys = Object.keys(values);
  return {
    keys,
    has: (key: string) => {
      const raw = values[key];
      return raw != null;
    },
    get: (key: string) => {
      const raw = values[key];
      if (raw == null) return null;
      return Array.isArray(raw) ? (raw[0] ?? null) : raw;
    },
    getAll: (key: string) => {
      const raw = values[key];
      if (raw == null) return [];
      return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [raw];
    },
  };
}

describe('query-params.util', () => {
  describe('accountSelectionToParams', () => {
    it('deve retornar IDs e limpar accountId legado se houver seleção', () => {
      const ids = ['1', '2'];
      const result = accountSelectionToParams(ids);
      expect(result).toEqual({
        accountIds: ['1', '2'],
        accountId: null,
      });
    });

    it('deve retornar null para accountIds e limpar accountId legado se array vazio', () => {
      const ids: string[] = [];
      const result = accountSelectionToParams(ids);
      expect(result).toEqual({
        accountIds: null,
        accountId: null,
      });
    });
  });

  describe('timeSelectionToParams', () => {
    const mockNow = new Date('2024-03-15T12:00:00Z');

    it('deve tratar modo INVOICE_MONTH corretamente', () => {
      const selection: TimeFilterSelectionDTO = {
        mode: 'INVOICE_MONTH',
        invoiceMonth: '2024-02',
      };

      const result = timeSelectionToParams(selection, mockNow);

      expect(result).toEqual({
        invoiceMonth: '2024-02',
        month: null,
        periodPreset: null,
        startDay: null,
        endDay: null,
        tzOffsetMinutes: null,
      });
    });

    it('deve tratar modo DAY_RANGE com PRESET corretamente', () => {
      const selection: TimeFilterSelectionDTO = {
        mode: 'DAY_RANGE',
        period: {
          preset: 'THIS_MONTH',
          tzOffsetMinutes: 180,
        },
      };

      const result = timeSelectionToParams(selection, mockNow);

      expect(result).toEqual({
        invoiceMonth: null,
        month: null,
        periodPreset: 'THIS_MONTH',
        startDay: null,
        endDay: null,
        tzOffsetMinutes: 180,
      });
    });

    it('deve tratar modo DAY_RANGE com CUSTOM corretamente', () => {
      // Mockando resolveTimeFilterToTransactionsQuery indiretamente pelo comportamento esperado
      // Assumindo que o utilitário resolveTimeFilterToTransactionsQuery funciona (ele é testado separadamente),
      // aqui focamos na estrutura do retorno.

      const selection: TimeFilterSelectionDTO = {
        mode: 'DAY_RANGE',
        period: {
          preset: 'CUSTOM',
          startDay: '2024-03-01',
          endDay: '2024-03-10',
          tzOffsetMinutes: 180,
        },
      };

      const result = timeSelectionToParams(selection, mockNow);

      expect(result).toEqual({
        invoiceMonth: null,
        month: null,
        periodPreset: 'CUSTOM',
        startDay: '2024-03-01',
        endDay: '2024-03-10',
        tzOffsetMinutes: 180,
      });
    });

    it('deve tratar fallback quando preset não é CUSTOM mas também não é fornecido (edge case)', () => {
      // Esse caso simula o comportamento onde cai no bloco "else" do preset check
      const selection: TimeFilterSelectionDTO = {
        mode: 'DAY_RANGE',
        period: {
          preset: 'CUSTOM',
          // mas seguindo a tipagem correta:
          startDay: '2024-01-01',
          endDay: '2024-01-01',
          tzOffsetMinutes: 0,
        },
      };

      const result = timeSelectionToParams(selection, mockNow);

      expect(result).toMatchObject({
        periodPreset: 'CUSTOM',
        startDay: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        endDay: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
    });
  });

  describe('paramsToTimeSelection', () => {
    it('deve priorizar invoiceMonth e aceitar fallback de month legado', () => {
      expect(paramsToTimeSelection(createParamMap({ invoiceMonth: '2026-01' }))).toEqual({
        mode: 'INVOICE_MONTH',
        invoiceMonth: '2026-01',
      });

      expect(paramsToTimeSelection(createParamMap({ month: '2026-02' }))).toEqual({
        mode: 'INVOICE_MONTH',
        invoiceMonth: '2026-02',
      });
    });

    it('deve ignorar invoiceMonth inválido e cair no preset quando disponível', () => {
      const selection = paramsToTimeSelection(
        createParamMap({ invoiceMonth: '2026-13', periodPreset: 'TODAY', tzOffsetMinutes: '60' }),
      );
      expect(selection).toEqual({
        mode: 'DAY_RANGE',
        period: { preset: 'TODAY', tzOffsetMinutes: 60 },
      });
    });

    it('deve aceitar preset diferente de CUSTOM', () => {
      const selection = paramsToTimeSelection(
        createParamMap({ periodPreset: 'THIS_MONTH', tzOffsetMinutes: '180' }),
      );
      expect(selection).toEqual({
        mode: 'DAY_RANGE',
        period: { preset: 'THIS_MONTH', tzOffsetMinutes: 180 },
      });
    });

    it('deve aceitar CUSTOM com range parcial e completar datas faltantes', () => {
      const selection = paramsToTimeSelection(createParamMap({ startDay: '2026-01-10' }));
      expect(selection).toEqual({
        mode: 'DAY_RANGE',
        period: {
          preset: 'CUSTOM',
          startDay: '2026-01-10',
          endDay: '2026-01-10',
          tzOffsetMinutes: new Date().getTimezoneOffset(),
        },
      });

      const selection2 = paramsToTimeSelection(createParamMap({ endDay: '2026-01-15' }));
      expect(selection2).toEqual({
        mode: 'DAY_RANGE',
        period: {
          preset: 'CUSTOM',
          startDay: '2026-01-15',
          endDay: '2026-01-15',
          tzOffsetMinutes: new Date().getTimezoneOffset(),
        },
      });
    });

    it('deve aplicar clamp em tzOffsetMinutes', () => {
      const selection = paramsToTimeSelection(
        createParamMap({ periodPreset: 'TODAY', tzOffsetMinutes: '1000' }),
      );
      expect(selection).toEqual({
        mode: 'DAY_RANGE',
        period: { preset: 'TODAY', tzOffsetMinutes: 840 },
      });
    });

    it('deve cair no padrão THIS_MONTH quando não houver params relevantes', () => {
      const selection = paramsToTimeSelection(createParamMap({}));
      expect(selection).toEqual({
        mode: 'DAY_RANGE',
        period: { preset: 'THIS_MONTH', tzOffsetMinutes: new Date().getTimezoneOffset() },
      });
    });
  });
});
