/** @vitest-environment jsdom */
import { TestBed, getTestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ReportsService } from './reports.service';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BalanceHistoryDTO, CashFlowDTO, SpendingByCategoryDTO } from '@dindinho/shared';

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}

describe('ReportsService', () => {
  let service: ReportsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ReportsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('deve buscar gastos por categoria com filtros', () => {
    const mockData: SpendingByCategoryDTO = [
      {
        categoryId: 'cat-1',
        categoryName: 'Lazer',
        amount: 100,
        percentage: 100,
        icon: 'pi-tag',
      },
    ];
    const filters = { startDate: '2024-01-01', endDate: '2024-01-31', includePending: true };

    service.getSpendingByCategory(filters).subscribe((data) => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/spending-by-category'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('startDate')).toBe('2024-01-01');
    expect(req.request.params.get('endDate')).toBe('2024-01-31');
    req.flush(mockData);
  });

  it('deve enviar startDay/endDay e tzOffsetMinutes nos params', () => {
    const filters = {
      startDay: '2024-01-22',
      endDay: '2024-01-22',
      tzOffsetMinutes: 180,
      includePending: true,
    };

    service.getSpendingByCategory(filters).subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/spending-by-category'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('startDay')).toBe('2024-01-22');
    expect(req.request.params.get('endDay')).toBe('2024-01-22');
    expect(req.request.params.get('tzOffsetMinutes')).toBe('180');
    expect(req.request.params.get('includePending')).toBe('true');
    req.flush([]);
  });

  it('deve buscar fluxo de caixa com múltiplos accountIds', () => {
    const filters = { accountIds: ['acc-1', 'acc-2'], includePending: true };

    service.getCashFlow(filters).subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/cash-flow'));
    expect(req.request.params.getAll('accountIds')).toEqual(['acc-1', 'acc-2']);
    expect(req.request.params.get('includePending')).toBe('true');
    req.flush([]);
  });

  it('deve formatar labels de mês sem shift de timezone no cash-flow', async () => {
    const mockData: CashFlowDTO = [
      { period: '2026-02', income: 20, expense: 0, balance: 20 },
      { period: '2026-01', income: 10, expense: 5, balance: 5 },
    ];

    const resultPromise = new Promise<void>((resolve) => {
      service.getCashFlowChart({ includePending: true }).subscribe((result) => {
        expect(result.periodKeys).toEqual(['2026-01', '2026-02']);
        expect(result.data.labels).toEqual(['Jan/2026', 'Fev/2026']);
        resolve();
      });
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/cash-flow'));
    req.flush(mockData);

    await resultPromise;
  });

  it('deve buscar histórico de saldo', () => {
    service.getBalanceHistory({ includePending: true }).subscribe();
    const req = httpMock.expectOne((r) => r.url.endsWith('/balance-history'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('deve mapear histórico de saldo com eixo X proporcional ao tempo', async () => {
    const mockData: BalanceHistoryDTO = [
      {
        date: '2024-01-02',
        t: Date.UTC(2024, 0, 2),
        label: '2024-01-02',
        periodStart: '2024-01-02',
        periodEnd: '2024-01-02',
        balance: 1100,
        changed: false,
      },
      {
        date: '2024-01-01',
        t: Date.UTC(2024, 0, 1),
        label: '2024-01-01',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-01',
        balance: 1000,
        changed: true,
      },
      {
        date: '2024-01-03',
        t: Date.UTC(2024, 0, 3),
        label: '2024-01-03',
        periodStart: '2024-01-03',
        periodEnd: '2024-01-03',
        balance: 1100,
        changed: false,
      },
    ];

    const resultPromise = new Promise<void>((resolve) => {
      service.getBalanceHistoryChart({ includePending: true }).subscribe((result) => {
        const dataset = result.datasets[0];
        const points = dataset.data as unknown as {
          x: number;
          y: number;
          label?: string;
          periodStart?: string;
          periodEnd?: string;
        }[];

        expect(points.map((p) => p.x)).toEqual([
          Date.UTC(2024, 0, 1),
          Date.UTC(2024, 0, 2),
          Date.UTC(2024, 0, 3),
        ]);
        expect(points.map((p) => p.y)).toEqual([1000, 1100, 1100]);
        expect(points[0]).toEqual(
          expect.objectContaining({
            label: '2024-01-01',
            periodStart: '2024-01-01',
            periodEnd: '2024-01-01',
          }),
        );

        const pointRadius = dataset.pointRadius;
        expect(typeof pointRadius).toBe('function');
        if (typeof pointRadius === 'function') {
          expect(pointRadius({ dataIndex: 0 } as never, {} as never)).toBe(3);
          expect(pointRadius({ dataIndex: 1 } as never, {} as never)).toBe(0);
          expect(pointRadius({ dataIndex: 2 } as never, {} as never)).toBe(3);
        }

        resolve();
      });
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/balance-history'));
    req.flush(mockData);
    await resultPromise;
  });

  it('deve exportar transações para CSV', () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' });
    const filters = { startDate: '2024-01-01', endDate: '2024-01-31', includePending: true };

    service.exportTransactionsCsv(filters).subscribe((blob) => {
      expect(blob).toEqual(mockBlob);
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/export/csv'));
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });
});
