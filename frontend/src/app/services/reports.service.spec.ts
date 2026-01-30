/** @vitest-environment jsdom */
import { TestBed, getTestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ReportsService } from './reports.service';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpendingByCategoryDTO } from '@dindinho/shared';

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

  it('deve buscar fluxo de caixa com múltiplos accountIds', () => {
    const filters = { accountIds: ['acc-1', 'acc-2'], includePending: true };

    service.getCashFlow(filters).subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/cash-flow'));
    expect(req.request.params.getAll('accountIds')).toEqual(['acc-1', 'acc-2']);
    expect(req.request.params.get('includePending')).toBe('true');
    req.flush([]);
  });

  it('deve buscar histórico de saldo', () => {
    service.getBalanceHistory({ includePending: true }).subscribe();
    const req = httpMock.expectOne((r) => r.url.endsWith('/balance-history'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
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
