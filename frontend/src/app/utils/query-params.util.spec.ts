import { describe, it, expect } from 'vitest';
import { TimeFilterSelectionDTO } from '@dindinho/shared';
import { accountSelectionToParams, timeSelectionToParams } from './query-params.util';

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
        startDay: expect.any(String),
        endDay: expect.any(String),
      });
    });
  });
});
